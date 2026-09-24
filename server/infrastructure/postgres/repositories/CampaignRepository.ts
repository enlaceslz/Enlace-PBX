import { postgresClient } from '../client';
import { OutboundCampaign } from '../../../../src/types/pbx';

export class CampaignRepository {
  public static async listAll(): Promise<OutboundCampaign[]> {
    try {
      const res = await postgresClient.query(
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
        createdAt: row.created_at ? row.created_at.toISOString() : new Date().toISOString(),
      }));
    } catch (err: any) {
      console.error('[CampaignRepository.listAll] Erro no PostgreSQL:', err?.message || err);
      throw err;
    }
  }

  public static async listByTenant(tenantId: string): Promise<OutboundCampaign[]> {
    try {
      const res = await postgresClient.query(
        'SELECT * FROM campaigns WHERE tenant_id = $1 ORDER BY created_at DESC',
        [tenantId]
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
        createdAt: row.created_at ? row.created_at.toISOString() : new Date().toISOString(),
      }));
    } catch (err: any) {
      console.error('[CampaignRepository.listByTenant] Erro no PostgreSQL:', err?.message || err);
      throw err;
    }
  }

  public static async findById(id: string, tenantId?: string): Promise<OutboundCampaign | null> {
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
      return null;
    } catch (err: any) {
      console.error('[CampaignRepository.findById] Erro no PostgreSQL:', err?.message || err);
      throw err;
    }
  }

  public static async save(campaign: OutboundCampaign): Promise<OutboundCampaign> {
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
          campaign.status, campaign.aiAgentId || null, campaign.totalLeads || 0,
          campaign.processedLeads || 0, campaign.successCount || 0, campaign.activeCalls || 0,
          campaign.createdAt ? new Date(campaign.createdAt) : new Date()
        ]
      );
      return campaign;
    } catch (err: any) {
      console.error('[CampaignRepository.save] Erro no PostgreSQL:', err?.message || err);
      throw err;
    }
  }

  public static async delete(id: string, tenantId?: string): Promise<boolean> {
    try {
      let query = 'DELETE FROM campaigns WHERE id = $1';
      const params: any[] = [id];
      if (tenantId) {
        query += ' AND tenant_id = $2';
        params.push(tenantId);
      }
      const res = await postgresClient.query(query, params);
      return (res.rowCount ?? 0) > 0;
    } catch (err: any) {
      console.error('[CampaignRepository.delete] Erro no PostgreSQL:', err?.message || err);
      throw err;
    }
  }
}
