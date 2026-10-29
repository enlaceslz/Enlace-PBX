import {logOperational} from '../../security/OperationalLog.js';
import { postgresClient } from '../client.js';
import { Ivr } from '../../../../src/types/pbx.js';
import { TenantContext } from '../../auth/tenantContext.js';

export class IvrRepository {
  public static async listAll(): Promise<Ivr[]> {
    return this.listAllGlobalForSuperAdmin();
  }

  public static async listAllGlobalForSuperAdmin(): Promise<Ivr[]> {
    return postgresClient.executeGlobalScoped(async (client) => {
      try {
        const res = await client.query('SELECT * FROM ivrs ORDER BY number ASC');
        return res.rows.map(row => ({
          id: row.id,
          tenantId: row.tenant_id,
          name: row.name,
          number: row.number,
          audioPrompt: row.audio_prompt,
          timeoutSeconds: row.timeout_seconds || 10,
          invalidRetries: row.invalid_retries || 3,
          options: typeof row.options === 'string' ? JSON.parse(row.options) : (row.options || []),
          flow: typeof row.flow === 'string' ? JSON.parse(row.flow) : (row.flow || undefined),
        }));
      } catch (err: any) {
        logOperational('DB_OPERATION_FAILURE');
        throw err;
      }
    });
  }

  public static async listByTenant(contextOrTenant: TenantContext | string): Promise<Ivr[]> {
    return postgresClient.executeTenantScoped(contextOrTenant, async (client, ctx) => {
      try {
        const res = await client.query(
          'SELECT * FROM ivrs WHERE tenant_id = $1 ORDER BY number ASC',
          [ctx.tenantId]
        );
        return res.rows.map(row => ({
          id: row.id,
          tenantId: row.tenant_id,
          name: row.name,
          number: row.number,
          audioPrompt: row.audio_prompt,
          timeoutSeconds: row.timeout_seconds || 10,
          invalidRetries: row.invalid_retries || 3,
          options: typeof row.options === 'string' ? JSON.parse(row.options) : (row.options || []),
          flow: typeof row.flow === 'string' ? JSON.parse(row.flow) : (row.flow || undefined),
        }));
      } catch (err: any) {
        logOperational('DB_OPERATION_FAILURE');
        throw err;
      }
    });
  }

  public static async findById(id: string, contextOrTenant?: TenantContext | string): Promise<Ivr | null> {
    if (!contextOrTenant || (typeof contextOrTenant === 'string' && contextOrTenant.trim() === '')) {
      // Regra Fail-Closed CS-199: Tenant ausente produz recusa estrita de recurso
      return null;
    }
    return postgresClient.executeTenantScoped(contextOrTenant, async (client, ctx) => {
      try {
        const res = await client.query(
          'SELECT * FROM ivrs WHERE id = $1 AND tenant_id = $2',
          [id, ctx.tenantId]
        );
        if (res.rows.length > 0) {
          const row = res.rows[0];
          return {
            id: row.id,
            tenantId: row.tenant_id,
            name: row.name,
            number: row.number,
            audioPrompt: row.audio_prompt,
            timeoutSeconds: row.timeout_seconds || 10,
            invalidRetries: row.invalid_retries || 3,
            options: typeof row.options === 'string' ? JSON.parse(row.options) : (row.options || []),
            flow: typeof row.flow === 'string' ? JSON.parse(row.flow) : (row.flow || undefined),
          };
        }
        return null;
      } catch (err: any) {
        logOperational('DB_OPERATION_FAILURE');
        throw err;
      }
    });
  }

  public static async findAnyByIdForSuperAdmin(id: string): Promise<Ivr | null> {
    return postgresClient.executeGlobalScoped(async (client) => {
      try {
        const res = await client.query('SELECT * FROM ivrs WHERE id = $1', [id]);
        if (res.rows.length > 0) {
          const row = res.rows[0];
          return {
            id: row.id,
            tenantId: row.tenant_id,
            name: row.name,
            number: row.number,
            audioPrompt: row.audio_prompt,
            timeoutSeconds: row.timeout_seconds || 10,
            invalidRetries: row.invalid_retries || 3,
            options: typeof row.options === 'string' ? JSON.parse(row.options) : (row.options || []),
            flow: typeof row.flow === 'string' ? JSON.parse(row.flow) : (row.flow || undefined),
          };
        }
        return null;
      } catch (err: any) {
        logOperational('DB_OPERATION_FAILURE');
        throw err;
      }
    });
  }

  public static async save(ivr: Ivr, contextOrTenant?: TenantContext | string): Promise<Ivr> {
    const target = contextOrTenant || ivr.tenantId;
    return postgresClient.executeTenantScoped(target, async (client, ctx) => {
      try {
        await client.query(
          `INSERT INTO ivrs (
            id, tenant_id, name, number, audio_prompt, timeout_seconds,
            invalid_retries, options, flow
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
          ON CONFLICT (id) DO UPDATE SET
            name = EXCLUDED.name,
            number = EXCLUDED.number,
            audio_prompt = EXCLUDED.audio_prompt,
            timeout_seconds = EXCLUDED.timeout_seconds,
            invalid_retries = EXCLUDED.invalid_retries,
            options = EXCLUDED.options,
            flow = EXCLUDED.flow,
            updated_at = CURRENT_TIMESTAMP`,
          [
            ivr.id,
            ctx.tenantId,
            ivr.name,
            ivr.number,
            ivr.audioPrompt || '',
            ivr.timeoutSeconds || 10,
            ivr.invalidRetries || 3,
            JSON.stringify(ivr.options || []),
            ivr.flow ? JSON.stringify(ivr.flow) : null
          ]
        );
        return ivr;
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
          'DELETE FROM ivrs WHERE id = $1 AND tenant_id = $2',
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
