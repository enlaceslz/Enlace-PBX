import crypto from 'node:crypto';
import { OutboundHttpError } from '../../infrastructure/security/OutboundHttp.js';
import { postgresClient } from '../../infrastructure/postgres/client.js';
import { toSafeIsoString } from '../../infrastructure/postgres/dateUtils.js';
import { TenantContext } from '../../infrastructure/auth/tenantContext.js';
import {
  MaiaSession,
  MaiaSessionTurn,
  MaiaToolExecution,
  MaiaSessionEvent,
} from '../types.js';

export class MaiaSessionRepository {
  public static async createSession(session: MaiaSession, contextOrTenant?: TenantContext | string): Promise<MaiaSession> {
    const target = contextOrTenant || session.tenantId;
    return postgresClient.executeTenantScoped(target, async (client, ctx) => {
      const metaJson = JSON.stringify(session.meta || {});
      await client.query(
        `INSERT INTO ai_sessions (
          id, tenant_id, agent_id, asterisk_channel_id, asterisk_unique_id, linked_id,
          caller_number, provider, model, routing_profile, status, started_at, last_activity_at,
          ended_at, duration_seconds, user_turns, tool_calls, tokens_input, tokens_output,
          csat_score, sentiment, summary, transfer_reason, transfer_destination, meta
        ) VALUES (
          $1, $2, $3, $4, $5, $6,
          $7, $8, $9, $10, $11, $12, $13,
          $14, $15, $16, $17, $18, $19,
          $20, $21, $22, $23, $24, $25
        ) ON CONFLICT (id) DO UPDATE SET
          last_activity_at = EXCLUDED.last_activity_at,
          ended_at = EXCLUDED.ended_at,
          status = EXCLUDED.status,
          duration_seconds = EXCLUDED.duration_seconds,
          user_turns = EXCLUDED.user_turns,
          tool_calls = EXCLUDED.tool_calls,
          tokens_input = EXCLUDED.tokens_input,
          tokens_output = EXCLUDED.tokens_output,
          csat_score = EXCLUDED.csat_score,
          sentiment = EXCLUDED.sentiment,
          summary = EXCLUDED.summary,
          transfer_reason = EXCLUDED.transfer_reason,
          transfer_destination = EXCLUDED.transfer_destination,
          meta = EXCLUDED.meta`,
        [
          session.id,
          ctx.tenantId,
          session.agentId,
          session.asteriskChannelId || null,
          session.asteriskUniqueId || null,
          session.linkedId || null,
          session.callerNumber,
          session.provider,
          session.model,
          session.routingProfile,
          session.status,
          session.startedAt ? new Date(session.startedAt) : new Date(),
          session.lastActivityAt ? new Date(session.lastActivityAt) : new Date(),
          session.endedAt ? new Date(session.endedAt) : null,
          session.durationSeconds || 0,
          session.userTurns || 0,
          session.toolCalls || 0,
          session.tokensInput || 0,
          session.tokensOutput || 0,
          session.csatScore || null,
          session.sentiment || null,
          session.summary || null,
          session.transferReason || null,
          session.transferDestination || null,
          metaJson,
        ]
      );
      return session;
    });
  }

  public static async updateSession(session: MaiaSession, contextOrTenant?: TenantContext | string): Promise<MaiaSession> {
    return this.createSession(session, contextOrTenant);
  }

  public static async endPreview(id:string,tenantId:string):Promise<MaiaSession> {
    return postgresClient.executeTenantScoped(tenantId,async client=>{
      const result=await client.query('SELECT * FROM ai_sessions WHERE id=$1 AND tenant_id=$2 FOR UPDATE',[id,tenantId]);
      const row=result.rows[0];
      if(!row)throw new OutboundHttpError('Sessão não encontrada.',404);
      if(row.active_turn_id)throw new OutboundHttpError('Aguarde o turno em processamento antes de encerrar a prévia.',409);
      if(row.asterisk_channel_id || row.asterisk_unique_id || row.linked_id)throw new OutboundHttpError('Sessão telefônica exige controle pelo host.',409);
      if(row.status==='completed')return this.rowToSession(row);
      const updated=await client.query(`UPDATE ai_sessions SET status='completed',ended_at=CURRENT_TIMESTAMP,last_activity_at=CURRENT_TIMESTAMP,
        duration_seconds=GREATEST(0,FLOOR(EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP-started_at)))) WHERE id=$1 AND tenant_id=$2 RETURNING *`,[id,tenantId]);
      await client.query(`INSERT INTO ai_session_events(id,session_id,tenant_id,event_type,from_status,to_status,payload)
        VALUES($1,$2,$3,'PREVIEW_ENDED',$4,'completed','{}')`,[crypto.randomUUID(),id,tenantId,row.status]);
      return this.rowToSession(updated.rows[0]);
    });
  }

