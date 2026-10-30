import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
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

test('deploy conserva bytes e inode do runtime e recusa alteração antes de escrever bootstrap', () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'pbx-preserve-'));
  try {
    const file = path.join(directory, 'runtime.json');
    const bootstrap = path.join(directory, 'bootstrap.json');
    const settings = productionSettings({ PBX_DOMAIN: 'pbx.example.invalid' });
    const original = JSON.stringify(settings);
    fs.writeFileSync(file, original, { mode: 0o640 });
    const inode = fs.statSync(file).ino;
    const invoke = (extra: Record<string, string> = {}) => spawnSync(process.execPath,
      ['scripts/configure-production.mjs', file, bootstrap, '--preserve-existing'],
      { encoding: 'utf8', env: { PATH: process.env.PATH, ...extra } });
    assert.equal(invoke().status, 0);
    assert.equal(fs.readFileSync(file, 'utf8'), original);
    assert.equal(fs.statSync(file).ino, inode);
    fs.unlinkSync(bootstrap);
    for (const extra of [{ PBX_DOMAIN: 'outro.example.invalid' }, { ASTERISK_AMI_PASSWORD: 'credencial-alterada' }, { DATABASE_URL: 'postgresql://enlace_app:nova@127.0.0.1:5432/enlace_pbx' }]) {
      const result = invoke(extra);
      assert.notEqual(result.status, 0);
      assert.equal(fs.existsSync(bootstrap), false);
      assert.equal(fs.readFileSync(file, 'utf8'), original);
      assert.equal(fs.statSync(file).ino, inode);
      assert.equal(result.stderr.includes(Object.values(extra)[0]), false);
    }
    fs.writeFileSync(file, JSON.stringify({ ...settings, ADMIN_INITIAL_PASSWORD: 'legado-sensivel' }));
    assert.notEqual(invoke().status, 0);
    assert.equal(fs.existsSync(bootstrap), false);
  } finally { fs.rmSync(directory, { recursive: true, force: true }); }
});
