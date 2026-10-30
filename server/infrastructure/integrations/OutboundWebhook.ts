import { createHmac, randomUUID } from 'node:crypto';
import { outboundJson, OutboundHttpError, type OutboundPolicy } from '../security/OutboundHttp.js';
import type { OutboundWebhook } from '../postgres/repositories/WebhookRepository.js';
export interface WebhookBinding { tenantId: string; webhookId: string; endpoint: string; signingSecret: string }
export function validateWebhook(input: any): { name: string; endpoint: string; enabled: boolean } {
  if (!input || typeof input.name !== 'string' || !input.name.trim() || input.name.length > 120 || typeof input.endpoint !== 'string' || input.endpoint.length > 2048 || typeof input.enabled !== 'boolean') throw new OutboundHttpError('Nome, URL ou estado do webhook inválidos.', 422);
  let url: URL;
  try { url = new URL(input.endpoint); } catch { throw new OutboundHttpError('Webhook exige URL absoluta.', 422); }
  if (!['https:', 'http:'].includes(url.protocol) || url.username || url.password || url.hash || url.search) throw new OutboundHttpError('URL do webhook não pode conter credenciais, query ou fragmento.', 422);
  return { name: input.name.trim(), endpoint: input.endpoint, enabled: input.enabled };
}
function bindings(): WebhookBinding[] {
  try {
    const raw = process.env.WEBHOOK_BINDINGS_JSON || '[]';
    if (raw.length > 65536) throw new Error();
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length > 100) throw new Error();
    return parsed;
  } catch { throw new OutboundHttpError('Configuração administrativa de webhooks inválida.', 503); }
}
export function prepareWebhookTest(hook: OutboundWebhook, configured = bindings()) {
  if (!hook.enabled) throw new OutboundHttpError('Webhook desabilitado.', 409);
  validateWebhook(hook);
  const matches = configured.filter(value => value?.tenantId === hook.tenant_id && value?.webhookId === hook.id);
  if (matches.length !== 1 || matches[0].endpoint !== hook.endpoint) throw new OutboundHttpError('Webhook sem vínculo administrativo para esta empresa e URL.', 403);
  const secret = matches[0].signingSecret;
  if (typeof secret !== 'string' || secret.length < 32 || secret.length > 1024) throw new OutboundHttpError('Segredo de assinatura do webhook inválido.', 503);
  const id = randomUUID();
  const payload = { id, event: 'enlace.webhook.test', tenantId: hook.tenant_id, webhookId: hook.id, timestamp: new Date().toISOString(), data: { test: true } };
  const signature = 'sha256=' + createHmac('sha256', secret).update(JSON.stringify(payload)).digest('hex');
  return { id, send: (policy?: OutboundPolicy) => outboundJson(hook.endpoint, { method: 'POST', body: payload, responseMode: 'discard', policy,
    headers: { 'X-Enlace-Signature-256': signature, 'X-Enlace-Request-Id': id } }) };
}
