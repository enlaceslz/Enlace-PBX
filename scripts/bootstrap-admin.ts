import 'dotenv/config';
import pg from 'pg';
import { getMigrationUrl } from './migrate.js';
import { bootstrapAdmin } from '../server/infrastructure/postgres/provisioning/bootstrapAdmin.js';

async function main() {
  const pool = new pg.Pool({ connectionString: getMigrationUrl(process.env), max: 1, connectionTimeoutMillis: 5000 });
  try {
    const client = await pool.connect();
    try {
      const result = await client.query('SELECT current_database() AS database');
      if (result.rows[0]?.database !== 'enlace_pbx') throw new Error('BOOTSTRAP_DATABASE_INVALID');
      const status = await bootstrapAdmin(client, process.env);
      console.log(status === 'created' ? 'Primeiro administrador criado com auditoria.' : 'Administrador já existente; nenhuma alteração realizada.');
    } finally { client.release(); }
  } finally { await pool.end(); }
}

main().catch(() => {
  console.error('Bootstrap recusado. Confira banco, migrações, credencial administrativa e ADMIN_INITIAL_EMAIL/ADMIN_INITIAL_PASSWORD (mínimo de 12 caracteres e máximo de 72 bytes).');
  process.exitCode = 1;
});
