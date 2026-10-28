import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import net from 'node:net';
import test from 'node:test';

test('servidor HTTP protege rotas, valida JSON e verifica o webhook original', { timeout: 30000 }, async () => {
  const reservation = net.createServer();
  reservation.listen(0, '127.0.0.1');
  await once(reservation, 'listening');
  const port = (reservation.address() as net.AddressInfo).port;
  await new Promise<void>(resolve => reservation.close(() => resolve()));
  const secret = crypto.randomBytes(32).toString('hex');
  const child = spawn(process.execPath, ['--import', 'tsx', 'server.ts'], {
    env: { ...process.env, NODE_ENV: 'test', PORT: String(port), DATABASE_URL: '', PGHOST: '',
      GEMINI_API_KEY: '', NINEROUTER_API_KEY: '', JWT_SECRET: secret, ENCRYPTION_KEY: secret,
      WHATSAPP_APP_SECRET: secret, DISABLE_HMR: 'true' },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  let output = '';
  try {
    await new Promise<void>((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error(`Servidor não iniciou: ${output.slice(-2000)}`)), 20000);
      child.stdout.on('data', chunk => {
        output += chunk.toString();
        if (output.includes('Servidor rodando em')) { clearTimeout(timer); resolve(); }
      });
      child.stderr.on('data', chunk => { output += chunk.toString(); });
      child.once('exit', code => { clearTimeout(timer); reject(new Error(`Servidor encerrou (${code}): ${output.slice(-2000)}`)); });
      child.once('error', reject);
    });
    const base = `http://127.0.0.1:${port}`;
    for (const path of ['/api/v1/webhooks', '/api/v1/health/run-diagnostic', '/api/v1/users', '/api/v1/events/asterisk?ticket=invalido']) {
      const response = await fetch(base + path);
      assert.equal(response.status, 401, path);
      assert.equal(response.headers.get('x-content-type-options'), 'nosniff');
    }
    const malformed = await fetch(base + '/api/v1/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{' });
    assert.equal(malformed.status, 400);
    assert.equal('details' in await malformed.json(), false);
    const invalidInput = await fetch(base + '/api/v1/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{"email":[],"password":{}}' });
    assert.equal(invalidInput.status, 400);
    const body = '{ "object": "whatsapp_business_account", "entry": [] }\n';
    const signature = 'sha256=' + crypto.createHmac('sha256', secret).update(body).digest('hex');
    const signed = await fetch(base + '/api/v1/webhooks/whatsapp', { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-hub-signature-256': signature }, body });
    assert.equal(signed.status, 200);
    const altered = await fetch(base + '/api/v1/webhooks/whatsapp', { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-hub-signature-256': signature }, body: JSON.stringify(JSON.parse(body)) });
    assert.equal(altered.status, 403);
    assert.equal((await fetch(base + '/api/nao-existe')).status, 404);
  } finally {
    if (child.exitCode === null && child.signalCode === null) {
      const exited = once(child, 'exit');
      child.kill('SIGTERM');
      const timer = setTimeout(() => child.kill('SIGKILL'), 3000);
      await exited;
      clearTimeout(timer);
    }
  }
});
