import test from 'node:test';
import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import http from 'node:http';
import { once } from 'node:events';
import { prepareWebhookTest, validateWebhook } from '../server/infrastructure/integrations/OutboundWebhook.js';

test('webhook exige vínculo exato, segredo forte e estado habilitado', () => {
  const hook = { id: 'hook-a', tenant_id: 'empresa-a', name: 'Teste', endpoint: 'https://example.invalid/hook', enabled: true };
  const binding = { tenantId: hook.tenant_id, webhookId: hook.id, endpoint: hook.endpoint, signingSecret: 's'.repeat(32) };
  assert.throws(() => prepareWebhookTest(hook, []), /vínculo/);
  assert.throws(() => prepareWebhookTest(hook, [binding, binding]), /vínculo/);
  assert.throws(() => prepareWebhookTest({ ...hook, tenant_id: 'empresa-b' }, [binding]), /vínculo/);
  assert.throws(() => prepareWebhookTest({ ...hook, endpoint: 'https://example.invalid/outro' }, [binding]), /vínculo/);
  assert.throws(() => prepareWebhookTest({ ...hook, enabled: false }, [binding]), /desabilitado/);
  assert.throws(() => prepareWebhookTest(hook, [{ ...binding, signingSecret: 'fraco' }]), /Segredo/);
  for (const endpoint of ['/relativo', 'file:///etc/passwd', 'https://user:secret@example.invalid', 'https://example.invalid?token=abc']) assert.throws(() => validateWebhook({ name: 'Teste', endpoint, enabled: true }));
});

test('webhook envia bytes assinados e evento explícito de teste, aceita resposta textual 2xx e recusa erro', async () => {
  const secret = 'segredo-exclusivo-do-teste-com-32-caracteres';
  let received = 0; let reject = false;
  const server = http.createServer(async (req, res) => {
    received++;
    const chunks: Buffer[] = []; for await (const chunk of req) chunks.push(Buffer.from(chunk));
    const raw = Buffer.concat(chunks);
    assert.equal(req.headers['x-enlace-signature-256'], 'sha256=' + createHmac('sha256', secret).update(raw).digest('hex'));
    const payload = JSON.parse(raw.toString());
    assert.equal(payload.id, req.headers['x-enlace-request-id']);
    assert.equal(payload.event, 'enlace.webhook.test'); assert.equal(payload.tenantId, 'empresa-a');
    assert.deepEqual(payload.data, { test: true }); assert.equal(Number.isFinite(Date.parse(payload.timestamp)), true);
    assert.equal(raw.includes(secret), false);
    res.writeHead(reject ? 503 : 202); res.end('Recebido sem JSON');
  });
  server.listen(0, '127.0.0.1'); await once(server, 'listening');
  const origin = `http://127.0.0.1:${(server.address() as import('node:net').AddressInfo).port}`;
  const hook = { id: 'hook-a', tenant_id: 'empresa-a', name: 'Teste', endpoint: origin + '/hook', enabled: true };
  const binding = { tenantId: hook.tenant_id, webhookId: hook.id, endpoint: hook.endpoint, signingSecret: secret };
  const policy = { allowedOrigins: [origin], privateOrigins: [origin] };
  try {
    const attempt = prepareWebhookTest(hook, [binding]);
    const result = await attempt.send(policy); assert.equal(result.status, 202); assert.equal(result.data, null);
    assert.notEqual(prepareWebhookTest(hook, [binding]).id, attempt.id);
    await assert.rejects(attempt.send({ allowedOrigins: [], privateOrigins: [] }), /Origem não autorizada/); assert.equal(received, 1);
    reject = true; await assert.rejects(prepareWebhookTest(hook, [binding]).send(policy), /HTTP 503/); assert.equal(received, 2);
  } finally { server.closeAllConnections(); await new Promise<void>(resolve => server.close(() => resolve())); }
});
