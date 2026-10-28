import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { productionSettings, writeSettings } from './configure-production.mjs';
import { readEnvironmentFile } from '../server/config/loadEnvironment.js';

test('configuração preserva literalmente segredos especiais e não entrega bootstrap ao serviço', () => {
  const secret = `senha com espaços # ' " \\ $() \\n e nova linha\nreal`;
  const existing = { PBX_DOMAIN: 'pbx.example.invalid', JWT_SECRET: secret, ENCRYPTION_KEY: secret, GEMINI_API_KEY: secret,
    DATABASE_URL: `postgresql://enlace_app:${encodeURIComponent(secret)}@127.0.0.1:5432/enlace_pbx`,
    WHATSAPP_APP_SECRET: secret, ADMIN_INITIAL_PASSWORD: 'admin-secret', DATABASE_MIGRATION_URL: 'admin-url' };
  const settings = productionSettings(existing);
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'pbx-config-'));
  try {
    const file = path.join(directory, 'runtime.json');
    writeSettings(file, settings);
    const restored = readEnvironmentFile(file);
    assert.equal(restored.JWT_SECRET, secret);
    assert.equal(restored.GEMINI_API_KEY, secret);
    assert.equal(restored.DATABASE_URL, existing.DATABASE_URL);
    assert.equal(restored.WHATSAPP_APP_SECRET, secret);
    assert.equal(restored.ADMIN_INITIAL_PASSWORD, undefined);
    assert.equal(restored.DATABASE_MIGRATION_URL, undefined);
    assert.equal(fs.statSync(file).mode & 0o777, 0o600);
    assert.equal(productionSettings(settings).ENCRYPTION_KEY, secret);
    assert.throws(() => productionSettings({ ...existing, ENCRYPTION_KEY: 'fraca' }), /existente é fraca/);
    assert.throws(() => productionSettings({ ...existing, PBX_DOMAIN: 'x; comando' }), /domínio/);
  } finally { fs.rmSync(directory, { recursive: true, force: true }); }
});
