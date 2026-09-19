import { postgresClient } from '../client';
import { db, Tenant } from '../../../db';

export class TenantRepository {
  public static async findById(id: string): Promise<Tenant | null> {
    if (postgresClient.isConnected()) {
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
            aiCreditsUsd: parseFloat(row.ai_credits_usd),
            createdAt: row.created_at ? row.created_at.toISOString() : new Date().toISOString(),
            antiFraud: row.anti_fraud || {},
          };
        }
        return null;
      } catch (err: any) {
        console.error('[TenantRepository] Erro ao buscar tenant no Postgres:', err.message);
      }
    }
    return db.tenants.find(t => t.id === id) || null;
  }

  public static async listAll(): Promise<Tenant[]> {
    if (postgresClient.isConnected()) {
      try {
        const res = await postgresClient.query('SELECT * FROM tenants ORDER BY name ASC');
        return res.rows.map(row => ({
          id: row.id,
          name: row.name,
          cnpj: row.cnpj || '',
          plan: row.plan,
          maxExtensions: row.max_extensions,
          maxTrunks: row.max_trunks,
          aiCreditsUsd: parseFloat(row.ai_credits_usd),
          createdAt: row.created_at ? row.created_at.toISOString() : new Date().toISOString(),
          antiFraud: row.anti_fraud || {},
        }));
      } catch (err: any) {
        console.error('[TenantRepository] Erro ao listar tenants no Postgres:', err.message);
      }
    }
    return db.tenants;
  }

  public static async save(tenant: Tenant): Promise<Tenant> {
    if (postgresClient.isConnected()) {
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
            tenant.id, tenant.name, tenant.cnpj, tenant.plan,
            tenant.maxExtensions, tenant.maxTrunks, tenant.aiCreditsUsd,
            JSON.stringify(tenant.antiFraud || {})
          ]
        );
      } catch (err: any) {
        console.error('[TenantRepository] Erro ao salvar tenant no Postgres:', err.message);
      }
    }

    const idx = db.tenants.findIndex(t => t.id === tenant.id);
    if (idx >= 0) {
      db.tenants[idx] = tenant;
    } else {
      db.tenants.push(tenant);
    }
    return tenant;
  }
}
