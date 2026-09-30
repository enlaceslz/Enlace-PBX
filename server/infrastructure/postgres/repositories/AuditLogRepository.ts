import crypto from 'crypto';
import { postgresClient } from '../client';
import { toSafeIsoStringOrNow } from '../dateUtils';
import { AuditLog } from '../../../../src/types/pbx';

export class AuditLogRepository {
  public static async create(entry: {
    tenantId: string;
    userId: string;
    userName: string;
    action: string;
    resource: string;
    ip: string;
    details: string;
    category?: 'TELECOM_SIP' | 'ROUTING' | 'SECURITY' | 'AI_GATEWAY' | 'USER_MGMT' | 'LGPD_ACCESS' | 'SYSTEM';
    severity?: 'INFO' | 'WARNING' | 'CRITICAL';
    payload?: Record<string, unknown>;
  }): Promise<AuditLog> {
    return this.log(entry);
  }

  /**
   * Constrói o hash canônico SHA-256 para o registro de auditoria.
   */
  public static computeCanonicalHash(params: {
    previousHash: string;
    id: string;
    tenantId: string;
    userId: string;
    action: string;
    resource: string;
    timestamp: string;
  }): string {
    const canonical = `${params.previousHash}|${params.id}|${params.tenantId}|${params.userId}|${params.action}|${params.resource}|${params.timestamp}`;
    return crypto.createHash('sha256').update(canonical).digest('hex');
  }

  public static async log(entry: {
    tenantId: string;
    userId: string;
    userName: string;
    action: string;
    resource: string;
    ip: string;
    details: string;
    category?: 'TELECOM_SIP' | 'ROUTING' | 'SECURITY' | 'AI_GATEWAY' | 'USER_MGMT' | 'LGPD_ACCESS' | 'SYSTEM';
    severity?: 'INFO' | 'WARNING' | 'CRITICAL';
    payload?: Record<string, unknown>;
  }): Promise<AuditLog> {
    const timestamp = new Date().toISOString();
    const id = `audit-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`;

    // Obtém o hash do registro imediatamente anterior para encadeamento criptográfico estrito
    let previousHash = '0000000000000000000000000000000000000000000000000000000000000000';
    try {
      const prevRes = await postgresClient.query(
        'SELECT sha256_hash FROM audit_logs WHERE tenant_id = $1 ORDER BY timestamp DESC, id DESC LIMIT 1',
        [entry.tenantId]
      );
      if (prevRes.rows.length > 0 && prevRes.rows[0].sha256_hash) {
        previousHash = prevRes.rows[0].sha256_hash;
      }
    } catch {}

    const sha256Hash = this.computeCanonicalHash({
      previousHash,
      id,
      tenantId: entry.tenantId,
      userId: entry.userId,
      action: entry.action,
      resource: entry.resource,
      timestamp,
    });

    const auditItem: AuditLog = {
      id,
      tenantId: entry.tenantId,
      userId: entry.userId,
      userName: entry.userName,
      action: entry.action,
      resource: entry.resource,
      ip: entry.ip,
      timestamp,
      details: entry.details,
      category: entry.category || 'SYSTEM',
      severity: entry.severity || 'INFO',
      sha256Hash,
      previousHash,
      payload: entry.payload,
    };

    try {
      await postgresClient.query(
        `INSERT INTO audit_logs (id, tenant_id, user_id, user_name, action, resource, ip, timestamp, details, category, severity, sha256_hash, previous_hash, payload)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)`,
        [
          auditItem.id, auditItem.tenantId, auditItem.userId, auditItem.userName,
          auditItem.action, auditItem.resource, auditItem.ip, new Date(timestamp),
          auditItem.details, auditItem.category, auditItem.severity,
          auditItem.sha256Hash, previousHash, JSON.stringify(auditItem.payload || {})
        ]
      );
    } catch (err: any) {
      console.error('[AuditLogRepository.log] Erro ao gravar log de auditoria no PostgreSQL:', err?.message || err);
    }

    return auditItem;
  }

