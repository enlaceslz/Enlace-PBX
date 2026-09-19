import { postgresClient } from '../client';
import { OutboundCampaign } from '../../../../src/types/pbx';
import { initialSeedData } from '../seedData';

export class CampaignRepository {
  public static async listByTenant(tenantId: string): Promise<OutboundCampaign[]> {
    if (postgresClient.isConnected()) {
      try {
        const res = await postgresClient.query(
          'SELECT * FROM campaigns WHERE tenant_id = $1 ORDER BY created_at DESC',
          [tenantId]
        );
        if (res.rows.length > 0) {
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
            createdAt: row.created_at ? row.created_at.toISOString() : new Date().toISOString(),
          }));
        }
      } catch (err: any) {
        // Tabela campaigns pode não existir se migration não rodou ainda
      }
    }

    return initialSeedData.outboundCampaigns.filter(c => !c.tenantId || c.tenantId === tenantId);
  }

  public static async findById(id: string, tenantId?: string): Promise<OutboundCampaign | null> {
    if (postgresClient.isConnected()) {
      try {
        let query = 'SELECT * FROM campaigns WHERE id = $1';
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
            name: row.name,
            type: row.type || 'ai_voicebot',
            status: row.status || 'paused',
            aiAgentId: row.ai_agent_id || undefined,
            totalLeads: row.total_leads || 0,
            processedLeads: row.processed_leads || 0,
            successCount: row.success_count || 0,
            activeCalls: row.active_calls || 0,
            createdAt: row.created_at ? row.created_at.toISOString() : new Date().toISOString(),
          };
        }
      } catch (err: any) {
        // Tabela pode não existir
      }
    }

    return initialSeedData.outboundCampaigns.find(c => c.id === id && (!tenantId || c.tenantId === tenantId)) || null;
  }

  public static async save(campaign: OutboundCampaign): Promise<OutboundCampaign> {
    if (postgresClient.isConnected()) {
      try {
        await postgresClient.query(
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
            campaign.id, campaign.tenantId, campaign.name, campaign.type,
            campaign.status, campaign.aiAgentId || null, campaign.totalLeads,
            campaign.processedLeads, campaign.successCount, campaign.activeCalls,
            campaign.createdAt ? new Date(campaign.createdAt) : new Date()
          ]
        );
      } catch (err: any) {
        // Fallback silently if table not yet migrated
      }
    }

    const idx = initialSeedData.outboundCampaigns.findIndex(c => c.id === campaign.id);
    if (idx >= 0) {
      initialSeedData.outboundCampaigns[idx] = campaign;
    } else {
      initialSeedData.outboundCampaigns.push(campaign);
    }
    return campaign;
  }
}
