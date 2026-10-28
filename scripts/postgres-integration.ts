import 'dotenv/config';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import pg from 'pg';
import jwt from 'jsonwebtoken';
import net from 'node:net';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
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
    VALUES ($1,$2,'A',$3,'hash-de-teste','admin'),($4,$5,'B',$6,'hash-de-teste','operator')`,
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
  const reservation = net.createServer();
  reservation.listen(0, '127.0.0.1');
  await once(reservation, 'listening');
  const port = (reservation.address() as net.AddressInfo).port;
  await new Promise<void>(resolve => reservation.close(() => resolve()));
  const child = spawn(process.execPath, ['dist/server.cjs'], {
    env: { ...process.env, PORT: String(port), HOST: '127.0.0.1', DATABASE_MIGRATION_URL: '' },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  try {
    await new Promise<void>((resolve, reject) => {
      let output = '';
      const timer = setTimeout(() => reject(new Error(`Backend de produção não iniciou: ${output.slice(-2000)}`)), 20000);
      child.stdout.on('data', chunk => {
        output += chunk.toString();
        if (output.includes('Servidor rodando em')) { clearTimeout(timer); resolve(); }
      });
      child.stderr.on('data', chunk => { output += chunk.toString(); });
      child.once('exit', code => { clearTimeout(timer); reject(new Error(`Backend encerrou (${code}): ${output.slice(-2000)}`)); });
      child.once('error', reject);
    });
    const base = `http://127.0.0.1:${port}`;
    const login = await fetch(base + '/api/v1/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: process.env.ADMIN_INITIAL_EMAIL, password: process.env.ADMIN_INITIAL_PASSWORD }) });
    assert.equal(login.status, 200, 'Login real com bcrypt e função de identidade.');
    const session = await login.json();
    assert.ok(session.token);
    const me = await fetch(base + '/api/v1/auth/me', { headers: { Authorization: `Bearer ${session.token}` } });
    assert.equal(me.status, 200);
    assert.equal('passwordHash' in await me.json(), false);
    // O papel no token não pode elevar o papel atual registrado no banco.
    const operatorToken = jwt.sign({ id: `user-b-${id}`, tenantId: tenantB, role: 'super_admin' }, process.env.JWT_SECRET!, { expiresIn: '1m' });
    const headers = { Authorization: `Bearer ${operatorToken}` };
    for (const path of ['/api/v1/billing', '/api/v1/cdr', '/api/v1/system/health']) {
      assert.equal((await fetch(base + path, { headers })).status, 403, path);
    }
    const tenants = await (await fetch(base + '/api/v1/tenants', { headers })).json();
    assert.deepEqual(tenants.map((tenant: any) => tenant.id), [tenantB]);
    assert.equal((await fetch(base + '/api/v1/extensions', { headers: { ...headers, 'x-tenant-id': tenantA } })).status, 403);
    const backendSource = await fetch(base + '/server.cjs');
    assert.match(backendSource.headers.get('content-type') || '', /text\/html/);
    assert.match(await backendSource.text(), /<!doctype html>/i);
    const readiness = await fetch(base + '/health/ready');
    assert.equal(readiness.status, 503, 'Sem Asterisk o PBX não declara prontidão de produção.');
    assert.equal((await readiness.json()).dependencies.postgresql, 'UP');
    console.log('HTTP de produção: login bcrypt, perfil, RBAC, isolamento, arquivos públicos e readiness aprovados.');
  } finally {
    if (child.exitCode === null && child.signalCode === null) {
      const exited = once(child, 'exit');
      child.kill('SIGTERM');
      const timer = setTimeout(() => child.kill('SIGKILL'), 3000);
      await exited;
      clearTimeout(timer);
    }
  }
  console.log('PostgreSQL real: migrações, RLS, identidade, privilégios mínimos e idempotência aprovados.');
} finally {
  await admin.query('DELETE FROM omnichannel_conversations WHERE tenant_id IN ($1,$2)', [tenantA, tenantB]).catch(() => {});
  await admin.query('DELETE FROM users WHERE tenant_id IN ($1,$2)', [tenantA, tenantB]).catch(() => {});
  await admin.query('DELETE FROM tenants WHERE id IN ($1,$2)', [tenantA, tenantB]).catch(() => {});
  await admin.end();
  await postgresClient.close();
}
