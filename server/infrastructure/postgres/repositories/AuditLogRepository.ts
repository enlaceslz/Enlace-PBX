import crypto from 'crypto';
import { postgresClient } from '../client';
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

    return auditItem;
  }

  public static async listByTenant(tenantId: string, limit: number = 100): Promise<AuditLog[]> {
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
  }
}
