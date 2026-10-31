import assert from 'node:assert/strict';
import { test } from 'node:test';
import bcrypt from 'bcrypt';
import { bootstrapAdmin } from '../server/infrastructure/postgres/provisioning/bootstrapAdmin.js';

for (const scenario of ['criação', 'existente', 'colisão', 'auditoria falha', 'sem privilégio', 'senha longa'] as const) {
  test(`Bootstrap administrativo: ${scenario}`, async () => {
    const calls: { sql: string; params?: any[] }[] = [];
    const password = scenario === 'senha longa' ? 'á'.repeat(40) : 'Seguro!ParaTeste#2026';
    const client = { query: async (sql: string, params?: any[]) => {
      calls.push({ sql, params });
      if (sql.includes('SELECT rolsuper')) return { rows: [{ rolsuper: scenario !== 'sem privilégio' }] };
      if (sql.includes("WHERE role = 'super_admin'")) return { rows: scenario === 'existente' ? [{ id: 'existente' }] : [] };
      if (sql.includes('WHERE LOWER(email)')) return { rows: scenario === 'colisão' ? [{ id: 'outro' }] : [] };
      if (sql.includes('INSERT INTO public.audit_logs') && scenario === 'auditoria falha') throw new Error('auditoria indisponível');
      return { rows: [] };
    }};
    const operation = bootstrapAdmin(client as any, { ADMIN_INITIAL_EMAIL: 'ADMIN@EXEMPLO.COM', ADMIN_INITIAL_PASSWORD: password });
    if (scenario === 'criação' || scenario === 'existente') {
      assert.equal(await operation, scenario === 'criação' ? 'created' : 'exists');
      assert.equal(calls.at(-1)?.sql, 'COMMIT');
    } else {
      await assert.rejects(operation);
      assert.equal(calls.at(-1)?.sql, 'ROLLBACK');
      assert.ok(!calls.some(call => call.sql === 'COMMIT'));
    }
    assert.ok(!calls.some(call => /UPDATE|DELETE/.test(call.sql)));
    if (scenario === 'existente' || scenario === 'colisão' || scenario === 'sem privilégio' || scenario === 'senha longa') {
      assert.ok(!calls.some(call => call.sql.includes('INSERT INTO')));
    }
    if (scenario === 'criação') {
      const user = calls.find(call => call.sql.includes('INSERT INTO public.users'))!;
      assert.equal(user.params![2], 'admin@exemplo.com');
      assert.ok(await bcrypt.compare(password, user.params![3]));
      assert.ok(!JSON.stringify(calls).includes(password));
      assert.ok(calls.some(call => call.sql.includes('pg_advisory_xact_lock')));
      assert.ok(calls.some(call => call.sql.includes('INSERT INTO public.audit_logs')));
    }
  });
}
