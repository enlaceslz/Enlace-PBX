import {logOperational} from '../../security/OperationalLog.js';
import { postgresClient } from '../client.js';
import { toSafeIsoStringOrNow } from '../dateUtils.js';
import { AiTool, AiProvider } from '../../../../src/types/pbx.js';
import { TenantContext } from '../../auth/tenantContext.js';

export class AiToolRepository {
  public static async listAll(): Promise<AiTool[]> {
    return this.listAllTools();
  }

  public static async listAllTools(): Promise<AiTool[]> {
    return postgresClient.executeGlobalScoped(async (client) => {
      try {
        const res = await client.query(
          'SELECT * FROM ai_tools ORDER BY name ASC'
        );
        return res.rows.map(row => ({
          id: row.id,
          tenantId: row.tenant_id,
          name: row.name,
          description: row.description,
          endpoint: row.endpoint || '',
          method: (row.method || 'POST') as 'GET' | 'POST',
          requiresConfirmation: row.requires_confirmation ?? false,
          schemaJson: typeof row.schema_json === 'string' ? JSON.parse(row.schema_json) : (row.schema_json || {}),
          mockResponse: typeof row.mock_response === 'string' ? JSON.parse(row.mock_response) : (row.mock_response || {}),
        }));
      } catch (err: any) {
        logOperational('DB_OPERATION_FAILURE');
        throw err;
      }
    });
  }

  public static async listAllProviders(): Promise<AiProvider[]> {
    return postgresClient.executeGlobalScoped(async (client) => {
      try {
        const res = await client.query(
          'SELECT * FROM ai_providers ORDER BY name ASC'
        );
        return res.rows.map(row => ({
          id: row.id,
          tenantId: row.tenant_id,
          name: row.name,
          providerType: row.provider_type as any,
          baseUrl: row.base_url || undefined,
          apiKeyMasked: row.api_key_masked,
          googleProjectId: row.google_project_id || undefined,
          googleLocation: row.google_location || undefined,
          defaultModel: row.default_model,
          defaultVoice: row.default_voice,
          defaultTemperature: parseFloat(row.default_temperature || '0.7'),
          isActive: row.is_active ?? true,
          updatedAt: toSafeIsoStringOrNow(row.updated_at),
        }));
      } catch (err: any) {
        logOperational('DB_OPERATION_FAILURE');
        throw err;
      }
    });
  }

  public static async listProviders(contextOrTenant: TenantContext | string): Promise<AiProvider[]> {
    return postgresClient.executeTenantScoped(contextOrTenant, async (client, ctx) => {
      try {
        const res = await client.query(
          'SELECT * FROM ai_providers WHERE tenant_id = $1 ORDER BY name ASC', [ctx.tenantId]
        );
        return res.rows.map(row => ({
          id: row.id,
          tenantId: row.tenant_id,
          name: row.name,
          providerType: row.provider_type as any,
          baseUrl: row.base_url || undefined,
          apiKeyMasked: row.api_key_masked,
          googleProjectId: row.google_project_id || undefined,
          googleLocation: row.google_location || undefined,
          defaultModel: row.default_model,
          defaultVoice: row.default_voice,
          defaultTemperature: parseFloat(row.default_temperature || '0.7'),
          isActive: row.is_active ?? true,
          updatedAt: toSafeIsoStringOrNow(row.updated_at),
        }));
      } catch (err: any) {
        logOperational('DB_OPERATION_FAILURE');
        throw err;
      }
    });
  }

  public static async listByTenant(contextOrTenant: TenantContext | string): Promise<AiTool[]> {
    return this.listToolsByTenant(contextOrTenant);
  }

  public static async listToolsByTenant(contextOrTenant: TenantContext | string): Promise<AiTool[]> {
    return postgresClient.executeTenantScoped(contextOrTenant, async (client, ctx) => {
      try {
        const res = await client.query(
          'SELECT * FROM ai_tools WHERE tenant_id = $1 ORDER BY name ASC',
          [ctx.tenantId]
        );
        return res.rows.map(row => ({
          id: row.id,
          tenantId: row.tenant_id,
          name: row.name,
          description: row.description,
          endpoint: row.endpoint || '',
          method: (row.method || 'POST') as 'GET' | 'POST',
          requiresConfirmation: row.requires_confirmation ?? false,
          schemaJson: typeof row.schema_json === 'string' ? JSON.parse(row.schema_json) : (row.schema_json || {}),
          mockResponse: typeof row.mock_response === 'string' ? JSON.parse(row.mock_response) : (row.mock_response || {}),
        }));
      } catch (err: any) {
        logOperational('DB_OPERATION_FAILURE');
        throw err;
      }
    });
  }

  public static async save(tool: any, contextOrTenant?: TenantContext | string): Promise<AiTool> {
    const target = contextOrTenant || tool.tenantId;
    if (!target) {
      throw new Error('Tenant ID é obrigatório para salvar AiTool.');
    }
    return this.saveTool(target, { ...tool, tenantId: typeof target === 'string' ? target : target.tenantId });
  }

