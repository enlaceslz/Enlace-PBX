import { postgresClient } from '../client.js';
import { toSafeIsoStringOrNow } from '../dateUtils.js';
import { OutboundCampaign } from '../../../../src/types/pbx.js';
import { TenantContext } from '../../auth/tenantContext.js';

export class CampaignRepository {
  public static async listAll(): Promise<OutboundCampaign[]> {
    return this.listAllGlobalForSuperAdmin();
  }

  public static async listAllGlobalForSuperAdmin(): Promise<OutboundCampaign[]> {
    return postgresClient.executeGlobalScoped(async (client) => {
      try {
        const res = await client.query(
          'SELECT * FROM campaigns ORDER BY created_at DESC'
        );
        return res.rows.map(row => ({
          id: row.id,
          tenantId: row.tenant_id,
          name: row.name,
          type: row.type || 'ai_voicebot',
          status: row.status || 'paused',
          aiAgentId: row.ai_agent_id || undefined,
          totalLeads: row.total_leads || 0,
          processedLeads: row.processed_leads || 0,
          successCount: row.success_count || 0,
          activeCalls: row.active_calls || 0,
          createdAt: toSafeIsoStringOrNow(row.created_at),
        }));
      } catch (err: any) {
        console.error('[CampaignRepository.listAllGlobalForSuperAdmin] Erro no PostgreSQL sob transação RLS:', err?.message || err);
        throw err;
      }
    });
  }

  public static async listByTenant(contextOrTenant: TenantContext | string): Promise<OutboundCampaign[]> {
    return postgresClient.executeTenantScoped(contextOrTenant, async (client, ctx) => {
      try {
        const res = await client.query(
          'SELECT * FROM campaigns WHERE tenant_id = $1 ORDER BY created_at DESC',
          [ctx.tenantId]
        );
        return res.rows.map(row => ({
          id: row.id,
          tenantId: row.tenant_id,
          name: row.name,
          type: row.type || 'ai_voicebot',
          status: row.status || 'paused',
          aiAgentId: row.ai_agent_id || undefined,
          totalLeads: row.total_leads || 0,
          processedLeads: row.processed_leads || 0,
          successCount: row.success_count || 0,
          activeCalls: row.active_calls || 0,
          createdAt: toSafeIsoStringOrNow(row.created_at),
        }));
      } catch (err: any) {
        console.error('[CampaignRepository.listByTenant] Erro no PostgreSQL sob transação RLS:', err?.message || err);
        throw err;
      }
    });
  }

  public static async findById(id: string, contextOrTenant?: TenantContext | string): Promise<OutboundCampaign | null> {
    if (!contextOrTenant || (typeof contextOrTenant === 'string' && contextOrTenant.trim() === '')) {
      // Regra Fail-Closed CS-199: Tenant ausente produz recusa estrita de recurso
      return null;
    }
    return postgresClient.executeTenantScoped(contextOrTenant, async (client, ctx) => {
      try {
        const res = await client.query(
          'SELECT * FROM campaigns WHERE id = $1 AND tenant_id = $2',
          [id, ctx.tenantId]
        );
        if (res.rows.length > 0) {
          const row = res.rows[0];
          return {
            id: row.id,
            tenantId: row.tenant_id,
            name: row.name,
            type: row.type || 'ai_voicebot',
            status: row.status || 'paused',
            aiAgentId: row.ai_agent_id || undefined,
            totalLeads: row.total_leads || 0,
            processedLeads: row.processed_leads || 0,
            successCount: row.success_count || 0,
            activeCalls: row.active_calls || 0,
            createdAt: toSafeIsoStringOrNow(row.created_at),
          };
        }
        return null;
      } catch (err: any) {
        console.error('[CampaignRepository.findById] Erro no PostgreSQL sob transação RLS:', err?.message || err);
        throw err;
      }
    });
  }

  public static async findAnyByIdForSuperAdmin(id: string): Promise<OutboundCampaign | null> {
    return postgresClient.executeGlobalScoped(async (client) => {
      try {
        const res = await client.query('SELECT * FROM campaigns WHERE id = $1', [id]);
        if (res.rows.length > 0) {
          const row = res.rows[0];
          return {
            id: row.id,
            tenantId: row.tenant_id,
            name: row.name,
            type: row.type || 'ai_voicebot',
            status: row.status || 'paused',
            aiAgentId: row.ai_agent_id || undefined,
            totalLeads: row.total_leads || 0,
            processedLeads: row.processed_leads || 0,
            successCount: row.success_count || 0,
            activeCalls: row.active_calls || 0,
            createdAt: toSafeIsoStringOrNow(row.created_at),
          };
        }
        return null;
      } catch (err: any) {
        console.error('[CampaignRepository.findAnyByIdForSuperAdmin] Erro no PostgreSQL sob transação RLS:', err?.message || err);
        throw err;
      }
    });
  }

  public static async save(campaign: OutboundCampaign, contextOrTenant?: TenantContext | string): Promise<OutboundCampaign> {
    const target = contextOrTenant || campaign.tenantId;
    return postgresClient.executeTenantScoped(target, async (client, ctx) => {
      try {
        await client.query(
          `INSERT INTO campaigns (id, tenant_id, name, type, status, ai_agent_id, total_leads, processed_leads, success_count, active_calls, created_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
           ON CONFLICT (id) DO UPDATE
           SET name = EXCLUDED.name,
               type = EXCLUDED.type,
               status = EXCLUDED.status,
               ai_agent_id = EXCLUDED.ai_agent_id,
               total_leads = EXCLUDED.total_leads,
               processed_leads = EXCLUDED.processed_leads,
               success_count = EXCLUDED.success_count,
               active_calls = EXCLUDED.active_calls,
               updated_at = CURRENT_TIMESTAMP`,
          [
            campaign.id, ctx.tenantId, campaign.name, campaign.type,
            campaign.status, campaign.aiAgentId || null, campaign.totalLeads || 0,
            campaign.processedLeads || 0, campaign.successCount || 0, campaign.activeCalls || 0,
            campaign.createdAt ? new Date(campaign.createdAt) : new Date()
          ]
        );
        return campaign;
      } catch (err: any) {
        console.error('[CampaignRepository.save] Erro no PostgreSQL sob transação RLS:', err?.message || err);
        throw err;
      }
    });
  }

  public static async delete(id: string, contextOrTenant: TenantContext | string): Promise<boolean> {
    return postgresClient.executeTenantScoped(contextOrTenant, async (client, ctx) => {
      try {
        const res = await client.query(
          'DELETE FROM campaigns WHERE id = $1 AND tenant_id = $2',
          [id, ctx.tenantId]
        );
        return (res.rowCount ?? 0) > 0;
      } catch (err: any) {
        console.error('[CampaignRepository.delete] Erro no PostgreSQL sob transação RLS:', err?.message || err);
        throw err;
      }
    });
  }
}
