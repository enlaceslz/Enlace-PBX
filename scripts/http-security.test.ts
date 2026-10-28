import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import test from 'node:test';
import { isPublicApiRoute, isUnavailableProductionOperation, verifyWhatsAppSignature } from '../server/infrastructure/security/httpSecurity.js';

test('webhook valida os bytes originais e rejeita adulteração, segredo ausente e assinatura malformada', () => {
  const body = Buffer.from('{ "object": "whatsapp_business_account" }\n');
  const secret = crypto.randomBytes(32).toString('hex');
  const signature = 'sha256=' + crypto.createHmac('sha256', secret).update(body).digest('hex');
  assert.equal(verifyWhatsAppSignature(body, signature, secret), true);
  assert.equal(verifyWhatsAppSignature(Buffer.from(JSON.stringify(JSON.parse(body.toString()))), signature, secret), false);
  for (const invalid of ['', 'sha256=xx', 'sha256=' + 'z'.repeat(64), [], undefined]) {
    assert.equal(verifyWhatsAppSignature(body, invalid, secret), false);
  }
  assert.equal(verifyWhatsAppSignature(undefined, signature, secret), false);
  assert.equal(verifyWhatsAppSignature(body, signature, ''), false);
});

test('operações simuladas e recuperação incompleta ficam indisponíveis em produção', () => {
  for (const [method, path] of [['POST', '/security/fail2ban/ban'], ['POST', '/network/wireguard/toggle'], ['GET', '/system/backup'], ['POST', '/system/restore'], ['POST', '/infra/send-test-push'], ['POST', '/omnichannel/ai-suggest']]) {
    assert.equal(isUnavailableProductionOperation(method, path), true);
  }
  assert.equal(isUnavailableProductionOperation('GET', '/network/wireguard'), false);
  assert.equal(isUnavailableProductionOperation('POST', '/network/nodes/wireguard/node-1/ping'), false);
  assert.equal(isUnavailableProductionOperation('POST', '/extensions'), false);
  assert.equal(isUnavailableProductionOperation('POST', '/ai/quality-supervisor/evaluate'), false);
  assert.equal(isUnavailableProductionOperation('POST', '/ai/entity-extraction/test'), false);
  assert.equal(isUnavailableProductionOperation('POST', '/webhooks/test'), false);
  assert.equal(isUnavailableProductionOperation('POST', '/ai/tools/tool-1/test'), false);
});

test('somente callbacks e probes públicos específicos dispensam JWT', () => {
  for (const path of ['/webhooks', '/webhooks/test', '/webhooks/other', '/health/run-diagnostic', '/health/secrets', '/users', '/events/asterisk']) {
    for (const method of ['GET', 'POST', 'DELETE', 'PUT']) assert.equal(isPublicApiRoute(method, path), false, `${method} ${path}`);
  }
  assert.equal(isPublicApiRoute('POST', '/webhooks/whatsapp'), true);
  assert.equal(isPublicApiRoute('GET', '/WEBHOOKS/WHATSAPP/'), true);
  assert.equal(isPublicApiRoute('DELETE', '/webhooks/whatsapp'), false);
  assert.equal(isPublicApiRoute('POST', '/health'), false);
  assert.equal(isPublicApiRoute('GET', '/health'), true);
});
