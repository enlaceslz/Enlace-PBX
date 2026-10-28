import 'dotenv/config';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import pg from 'pg';
import { postgresClient } from '../server/infrastructure/postgres/client.js';
import { DatabaseMigrator } from '../server/infrastructure/postgres/migrations/migrator.js';
import { OmnichannelRepository } from '../server/infrastructure/postgres/repositories/OmnichannelRepository.js';

// Este comando é destinado exclusivamente a um banco descartável de integração.
if (process.env.PBX_INTEGRATION_DATABASE !== 'descartavel') throw new Error('Banco descartável de integração obrigatório.');
const admin = new pg.Client({ connectionString: process.env.DATABASE_MIGRATION_URL });
const id = crypto.randomUUID();
const tenantA = `test-a-${id}`;
const tenantB = `test-b-${id}`;
const context = (tenantId: string) => ({ tenantId, actorRole: 'admin' as const, actorUserId: 'integration', accessMode: 'TENANT' as const });
try {
  await admin.connect();
  assert.equal((await postgresClient.checkHealth()).productionSafe, true);
  const migrations = await DatabaseMigrator.runMigrations();
  assert.equal(migrations.success, true, migrations.error);
  await admin.query("INSERT INTO tenants (id,name) VALUES ($1,'Empresa A'),($2,'Empresa B')", [tenantA, tenantB]);
  await admin.query(`INSERT INTO users (id,tenant_id,name,email,password_hash,role)
    VALUES ($1,$2,'A',$3,'hash-de-teste','admin'),($4,$5,'B',$6,'hash-de-teste','admin')`,
    [`user-a-${id}`, tenantA, `a-${id}@example.invalid`, `user-b-${id}`, tenantB, `b-${id}@example.invalid`]);
  const visible = await postgresClient.withTenantTransaction(context(tenantA), client => client.query('SELECT tenant_id FROM users'));
  assert.deepEqual(visible.rows, [{ tenant_id: tenantA }]);
  assert.equal((await postgresClient.query('SELECT id FROM users')).rows.length, 0);
  await assert.rejects(postgresClient.withTenantTransaction(context(tenantA), client => client.query(
    "INSERT INTO users (id,tenant_id,name,email,password_hash,role) VALUES ($1,$2,'X',$3,'x','admin')",
    [`forbidden-${id}`, tenantB, `forbidden-${id}@example.invalid`])));
  const identity = await postgresClient.query('SELECT * FROM authenticate_user_identity($1)', [`a-${id}@example.invalid`]);
  assert.equal(identity.rows[0].tenant_id, tenantA);
  await assert.rejects(postgresClient.query('CREATE TABLE public.forbidden_integration (id INT)'));
  await assert.rejects(postgresClient.query("DELETE FROM schema_migrations WHERE version = 'impossivel'"));
  await OmnichannelRepository.receiveWhatsappMessage(tenantA, { id: `wamid-${id}`, from: '5598999990000', content: 'Entrada', timestamp: new Date().toISOString() });
  await OmnichannelRepository.receiveWhatsappMessage(tenantA, { id: `wamid-${id}`, from: '5598999990000', content: 'Entrada', timestamp: new Date().toISOString() });
  const stored = await admin.query('SELECT messages FROM omnichannel_conversations WHERE tenant_id=$1', [tenantA]);
  assert.equal(stored.rows[0].messages.length, 1);
  const insecure = await admin.query(`SELECT c.relname FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
    WHERE n.nspname='public' AND c.relkind='r' AND EXISTS
      (SELECT 1 FROM pg_attribute a WHERE a.attrelid=c.oid AND a.attname='tenant_id' AND NOT a.attisdropped)
      AND (NOT c.relrowsecurity OR NOT c.relforcerowsecurity)`);
  assert.deepEqual(insecure.rows, [], 'Todas as tabelas com tenant_id exigem RLS forçada.');
  console.log('PostgreSQL real: migrações, RLS, identidade, privilégios mínimos e idempotência aprovados.');
} finally {
  await admin.query('DELETE FROM omnichannel_conversations WHERE tenant_id IN ($1,$2)', [tenantA, tenantB]).catch(() => {});
  await admin.query('DELETE FROM users WHERE tenant_id IN ($1,$2)', [tenantA, tenantB]).catch(() => {});
  await admin.query('DELETE FROM tenants WHERE id IN ($1,$2)', [tenantA, tenantB]).catch(() => {});
  await admin.end();
  await postgresClient.close();
}
