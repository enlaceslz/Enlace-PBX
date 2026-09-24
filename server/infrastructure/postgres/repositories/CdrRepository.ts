import crypto from 'crypto';
import { postgresClient } from '../client';
import { CdrRecord } from '../../../../src/types/pbx';

export interface OfficialCdrPayload {
  uniqueid: string;
  linkedid?: string;
  tenantId: string;
  caller: string;
  callee: string;
  direction: 'inbound' | 'outbound' | 'internal';
  trunk?: string;
  extension?: string;
  queue?: string;
  ivr?: string;
  startTime: Date;
  answerTime?: Date | null;
  endTime: Date;
  duration: number;
  billsec: number;
  disposition: 'ANSWERED' | 'NO ANSWER' | 'BUSY' | 'FAILED';
  hangupCause?: number;
  recordingFile?: string;
  aiAgentId?: string;
  costBrl?: number;
}

export class CdrRepository {
  public static async save(record: any): Promise<CdrRecord> {
    if (!record.tenantId || typeof record.tenantId !== 'string' || record.tenantId.trim() === '') {
      throw new Error('CDR Rejeitado: O tenantId é obrigatório e deve ser determinado confiavelmente da infraestrutura.');
    }
    return this.insertOfficial({
      uniqueid: record.uniqueId || record.uniqueid || record.id || `cdr-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`,
      tenantId: record.tenantId.trim(),
      caller: record.caller || 'anonymous',
      callee: record.callee || 's',
      direction: record.direction || 'inbound',
      startTime: record.startTime ? new Date(record.startTime) : new Date(),
      endTime: record.endTime ? new Date(record.endTime) : new Date(),
      duration: record.duration || 0,
      billsec: record.billsec || record.duration || 0,
      disposition: record.disposition || 'ANSWERED',
      costBrl: record.costBrl,
      trunk: record.trunkName,
      extension: record.extension,
      aiAgentId: record.aiAgentId,
      recordingFile: record.recordingUrl,
    });
  }

  public static async insertOfficial(record: OfficialCdrPayload): Promise<CdrRecord> {
    const cdrId = `cdr-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`;
    const cost = record.costBrl || (record.billsec > 0 ? (record.billsec / 60) * 0.045 : 0);

    const cdrItem: CdrRecord = {
      id: cdrId,
      tenantId: record.tenantId,
      uniqueId: record.uniqueid,
      caller: record.caller,
      callee: record.callee,
      direction: record.direction,
      startTime: record.startTime.toISOString(),
      answerTime: record.answerTime ? record.answerTime.toISOString() : undefined,
      endTime: record.endTime.toISOString(),
      duration: record.duration,
      billsec: record.billsec,
      disposition: record.disposition,
      recordingUrl: record.recordingFile || undefined,
      trunkName: record.trunk || undefined,
      extension: record.extension || undefined,
      aiAgentId: record.aiAgentId || undefined,
      isAiHandled: !!record.aiAgentId,
      costBrl: parseFloat(cost.toFixed(4)),
    };

    try {
      await postgresClient.query(
        `INSERT INTO cdr (id, uniqueid, linkedid, tenant_id, caller, callee, direction, trunk, extension, queue, ivr, start_time, answer_time, end_time, duration, billsec, disposition, hangup_cause, recording_file, ai_agent_id, cost_brl)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21)
         ON CONFLICT (uniqueid) DO UPDATE
         SET answer_time = EXCLUDED.answer_time,
             end_time = EXCLUDED.end_time,
             duration = EXCLUDED.duration,
             billsec = EXCLUDED.billsec,
             disposition = EXCLUDED.disposition,
             hangup_cause = EXCLUDED.hangup_cause,
             recording_file = EXCLUDED.recording_file,
             cost_brl = EXCLUDED.cost_brl`,
        [
          cdrId, record.uniqueid, record.linkedid || null, record.tenantId,
          record.caller, record.callee, record.direction, record.trunk || null,
          record.extension || null, record.queue || null, record.ivr || null,
          record.startTime, record.answerTime || null, record.endTime,
          record.duration, record.billsec, record.disposition,
          record.hangupCause || null, record.recordingFile || null,
          record.aiAgentId || null, cdrItem.costBrl
        ]
      );
      return cdrItem;
    } catch (err: any) {
      console.error('[CdrRepository.insertOfficial] Erro no PostgreSQL:', err?.message || err);
      throw err;
    }
  }

