import assert from 'node:assert/strict';
import pg from 'pg';
import bcrypt from 'bcrypt';
import { bootstrapAdmin } from '../server/infrastructure/postgres/provisioning/bootstrapAdmin.js';

// Exclusivo do banco descartável do CI; não aceita a conexão operacional de produção.
const adminUrl = process.env.TEST_DATABASE_URL;
const appUrl = process.env.TEST_APP_DATABASE_URL;
if (!adminUrl || !appUrl || process.env.CI !== 'true') throw new Error('Integração exige CI e URLs explícitas de teste.');
if (new URL(adminUrl).pathname !== '/enlace_pbx' || new URL(appUrl).pathname !== '/enlace_pbx') throw new Error('Banco de teste inválido.');
const admin = new pg.Pool({ connectionString: adminUrl, max: 3 });
const app = new pg.Pool({ connectionString: appUrl, max: 2 });
try {
  const passwordSql = await admin.query("SELECT format('ALTER ROLE enlace_app PASSWORD %L', $1::text) AS sql", [decodeURIComponent(new URL(appUrl).password)]);
  await admin.query(passwordSql.rows[0].sql);
  const environment = { ADMIN_INITIAL_EMAIL: 'admin@integracao.example', ADMIN_INITIAL_PASSWORD: 'Teste#Concorrente2026!', DEFAULT_TENANT_ID: 'integracao-a' };
  const first = await admin.connect();
  const second = await admin.connect();
  try {
    const results = await Promise.all([bootstrapAdmin(first, environment), bootstrapAdmin(second, environment)]);
    assert.deepEqual(results.sort(), ['created', 'exists']);
  } finally { first.release(); second.release(); }
  const users = await admin.query("SELECT password_hash FROM users WHERE role = 'super_admin'");
  assert.equal(users.rowCount, 1);
  assert.ok(await bcrypt.compare(environment.ADMIN_INITIAL_PASSWORD, users.rows[0].password_hash));
  const audit = await admin.query("SELECT id FROM audit_logs WHERE action = 'BOOTSTRAP_SUPER_ADMIN_CREATED'");
  assert.equal(audit.rowCount, 1);
  await admin.query("INSERT INTO tenants (id, name) VALUES ('integracao-b', 'Empresa B') ON CONFLICT DO NOTHING");
  await admin.query(`INSERT INTO users (id, tenant_id, name, email, password_hash, role)
    VALUES ('integracao-user-b', 'integracao-b', 'Empresa B', 'b@integracao.example', 'sem-login', 'readonly') ON CONFLICT DO NOTHING`);
  const identity = await app.query('SELECT current_user AS username, rolsuper, rolbypassrls FROM pg_roles WHERE rolname = current_user');
  assert.equal(identity.rows[0].username, 'enlace_app');
  assert.equal(identity.rows[0].rolsuper, false);
  assert.equal(identity.rows[0].rolbypassrls, false);
  assert.equal((await app.query('SELECT id FROM users')).rowCount, 0);
  const scoped = await app.connect();
  try {
    await scoped.query('BEGIN');
    await scoped.query("SELECT set_config('app.current_tenant_id', $1, true)", ['integracao-a']);
    const visible = await scoped.query('SELECT tenant_id FROM users');
    assert.equal(visible.rowCount, 1);
    assert.ok(visible.rows.every(row => row.tenant_id === 'integracao-a'));
    await assert.rejects(scoped.query("INSERT INTO users (id,tenant_id,name,email,password_hash,role) VALUES ('forbidden','integracao-b','x','x@x.example','x','readonly')"), /row-level security/);
    await scoped.query('ROLLBACK');
    assert.equal((await scoped.query('SELECT id FROM users')).rowCount, 0);
  } finally { scoped.release(); }
  await assert.rejects(app.query('DELETE FROM schema_migrations'), /permission denied/);
  await assert.rejects(app.query('DELETE FROM audit_logs'), /permission denied/);
  await assert.rejects(app.query('CREATE TABLE public.proibida (id int)'), /permission denied/);
  const login = await app.query('SELECT id, tenant_id FROM authenticate_user_identity($1)', [environment.ADMIN_INITIAL_EMAIL]);
  assert.equal(login.rowCount, 1);
  assert.equal(login.rows[0].tenant_id, 'integracao-a');
  console.log('PostgreSQL real: bootstrap concorrente, bcrypt, auditoria, RLS, identidade e privilégios aprovados.');
} finally { await Promise.all([app.end(), admin.end()]); }
