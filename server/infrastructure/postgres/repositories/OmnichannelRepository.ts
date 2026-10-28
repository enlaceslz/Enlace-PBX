import { nextWorkflow, validateInternalNote, assertWorkflowAccess, type WorkflowActor } from '../../../maia/integrations/ConversationWorkflow.js';
import { OutboundHttpError } from '../../security/OutboundHttp.js';
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
  assignedUserId?: string|null;
  workflowVersion?: number;
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
          notes: typeof row.notes === 'string' ? JSON.parse(row.notes) : (row.notes || []),
          assignedUserId: row.assigned_user_id ?? null, workflowVersion: row.workflow_version ?? 0,
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
          notes: typeof row.notes === 'string' ? JSON.parse(row.notes) : (row.notes || []),
          assignedUserId: row.assigned_user_id ?? null, workflowVersion: row.workflow_version ?? 0,
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
          notes: typeof row.notes === 'string' ? JSON.parse(row.notes) : (row.notes || []),
          assignedUserId: row.assigned_user_id ?? null, workflowVersion: row.workflow_version ?? 0,
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
        await client.query(`UPDATE omnichannel_conversations SET messages = $1, status=CASE WHEN status='closed' THEN 'waiting' ELSE status END,assigned_user_id=CASE WHEN status='closed' THEN NULL ELSE assigned_user_id END,workflow_version=workflow_version+CASE WHEN status='closed' THEN 1 ELSE 0 END, updated_at = CURRENT_TIMESTAMP WHERE id = $2 AND tenant_id = $3`, [JSON.stringify(messages), row.id, ctx.tenantId]);
      } else {
        await client.query(`INSERT INTO omnichannel_conversations
          (id, tenant_id, contact_id, contact_name, contact_phone, channel, status, sentiment, tags, messages)
          VALUES ($1,$2,$3,$3,$3,'whatsapp','waiting','neutral','["whatsapp","meta-api"]',$4)`,
          [`conv-wa-${crypto.randomUUID()}`, ctx.tenantId, message.from, JSON.stringify(messages)]);
      }
    });
  }

  /** Acrescenta somente a saída confirmada, sem substituir entradas recebidas durante o envio. */
  public static async appendAgentMessage(tenantId: string, conversationId: string, message: OmnichannelMessage, actorId?:string): Promise<void> {
    await postgresClient.executeTenantScoped(tenantId,async client=>{
      const result=await client.query('SELECT messages FROM omnichannel_conversations WHERE tenant_id=$1 AND id=$2 FOR UPDATE',[tenantId,conversationId]);
      if(!result.rows[0])throw new Error('Conversa não encontrada para registrar a saída.');
      const value=result.rows[0].messages;
      const messages=typeof value==='string'?JSON.parse(value):value||[];
      const previous=messages.find((entry:any)=>entry.id===message.id);
      if(previous){if(previous.sender!=='agent'||previous.content!==message.content)throw new Error('Identificador de mensagem conflitante.');return;}
      messages.push(message);
      await client.query("UPDATE omnichannel_conversations SET messages=$3,status=CASE WHEN status IN ('waiting','queued','bot_handling') THEN 'active' ELSE status END,assigned_user_id=CASE WHEN status='closed' THEN assigned_user_id ELSE COALESCE(assigned_user_id,$4) END,workflow_version=workflow_version+CASE WHEN status IN ('waiting','queued','bot_handling') OR (status<>'closed' AND assigned_user_id IS NULL AND $4 IS NOT NULL) THEN 1 ELSE 0 END,updated_at=CURRENT_TIMESTAMP WHERE tenant_id=$1 AND id=$2",[tenantId,conversationId,JSON.stringify(messages),actorId??null]);
    });
  }

  public static async reserveHumanReply(tenantId:string,id:string,actor:WorkflowActor){
    await postgresClient.executeTenantScoped(tenantId,async client=>{
      const row=(await client.query('SELECT status,channel,assigned_user_id FROM omnichannel_conversations WHERE tenant_id=$1 AND id=$2 FOR UPDATE',[tenantId,id])).rows[0];
      if(!row)throw new OutboundHttpError('Conversa não encontrada.',404);
      if(row.status==='closed')throw new OutboundHttpError('Conversa encerrada.',409);
      if(row.channel!=='whatsapp')throw new OutboundHttpError('Canal sem envio por WhatsApp.',501);
      assertWorkflowAccess(row.assigned_user_id,actor);
      if(row.assigned_user_id===null||row.status!=='active')await client.query("UPDATE omnichannel_conversations SET status='active',assigned_user_id=COALESCE(assigned_user_id,$3),workflow_version=workflow_version+1,updated_at=CURRENT_TIMESTAMP WHERE tenant_id=$1 AND id=$2",[tenantId,id,actor.id]);
    });
  }

  public static async changeWorkflow(tenantId:string,id:string,status:string,version:number,actor:WorkflowActor){
    await postgresClient.executeTenantScoped(tenantId,async client=>{
      const current=(await client.query('SELECT status,assigned_user_id,workflow_version FROM omnichannel_conversations WHERE tenant_id=$1 AND id=$2 FOR UPDATE',[tenantId,id])).rows[0];
      if(!current)throw new OutboundHttpError('Conversa não encontrada.',404);
      const next=nextWorkflow(current,status,version,actor);
      await client.query('UPDATE omnichannel_conversations SET status=$3,assigned_user_id=$4,workflow_version=workflow_version+1,updated_at=CURRENT_TIMESTAMP WHERE tenant_id=$1 AND id=$2',[tenantId,id,next.status,next.owner]);
    });
    return this.findById(id,tenantId);
  }
  public static async addInternalNote(tenantId:string,id:string,text:string,requestId:string,actor:WorkflowActor){
    const input=validateInternalNote(text,requestId);
    return postgresClient.executeTenantScoped(tenantId,async client=>{
      const row=(await client.query('SELECT notes FROM omnichannel_conversations WHERE tenant_id=$1 AND id=$2 FOR UPDATE',[tenantId,id])).rows[0];
      if(!row)throw new OutboundHttpError('Conversa não encontrada.',404);
      const notes=typeof row.notes==='string'?JSON.parse(row.notes):row.notes||[];
      const previous=notes.find((entry:any)=>entry.id===input.requestId);
      if(previous){if(previous.userId!==actor.id||previous.text!==input.text)throw new OutboundHttpError('Identificador de anotação já utilizado.',409);return previous;}
      if(notes.length>=1000)throw new OutboundHttpError('Limite de anotações desta conversa atingido.',413);
      const note={id:input.requestId,text:input.text,userId:actor.id,agentName:actor.name,createdAt:new Date().toISOString()};
      notes.push(note);
      await client.query('UPDATE omnichannel_conversations SET notes=$3,updated_at=CURRENT_TIMESTAMP WHERE tenant_id=$1 AND id=$2',[tenantId,id,JSON.stringify(notes)]);
      return note;
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
