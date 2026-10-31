import assert from 'node:assert/strict';
import { test } from 'node:test';
import { loadEnvConfig } from '../server/config/env.js';

for (const scenario of ['válido', 'JWT curto', 'chave ausente', 'chave curta'] as const) {
  test(`Ambiente de produção: ${scenario}`, () => {
    const original = { ...process.env };
    try {
      process.env.NODE_ENV = 'production';
      process.env.CORS_ALLOWED_ORIGINS = 'https://pbx.example';
      process.env.JWT_SECRET = scenario === 'JWT curto' ? 'senha-fraca' : 'a'.repeat(64);
      process.env.ENCRYPTION_KEY = scenario === 'chave curta' ? 'curta' : 'b'.repeat(64);
      if (scenario === 'chave ausente') delete process.env.ENCRYPTION_KEY;
      if (scenario === 'válido') assert.equal(loadEnvConfig().NODE_ENV, 'production');
      else assert.throws(() => loadEnvConfig(), /JWT_SECRET|ENCRYPTION_KEY/);
    } finally {
      for (const key of Object.keys(process.env)) if (!(key in original)) delete process.env[key];
      Object.assign(process.env, original);
    }
  });
}
