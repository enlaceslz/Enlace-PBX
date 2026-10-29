import crypto from 'node:crypto';
import type { Request } from 'express';

export type RawBodyRequest = Request & { rawBody?: Buffer };

/** A Meta assina os bytes recebidos, incluindo espaços e quebras de linha. */
export function verifyWhatsAppSignature(body: Buffer | undefined, signature: unknown, secret: string): boolean {
  if (!secret || !body || typeof signature !== 'string' || !/^sha256=[a-f0-9]{64}$/i.test(signature)) return false;
  const expected = crypto.createHmac('sha256', secret).update(body).digest();
  return crypto.timingSafeEqual(Buffer.from(signature.slice(7), 'hex'), expected);
}

/** Somente os callbacks da Meta e probes mínimos dispensam a sessão JWT. */
export function isPublicApiRoute(method: string, route: string): boolean {
  const normalized = route.replace(/\/$/, '').toLowerCase();
  return (method === 'POST' && normalized === '/auth/login') ||
    ((method === 'GET' || method === 'HEAD') && ['/health', '/health/summary'].includes(normalized)) ||
    (['GET', 'HEAD', 'POST'].includes(method) && normalized === '/webhooks/whatsapp');
}

export function isUnavailableProductionOperation(method: string, route: string): boolean {
  if (method === 'GET' || method === 'HEAD') return route.replace(/\/$/, '').toLowerCase() === '/system/backup';
  const path = route.replace(/\/$/, '').toLowerCase();
  return path.startsWith('/network/') && !/^\/network\/nodes\/[^/]+\/[^/]+\/ping$/.test(path) ||
    path.startsWith('/security/fail2ban/') ||
    /^\/infra\/(validate-(ssl|webphone|pwa|whatsapp)|vapid\/generate|send-test-push)$/.test(path) ||
    /^\/crm\/providers\/[^/]+\/(connect|disconnect)$/.test(path) ||
    ['/system/restore', '/system/snapshots/rollback', '/trunks/rollback'].includes(path);
}
