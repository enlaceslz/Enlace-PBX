import { postgresClient } from '../../infrastructure/postgres/client.js';
import { toSafeIsoString } from '../../infrastructure/postgres/dateUtils.js';
import {
  MaiaSession,
  MaiaSessionTurn,
  MaiaToolExecution,
  MaiaSessionEvent,
} from '../types.js';

export class MaiaSessionRepository {
  public static async createSession(session: MaiaSession): Promise<MaiaSession> {
    const metaJson = JSON.stringify(session.meta || {});
    await postgresClient.query(
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
        session.tenantId,
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
  }

  public static async updateSession(session: MaiaSession): Promise<MaiaSession> {
    return this.createSession(session);
  }

  public static async findById(id: string, tenantId?: string): Promise<MaiaSession | null> {
    let query = 'SELECT * FROM ai_sessions WHERE id = $1';
    const params: any[] = [id];
    if (tenantId) {
      query += ' AND tenant_id = $2';
      params.push(tenantId);
    }

    const res = await postgresClient.query(query, params);
    if (res.rows.length === 0) return null;
    return this.rowToSession(res.rows[0]);
  }

  public static async findByChannelId(channelId: string, tenantId?: string): Promise<MaiaSession | null> {
    let query = 'SELECT * FROM ai_sessions WHERE asterisk_channel_id = $1';
    const params: any[] = [channelId];
    if (tenantId) {
      query += ' AND tenant_id = $2';
      params.push(tenantId);
    }
    query += ' ORDER BY started_at DESC LIMIT 1';

    const res = await postgresClient.query(query, params);
    if (res.rows.length === 0) return null;
    return this.rowToSession(res.rows[0]);
  }

  public static async listByTenant(tenantId: string, limit: number = 50): Promise<MaiaSession[]> {
    const res = await postgresClient.query(
      'SELECT * FROM ai_sessions WHERE tenant_id = $1 ORDER BY started_at DESC LIMIT $2',
      [tenantId, limit]
    );
    return res.rows.map((row) => this.rowToSession(row));
  }

  public static async listAll(limit: number = 50): Promise<MaiaSession[]> {
    const res = await postgresClient.query(
      'SELECT * FROM ai_sessions ORDER BY started_at DESC LIMIT $1',
      [limit]
    );
    return res.rows.map((row) => this.rowToSession(row));
  }

  public static async addTurn(turn: MaiaSessionTurn): Promise<MaiaSessionTurn> {
    await postgresClient.query(
      `INSERT INTO ai_session_turns (
        id, session_id, tenant_id, turn_number, role, content,
        audio_base64, latency_ms, tokens_input, tokens_output, provider, model, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
      [
        turn.id,
        turn.sessionId,
        turn.tenantId,
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
  }

  public static async listTurns(sessionId: string): Promise<MaiaSessionTurn[]> {
    const res = await postgresClient.query(
      'SELECT * FROM ai_session_turns WHERE session_id = $1 ORDER BY turn_number ASC',
      [sessionId]
    );
    return res.rows.map((r) => ({
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
  }

  public static async addToolExecution(exec: MaiaToolExecution): Promise<MaiaToolExecution> {
    await postgresClient.query(
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
        exec.tenantId,
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
  }

  public static async updateToolExecution(
    id: string,
    updates: { resultStatus: 'pending' | 'success' | 'failed'; resultData?: Record<string, unknown>; errorMessage?: string; durationMs?: number }
  ): Promise<void> {
    await postgresClient.query(
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
  }

  public static async addSessionEvent(event: MaiaSessionEvent): Promise<MaiaSessionEvent> {
    await postgresClient.query(
      `INSERT INTO ai_session_events (
        id, session_id, tenant_id, event_type, from_status, to_status, payload, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        event.id,
        event.sessionId,
        event.tenantId,
        event.eventType,
        event.fromStatus || null,
        event.toStatus || null,
        JSON.stringify(event.payload || {}),
        event.createdAt ? new Date(event.createdAt) : new Date(),
      ]
    );
    return event;
  }

  public static async listToolExecutions(sessionId: string): Promise<MaiaToolExecution[]> {
    const res = await postgresClient.query(
      'SELECT * FROM ai_tool_executions WHERE session_id = $1 ORDER BY created_at ASC',
      [sessionId]
    );
    return res.rows.map((r) => ({
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
  }

  public static async listEvents(sessionId: string): Promise<MaiaSessionEvent[]> {
    const res = await postgresClient.query(
      'SELECT * FROM ai_session_events WHERE session_id = $1 ORDER BY created_at ASC',
      [sessionId]
    );
    return res.rows.map((r) => ({
      id: r.id,
      sessionId: r.session_id,
      tenantId: r.tenant_id,
      eventType: r.event_type,
      fromStatus: r.from_status || undefined,
      toStatus: r.to_status || undefined,
      payload: typeof r.payload === 'string' ? JSON.parse(r.payload) : (r.payload || {}),
      createdAt: toSafeIsoString(r.created_at),
    }));
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