  public static async listAll(options?: {
    search?: string;
    category?: string;
    severity?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ logs: AuditLog[]; total: number }> {
    const limit = options?.limit || 100;
    const offset = options?.offset || 0;
    try {
      const whereClauses: string[] = [];
      const params: any[] = [];
      let paramIdx = 1;

      if (options?.category && options.category !== 'ALL') {
        whereClauses.push(`category = $${paramIdx++}`);
        params.push(options.category);
      }
      if (options?.severity && options.severity !== 'ALL') {
        whereClauses.push(`severity = $${paramIdx++}`);
        params.push(options.severity);
      }
      if (options?.search) {
        whereClauses.push(`(details ILIKE $${paramIdx} OR action ILIKE $${paramIdx} OR user_name ILIKE $${paramIdx} OR resource ILIKE $${paramIdx} OR ip ILIKE $${paramIdx})`);
        params.push(`%${options.search}%`);
        paramIdx++;
      }

      const whereStr = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

      const countRes = await postgresClient.query(`SELECT COUNT(*) as total FROM audit_logs ${whereStr}`, params);
      const total = parseInt(countRes.rows[0]?.total || '0', 10);

      const dataQuery = `SELECT * FROM audit_logs ${whereStr} ORDER BY timestamp DESC LIMIT $${paramIdx++} OFFSET $${paramIdx++}`;
      const dataParams = [...params, limit, offset];

      const res = await postgresClient.query(dataQuery, dataParams);
      const logs = res.rows.map(row => ({
        id: row.id,
        tenantId: row.tenant_id,
        userId: row.user_id,
        userName: row.user_name,
        action: row.action,
        resource: row.resource,
        ip: row.ip,
        timestamp: toSafeIsoStringOrNow(row.timestamp),
        details: row.details,
        category: row.category,
        severity: row.severity,
        sha256Hash: row.sha256_hash,
        previousHash: row.previous_hash || undefined,
        payload: typeof row.payload === 'string' ? JSON.parse(row.payload) : (row.payload || {}),
      }));

      return { logs, total };
    } catch (err: any) {
      console.error('[AuditLogRepository.listAll] Erro no PostgreSQL:', err?.message || err);
      throw err;
    }
  }

  public static async findById(id: string, tenantId?: string): Promise<AuditLog | null> {
    try {
      let query = 'SELECT * FROM audit_logs WHERE id = $1';
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
          userId: row.user_id,
          userName: row.user_name,
          action: row.action,
          resource: row.resource,
          ip: row.ip,
          timestamp: toSafeIsoStringOrNow(row.timestamp),
          details: row.details,
          category: row.category,
          severity: row.severity,
          sha256Hash: row.sha256_hash,
          payload: typeof row.payload === 'string' ? JSON.parse(row.payload) : (row.payload || {}),
        };
      }
      return null;
    } catch (err: any) {
      console.error('[AuditLogRepository.findById] Erro no PostgreSQL:', err?.message || err);
      throw err;
    }
  }

  public static async listByTenant(tenantId: string, limit: number = 100): Promise<AuditLog[]> {
    try {
      const res = await postgresClient.query(
        'SELECT * FROM audit_logs WHERE tenant_id = $1 ORDER BY timestamp DESC LIMIT $2',
        [tenantId, limit]
      );
      return res.rows.map(row => ({
        id: row.id,
        tenantId: row.tenant_id,
        userId: row.user_id,
        userName: row.user_name,
        action: row.action,
        resource: row.resource,
        ip: row.ip,
        timestamp: toSafeIsoStringOrNow(row.timestamp),
        details: row.details,
        category: row.category,
        severity: row.severity,
        sha256Hash: row.sha256_hash,
        previousHash: row.previous_hash || undefined,
        payload: typeof row.payload === 'string' ? JSON.parse(row.payload) : (row.payload || {}),
      }));
    } catch (err: any) {
      console.error('[AuditLogRepository.listByTenant] Erro no PostgreSQL:', err?.message || err);
      throw err;
    }
  }

  /**
   * Validação matemática da cadeia criptográfica de custódia (Blockchain-style).
   * Comprova que os registros não sofreram adulteração, inserção espúria ou exclusão.
   */
  public static async verifyChain(tenantId: string): Promise<{
    valid: boolean;
    totalVerified: number;
    brokenAtId?: string;
    details?: string;
  }> {
    try {
      const res = await postgresClient.query(
        'SELECT id, tenant_id, user_id, action, resource, ip, timestamp, sha256_hash, previous_hash FROM audit_logs WHERE tenant_id = $1 ORDER BY timestamp ASC, id ASC',
        [tenantId]
      );
      const rows = res.rows;
      if (rows.length === 0) {
        return { valid: true, totalVerified: 0 };
      }

      let expectedPrev = '0000000000000000000000000000000000000000000000000000000000000000';
      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        const actualPrev = row.previous_hash || '0000000000000000000000000000000000000000000000000000000000000000';

        // 1. Validação de Encadeamento de Hash (previous_hash[n] === sha256_hash[n-1])
        if (i > 0 && actualPrev !== expectedPrev) {
          return {
            valid: false,
            totalVerified: i,
            brokenAtId: row.id,
            details: `Ruptura na cadeia de custódia no registro ${row.id}. Hash anterior esperado: ${expectedPrev}, obtido: ${actualPrev}`,
          };
        }

        // 2. Validação Matemática Canônica: CALCULATED_HASH === STORED_HASH
        const canonicalTimestamp = toSafeIsoStringOrNow(row.timestamp);
        const calculatedHash = this.computeCanonicalHash({
          previousHash: actualPrev,
          id: row.id,
          tenantId: row.tenant_id,
          userId: row.user_id,
          action: row.action,
          resource: row.resource,
          timestamp: canonicalTimestamp,
        });

        if (calculatedHash !== row.sha256_hash) {
          // Tenta com timestamp bruto caso a formatação de fuso difira minimamente
          const rawTimestamp = typeof row.timestamp === 'string' ? row.timestamp : new Date(row.timestamp).toISOString();
          const altHash = this.computeCanonicalHash({
            previousHash: actualPrev,
            id: row.id,
            tenantId: row.tenant_id,
            userId: row.user_id,
            action: row.action,
            resource: row.resource,
            timestamp: rawTimestamp,
          });

          if (altHash !== row.sha256_hash) {
            return {
              valid: false,
              totalVerified: i,
              brokenAtId: row.id,
              details: `Adulteração detectada no registro ${row.id}: hash recalculado não coincide com o hash armazenado. Cadeia de custódia corrompida.`,
            };
          }
        }

        expectedPrev = row.sha256_hash;
      }

      return { valid: true, totalVerified: rows.length };
    } catch (err: any) {
      return { valid: false, totalVerified: 0, details: err.message };
    }
  }
}
