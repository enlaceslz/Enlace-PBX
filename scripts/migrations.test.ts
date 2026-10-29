import assert from 'node:assert/strict';
import test from 'node:test';
import pg from 'pg';
import { DatabaseMigrator } from '../server/infrastructure/postgres/migrations/migrator.js';

test('migrações usam uma conexão, registram checksum na transação e liberam lock', async () => {
  const original = { connect: pg.Client.prototype.connect, query: pg.Client.prototype.query, end: pg.Client.prototype.end };
  const previous = process.env.DATABASE_MIGRATION_URL;
  const statements: string[] = [];
  const connections = new Set<unknown>();
  let failInsert = false;
  process.env.DATABASE_MIGRATION_URL = 'postgresql://migration-test/enlace_pbx';
  pg.Client.prototype.connect = (async function () { connections.add(this); }) as any;
  pg.Client.prototype.end = (async function () { statements.push('END_CONNECTION'); }) as any;
  pg.Client.prototype.query = (async function (sql: string) {
    connections.add(this);
    statements.push(sql);
    if (sql.startsWith('INSERT INTO schema_migrations') && failInsert) throw new Error('Falha induzida no registro');
    return { rows: sql.includes("WHERE role = 'super_admin'") ? [{ id: 'existing-admin' }] : [], rowCount: 0 };
  }) as any;
  try {
    const success = await DatabaseMigrator.runMigrations({ apply: true });
    assert.equal(success.success, true);
    assert.equal(success.applied, 21);
    assert.equal(connections.size, 1);
    const firstInsert = statements.findIndex(sql => sql.startsWith('INSERT INTO schema_migrations'));
    assert.ok(statements.slice(0, firstInsert).includes('BEGIN'));
    assert.equal(statements[firstInsert + 1], 'COMMIT');
    assert.match(statements.at(-2)!, /pg_advisory_unlock/);
    assert.equal(statements.at(-1), 'END_CONNECTION');
    statements.length = 0;
    failInsert = true;
    const failure = await DatabaseMigrator.runMigrations({ apply: true });
    assert.equal(failure.success, false);
    assert.ok(statements.includes('ROLLBACK'));
    assert.match(statements.at(-2)!, /pg_advisory_unlock/);
    assert.equal(statements.at(-1), 'END_CONNECTION');
  } finally {
    Object.assign(pg.Client.prototype, original);
    if (previous === undefined) delete process.env.DATABASE_MIGRATION_URL;
    else process.env.DATABASE_MIGRATION_URL = previous;
  }
});
