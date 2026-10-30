import {logOperational} from '../../security/OperationalLog.js';
import { postgresClient } from '../client.js';
import { toSafeIsoStringOrNow } from '../dateUtils.js';
import { TenantContext } from '../../auth/tenantContext.js';

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
  public static async listByTenant(contextOrTenant: TenantContext | string): Promise<QualityAudit[]> {
    return postgresClient.executeTenantScoped(contextOrTenant, async (client, ctx) => {
      try {
        const res = await client.query(
          'SELECT * FROM quality_audits WHERE tenant_id = $1 ORDER BY created_at DESC LIMIT 100',
          [ctx.tenantId]
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
          createdAt: toSafeIsoStringOrNow(row.created_at),
        }));
      } catch (err: any) {
        logOperational('AUDIT_OPERATION_FAILURE');
        throw err;
      }
    });
  }

  public static async listAll(): Promise<QualityAudit[]> {
    return postgresClient.executeGlobalScoped(async (client) => {
      try {
        const res = await client.query(
          'SELECT * FROM quality_audits ORDER BY created_at DESC LIMIT 100'
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
          createdAt: toSafeIsoStringOrNow(row.created_at),
        }));
      } catch (err: any) {
        logOperational('AUDIT_OPERATION_FAILURE');
        throw err;
      }
    });
  }

  public static async findById(id: string, contextOrTenant: TenantContext | string): Promise<QualityAudit | null> {
    if (!contextOrTenant || (typeof contextOrTenant === 'string' && contextOrTenant.trim() === '')) {
      throw new Error('TENANT_REQUIRED: tenantId é obrigatório para consultar auditoria de qualidade.');
    }
    return postgresClient.executeTenantScoped(contextOrTenant, async (client, ctx) => {
      try {
        const res = await client.query(
          'SELECT * FROM quality_audits WHERE id = $1 AND tenant_id = $2',
          [id, ctx.tenantId]
        );
        if (res.rows.length > 0) {
          const row = res.rows[0];
          return {
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
            createdAt: toSafeIsoStringOrNow(row.created_at),
          };
        }
        return null;
      } catch (err: any) {
        logOperational('AUDIT_OPERATION_FAILURE');
        throw err;
      }
    });
  }

  public static async save(audit: QualityAudit, contextOrTenant?: TenantContext | string): Promise<QualityAudit> {
    const target = contextOrTenant || audit.tenantId;
    return postgresClient.executeTenantScoped(target, async (client, ctx) => {
      try {
        await client.query(
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
            audit.id, ctx.tenantId, audit.callId, audit.agentId || null,
            audit.score, audit.sentiment, audit.resolutionStatus,
            audit.summary, audit.feedback, audit.complianceScore,
            audit.createdAt ? new Date(audit.createdAt) : new Date()
          ]
        );
        return audit;
      } catch (err: any) {
        logOperational('AUDIT_OPERATION_FAILURE');
        throw err;
      }
    });
  }
}