  public static async claimTurn(id:string,tenantId:string,attemptId:string):Promise<MaiaSession> {
    return postgresClient.executeTenantScoped(tenantId,async client=>{
      const active=await client.query(`SELECT a.id,a.max_session_minutes FROM ai_agents a JOIN ai_sessions s ON s.agent_id=a.id AND s.tenant_id=a.tenant_id
        WHERE s.id=$1 AND s.tenant_id=$2 AND a.is_active=TRUE AND a.max_session_minutes BETWEEN 1 AND 240 FOR SHARE OF a`,[id,tenantId]);
      if(!active.rows.length)throw new OutboundHttpError('Sessão sem agente ativo ou limite válido nesta empresa.',409);
      const result=await client.query(`UPDATE ai_sessions SET active_turn_id=$3,status='processing',last_activity_at=CURRENT_TIMESTAMP
        WHERE id=$1 AND tenant_id=$2 AND active_turn_id IS NULL AND status NOT IN ('completed','failed')
          AND started_at<=clock_timestamp() AND started_at+make_interval(mins=>$4::int)>clock_timestamp() RETURNING *`,[id,tenantId,attemptId,active.rows[0].max_session_minutes]);
      if(!result.rows.length)throw new OutboundHttpError('Sessão indisponível, expirada, encerrada ou com turno em processamento.',409);
      return this.rowToSession(result.rows[0]);
    });
  }

  public static async releaseTurn(id:string,tenantId:string,attemptId:string):Promise<void> {
    await postgresClient.executeTenantScoped(tenantId,client=>client.query(`UPDATE ai_sessions SET active_turn_id=NULL,
      status=CASE WHEN status='processing' THEN 'listening' ELSE status END
      WHERE id=$1 AND tenant_id=$2 AND active_turn_id=$3`,[id,tenantId,attemptId]));
  }

  public static async recentDialogue(id:string,tenantId:string) {
    return postgresClient.executeTenantScoped(tenantId,async client=>{
      const result=await client.query(`SELECT role,content FROM (SELECT role,content,turn_number,created_at,id FROM ai_session_turns
        WHERE session_id=$1 AND tenant_id=$2 AND role IN ('user','assistant') ORDER BY turn_number DESC,created_at DESC,id DESC LIMIT 6) recent
        ORDER BY turn_number ASC,created_at ASC,id ASC`,[id,tenantId]);
      return result.rows;
    });
  }

  public static async commitExchange(session:MaiaSession,attemptId:string,userMessage:string,assistant:MaiaSessionTurn):Promise<void> {
    if(!userMessage.trim() || userMessage.length>8000 || assistant.role!=='assistant' || assistant.sessionId!==session.id || assistant.tenantId!==session.tenantId || typeof assistant.content!=='string' || assistant.content.length>32000)
      throw new OutboundHttpError('Turno inválido para persistência.',400);
    await postgresClient.executeTenantScoped(session.tenantId,async client=>{
      const current=await client.query('SELECT * FROM ai_sessions WHERE id=$1 AND tenant_id=$2 FOR UPDATE',[session.id,session.tenantId]);
      const row=current.rows[0];
      if(!row || row.active_turn_id!==attemptId || Number(row.user_turns)+1!==session.userTurns || row.status!=='processing')
        throw new OutboundHttpError('O turno perdeu a reserva da sessão; resultado não confirmado.',409);
      const number=session.userTurns*2;
      const now=new Date();
      await client.query(`INSERT INTO ai_session_turns(id,session_id,tenant_id,turn_number,role,content,created_at)
        VALUES($1,$2,$3,$4,'user',$5,$6)`,['turn-'+crypto.randomUUID(),session.id,session.tenantId,number-1,userMessage,now]);
      await client.query(`INSERT INTO ai_session_turns(id,session_id,tenant_id,turn_number,role,content,audio_base64,latency_ms,tokens_input,tokens_output,provider,model,created_at)
        VALUES($1,$2,$3,$4,'assistant',$5,$6,$7,$8,$9,$10,$11,$12)`,[assistant.id,session.id,session.tenantId,number,assistant.content,assistant.audioBase64||null,assistant.latencyMs,assistant.tokensInput,assistant.tokensOutput,assistant.provider||null,assistant.model||null,now]);
      await client.query(`UPDATE ai_sessions SET status=$4,last_activity_at=$5,ended_at=$6,duration_seconds=$7,user_turns=$8,
        tool_calls=$9,tokens_input=$10,tokens_output=$11,provider=$12,model=$13,transfer_reason=$14,transfer_destination=$15,active_turn_id=NULL
        WHERE id=$1 AND tenant_id=$2 AND active_turn_id=$3`,[session.id,session.tenantId,attemptId,session.status,session.lastActivityAt,session.endedAt||null,session.durationSeconds,session.userTurns,session.toolCalls,session.tokensInput,session.tokensOutput,session.provider,session.model,session.transferReason||null,session.transferDestination||null]);
    });
  }

