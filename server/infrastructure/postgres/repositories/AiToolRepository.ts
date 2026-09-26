import { postgresClient } from '../client';
import { toSafeIsoStringOrNow } from '../dateUtils';
import { AiTool, AiProvider } from '../../../../src/types/pbx';

export class AiToolRepository {
  public static async listAll(): Promise<AiTool[]> {
    return this.listAllTools();
  }

  public static async listAllTools(): Promise<AiTool[]> {
    try {
      const res = await postgresClient.query(
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
      console.error('[AiToolRepository.listAllTools] Erro no PostgreSQL:', err?.message || err);
      throw err;
    }
  }

  public static async listAllProviders(): Promise<AiProvider[]> {
    try {
      const res = await postgresClient.query(
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
      console.error('[AiToolRepository.listAllProviders] Erro no PostgreSQL:', err?.message || err);
      throw err;
    }
  }

  public static async listByTenant(tenantId: string): Promise<AiTool[]> {
    return this.listToolsByTenant(tenantId);
  }

  public static async save(tool: any, tenantId?: string): Promise<AiTool> {
    const tId = tool.tenantId || tenantId;
    if (!tId) {
      throw new Error('Tenant ID é obrigatório para salvar AiTool.');
    }
    return this.saveTool(tId, { ...tool, tenantId: tId });
  }

  public static async delete(id: string, tenantId?: string): Promise<boolean> {
    if (tenantId) {
      return this.deleteTool(id, tenantId);
    }
    try {
      const res = await postgresClient.query('DELETE FROM ai_tools WHERE id = $1', [id]);
      return (res.rowCount ?? 0) > 0;
    } catch (err: any) {
      console.error('[AiToolRepository.delete] Erro no PostgreSQL:', err?.message || err);
      throw err;
    }
  }

  public static async listToolsByTenant(tenantId: string): Promise<AiTool[]> {
    try {
      const res = await postgresClient.query(
        'SELECT * FROM ai_tools WHERE tenant_id = $1 ORDER BY name ASC',
        [tenantId]
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
      console.error('[AiToolRepository.listToolsByTenant] Erro no PostgreSQL:', err?.message || err);
      throw err;
    }
  }

  public static async saveTool(tenantId: string, tool: AiTool): Promise<AiTool> {
    try {
      await postgresClient.query(
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
          tenantId,
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
      console.error('[AiToolRepository.saveTool] Erro no PostgreSQL:', err?.message || err);
      throw err;
    }
  }

  public static async deleteTool(id: string, tenantId: string): Promise<boolean> {
    try {
      const res = await postgresClient.query(
        'DELETE FROM ai_tools WHERE id = $1 AND tenant_id = $2',
        [id, tenantId]
      );
      return (res.rowCount ?? 0) > 0;
    } catch (err: any) {
      console.error('[AiToolRepository.deleteTool] Erro no PostgreSQL:', err?.message || err);
      throw err;
    }
  }

  public static async findById(id: string, tenantId?: string): Promise<AiTool | null> {
    try {
      let query = 'SELECT * FROM ai_tools WHERE id = $1';
      const params: any[] = [id];
      if (tenantId && tenantId.trim() !== '') {
        query += ' AND tenant_id = $2';
        params.push(tenantId.trim());
      }
      const res = await postgresClient.query(query, params);
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
      console.error('[AiToolRepository.findById] Erro no PostgreSQL:', err?.message || err);
      throw err;
    }
  }

  public static async findAnyByIdForSuperAdmin(id: string): Promise<AiTool | null> {
    return this.findById(id);
  }

  public static async findByName(name: string, tenantId: string): Promise<AiTool | null> {
    if (!tenantId || tenantId.trim() === '') {
      throw new Error('TENANT_REQUIRED: tenantId é obrigatório para consultar ferramenta por nome.');
    }
    try {
      const res = await postgresClient.query(
        'SELECT * FROM ai_tools WHERE name = $1 AND tenant_id = $2',
        [name, tenantId]
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
      console.error('[AiToolRepository.findByName] Erro no PostgreSQL:', err?.message || err);
      throw err;
    }
  }

  // Providers
  public static async listProviders(tenantId: string): Promise<AiProvider[]> {
    try {
      const res = await postgresClient.query(
        'SELECT * FROM ai_providers WHERE tenant_id = $1 ORDER BY name ASC',
        [tenantId]
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
      console.error('[AiToolRepository.listProviders] Erro no PostgreSQL:', err?.message || err);
      throw err;
    }
  }

  public static async saveProvider(provider: AiProvider): Promise<AiProvider> {
    try {
      await postgresClient.query(
        `INSERT INTO ai_providers (id, tenant_id, name, provider_type, base_url, api_key_masked, google_project_id, google_location, default_model, default_voice, default_temperature, is_active, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, CURRENT_TIMESTAMP)
         ON CONFLICT (id) DO UPDATE SET
           name = EXCLUDED.name,
           provider_type = EXCLUDED.provider_type,
           base_url = EXCLUDED.base_url,
           api_key_masked = EXCLUDED.api_key_masked,
           google_project_id = EXCLUDED.google_project_id,
           google_location = EXCLUDED.google_location,
           default_model = EXCLUDED.default_model,
           default_voice = EXCLUDED.default_voice,
           default_temperature = EXCLUDED.default_temperature,
           is_active = EXCLUDED.is_active,
           updated_at = CURRENT_TIMESTAMP`,
        [
          provider.id,
          provider.tenantId,
          provider.name,
          provider.providerType,
          provider.baseUrl || null,
          provider.apiKeyMasked,
          provider.googleProjectId || null,
          provider.googleLocation || null,
          provider.defaultModel || 'gemini-flash-latest',
          provider.defaultVoice || 'pt-BR-Wavenet-A',
          provider.defaultTemperature || 0.7,
          provider.isActive ?? true
        ]
      );
      return provider;
    } catch (err: any) {
      console.error('[AiToolRepository.saveProvider] Erro no PostgreSQL:', err?.message || err);
      throw err;
    }
  }
}
