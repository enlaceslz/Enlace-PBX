import crypto from 'node:crypto';
import { postgresClient } from '../client.js';

export interface TicketInput { requestId: string; callerNumber: string; category: string; description: string; urgency: string }
export class TicketRepository {
  public static async create(tenantId: string, input: TicketInput) {
    if (!input.requestId || input.requestId.length > 128 || typeof input.description !== 'string' || !input.description.trim() || input.description.length > 8000 ||
        !['baixa', 'media', 'alta'].includes(input.urgency) || !input.category || input.category.length > 64 || !input.callerNumber || input.callerNumber.length > 64) {
      throw new Error('Dados do chamado inválidos.');
    }
    return postgresClient.executeTenantScoped(tenantId, async (client, context) => {
      const id = crypto.randomUUID();
      const protocol = `ENL-${crypto.randomBytes(12).toString('hex').toUpperCase()}`;
      const inserted = await client.query(`INSERT INTO support_tickets
        (id, tenant_id, request_id, protocol, caller_number, category, description, urgency)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8) ON CONFLICT (tenant_id,request_id) DO NOTHING RETURNING *`,
        [id, context.tenantId, input.requestId, protocol, input.callerNumber, input.category, input.description.trim(), input.urgency]);
      if (inserted.rows[0]) return inserted.rows[0];
      const existing = await client.query('SELECT * FROM support_tickets WHERE tenant_id=$1 AND request_id=$2', [context.tenantId, input.requestId]);
      if (!existing.rows[0]) throw new Error('Chamado não confirmado na persistência.');
      return existing.rows[0];
    });
  }
  public static async list(tenantId: string) {
    return postgresClient.executeTenantScoped(tenantId, async (client, context) => {
      const result = await client.query('SELECT id, protocol, caller_number, category, description, urgency, status, created_at FROM support_tickets WHERE tenant_id=$1 ORDER BY created_at DESC LIMIT 100', [context.tenantId]);
      return result.rows;
    });
  }
}