  public static async findById(id: string, contextOrTenant?: TenantContext | string): Promise<MaiaSession | null> {
    if (!contextOrTenant || (typeof contextOrTenant === 'string' && contextOrTenant.trim() === '')) {
      // Regra Fail-Closed CS-148/CS-199/CS-227: Tenant ausente produz recusa estrita de recurso
      return null;
    }
    return postgresClient.executeTenantScoped(contextOrTenant, async (client, ctx) => {
      const res = await client.query(
        'SELECT * FROM ai_sessions WHERE id = $1 AND tenant_id = $2',
        [id, ctx.tenantId]
      );
      if (res.rows.length === 0) return null;
      return this.rowToSession(res.rows[0]);
    });
  }

  public static async findAnyByIdForSuperAdmin(id: string): Promise<MaiaSession | null> {
    return postgresClient.executeGlobalScoped(async (client) => {
      const res = await client.query('SELECT * FROM ai_sessions WHERE id = $1', [id]);
      if (res.rows.length === 0) return null;
      return this.rowToSession(res.rows[0]);
    });
  }

  public static async findByChannelId(channelId: string, contextOrTenant?: TenantContext | string): Promise<MaiaSession | null> {
    if (!contextOrTenant || (typeof contextOrTenant === 'string' && contextOrTenant.trim() === '')) {
      return null;
    }
    return postgresClient.executeTenantScoped(contextOrTenant, async (client, ctx) => {
      const res = await client.query(
        'SELECT * FROM ai_sessions WHERE asterisk_channel_id = $1 AND tenant_id = $2 ORDER BY started_at DESC LIMIT 1',
        [channelId, ctx.tenantId]
      );
      if (res.rows.length === 0) return null;
      return this.rowToSession(res.rows[0]);
    });
  }

  public static async listByTenant(contextOrTenant: TenantContext | string, limit: number = 50): Promise<MaiaSession[]> {
    return postgresClient.executeTenantScoped(contextOrTenant, async (client, ctx) => {
      const res = await client.query(
        'SELECT * FROM ai_sessions WHERE tenant_id = $1 ORDER BY started_at DESC LIMIT $2',
        [ctx.tenantId, limit]
      );
      return res.rows.map((row) => this.rowToSession(row));
    });
  }

  public static async listAllGlobalForSuperAdmin(limit: number = 50): Promise<MaiaSession[]> {
    return this.listAll(limit);
  }

  public static async listAll(limit: number = 50): Promise<MaiaSession[]> {
    return postgresClient.executeGlobalScoped(async (client) => {
      const res = await client.query(
        'SELECT * FROM ai_sessions ORDER BY started_at DESC LIMIT $1',
        [limit]
      );
      return res.rows.map((row) => this.rowToSession(row));
    });
  }

