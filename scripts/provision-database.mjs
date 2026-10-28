import fs from 'node:fs';
import pg from 'pg';

const settings = JSON.parse(fs.readFileSync(process.env.PBX_CONFIG_FILE, 'utf8'));
const application = new URL(settings.DATABASE_URL);
const maintenance = new URL(settings.DATABASE_MIGRATION_URL);
maintenance.pathname = '/postgres';
const client = new pg.Client({ connectionString: maintenance.toString(), connectionTimeoutMillis: 5000 });
try {
  await client.connect();
  if (!(await client.query("SELECT 1 FROM pg_database WHERE datname='enlace_pbx'")).rowCount) await client.query('CREATE DATABASE enlace_pbx');
  if (!(await client.query("SELECT 1 FROM pg_roles WHERE rolname='enlace_app'")).rowCount) await client.query('CREATE ROLE enlace_app LOGIN NOSUPERUSER NOBYPASSRLS NOCREATEDB NOCREATEROLE');
  // format(%L) é executado no PostgreSQL; a senha não é concatenada em SQL nem argumentos de processo.
  const command = await client.query("SELECT format('ALTER ROLE enlace_app PASSWORD %L', $1::text) AS sql", [decodeURIComponent(application.password)]);
  await client.query(command.rows[0].sql);
  console.log('Banco e role operacional provisionados.');
} finally { await client.end(); }
