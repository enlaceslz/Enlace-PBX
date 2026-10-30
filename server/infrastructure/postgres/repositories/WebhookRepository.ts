import { randomUUID } from 'node:crypto';
import { postgresClient } from '../client.js';
export interface OutboundWebhook { id: string; tenant_id: string; name: string; endpoint: string; enabled: boolean }
export class WebhookRepository {
  static async list(tenantId: string) {
    return postgresClient.executeTenantScoped(tenantId, async client => (await client.query(
      'SELECT id, name, endpoint, enabled, created_at FROM outbound_webhooks WHERE tenant_id=$1 ORDER BY created_at DESC LIMIT 100', [tenantId])).rows);
  }
  static async find(tenantId: string, id: string): Promise<OutboundWebhook | undefined> {
    return postgresClient.executeTenantScoped(tenantId, async client => (await client.query(
      'SELECT id, tenant_id, name, endpoint, enabled FROM outbound_webhooks WHERE tenant_id=$1 AND id=$2', [tenantId, id])).rows[0]);
  }
  static async create(tenantId: string, input: { name: string; endpoint: string; enabled: boolean }) {
    return postgresClient.executeTenantScoped(tenantId, async client => (await client.query(
      'INSERT INTO outbound_webhooks(id,tenant_id,name,endpoint,enabled) VALUES($1,$2,$3,$4,$5) RETURNING id,name,endpoint,enabled,created_at',
      [randomUUID(), tenantId, input.name, input.endpoint, input.enabled])).rows[0]);
  }
  static async update(tenantId: string, id: string, input: { name: string; endpoint: string; enabled: boolean }) {
    return postgresClient.executeTenantScoped(tenantId, async client => (await client.query(
      'UPDATE outbound_webhooks SET name=$3,endpoint=$4,enabled=$5 WHERE tenant_id=$1 AND id=$2 RETURNING id,name,endpoint,enabled,created_at',
      [tenantId, id, input.name, input.endpoint, input.enabled])).rows[0]);
  }
  static async begin(tenantId: string, webhookId: string, id: string) {
    await postgresClient.executeTenantScoped(tenantId, async client => { await client.query(
      "INSERT INTO webhook_deliveries(id,tenant_id,webhook_id,status) VALUES($1,$2,$3,'PENDING')", [id, tenantId, webhookId]); });
  }
  static async finish(tenantId: string, id: string, status: 'ACKNOWLEDGED' | 'UNKNOWN', httpStatus?: number, durationMs?: number, error?: string) {
    return postgresClient.executeTenantScoped(tenantId, async client => (await client.query(
      "UPDATE webhook_deliveries SET status=$3,http_status=$4,duration_ms=$5,error_message=$6,completed_at=CURRENT_TIMESTAMP WHERE tenant_id=$1 AND id=$2 AND status='PENDING' RETURNING *",
      [tenantId, id, status, httpStatus ?? null, durationMs ?? null, error ?? null])).rows[0]);
  }
  static async deliveries(tenantId: string, webhookId: string) {
    return postgresClient.executeTenantScoped(tenantId, async client => (await client.query(
      'SELECT id,status,http_status,duration_ms,error_message,created_at,completed_at FROM webhook_deliveries WHERE tenant_id=$1 AND webhook_id=$2 ORDER BY created_at DESC LIMIT 25', [tenantId, webhookId])).rows);
  }
}
