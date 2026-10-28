import crypto from 'node:crypto';
import { postgresClient } from '../client.js';
import { toSafeIsoStringOrNow } from '../dateUtils.js';
import { SystemRepository } from './SystemRepository.js';
import { TenantContext } from '../../auth/tenantContext.js';

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
  public static async listConversations(contextOrTenant: TenantContext | string): Promise<OmnichannelConversation[]> {
    return postgresClient.executeTenantScoped(contextOrTenant, async (client, ctx) => {
      try {
        const res = await client.query(
          'SELECT * FROM omnichannel_conversations WHERE tenant_id = $1 ORDER BY updated_at DESC',
          [ctx.tenantId]
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
          createdAt: toSafeIsoStringOrNow(row.created_at),
        }));
      } catch (err: any) {
        console.error('[OmnichannelRepository.listConversations] Erro no PostgreSQL sob transação RLS:', err?.message || err);
        throw err;
      }
    });
  }

  public static async findById(id: string, contextOrTenant?: TenantContext | string): Promise<OmnichannelConversation | null> {
    if (!contextOrTenant || (typeof contextOrTenant === 'string' && contextOrTenant.trim() === '')) {
      // Regra Fail-Closed CS-148/CS-199: Tenant ausente produz recusa estrita de recurso
      return null;
    }
    return postgresClient.executeTenantScoped(contextOrTenant, async (client, ctx) => {
      try {
        const res = await client.query(
          'SELECT * FROM omnichannel_conversations WHERE id = $1 AND tenant_id = $2',
          [id, ctx.tenantId]
        );
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
            createdAt: toSafeIsoStringOrNow(row.created_at),
          };
        }
        return null;
      } catch (err: any) {
        console.error('[OmnichannelRepository.findById] Erro no PostgreSQL sob transação RLS:', err?.message || err);
        throw err;
      }
    });
  }

  public static async findAnyByIdForSuperAdmin(id: string): Promise<OmnichannelConversation | null> {
    return postgresClient.executeGlobalScoped(async (client) => {
      try {
        const res = await client.query('SELECT * FROM omnichannel_conversations WHERE id = $1', [id]);
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
            createdAt: toSafeIsoStringOrNow(row.created_at),
          };
        }
        return null;
      } catch (err: any) {
        console.error('[OmnichannelRepository.findAnyByIdForSuperAdmin] Erro no PostgreSQL sob transação RLS:', err?.message || err);
        throw err;
      }
    });
  }

  /**
   * Resolução Fail-Closed de Vínculo Estrito Meta WhatsApp:
   * phone_number_id -> integração ativa -> tenantId
   * Nunca permite mensagens órfãs ou roteamento para 'tenant-default'.
   */
  public static async findIntegrationByPhoneNumberId(
    phoneNumberId: string
  ): Promise<{ tenantId: string; phoneNumberId: string; accessToken?: string } | null> {
    if (!phoneNumberId || phoneNumberId.trim() === '') {
      return null;
    }
    const cleanId = phoneNumberId.trim();

    return postgresClient.executeGlobalScoped(async (client) => {
      const result = await client.query(`SELECT value FROM system_settings
        WHERE (key = 'whatsapp_config' OR key LIKE 'whatsapp_config:%')
          AND value->>'phoneNumberId' = $1 AND value->>'isActive' = 'true'`, [cleanId]);
      const mappings = result.rows.map(row => typeof row.value === 'string' ? JSON.parse(row.value) : row.value);
      const tenants = new Set(mappings.map(config => config.tenantId).filter(Boolean));
      if (tenants.size !== 1) return null;
      const config = mappings[0];
      if (typeof config?.tenantId === 'string' && config.tenantId.trim()) {
        return { tenantId: config.tenantId.trim(), phoneNumberId: cleanId };
      }

      return null;
    });
  }

  /** Persiste a entrada antes do ACK; retries da Meta não duplicam mensagens. */
  public static async receiveWhatsappMessage(tenantId: string, message: { id: string; from: string; content: string; timestamp: string }): Promise<void> {
    await postgresClient.executeTenantScoped(tenantId, async (client, ctx) => {
      await client.query('SELECT pg_advisory_xact_lock(hashtext($1))', [`whatsapp:${ctx.tenantId}:${message.from}`]);
      const result = await client.query(`SELECT id, messages FROM omnichannel_conversations
        WHERE tenant_id = $1 AND contact_id = $2 AND channel = 'whatsapp' ORDER BY created_at DESC LIMIT 1 FOR UPDATE`, [ctx.tenantId, message.from]);
      const row = result.rows[0];
      const messages = row ? (typeof row.messages === 'string' ? JSON.parse(row.messages) : row.messages || []) : [];
      if (messages.some((entry: any) => entry.id === message.id)) return;
      messages.push({ id: message.id, sender: 'contact', senderName: message.from, content: message.content, type: 'text', timestamp: message.timestamp });
      if (row) {
        await client.query('UPDATE omnichannel_conversations SET messages = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 AND tenant_id = $3', [JSON.stringify(messages), row.id, ctx.tenantId]);
      } else {
        await client.query(`INSERT INTO omnichannel_conversations
          (id, tenant_id, contact_id, contact_name, contact_phone, channel, status, sentiment, tags, messages)
          VALUES ($1,$2,$3,$3,$3,'whatsapp','waiting','neutral','["whatsapp","meta-api"]',$4)`,
          [`conv-wa-${crypto.randomUUID()}`, ctx.tenantId, message.from, JSON.stringify(messages)]);
      }
    });
  }

  /** Acrescenta somente a saída confirmada, sem substituir entradas recebidas durante o envio. */
  public static async appendAgentMessage(tenantId: string, conversationId: string, message: OmnichannelMessage): Promise<void> {
    await postgresClient.executeTenantScoped(tenantId,async client=>{
      const result=await client.query('SELECT messages FROM omnichannel_conversations WHERE tenant_id=$1 AND id=$2 FOR UPDATE',[tenantId,conversationId]);
      if(!result.rows[0])throw new Error('Conversa não encontrada para registrar a saída.');
      const value=result.rows[0].messages;
      const messages=typeof value==='string'?JSON.parse(value):value||[];
      const previous=messages.find((entry:any)=>entry.id===message.id);
      if(previous){if(previous.sender!=='agent'||previous.content!==message.content)throw new Error('Identificador de mensagem conflitante.');return;}
      messages.push(message);
      await client.query("UPDATE omnichannel_conversations SET messages=$3,status=CASE WHEN status IN ('waiting','queued','bot_handling') THEN 'active' ELSE status END,updated_at=CURRENT_TIMESTAMP WHERE tenant_id=$1 AND id=$2",[tenantId,conversationId,JSON.stringify(messages)]);
    });
  }

  public static async save(conv: OmnichannelConversation, contextOrTenant?: TenantContext | string): Promise<OmnichannelConversation> {
    const target = contextOrTenant || conv.tenantId;
    return postgresClient.executeTenantScoped(target, async (client, ctx) => {
      try {
        await client.query(
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
            ctx.tenantId,
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
        console.error('[OmnichannelRepository.save] Erro no PostgreSQL sob transação RLS:', err?.message || err);
        throw err;
      }
    });
  }
}