  public static async addTurn(turn: MaiaSessionTurn, contextOrTenant?: TenantContext | string): Promise<MaiaSessionTurn> {
    const target = contextOrTenant || turn.tenantId;
    return postgresClient.executeTenantScoped(target, async (client, ctx) => {
      await client.query(
        `INSERT INTO ai_session_turns (
          id, session_id, tenant_id, turn_number, role, content,
          audio_base64, latency_ms, tokens_input, tokens_output, provider, model, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
        [
          turn.id,
          turn.sessionId,
          ctx.tenantId,
          turn.turnNumber,
          turn.role,
          turn.content,
          turn.audioBase64 || null,
          turn.latencyMs || 0,
          turn.tokensInput || 0,
          turn.tokensOutput || 0,
          turn.provider || null,
          turn.model || null,
          turn.createdAt ? new Date(turn.createdAt) : new Date(),
        ]
      );
      return turn;
    });
  }

  public static async listTurns(sessionId: string, contextOrTenant?: TenantContext | string): Promise<MaiaSessionTurn[]> {
    const callback = async (client: any) => {
      const res = await client.query(
        'SELECT * FROM ai_session_turns WHERE session_id = $1 ORDER BY turn_number ASC',
        [sessionId]
      );
      return res.rows.map((r: any) => ({
        id: r.id,
        sessionId: r.session_id,
        tenantId: r.tenant_id,
        turnNumber: r.turn_number,
        role: r.role,
        content: r.content,
        audioBase64: r.audio_base64 || undefined,
        latencyMs: r.latency_ms || 0,
        tokensInput: r.tokens_input || 0,
        tokensOutput: r.tokens_output || 0,
        provider: r.provider || undefined,
        model: r.model || undefined,
        createdAt: toSafeIsoString(r.created_at),
      }));
    };

    if (contextOrTenant) {
      return postgresClient.executeTenantScoped(contextOrTenant, (client) => callback(client));
    }
    return postgresClient.executeGlobalScoped((client) => callback(client));
  }

  public static async addToolExecution(exec: MaiaToolExecution, contextOrTenant?: TenantContext | string): Promise<MaiaToolExecution> {
    const target = contextOrTenant || exec.tenantId;
    return postgresClient.executeTenantScoped(target, async (client, ctx) => {
      await client.query(
        `INSERT INTO ai_tool_executions (
          id, session_id, turn_id, tenant_id, user_id, agent_id,
          provider, model, tool_id, tool_name, risk, policy_decision,
          confirmation_required, confirmation_received, confirmation_token,
          arguments_hash, arguments_masked, result_status, result_data,
          error_message, duration_ms, correlation_id, created_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6,
          $7, $8, $9, $10, $11, $12,
          $13, $14, $15,
          $16, $17, $18, $19,
          $20, $21, $22, $23
        )`,
        [
          exec.id,
          exec.sessionId || null,
          exec.turnId || null,
          ctx.tenantId,
          exec.userId || 'ai-gateway',
          exec.agentId || null,
          exec.provider || 'gemini',
          exec.model || 'gemini-flash-latest',
          exec.toolId || null,
          exec.toolName,
          exec.risk || 'LOW',
          exec.policyDecision || 'ALLOW',
          exec.confirmationRequired || false,
          exec.confirmationReceived || false,
          exec.confirmationToken || null,
          exec.argumentsHash,
          JSON.stringify(exec.argumentsMasked || {}),
          exec.resultStatus || 'pending',
          JSON.stringify(exec.resultData || {}),
          exec.errorMessage || null,
          exec.durationMs || 0,
          exec.correlationId,
          exec.createdAt ? new Date(exec.createdAt) : new Date(),
        ]
      );
      return exec;
    });
  }

  public static async updateToolExecution(
    id: string,
    updates: { resultStatus: 'pending' | 'success' | 'failed'; resultData?: Record<string, unknown>; errorMessage?: string; durationMs?: number },
    contextOrTenant?: TenantContext | string
  ): Promise<void> {
    const callback = async (client: any) => {
      await client.query(
        `UPDATE ai_tool_executions SET
          result_status = $2,
          result_data = $3,
          error_message = $4,
          duration_ms = $5
         WHERE id = $1`,
        [
          id,
          updates.resultStatus,
          JSON.stringify(updates.resultData || {}),
          updates.errorMessage || null,
          updates.durationMs || 0,
        ]
      );
    };

    if (contextOrTenant) {
      await postgresClient.executeTenantScoped(contextOrTenant, (client) => callback(client));
    } else {
      await postgresClient.executeGlobalScoped((client) => callback(client));
    }
  }

  public static async addSessionEvent(event: MaiaSessionEvent, contextOrTenant?: TenantContext | string): Promise<MaiaSessionEvent> {
    const target = contextOrTenant || event.tenantId;
    return postgresClient.executeTenantScoped(target, async (client, ctx) => {
      await client.query(
        `INSERT INTO ai_session_events (
          id, session_id, tenant_id, event_type, from_status, to_status, payload, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [
          event.id,
          event.sessionId,
          ctx.tenantId,
          event.eventType,
          event.fromStatus || null,
          event.toStatus || null,
          JSON.stringify(event.payload || {}),
          event.createdAt ? new Date(event.createdAt) : new Date(),
        ]
      );
      return event;
    });
  }

  public static async listToolExecutions(sessionId: string, contextOrTenant?: TenantContext | string): Promise<MaiaToolExecution[]> {
    const callback = async (client: any) => {
      const res = await client.query(
        'SELECT * FROM ai_tool_executions WHERE session_id = $1 ORDER BY created_at ASC',
        [sessionId]
      );
      return res.rows.map((r: any) => ({
        id: r.id,
        sessionId: r.session_id,
        turnId: r.turn_id,
        tenantId: r.tenant_id,
        userId: r.user_id,
        agentId: r.agent_id,
        provider: r.provider,
        model: r.model,
        toolId: r.tool_id,
        toolName: r.tool_name,
        risk: r.risk,
        policyDecision: r.policy_decision,
        confirmationRequired: r.confirmation_required,
        confirmationReceived: r.confirmation_received,
        confirmationToken: r.confirmation_token,
        argumentsHash: r.arguments_hash,
        argumentsMasked: typeof r.arguments_masked === 'string' ? JSON.parse(r.arguments_masked) : (r.arguments_masked || {}),
        resultStatus: r.result_status,
        resultData: typeof r.result_data === 'string' ? JSON.parse(r.result_data) : (r.result_data || {}),
        errorMessage: r.error_message || undefined,
        durationMs: r.duration_ms || 0,
        correlationId: r.correlation_id,
        createdAt: toSafeIsoString(r.created_at),
      }));
    };

    if (contextOrTenant) {
      return postgresClient.executeTenantScoped(contextOrTenant, (client) => callback(client));
    }
    return postgresClient.executeGlobalScoped((client) => callback(client));
  }

  public static async listEvents(sessionId: string, contextOrTenant?: TenantContext | string): Promise<MaiaSessionEvent[]> {
    const callback = async (client: any) => {
      const res = await client.query(
        'SELECT * FROM ai_session_events WHERE session_id = $1 ORDER BY created_at ASC',
        [sessionId]
      );
      return res.rows.map((r: any) => ({
        id: r.id,
        sessionId: r.session_id,
        tenantId: r.tenant_id,
        eventType: r.event_type,
        fromStatus: r.from_status || undefined,
        toStatus: r.to_status || undefined,
        payload: typeof r.payload === 'string' ? JSON.parse(r.payload) : (r.payload || {}),
        createdAt: toSafeIsoString(r.created_at),
      }));
    };

    if (contextOrTenant) {
      return postgresClient.executeTenantScoped(contextOrTenant, (client) => callback(client));
    }
    return postgresClient.executeGlobalScoped((client) => callback(client));
  }

  private static rowToSession(row: any): MaiaSession {
    let meta = {};
    if (typeof row.meta === 'string') {
      try {
        meta = JSON.parse(row.meta);
      } catch {
        meta = {};
      }
    } else if (typeof row.meta === 'object' && row.meta !== null) {
      meta = row.meta;
    }

    return {
      id: row.id,
      tenantId: row.tenant_id,
      agentId: row.agent_id,
      asteriskChannelId: row.asterisk_channel_id || undefined,
      asteriskUniqueId: row.asterisk_unique_id || undefined,
      linkedId: row.linked_id || undefined,
      callerNumber: row.caller_number || 'Desconhecido',
      provider: row.provider || 'gemini',
      model: row.model || 'gemini-flash-latest',
      routingProfile: row.routing_profile || 'BALANCEADO',
      status: row.status || 'created',
      startedAt: toSafeIsoString(row.started_at),
      lastActivityAt: toSafeIsoString(row.last_activity_at),
      endedAt: row.ended_at ? toSafeIsoString(row.ended_at) : undefined,
      durationSeconds: parseInt(row.duration_seconds || '0', 10),
      userTurns: parseInt(row.user_turns || '0', 10),
      toolCalls: parseInt(row.tool_calls || '0', 10),
      tokensInput: parseInt(row.tokens_input || '0', 10),
      tokensOutput: parseInt(row.tokens_output || '0', 10),
      csatScore: row.csat_score ? parseFloat(row.csat_score) : undefined,
      sentiment: row.sentiment || undefined,
      summary: row.summary || undefined,
      transferReason: row.transfer_reason || undefined,
      transferDestination: row.transfer_destination || undefined,
      meta,
    };
  }
}
