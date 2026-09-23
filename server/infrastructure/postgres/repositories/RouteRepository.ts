import { postgresClient } from '../client';
import { Route } from '../../../../src/types/pbx';
import { initialSeedData } from '../seedData';

export class RouteRepository {
  public static async listAll(): Promise<Route[]> {
    try {
      const res = await postgresClient.query(
        'SELECT * FROM routes ORDER BY priority ASC, name ASC'
      );
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
    } catch {
      return [...initialSeedData.routes];
    }
  }

  public static async listByTenant(tenantId: string): Promise<Route[]> {
    try {
      const res = await postgresClient.query(
        'SELECT * FROM routes WHERE tenant_id = $1 ORDER BY priority ASC, name ASC',
        [tenantId]
      );
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
    } catch {
      return initialSeedData.routes.filter(r => r.tenantId === tenantId);
    }
  }

  public static async findById(id: string, tenantId?: string): Promise<Route | null> {
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
    } catch {
      const r = initialSeedData.routes.find(route => route.id === id && (!tenantId || route.tenantId === tenantId));
      return r ? { ...r } : null;
    }
  }

  public static async save(route: Route): Promise<Route> {
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
          is_active = EXCLUDED.is_active,
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
    } catch {
      const idx = initialSeedData.routes.findIndex(r => r.id === route.id);
      if (idx !== -1) {
        initialSeedData.routes[idx] = { ...route };
      } else {
        initialSeedData.routes.push({ ...route });
      }
    }
    return route;
  }

  public static async delete(id: string, tenantId?: string): Promise<boolean> {
    try {
      let query = 'DELETE FROM routes WHERE id = $1';
      const params: any[] = [id];
      if (tenantId) {
        query += ' AND tenant_id = $2';
        params.push(tenantId);
      }
      const res = await postgresClient.query(query, params);
      return (res.rowCount ?? 0) > 0;
    } catch {
      const idx = initialSeedData.routes.findIndex(r => r.id === id && (!tenantId || r.tenantId === tenantId));
      if (idx !== -1) {
        initialSeedData.routes.splice(idx, 1);
        return true;
      }
      return false;
    }
  }
}
