import 'dotenv/config';
import pg from 'pg';
import { pathToFileURL } from 'node:url';
import { DatabaseMigrator } from '../server/infrastructure/postgres/migrations/migrator.js';

/** Credencial administrativa somente neste processo, sem fallback para DATABASE_URL. */
export function getMigrationUrl(environment: NodeJS.ProcessEnv): string {
  const value = environment.MIGRATION_DATABASE_URL?.trim();
  if (!value) throw new Error('MIGRATION_DATABASE_URL obrigatória para o comando administrativo.');
  let url: URL;
  try { url = new URL(value); } catch { throw new Error('MIGRATION_DATABASE_URL inválida.'); }
  if (!['postgres:', 'postgresql:'].includes(url.protocol)) throw new Error('A conexão de migração deve usar PostgreSQL.');
  if (decodeURIComponent(url.username) === 'enlace_app') throw new Error('O usuário operacional enlace_app não pode executar migrações.');
  return value;
}

export async function migrate(): Promise<void> {
  const connectionString = getMigrationUrl(process.env);
  const pool = new pg.Pool({ connectionString, max: 1, connectionTimeoutMillis: 5000 });
  try {
    const client = await pool.connect();
    let handedOff = false;
    try {
      const result = await client.query(`SELECT current_database() AS database, current_user AS username,
        rolsuper FROM pg_roles WHERE rolname = current_user`);
      const identity = result.rows[0];
      // As migrações históricas 007/008 administram papéis e referenciam este banco.
      if (identity?.database !== 'enlace_pbx' || !identity?.rolsuper || identity?.username === 'enlace_app') {
        throw new Error('Migrações históricas exigem uma sessão administrativa no banco enlace_pbx.');
      }
      // A migração 007 concede EXECUTE antes de criar o papel; preparar o papel sem alterar seu checksum.
      await client.query(`DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'enlace_app') THEN
          CREATE ROLE enlace_app WITH LOGIN NOSUPERUSER NOBYPASSRLS NOCREATEDB NOCREATEROLE;
        END IF;
      END $$;`);
      handedOff = true;
      const migration = await DatabaseMigrator.applyMigrations(client);
      if (!migration.success) throw new Error('Migrações não concluídas; consulte o diagnóstico do executor.');
      console.log(`Migrações concluídas: ${migration.applied} novas versões. Bootstrap não executado.`);
    } finally {
      if (!handedOff) client.release();
    }
  } finally {
    await pool.end();
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  migrate().catch(() => {
    // Não imprimir objetos de conexão, URL ou erros do driver com possíveis credenciais.
    console.error('Falha no provisionamento. Confira MIGRATION_DATABASE_URL, papel administrativo e banco enlace_pbx.');
    process.exitCode = 1;
  });
}
