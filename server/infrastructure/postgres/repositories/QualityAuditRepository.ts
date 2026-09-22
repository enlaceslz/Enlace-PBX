import { postgresClient } from '../client';

export interface QualityAudit {
  id: string;
  tenantId: string;
  callId: string;
  agentId?: string;
  score: number;
  sentiment: 'positive' | 'neutral' | 'negative';
  resolutionStatus: string;
  summary: string;
  feedback: string;
  complianceScore: number;
  createdAt: string;
}

export class QualityAuditRepository {
  public static async listByTenant(tenantId: string): Promise<QualityAudit[]> {
    const res = await postgresClient.query(
      'SELECT * FROM quality_audits WHERE tenant_id = $1 ORDER BY created_at DESC LIMIT 50',
      [tenantId]
    );
    return res.rows.map(row => ({
      id: row.id,
      tenantId: row.tenant_id,
      callId: row.call_id,
      agentId: row.agent_id || undefined,
      score: row.score || 85,
      sentiment: row.sentiment || 'positive',
      resolutionStatus: row.resolution_status || 'resolved',
      summary: row.summary || '',
      feedback: row.feedback || '',
      complianceScore: row.compliance_score || 100,
      createdAt: row.created_at ? row.created_at.toISOString() : new Date().toISOString(),
    }));
  }

  public static async save(audit: QualityAudit): Promise<QualityAudit> {
    await postgresClient.query(
      `INSERT INTO quality_audits (id, tenant_id, call_id, agent_id, score, sentiment, resolution_status, summary, feedback, compliance_score, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       ON CONFLICT (id) DO UPDATE SET
         score = EXCLUDED.score,
         sentiment = EXCLUDED.sentiment,
         resolution_status = EXCLUDED.resolution_status,
         summary = EXCLUDED.summary,
         feedback = EXCLUDED.feedback,
         compliance_score = EXCLUDED.compliance_score`,
      [
        audit.id, audit.tenantId, audit.callId, audit.agentId || null,
        audit.score, audit.sentiment, audit.resolutionStatus,
        audit.summary, audit.feedback, audit.complianceScore,
        audit.createdAt ? new Date(audit.createdAt) : new Date()
      ]
    );
    return audit;
  }
}