  public static async listAll(options?: { limit?: number; offset?: number }): Promise<CdrRecord[]> {
    const limit = options?.limit || 100;
    const offset = options?.offset || 0;
    try {
      const res = await postgresClient.query(
        'SELECT * FROM cdr ORDER BY start_time DESC LIMIT $1 OFFSET $2',
        [limit, offset]
      );
      return res.rows.map(row => ({
        id: row.id,
        tenantId: row.tenant_id,
        uniqueId: row.uniqueid || row.id,
        caller: row.caller,
        callee: row.callee,
        direction: row.direction,
        startTime: row.start_time ? new Date(row.start_time).toISOString() : new Date().toISOString(),
        answerTime: row.answer_time ? new Date(row.answer_time).toISOString() : undefined,
        endTime: row.end_time ? new Date(row.end_time).toISOString() : new Date().toISOString(),
        duration: row.duration,
        billsec: row.billsec,
        disposition: row.disposition,
        recordingUrl: row.recording_file || undefined,
        trunkName: row.trunk || undefined,
        extension: row.extension || undefined,
        aiAgentId: row.ai_agent_id || undefined,
        isAiHandled: !!row.ai_agent_id,
        costBrl: parseFloat(row.cost_brl || '0'),
      }));
    } catch (err: any) {
      console.error('[CdrRepository.listAll] Erro no PostgreSQL:', err?.message || err);
      throw err;
    }
  }

  public static async listByTenant(
    tenantId: string,
    options?: { limit?: number; offset?: number; startDate?: string; endDate?: string }
  ): Promise<CdrRecord[]> {
    const limit = options?.limit || 100;
    const offset = options?.offset || 0;

    try {
      let query = 'SELECT * FROM cdr WHERE tenant_id = $1';
      const params: any[] = [tenantId];
      let paramIdx = 2;

      if (options?.startDate) {
        query += ` AND start_time >= $${paramIdx++}`;
        params.push(new Date(options.startDate));
      }
      if (options?.endDate) {
        query += ` AND start_time <= $${paramIdx++}`;
        params.push(new Date(options.endDate));
      }

      query += ` ORDER BY start_time DESC LIMIT $${paramIdx++} OFFSET $${paramIdx++}`;
      params.push(limit, offset);

      const res = await postgresClient.query(query, params);
      return res.rows.map(row => ({
        id: row.id,
        tenantId: row.tenant_id,
        uniqueId: row.uniqueid || row.id,
        caller: row.caller,
        callee: row.callee,
        direction: row.direction,
        startTime: row.start_time ? new Date(row.start_time).toISOString() : new Date().toISOString(),
        answerTime: row.answer_time ? new Date(row.answer_time).toISOString() : undefined,
        endTime: row.end_time ? new Date(row.end_time).toISOString() : new Date().toISOString(),
        duration: row.duration,
        billsec: row.billsec,
        disposition: row.disposition,
        recordingUrl: row.recording_file || undefined,
        trunkName: row.trunk || undefined,
        extension: row.extension || undefined,
        aiAgentId: row.ai_agent_id || undefined,
        isAiHandled: !!row.ai_agent_id,
        costBrl: parseFloat(row.cost_brl || '0'),
      }));
    } catch (err: any) {
      console.error('[CdrRepository.listByTenant] Erro no PostgreSQL:', err?.message || err);
      throw err;
    }
  }

  public static async findById(id: string, tenantId?: string): Promise<CdrRecord | null> {
    try {
      let query = 'SELECT * FROM cdr WHERE (id = $1 OR uniqueid = $1)';
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
          uniqueId: row.uniqueid || row.id,
          caller: row.caller,
          callee: row.callee,
          direction: row.direction,
          startTime: row.start_time ? new Date(row.start_time).toISOString() : new Date().toISOString(),
          answerTime: row.answer_time ? new Date(row.answer_time).toISOString() : undefined,
          endTime: row.end_time ? new Date(row.end_time).toISOString() : new Date().toISOString(),
          duration: row.duration,
          billsec: row.billsec,
          disposition: row.disposition,
          recordingUrl: row.recording_file || undefined,
          trunkName: row.trunk || undefined,
          extension: row.extension || undefined,
          aiAgentId: row.ai_agent_id || undefined,
          isAiHandled: !!row.ai_agent_id,
          costBrl: parseFloat(row.cost_brl || '0'),
        };
      }
      return null;
    } catch (err: any) {
      console.error('[CdrRepository.findById] Erro no PostgreSQL:', err?.message || err);
      throw err;
    }
  }
}
