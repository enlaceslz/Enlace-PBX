import assert from 'node:assert/strict';
import { test } from 'node:test';
import { DatabaseMigrator } from '../server/infrastructure/postgres/migrations/migrator.js';
import { postgresClient } from '../server/infrastructure/postgres/client.js';

// Cliente controlado para verificar afinidade de sessão e tratamento de falhas.
// Não substitui testes de integração com PostgreSQL real.
for (const scenario of ['sucesso', 'bloqueio', 'registro', 'desbloqueio'] as const) {
  test(`Migrações: ${scenario}`, async () => {
    const calls: string[] = [];
    const releases: (boolean | undefined)[] = [];
    let recorded = 0;
    const original = {
      health: postgresClient.checkHealth,
      getClient: postgresClient.getClient,
      query: postgresClient.query,
      configured: postgresClient.isConfigured,
      bootstrap: DatabaseMigrator.bootstrapAdminIfRequested,
    };
    try {
      postgresClient.isConfigured = true;
      postgresClient.checkHealth = async () => ({ status: 'UP' });
      postgresClient.query = async () => { throw new Error('Consulta avulsa do pool proibida'); };
      DatabaseMigrator.bootstrapAdminIfRequested = async () => {};
      postgresClient.getClient = async () => ({
        query: async (sql: string) => {
          calls.push(sql);
          if (scenario === 'bloqueio' && sql.includes('pg_advisory_lock(')) throw new Error('bloqueio indisponível');
          if (scenario === 'desbloqueio' && sql.includes('pg_advisory_unlock(')) throw new Error('conexão perdida');
          if (sql.startsWith('INSERT INTO schema_migrations')) {
            if (scenario === 'registro' && recorded === 1) throw new Error('falha ao registrar versão');
            recorded++;
          }
          return { rows: [], rowCount: 0 };
        },
        release: (destroy?: boolean) => releases.push(destroy),
      }) as any;
      const result = await DatabaseMigrator.runMigrations();
      assert.equal(releases.length, 1);
      assert.equal(releases[0], scenario === 'desbloqueio' ? true : undefined);
      if (scenario === 'bloqueio') {
        assert.equal(result.success, false);
        assert.equal(calls.length, 1);
        assert.equal(result.applied, 0);
      } else if (scenario === 'registro') {
        assert.equal(result.success, false);
        assert.equal(result.applied, 1);
        assert.equal(calls.filter(sql => sql === 'COMMIT').length, 1);
        assert.equal(calls.at(-2), 'ROLLBACK');
        assert.match(calls.at(-1)!, /pg_advisory_unlock/);
      } else {
        assert.equal(result.success, true);
        assert.ok(result.applied >= 8);
        assert.equal(calls.filter(sql => sql === 'BEGIN').length, result.applied);
        assert.equal(calls.filter(sql => sql === 'COMMIT').length, result.applied);
        assert.match(calls.at(-1)!, /pg_advisory_unlock/);
      }
    } finally {
      postgresClient.checkHealth = original.health;
      postgresClient.getClient = original.getClient;
      postgresClient.query = original.query;
      postgresClient.isConfigured = original.configured;
      DatabaseMigrator.bootstrapAdminIfRequested = original.bootstrap;
    }
  });
}

for (const scenario of ['íntegro', 'pendente', 'divergente', 'sem hash'] as const) {
  test(`Validação somente leitura: ${scenario}`, async () => {
    const fs = await import('node:fs');
    const crypto = await import('node:crypto');
    const path = await import('node:path');
    const original = { health: postgresClient.checkHealth, query: postgresClient.query, configured: postgresClient.isConfigured, env: process.env.NODE_ENV };
    const directory = path.join(process.cwd(), 'server/infrastructure/postgres/migrations');
    const rows = fs.readdirSync(directory).filter(file => /^\d+_.*\.sql$/.test(file)).map(file => ({
      version: file.split('_')[0],
      sha256: crypto.createHash('sha256').update(fs.readFileSync(path.join(directory, file))).digest('hex'),
    }));
    if (scenario === 'pendente') rows.pop();
    if (scenario === 'divergente') rows[0].sha256 = 'inválido';
    if (scenario === 'sem hash') rows[0].sha256 = null;
    try {
      process.env.NODE_ENV = 'production';
      postgresClient.isConfigured = true;
      postgresClient.checkHealth = async () => ({ status: 'UP' });
      postgresClient.query = (async (sql: string) => {
        assert.equal(sql, 'SELECT version, sha256 FROM schema_migrations');
        return { rows };
      }) as any;
      const result = await DatabaseMigrator.runMigrations();
      assert.equal(result.applied, 0);
      assert.equal(result.success, scenario === 'íntegro');
      if (scenario !== 'íntegro') assert.match(result.error!, /SCHEMA_PENDING|SCHEMA_DRIFT/);
    } finally {
      postgresClient.checkHealth = original.health;
      postgresClient.query = original.query;
      postgresClient.isConfigured = original.configured;
      if (original.env === undefined) delete process.env.NODE_ENV;
      else process.env.NODE_ENV = original.env;
    }
  });
}