  public static async saveTool(contextOrTenant: TenantContext | string, tool: AiTool): Promise<AiTool> {
    return postgresClient.executeTenantScoped(contextOrTenant, async (client, ctx) => {
      try {
        await client.query(
          `INSERT INTO ai_tools (id, tenant_id, name, description, endpoint, method, requires_confirmation, schema_json)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
           ON CONFLICT (id) DO UPDATE SET
             name = EXCLUDED.name,
             description = EXCLUDED.description,
             endpoint = EXCLUDED.endpoint,
             method = EXCLUDED.method,
             requires_confirmation = EXCLUDED.requires_confirmation,
             schema_json = EXCLUDED.schema_json`,
          [
            tool.id,
            ctx.tenantId,
            tool.name,
            tool.description,
            tool.endpoint,
            tool.method || 'POST',
            tool.requiresConfirmation ?? false,
            JSON.stringify(tool.schemaJson || {})
          ]
        );
        return tool;
      } catch (err: any) {
        logOperational('DB_OPERATION_FAILURE');
        throw err;
      }
    });
  }

  public static async delete(id: string, contextOrTenant?: TenantContext | string): Promise<boolean> {
    if (!contextOrTenant || (typeof contextOrTenant === 'string' && contextOrTenant.trim() === '')) {
      throw new Error('TENANT_REQUIRED: Deleção de ferramenta de IA requer tenantId explícito (Fail-Closed).');
    }
    return this.deleteTool(id, contextOrTenant);
  }

  public static async deleteTool(id: string, contextOrTenant: TenantContext | string): Promise<boolean> {
    return postgresClient.executeTenantScoped(contextOrTenant, async (client, ctx) => {
      try {
        const res = await client.query(
          'DELETE FROM ai_tools WHERE id = $1 AND tenant_id = $2',
          [id, ctx.tenantId]
        );
        return (res.rowCount ?? 0) > 0;
      } catch (err: any) {
        logOperational('DB_OPERATION_FAILURE');
        throw err;
      }
    });
  }

  public static async deleteAnyForSuperAdmin(id: string): Promise<boolean> {
    return postgresClient.executeGlobalScoped(async (client) => {
      try {
        const res = await client.query('DELETE FROM ai_tools WHERE id = $1', [id]);
        return (res.rowCount ?? 0) > 0;
      } catch (err: any) {
        logOperational('DB_OPERATION_FAILURE');
        throw err;
      }
    });
  }

  public static async findById(id: string, contextOrTenant?: TenantContext | string): Promise<AiTool | null> {
    if (!contextOrTenant || (typeof contextOrTenant === 'string' && contextOrTenant.trim() === '')) {
      // Regra Fail-Closed CS-148/CS-199: Tenant ausente produz recusa estrita de recurso
      return null;
    }
    return postgresClient.executeTenantScoped(contextOrTenant, async (client, ctx) => {
      try {
        const res = await client.query(
          'SELECT * FROM ai_tools WHERE id = $1 AND tenant_id = $2',
          [id, ctx.tenantId]
        );
        if (res.rows.length > 0) {
          const row = res.rows[0];
          return {
            id: row.id,
            tenantId: row.tenant_id,
            name: row.name,
            description: row.description,
            endpoint: row.endpoint || '',
            method: (row.method || 'POST') as 'GET' | 'POST',
            requiresConfirmation: row.requires_confirmation ?? false,
            schemaJson: typeof row.schema_json === 'string' ? JSON.parse(row.schema_json) : (row.schema_json || {}),
            mockResponse: typeof row.mock_response === 'string' ? JSON.parse(row.mock_response) : (row.mock_response || {}),
          };
        }
        return null;
      } catch (err: any) {
        logOperational('DB_OPERATION_FAILURE');
        throw err;
      }
    });
  }

  public static async findAnyByIdForSuperAdmin(id: string): Promise<AiTool | null> {
    return postgresClient.executeGlobalScoped(async (client) => {
      try {
        const res = await client.query('SELECT * FROM ai_tools WHERE id = $1', [id]);
        if (res.rows.length > 0) {
          const row = res.rows[0];
          return {
            id: row.id,
            tenantId: row.tenant_id,
            name: row.name,
            description: row.description,
            endpoint: row.endpoint || '',
            method: (row.method || 'POST') as 'GET' | 'POST',
            requiresConfirmation: row.requires_confirmation ?? false,
            schemaJson: typeof row.schema_json === 'string' ? JSON.parse(row.schema_json) : (row.schema_json || {}),
            mockResponse: typeof row.mock_response === 'string' ? JSON.parse(row.mock_response) : (row.mock_response || {}),
          };
        }
        return null;
      } catch (err: any) {
        logOperational('DB_OPERATION_FAILURE');
        throw err;
      }
    });
  }
}
