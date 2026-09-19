import { postgresClient } from '../client';
import { db, Route } from '../../../db';

export class RouteRepository {
  public static async listByTenant(tenantId: string): Promise<Route[]> {
    if (postgresClient.isConnected()) {
      try {
        const res = await postgresClient.query(
          'SELECT * FROM routes WHERE tenant_id = $1 ORDER BY priority ASC, name ASC',
          [tenantId]
        );
        if (res.rows.length > 0) {
          return res.rows.map(row => ({
            id: row.id,
            tenantId: row.tenant_id,
            name: row.name,
            type: (row.type || 'outbound') as 'outbound' | 'inbound',
            pattern: row.pattern,
            prefixRemove: row.strip_digits ? String(row.strip_digits) : undefined,
            prepend: row.prepend_digits || undefined,
            trunkId: row.trunk_id,
            failoverTrunkId: row.failover_trunk_id || undefined,
            priority: row.priority || 1,
            isCliItx: row.is_cli_itx || false,
            callerIdOverride: row.caller_id_override || undefined,
            extensionOverrides: typeof row.extension_overrides === 'string' 
              ? JSON.parse(row.extension_overrides) 
              : (row.extension_overrides || []),
            destinationType: (row.destination_type || 'trunk') as any,
            destinationId: row.destination_id || (row.trunk_id || ''),
          }));
        }
      } catch (err: any) {
        console.error('[RouteRepository] Erro ao listar rotas no PostgreSQL:', err.message);
      }
    }

    return db.routes.filter(r => r.tenantId === tenantId);
  }

  public static async findById(id: string, tenantId?: string): Promise<Route | null> {
    if (postgresClient.isConnected()) {
      try {
        let query = 'SELECT * FROM routes WHERE id = $1';
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
            type: (row.type || 'outbound') as any,
            pattern: row.pattern,
            prefixRemove: row.strip_digits ? String(row.strip_digits) : undefined,
            prepend: row.prepend_digits || undefined,
            trunkId: row.trunk_id,
            failoverTrunkId: row.failover_trunk_id || undefined,
            priority: row.priority || 1,
            isCliItx: row.is_cli_itx || false,
            callerIdOverride: row.caller_id_override || undefined,
            extensionOverrides: typeof row.extension_overrides === 'string' 
              ? JSON.parse(row.extension_overrides) 
              : (row.extension_overrides || []),
            destinationType: (row.destination_type || 'trunk') as any,
            destinationId: row.destination_id || (row.trunk_id || ''),
          };
        }
        return null;
      } catch (err: any) {
        console.error('[RouteRepository] Erro ao buscar rota por ID:', err.message);
      }
    }

    return db.routes.find(r => r.id === id && (!tenantId || r.tenantId === tenantId)) || null;
  }

  public static async save(route: Route): Promise<Route> {
    if (postgresClient.isConnected()) {
      try {
        await postgresClient.query(
          `INSERT INTO routes (
            id, tenant_id, name, pattern, trunk_id, failover_trunk_id,
            priority, strip_digits, prepend_digits, caller_id_override,
            is_cli_itx, extension_overrides, is_active
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
          ON CONFLICT (id) DO UPDATE SET
            name = EXCLUDED.name,
            pattern = EXCLUDED.pattern,
            trunk_id = EXCLUDED.trunk_id,
            failover_trunk_id = EXCLUDED.failover_trunk_id,
            priority = EXCLUDED.priority,
            strip_digits = EXCLUDED.strip_digits,
            prepend_digits = EXCLUDED.prepend_digits,
            caller_id_override = EXCLUDED.caller_id_override,
            is_cli_itx = EXCLUDED.is_cli_itx,
            extension_overrides = EXCLUDED.extension_overrides,
            updated_at = CURRENT_TIMESTAMP`,
          [
            route.id,
            route.tenantId,
            route.name,
            route.pattern,
            route.trunkId || null,
            route.failoverTrunkId || null,
            route.priority || 1,
            route.prefixRemove ? parseInt(route.prefixRemove, 10) : 0,
            route.prepend || '',
            route.callerIdOverride || null,
            route.isCliItx || false,
            JSON.stringify(route.extensionOverrides || []),
            true
          ]
        );
      } catch (err: any) {
        console.error('[RouteRepository] Erro ao salvar rota no PostgreSQL:', err.message);
      }
    }

    const idx = db.routes.findIndex(r => r.id === route.id);
    if (idx >= 0) {
      db.routes[idx] = route;
    } else {
      db.routes.push(route);
    }
    return route;
  }

  public static async delete(id: string, tenantId: string): Promise<boolean> {
    if (postgresClient.isConnected()) {
      try {
        await postgresClient.query(
          'DELETE FROM routes WHERE id = $1 AND tenant_id = $2',
          [id, tenantId]
        );
      } catch (err: any) {
        console.error('[RouteRepository] Erro ao deletar rota no PostgreSQL:', err.message);
      }
    }

    const initialLen = db.routes.length;
    db.routes = db.routes.filter(r => !(r.id === id && r.tenantId === tenantId));
    return db.routes.length < initialLen;
  }
}
