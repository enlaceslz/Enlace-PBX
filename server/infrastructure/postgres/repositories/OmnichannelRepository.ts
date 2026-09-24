import { postgresClient } from '../client';

export interface OmnichannelMessage {
  id: string;
  sender: 'contact' | 'agent' | 'bot' | 'user';
  senderName?: string;
  content?: string;
  text?: string;
  timestamp: string;
  type?: 'text' | 'image' | 'audio' | 'document';
}

export interface OmnichannelConversation {
  id: string;
  tenantId: string;
  contactId: string;
  contactName: string;
  contactPhone: string;
  companyName?: string;
  channel: 'whatsapp' | 'webchat' | 'voice';
  status: 'active' | 'waiting' | 'closed' | 'bot_handling' | 'queued';
  sentiment: 'positive' | 'neutral' | 'negative';
  tags: string[];
  createdAt: string;
  messages: OmnichannelMessage[];
  notes?: any[];
}

export class OmnichannelRepository {
  public static async listConversations(tenantId: string): Promise<OmnichannelConversation[]> {
    try {
      const res = await postgresClient.query(
        'SELECT * FROM omnichannel_conversations WHERE tenant_id = $1 ORDER BY updated_at DESC',
        [tenantId]
      );
      return res.rows.map(row => ({
        id: row.id,
        tenantId: row.tenant_id,
        contactId: row.contact_id,
        contactName: row.contact_name,
        contactPhone: row.contact_phone,
        companyName: row.company_name || undefined,
        channel: row.channel || 'whatsapp',
        status: row.status || 'active',
        sentiment: row.sentiment || 'neutral',
        tags: typeof row.tags === 'string' ? JSON.parse(row.tags) : (row.tags || []),
        messages: typeof row.messages === 'string' ? JSON.parse(row.messages) : (row.messages || []),
        createdAt: row.created_at ? row.created_at.toISOString() : new Date().toISOString(),
      }));
    } catch (err: any) {
      console.error('[OmnichannelRepository.listConversations] Erro no PostgreSQL:', err?.message || err);
      throw err;
    }
  }

  public static async findById(id: string, tenantId?: string): Promise<OmnichannelConversation | null> {
    try {
      let query = 'SELECT * FROM omnichannel_conversations WHERE id = $1';
      const params: any[] = [id];
      if (tenantId) {
        query += ' AND tenant_id = $2';
        params.push(tenantId);
      }
      const res = await postgresClient.query(query, params);
      if (res.rows.length > 0) {
        const row = res.rows[0];
        return {
          id: row.id,
          tenantId: row.tenant_id,
          contactId: row.contact_id,
          contactName: row.contact_name,
          contactPhone: row.contact_phone,
          companyName: row.company_name || undefined,
          channel: row.channel || 'whatsapp',
          status: row.status || 'active',
          sentiment: row.sentiment || 'neutral',
          tags: typeof row.tags === 'string' ? JSON.parse(row.tags) : (row.tags || []),
          messages: typeof row.messages === 'string' ? JSON.parse(row.messages) : (row.messages || []),
          createdAt: row.created_at ? row.created_at.toISOString() : new Date().toISOString(),
        };
      }
      return null;
    } catch (err: any) {
      console.error('[OmnichannelRepository.findById] Erro no PostgreSQL:', err?.message || err);
      throw err;
    }
  }

  public static async save(conv: OmnichannelConversation): Promise<OmnichannelConversation> {
    try {
      await postgresClient.query(
        `INSERT INTO omnichannel_conversations (id, tenant_id, contact_id, contact_name, contact_phone, company_name, channel, status, sentiment, tags, messages, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
         ON CONFLICT (id) DO UPDATE SET
           status = EXCLUDED.status,
           sentiment = EXCLUDED.sentiment,
           tags = EXCLUDED.tags,
           messages = EXCLUDED.messages,
           updated_at = CURRENT_TIMESTAMP`,
        [
          conv.id,
          conv.tenantId,
          conv.contactId,
          conv.contactName,
          conv.contactPhone,
          conv.companyName || null,
          conv.channel || 'whatsapp',
          conv.status || 'active',
          conv.sentiment || 'neutral',
          JSON.stringify(conv.tags || []),
          JSON.stringify(conv.messages || []),
          conv.createdAt ? new Date(conv.createdAt) : new Date()
        ]
      );
      return conv;
    } catch (err: any) {
      console.error('[OmnichannelRepository.save] Erro no PostgreSQL:', err?.message || err);
      throw err;
    }
  }
}
