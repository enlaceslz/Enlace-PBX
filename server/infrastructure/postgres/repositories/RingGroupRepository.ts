import {logOperational} from '../../security/OperationalLog.js';
import { postgresClient } from '../client.js';
import { RingGroup } from '../../../../src/types/pbx.js';
import { TenantContext } from '../../auth/tenantContext.js';

export class RingGroupRepository {
  public static async listAll(): Promise<RingGroup[]> {
    return this.listAllGlobalForSuperAdmin();
  }

  public static async listAllGlobalForSuperAdmin(): Promise<RingGroup[]> {
    return postgresClient.executeGlobalScoped(async (client) => {
      try {
        const res = await client.query('SELECT * FROM ring_groups ORDER BY number ASC');
        return res.rows.map(row => ({
          id: row.id,
          tenantId: row.tenant_id,
          name: row.name,
          number: row.number,
          strategy: row.strategy || 'ringall',
          timeoutSeconds: row.timeout_seconds || 25,
          members: typeof row.extensions === 'string' ? JSON.parse(row.extensions) : (row.extensions || []),
          failoverDestination: row.fallback_target || 'voicemail',
        }));
      } catch (err: any) {
        logOperational('DB_OPERATION_FAILURE');
        throw err;
      }
    });
  }

  public static async listByTenant(contextOrTenant: TenantContext | string): Promise<RingGroup[]> {
    return postgresClient.executeTenantScoped(contextOrTenant, async (client, ctx) => {
      try {
        const res = await client.query(
          'SELECT * FROM ring_groups WHERE tenant_id = $1 ORDER BY number ASC',
          [ctx.tenantId]
        );
        return res.rows.map(row => ({
          id: row.id,
          tenantId: row.tenant_id,
          name: row.name,
          number: row.number,
          strategy: row.strategy || 'ringall',
          timeoutSeconds: row.timeout_seconds || 25,
          members: typeof row.extensions === 'string' ? JSON.parse(row.extensions) : (row.extensions || []),
          failoverDestination: row.fallback_target || 'voicemail',
        }));
      } catch (err: any) {
        logOperational('DB_OPERATION_FAILURE');
        throw err;
      }
    });
  }

  public static async findById(id: string, contextOrTenant?: TenantContext | string): Promise<RingGroup | null> {
    if (!contextOrTenant || (typeof contextOrTenant === 'string' && contextOrTenant.trim() === '')) {
      // Regra Fail-Closed CS-199: Tenant ausente produz recusa estrita de recurso
      return null;
    }
    return postgresClient.executeTenantScoped(contextOrTenant, async (client, ctx) => {
      try {
        const res = await client.query(
          'SELECT * FROM ring_groups WHERE id = $1 AND tenant_id = $2',
          [id, ctx.tenantId]
        );
        if (res.rows.length > 0) {
          const row = res.rows[0];
          return {
            id: row.id,
            tenantId: row.tenant_id,
            name: row.name,
            number: row.number,
            strategy: row.strategy || 'ringall',
            timeoutSeconds: row.timeout_seconds || 25,
            members: typeof row.extensions === 'string' ? JSON.parse(row.extensions) : (row.extensions || []),
            failoverDestination: row.fallback_target || 'voicemail',
          };
        }
        return null;
      } catch (err: any) {
        logOperational('DB_OPERATION_FAILURE');
        throw err;
      }
    });
  }

  public static async findAnyByIdForSuperAdmin(id: string): Promise<RingGroup | null> {
    return postgresClient.executeGlobalScoped(async (client) => {
      try {
        const res = await client.query('SELECT * FROM ring_groups WHERE id = $1', [id]);
        if (res.rows.length > 0) {
          const row = res.rows[0];
          return {
            id: row.id,
            tenantId: row.tenant_id,
            name: row.name,
            number: row.number,
            strategy: row.strategy || 'ringall',
            timeoutSeconds: row.timeout_seconds || 25,
            members: typeof row.extensions === 'string' ? JSON.parse(row.extensions) : (row.extensions || []),
            failoverDestination: row.fallback_target || 'voicemail',
          };
        }
        return null;
      } catch (err: any) {
        logOperational('DB_OPERATION_FAILURE');
        throw err;
      }
    });
  }

  public static async save(group: RingGroup, contextOrTenant?: TenantContext | string): Promise<RingGroup> {
    const target = contextOrTenant || group.tenantId;
    return postgresClient.executeTenantScoped(target, async (client, ctx) => {
      try {
        await client.query(
          `INSERT INTO ring_groups (id, tenant_id, name, number, strategy, timeout_seconds, extensions, fallback_target)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
           ON CONFLICT (id) DO UPDATE SET
             name = EXCLUDED.name,
             number = EXCLUDED.number,
             strategy = EXCLUDED.strategy,
             timeout_seconds = EXCLUDED.timeout_seconds,
             extensions = EXCLUDED.extensions,
             fallback_target = EXCLUDED.fallback_target,
             updated_at = CURRENT_TIMESTAMP`,
          [
            group.id,
            ctx.tenantId,
            group.name,
            group.number,
            group.strategy || 'ringall',
            group.timeoutSeconds || 25,
            JSON.stringify(group.members || []),
            group.failoverDestination || 'voicemail'
          ]
        );
        return group;
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
          'DELETE FROM ring_groups WHERE id = $1 AND tenant_id = $2',
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
