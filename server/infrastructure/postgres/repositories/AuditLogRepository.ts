import crypto from 'crypto';
import { postgresClient } from '../client';
import { AuditLog } from '../../../../src/types/pbx';
import { initialSeedData } from '../seedData';

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
    const hashData = `${id}|${entry.tenantId}|${entry.userId}|${entry.action}|${entry.resource}|${timestamp}`;
    const sha256Hash = crypto.createHash('sha256').update(hashData).digest('hex');

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
      payload: entry.payload,
    };

    try {
      await postgresClient.query(
        `INSERT INTO audit_logs (id, tenant_id, user_id, user_name, action, resource, ip, timestamp, details, category, severity, sha256_hash, payload)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
        [
          auditItem.id, auditItem.tenantId, auditItem.userId, auditItem.userName,
          auditItem.action, auditItem.resource, auditItem.ip, new Date(timestamp),
          auditItem.details, auditItem.category, auditItem.severity,
          auditItem.sha256Hash, JSON.stringify(auditItem.payload || {})
        ]
      );
    } catch {
      initialSeedData.auditLogs.unshift({ ...auditItem });
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
        timestamp: row.timestamp ? row.timestamp.toISOString() : new Date().toISOString(),
        details: row.details,
        category: row.category,
        severity: row.severity,
        sha256Hash: row.sha256_hash,
        payload: typeof row.payload === 'string' ? JSON.parse(row.payload) : (row.payload || {}),
      }));

      return { logs, total };
    } catch {
      let filtered = [...initialSeedData.auditLogs];
      if (options?.category && options.category !== 'ALL') {
        filtered = filtered.filter(l => l.category === options.category);
      }
      if (options?.severity && options.severity !== 'ALL') {
        filtered = filtered.filter(l => l.severity === options.severity);
      }
      if (options?.search) {
        const q = options.search.toLowerCase();
        filtered = filtered.filter(l =>
          l.details?.toLowerCase().includes(q) ||
          l.action?.toLowerCase().includes(q) ||
          l.userName?.toLowerCase().includes(q) ||
          l.resource?.toLowerCase().includes(q) ||
          l.ip?.toLowerCase().includes(q)
        );
      }
      return {
        logs: filtered.slice(offset, offset + limit),
        total: filtered.length,
      };
    }
  }

  public static async findById(id: string): Promise<AuditLog | null> {
    try {
      const res = await postgresClient.query('SELECT * FROM audit_logs WHERE id = $1', [id]);
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
          timestamp: row.timestamp ? row.timestamp.toISOString() : new Date().toISOString(),
          details: row.details,
          category: row.category,
          severity: row.severity,
          sha256Hash: row.sha256_hash,
          payload: typeof row.payload === 'string' ? JSON.parse(row.payload) : (row.payload || {}),
        };
      }
      return null;
    } catch {
      const l = initialSeedData.auditLogs.find(log => log.id === id);
      return l ? { ...l } : null;
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
        timestamp: row.timestamp ? row.timestamp.toISOString() : new Date().toISOString(),
        details: row.details,
        category: row.category,
        severity: row.severity,
        sha256Hash: row.sha256_hash,
        payload: typeof row.payload === 'string' ? JSON.parse(row.payload) : (row.payload || {}),
      }));
    } catch {
      return initialSeedData.auditLogs.filter(l => l.tenantId === tenantId).slice(0, limit);
    }
  }
}
