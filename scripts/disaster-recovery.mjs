import fs from 'node:fs/promises';
import { createReadStream, createWriteStream } from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';
import { pipeline } from 'node:stream/promises';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import pg from 'pg';

const execute = promisify(execFile);
const magic = Buffer.from('EPBXBK01');
const identifier = value => '"' + value.replaceAll('"', '""') + '"';
const keyFromFile = async file => {
  const content = (await fs.readFile(file, 'utf8')).trim();
  if (!/^[a-f0-9]{64}$/i.test(content)) throw new Error('Chave de backup deve conter 32 bytes em hexadecimal.');
  return Buffer.from(content, 'hex');
};
const hashFile = async file => {
  const hash = crypto.createHash('sha256');
  for await (const block of createReadStream(file)) hash.update(block);
  return hash.digest('hex');
};
function postgresEnvironment(url, database) {
  const value = new URL(url);
  return { ...process.env, PGHOST: value.searchParams.get('host') || value.hostname,
    PGPORT: value.port || '5432', PGUSER: decodeURIComponent(value.username) || process.env.USER,
    PGPASSWORD: decodeURIComponent(value.password), PGDATABASE: database || decodeURIComponent(value.pathname.slice(1)),
    PGSSLMODE: value.searchParams.get('sslmode') || process.env.PGSSLMODE || 'prefer' };
}
async function assertFullAccess(client) {
  const result = await client.query('SELECT rolsuper OR rolbypassrls AS allowed FROM pg_roles WHERE rolname=current_user');
  if (!result.rows[0]?.allowed) throw new Error('Backup/recuperação integral exige role administrativa separada com acesso completo a RLS.');
}
async function counts(client) {
  const tables = await client.query("SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY tablename");
  const result = {};
  for (const { tablename } of tables.rows) result[tablename] = (await client.query(`SELECT count(*)::text AS count FROM public.${identifier(tablename)}`)).rows[0].count;
  return result;
}
export async function createBackup({ url, keyFile, directory, configuration, asterisk, recordings }) {
  if (!url) throw new Error('DATABASE_BACKUP_URL obrigatório; não use credencial do serviço HTTP.');
  const key = await keyFromFile(keyFile);
  const stage = await fs.mkdtemp(path.join(os.tmpdir(), 'enlace-backup-'));
  await fs.chmod(stage, 0o700);
  const client = new pg.Client({ connectionString: url, connectionTimeoutMillis: 5000 });
  let temporary;
  try {
    await client.connect();
    await assertFullAccess(client);
    await client.query('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY');
    const snapshot = (await client.query('SELECT pg_export_snapshot() AS id')).rows[0].id;
    const tableCounts = await counts(client);
    const dump = path.join(stage, 'database.dump');
    await execute('pg_dump', ['--format=custom', '--no-owner', '--no-privileges', '--snapshot', snapshot, '--file', dump],
      { env: postgresEnvironment(url), timeout: 3600000 });
    await client.query('COMMIT');
    const config = JSON.parse(await fs.readFile(configuration, 'utf8'));
    if (!config.ENCRYPTION_KEY || !config.JWT_SECRET) throw new Error('Configuração sem chaves necessárias para recuperação.');
    await fs.mkdir(path.join(stage, 'configuration'));
    await fs.copyFile(configuration, path.join(stage, 'configuration/runtime.json'));
    // Links não são seguidos: uma cópia de mídia não pode capturar arquivos arbitrários do host.
    for (const [source, destination] of [[asterisk, 'asterisk'], [recordings, 'recordings']]) {
      await fs.cp(source, path.join(stage, destination), { recursive: true, filter: async candidate => {
        if ((await fs.lstat(candidate)).isSymbolicLink()) throw new Error('Link simbólico encontrado; use uma origem materializada para o backup.');
        return true;
      } });
    }
    const manifest = { format: 1, createdAt: new Date().toISOString(), tableCounts,
      databaseSha256: await hashFile(dump), databaseConsistency: 'snapshot', filesConsistency: 'copy',
      scope: ['postgresql', 'runtime-configuration', 'asterisk-configuration', 'recordings'] };
    await fs.writeFile(path.join(stage, 'manifest.json'), JSON.stringify(manifest));
    const archive = path.join(stage, 'payload.tar');
    await execute('tar', ['-cf', archive, '-C', stage, 'database.dump', 'manifest.json', 'configuration', 'asterisk', 'recordings']);
    await fs.mkdir(directory, { recursive: true, mode: 0o700 });
    const name = `enlace-${Date.now()}-${crypto.randomBytes(4).toString('hex')}.epbx`;
    temporary = path.join(directory, `.${name}.tmp`);
    const header = Buffer.concat([magic, crypto.randomBytes(12)]);
    await fs.writeFile(temporary, header, { mode: 0o600, flag: 'wx' });
    const cipher = crypto.createCipheriv('aes-256-gcm', key, header.subarray(8));
    cipher.setAAD(header);
    await pipeline(createReadStream(archive), cipher, createWriteStream(temporary, { flags: 'a' }));
    await fs.appendFile(temporary, cipher.getAuthTag());
    const destination = path.join(directory, name);
    await fs.rename(temporary, destination);
    await fs.chmod(destination, 0o640);
    temporary = undefined;
    const metadata = { ...manifest, name, bytes: (await fs.stat(destination)).size };
    await fs.writeFile(destination + '.json', JSON.stringify(metadata, null, 2) + '\n', { mode: 0o640, flag: 'wx' });
    return { file: destination, metadata };
  } finally {
    await client.query('ROLLBACK').catch(() => {});
    await client.end().catch(() => {});
    if (temporary) await fs.rm(temporary, { force: true });
    await fs.rm(stage, { recursive: true, force: true });
  }
}
export async function restoreBackup({ url, keyFile, file, destination, database }) {
  if (!url || !/^enlace_restore_[a-z0-9_]{1,40}$/.test(database || '')) throw new Error('Informe a URL administrativa e um banco NOVO com prefixo enlace_restore_.');
  await fs.mkdir(destination, { mode: 0o700 }); // Recusa um diretório já existente.
  const stage = await fs.mkdtemp(path.join(os.tmpdir(), 'enlace-restore-'));
  await fs.chmod(stage, 0o700);
  const admin = new pg.Client({ connectionString: url, connectionTimeoutMillis: 5000 });
  let recovered;
  let databaseCreated = false;
  try {
    const handle = await fs.open(file, 'r');
    const size = (await handle.stat()).size;
    if (size < 37) { await handle.close(); throw new Error('Arquivo de backup truncado.'); }
    const header = Buffer.alloc(20); const tag = Buffer.alloc(16);
    try { await handle.read(header, 0, 20, 0); await handle.read(tag, 0, 16, size - 16); } finally { await handle.close(); }
    if (!header.subarray(0, 8).equals(magic)) throw new Error('Formato de backup inválido.');
    const decipher = crypto.createDecipheriv('aes-256-gcm', await keyFromFile(keyFile), header.subarray(8));
    decipher.setAAD(header); decipher.setAuthTag(tag);
    const archive = path.join(stage, 'payload.tar');
    await pipeline(createReadStream(file, { start: 20, end: size - 17 }), decipher, createWriteStream(archive, { mode: 0o600, flags: 'wx' }));
    // A extração só ocorre depois da autenticação de todo o arquivo criptografado.
    await execute('python3', [new URL('../ops/extract-backup.py', import.meta.url).pathname, archive, destination]);
    const manifest = JSON.parse(await fs.readFile(path.join(destination, 'manifest.json'), 'utf8'));
    if (manifest.format !== 1 || await hashFile(path.join(destination, 'database.dump')) !== manifest.databaseSha256) throw new Error('Integridade do dump inválida.');
    await admin.connect();
    await assertFullAccess(admin);
    if ((await admin.query('SELECT 1 FROM pg_database WHERE datname=$1', [database])).rowCount) throw new Error('Banco de recuperação já existe; nenhuma alteração foi realizada nele.');
    await admin.query(`CREATE DATABASE ${identifier(database)}`);
    databaseCreated = true;
    await execute('pg_restore', ['--exit-on-error', '--single-transaction', '--no-owner', '--no-privileges', '--dbname', database, path.join(destination, 'database.dump')],
      { env: postgresEnvironment(url, database), timeout: 3600000 });
    const restoredUrl = new URL(url); restoredUrl.pathname = '/' + database;
    recovered = new pg.Client({ connectionString: restoredUrl.toString() });
    await recovered.connect();
    const actualCounts = await counts(recovered);
    if (JSON.stringify(actualCounts) !== JSON.stringify(manifest.tableCounts)) throw new Error('Contagens de registros divergentes após a recuperação.');
    // O dump não restaura privilégios de origem. Reaplica apenas o papel operacional restrito.
    await recovered.query(`GRANT CONNECT ON DATABASE ${identifier(database)} TO enlace_app;
      GRANT USAGE ON SCHEMA public TO enlace_app;
      GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO enlace_app;
      GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO enlace_app;
      REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON schema_migrations FROM enlace_app;
      REVOKE CREATE ON SCHEMA public FROM PUBLIC;
      REVOKE ALL ON FUNCTION authenticate_user_identity(VARCHAR) FROM PUBLIC;
      GRANT EXECUTE ON FUNCTION authenticate_user_identity(VARCHAR) TO enlace_app;`);
    return { database, destination, verified: true, tableCounts: actualCounts };
  } catch (error) {
    await recovered?.end().catch(() => {}); recovered = undefined;
    // Somente o banco recém-criado por esta execução pode ser removido no tratamento de falha.
    if (databaseCreated) await admin.query(`DROP DATABASE ${identifier(database)}`).catch(() => {});
    await fs.rm(destination, { recursive: true, force: true });
    throw error;
  } finally {
    await recovered?.end().catch(() => {});
    await admin.end().catch(() => {});
    await fs.rm(stage, { recursive: true, force: true });
  }
}
if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(new URL(import.meta.url).pathname)) {
  const command = process.argv[2];
  const options = Object.fromEntries(process.argv.slice(3).map((value, index, all) => value.startsWith('--') ? [value.slice(2), all[index + 1]] : null).filter(Boolean));
  const common = { url: process.env.DATABASE_BACKUP_URL, keyFile: options.key || '/etc/enlace-pbx/backup.key' };
  if (command === 'create') console.log(await createBackup({ ...common, directory: options.directory || '/var/backups/enlace-pbx',
    configuration: options.configuration || '/etc/enlace-pbx/runtime.json', asterisk: options.asterisk || '/etc/asterisk', recordings: options.recordings || '/var/spool/asterisk/recording' }));
  else if (command === 'restore') console.log(await restoreBackup({ ...common, file: options.file, destination: options.destination, database: options.database }));
  else throw new Error('Use create ou restore; recuperação exige diretório e banco novos.');
}
