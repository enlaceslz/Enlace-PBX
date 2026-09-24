import { postgresClient } from '../client';
import { Tenant } from '../../../../src/types/pbx';

export class TenantRepository {
  public static async findById(id: string): Promise<Tenant | null> {
    try {
      const res = await postgresClient.query('SELECT * FROM tenants WHERE id = $1', [id]);
      if (res.rows.length > 0) {
        const row = res.rows[0];
        return {
          id: row.id,
          name: row.name,
          cnpj: row.cnpj || '',
          plan: row.plan,
          maxExtensions: row.max_extensions,
          maxTrunks: row.max_trunks,
          aiCreditsUsd: parseFloat(row.ai_credits_usd || '0'),
          createdAt: row.created_at ? row.created_at.toISOString() : new Date().toISOString(),
          antiFraud: typeof row.anti_fraud === 'string' ? JSON.parse(row.anti_fraud) : (row.anti_fraud || {}),
        };
      }
      return null;
    } catch (err: any) {
      console.error('[TenantRepository.findById] Erro no PostgreSQL:', err?.message || err);
      throw err;
    }
  }

  public static async listAll(): Promise<Tenant[]> {
    try {
      const res = await postgresClient.query('SELECT * FROM tenants ORDER BY name ASC');
      return res.rows.map(row => ({
        id: row.id,
        name: row.name,
        cnpj: row.cnpj || '',
        plan: row.plan,
        maxExtensions: row.max_extensions,
        maxTrunks: row.max_trunks,
        aiCreditsUsd: parseFloat(row.ai_credits_usd || '0'),
        createdAt: row.created_at ? row.created_at.toISOString() : new Date().toISOString(),
        antiFraud: typeof row.anti_fraud === 'string' ? JSON.parse(row.anti_fraud) : (row.anti_fraud || {}),
      }));
    } catch (err: any) {
      console.error('[TenantRepository.listAll] Erro no PostgreSQL:', err?.message || err);
      throw err;
    }
  }

  public static async save(tenant: Tenant): Promise<Tenant> {
    try {
      await postgresClient.query(
        `INSERT INTO tenants (id, name, cnpj, plan, max_extensions, max_trunks, ai_credits_usd, anti_fraud)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         ON CONFLICT (id) DO UPDATE
         SET name = EXCLUDED.name,
             cnpj = EXCLUDED.cnpj,
             plan = EXCLUDED.plan,
             max_extensions = EXCLUDED.max_extensions,
             max_trunks = EXCLUDED.max_trunks,
             ai_credits_usd = EXCLUDED.ai_credits_usd,
             anti_fraud = EXCLUDED.anti_fraud,
             updated_at = CURRENT_TIMESTAMP`,
        [
          tenant.id,
          tenant.name,
          tenant.cnpj || '',
          tenant.plan || 'pro',
          tenant.maxExtensions || 50,
          tenant.maxTrunks || 10,
          tenant.aiCreditsUsd || 0,
          JSON.stringify(tenant.antiFraud || {})
        ]
      );
      return tenant;
    } catch (err: any) {
      console.error('[TenantRepository.save] Erro no PostgreSQL:', err?.message || err);
      throw err;
    }
  }

  public static async delete(id: string): Promise<boolean> {
    try {
      const res = await postgresClient.query('DELETE FROM tenants WHERE id = $1', [id]);
      return (res.rowCount ?? 0) > 0;
    } catch (err: any) {
      console.error('[TenantRepository.delete] Erro no PostgreSQL:', err?.message || err);
      throw err;
    }
  }
}
