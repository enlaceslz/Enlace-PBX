import { postgresClient } from '../client';
import { initialSeedData } from '../seedData';

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
    try {
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
    } catch {
      return (initialSeedData.qualityAudits as any[])
        .filter(q => q.tenantId === tenantId)
        .map(q => ({
          id: q.id,
          tenantId: q.tenantId,
          callId: q.referenceId || q.callId || q.id,
          agentId: q.agentOrBot || q.agentId,
          score: q.score || 85,
          sentiment: q.sentiment || 'positive',
          resolutionStatus: q.resolutionStatus || 'resolved',
          summary: q.summary || '',
          feedback: q.feedbackForAgent || q.feedback || '',
          complianceScore: q.complianceChecked ? 100 : (q.complianceScore || 90),
          createdAt: q.timestamp || q.createdAt || new Date().toISOString(),
        }));
    }
  }

  public static async save(audit: QualityAudit): Promise<QualityAudit> {
    try {
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
    } catch {
      const list = initialSeedData.qualityAudits as any[];
      const idx = list.findIndex(q => q.id === audit.id);
      const converted = {
        id: audit.id,
        tenantId: audit.tenantId,
        referenceId: audit.callId,
        channelType: 'voice_pjsip',
        agentOrBot: audit.agentId || 'MaIA',
        timestamp: audit.createdAt,
        score: audit.score,
        sentiment: audit.sentiment,
        slaBreach: false,
        complianceChecked: audit.complianceScore >= 90,
        keyPhrases: [],
        riskAlerts: [],
        summary: audit.summary,
        feedbackForAgent: audit.feedback,
      };
      if (idx !== -1) {
        list[idx] = converted;
      } else {
        list.unshift(converted);
      }
    }
    return audit;
  }
}
