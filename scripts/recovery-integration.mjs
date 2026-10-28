import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import pg from 'pg';
import { createBackup, restoreBackup } from './disaster-recovery.mjs';

if (process.env.PBX_INTEGRATION_DATABASE !== 'descartavel') throw new Error('Somente banco descartável de integração.');
const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'pbx-recovery-test-'));
const database = `enlace_restore_${crypto.randomBytes(8).toString('hex')}`;
const admin = new pg.Client({ connectionString: process.env.DATABASE_MIGRATION_URL });
try {
  await admin.connect();
  const key = path.join(directory, 'backup.key');
  const configuration = path.join(directory, 'runtime.json');
  const asterisk = path.join(directory, 'asterisk');
  const recordings = path.join(directory, 'recordings');
  await fs.writeFile(key, crypto.randomBytes(32).toString('hex'), { mode: 0o600 });
  const settings = { ENCRYPTION_KEY: crypto.randomBytes(32).toString('hex'), JWT_SECRET: crypto.randomBytes(32).toString('hex') };
  await fs.writeFile(configuration, JSON.stringify(settings));
  await fs.mkdir(asterisk); await fs.mkdir(recordings);
  await fs.writeFile(path.join(asterisk, 'pjsip.conf'), '[teste]\ntype=endpoint\n');
  const recording = crypto.randomBytes(8192);
  await fs.writeFile(path.join(recordings, 'call.wav'), recording);
  const created = await createBackup({ url: process.env.DATABASE_MIGRATION_URL, keyFile: key,
    directory: path.join(directory, 'backups'), configuration, asterisk, recordings });
  const restored = await restoreBackup({ url: process.env.DATABASE_MIGRATION_URL, keyFile: key, file: created.file,
    destination: path.join(directory, 'recovered'), database });
  assert.equal(restored.verified, true);
  assert.deepEqual(restored.tableCounts, created.metadata.tableCounts);
  assert.deepEqual(JSON.parse(await fs.readFile(path.join(restored.destination, 'configuration/runtime.json'), 'utf8')), settings);
  assert.deepEqual(await fs.readFile(path.join(restored.destination, 'recordings/call.wav')), recording);
  assert.equal(await fs.readFile(path.join(restored.destination, 'asterisk/pjsip.conf'), 'utf8'), '[teste]\ntype=endpoint\n');
  await assert.rejects(restoreBackup({ url: process.env.DATABASE_MIGRATION_URL, keyFile: key, file: created.file,
    destination: path.join(directory, 'existing-db'), database }), /já existe/);
  const corrupt = path.join(directory, 'corrupt.epbx');
  const bytes = await fs.readFile(created.file); bytes[30] ^= 1; await fs.writeFile(corrupt, bytes);
  await assert.rejects(restoreBackup({ url: process.env.DATABASE_MIGRATION_URL, keyFile: key, file: corrupt,
    destination: path.join(directory, 'corrupt'), database: database + '_bad' }));
  await assert.rejects(restoreBackup({ url: process.env.DATABASE_MIGRATION_URL, keyFile: key, file: created.file,
    destination: path.join(directory, 'forbidden'), database: 'enlace_pbx' }), /NOVO/);
  assert.equal((await admin.query('SELECT 1 FROM pg_database WHERE datname=$1', [database])).rowCount, 1);
  console.log('Recuperação real aprovada: PostgreSQL completo, chaves, configuração Asterisk e gravação; adulteração rejeitada e banco existente preservado.');
} finally {
  await admin.query(`DROP DATABASE IF EXISTS "${database}"`).catch(() => {});
  await admin.end();
  await fs.rm(directory, { recursive: true, force: true });
}
