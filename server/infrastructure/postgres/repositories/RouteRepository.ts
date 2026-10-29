import {logOperational} from '../../security/OperationalLog.js';
import { postgresClient } from '../client.js';
import { Route } from '../../../../src/types/pbx.js';
import { TenantContext } from '../../auth/tenantContext.js';

export class RouteRepository {
  public static async listAll(): Promise<Route[]> {
    return this.listAllGlobalForSuperAdmin();
  }

  public static async listAllGlobalForSuperAdmin(): Promise<Route[]> {
    return postgresClient.executeGlobalScoped(async (client) => {
      try {
        const res = await client.query(
          'SELECT * FROM routes ORDER BY priority ASC, name ASC'
        );
        return res.rows.map(row => ({
          id: row.id,
          tenantId: row.tenant_id,
          isActive:row.is_active,
          stripDigits:row.strip_digits,
          name: row.name,
          type: (row.type || 'outbound') as 'outbound' | 'inbound',
          pattern: row.pattern,
          prefixRemove: row.strip_digits ? String(row.strip_digits) : undefined,
          prepend: row.prepend_digits || undefined,
          trunkId: row.trunk_id,
          failoverTrunkId: row.failover_trunk_id || undefined,
          priority: row.priority ?? 1,
          isCliItx: row.is_cli_itx || false,
          callerIdOverride: row.caller_id_override || undefined,
          extensionOverrides: typeof row.extension_overrides === 'string'
            ? JSON.parse(row.extension_overrides)
            : (row.extension_overrides || []),
          destinationType: (row.destination_type || 'trunk') as any,
          destinationId: row.destination_id || (row.trunk_id || ''),
        }));
      } catch (err: any) {
        logOperational('DB_OPERATION_FAILURE');
        throw err;
      }
    });
  }

  public static async listByTenant(contextOrTenant: TenantContext | string): Promise<Route[]> {
    return postgresClient.executeTenantScoped(contextOrTenant, async (client, ctx) => {
      try {
        const res = await client.query(
          'SELECT * FROM routes WHERE tenant_id = $1 ORDER BY priority ASC, name ASC',
          [ctx.tenantId]
        );
        return res.rows.map(row => ({
          id: row.id,
          tenantId: row.tenant_id,
          isActive:row.is_active,
          stripDigits:row.strip_digits,
          name: row.name,
          type: (row.type || 'outbound') as 'outbound' | 'inbound',
          pattern: row.pattern,
          prefixRemove: row.strip_digits ? String(row.strip_digits) : undefined,
          prepend: row.prepend_digits || undefined,
          trunkId: row.trunk_id,
          failoverTrunkId: row.failover_trunk_id || undefined,
          priority: row.priority ?? 1,
          isCliItx: row.is_cli_itx || false,
          callerIdOverride: row.caller_id_override || undefined,
          extensionOverrides: typeof row.extension_overrides === 'string'
            ? JSON.parse(row.extension_overrides)
            : (row.extension_overrides || []),
          destinationType: (row.destination_type || 'trunk') as any,
          destinationId: row.destination_id || (row.trunk_id || ''),
        }));
      } catch (err: any) {
        logOperational('DB_OPERATION_FAILURE');
        throw err;
      }
    });
  }

  public static async findById(id: string, contextOrTenant?: TenantContext | string): Promise<Route | null> {
    if (!contextOrTenant || (typeof contextOrTenant === 'string' && contextOrTenant.trim() === '')) {
      // Regra Fail-Closed CS-148/CS-149: Tenant ausente produz recusa estrita de recurso
      return null;
    }
    return postgresClient.executeTenantScoped(contextOrTenant, async (client, ctx) => {
      try {
        const res = await client.query(
          'SELECT * FROM routes WHERE id = $1 AND tenant_id = $2',
          [id, ctx.tenantId]
        );
        if (res.rows.length > 0) {
          const row = res.rows[0];
          return {
            id: row.id,
            tenantId: row.tenant_id,
          isActive:row.is_active,
          stripDigits:row.strip_digits,
            name: row.name,
            type: (row.type || 'outbound') as any,
            pattern: row.pattern,
            prefixRemove: row.strip_digits ? String(row.strip_digits) : undefined,
            prepend: row.prepend_digits || undefined,
            trunkId: row.trunk_id,
            failoverTrunkId: row.failover_trunk_id || undefined,
            priority: row.priority ?? 1,
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
        logOperational('DB_OPERATION_FAILURE');
        throw err;
      }
    });
  }

  public static async findAnyByIdForSuperAdmin(id: string): Promise<Route | null> {
    return postgresClient.executeGlobalScoped(async (client) => {
      try {
        const res = await client.query('SELECT * FROM routes WHERE id = $1', [id]);
        if (res.rows.length > 0) {
          const row = res.rows[0];
          return {
            id: row.id,
            tenantId: row.tenant_id,
          isActive:row.is_active,
          stripDigits:row.strip_digits,
            name: row.name,
            type: (row.type || 'outbound') as any,
            pattern: row.pattern,
            prefixRemove: row.strip_digits ? String(row.strip_digits) : undefined,
            prepend: row.prepend_digits || undefined,
            trunkId: row.trunk_id,
            failoverTrunkId: row.failover_trunk_id || undefined,
            priority: row.priority ?? 1,
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
        logOperational('DB_OPERATION_FAILURE');
        throw err;
      }
    });
  }

  public static async save(route: Route, contextOrTenant?: TenantContext | string): Promise<Route> {
    const target = contextOrTenant || route.tenantId;
    return postgresClient.executeTenantScoped(target, async (client, ctx) => {
      try {
        await client.query(
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
            ctx.tenantId,
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
        return route;
      } catch (err: any) {
        logOperational('DB_OPERATION_FAILURE');
        throw err;
      }
    });
  }

  public static async delete(id: string, contextOrTenant: TenantContext | string): Promise<boolean> {
    return postgresClient.executeTenantScoped(contextOrTenant, async (client, ctx) => {
      try {
        const res = await client.query(
          'DELETE FROM routes WHERE id = $1 AND tenant_id = $2',
          [id, ctx.tenantId]
        );
        return (res.rowCount ?? 0) > 0;
      } catch (err: any) {
        logOperational('DB_OPERATION_FAILURE');
        throw err;
      }
    });
  }
}
