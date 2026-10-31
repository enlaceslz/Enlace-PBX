import assert from 'node:assert/strict';
import { test } from 'node:test';
import { getMigrationUrl } from './migrate.js';

for (const [name, environment] of [
  ['ausente', {}],
  ['sem fallback operacional', { DATABASE_URL: 'postgresql://admin:senha@localhost/enlace_pbx' }],
  ['URL inválida', { MIGRATION_DATABASE_URL: 'inválida' }],
  ['protocolo inválido', { MIGRATION_DATABASE_URL: 'https://localhost/enlace_pbx' }],
  ['usuário operacional', { MIGRATION_DATABASE_URL: 'postgresql://enlace_app:senha@localhost/enlace_pbx' }],
  ['usuário codificado', { MIGRATION_DATABASE_URL: 'postgresql://enlace%5Fapp:senha@localhost/enlace_pbx' }],
] as const) {
  test(`Credencial de migração: rejeita ${name}`, () => {
    assert.throws(() => getMigrationUrl(environment));
  });
}
test('Credencial de migração: aceita URL administrativa explícita', () => {
  const url = 'postgresql://administrador:segredo@localhost/enlace_pbx';
  assert.equal(getMigrationUrl({ MIGRATION_DATABASE_URL: url }), url);
});
