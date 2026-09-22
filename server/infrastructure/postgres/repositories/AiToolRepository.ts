import { postgresClient } from '../client';
import { AiTool, AiProvider } from '../../../../src/types/pbx';

export class AiToolRepository {
  public static async listToolsByTenant(tenantId: string): Promise<AiTool[]> {
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
  }

  public static async saveTool(tenantId: string, tool: AiTool): Promise<AiTool> {
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
  }

  public static async deleteTool(id: string, tenantId: string): Promise<boolean> {
    const res = await postgresClient.query(
      'DELETE FROM ai_tools WHERE id = $1 AND tenant_id = $2',
      [id, tenantId]
    );
    return (res.rowCount ?? 0) > 0;
  }

  // Providers
  public static async listProviders(tenantId: string): Promise<AiProvider[]> {
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
      updatedAt: row.updated_at ? row.updated_at.toISOString() : new Date().toISOString(),
    }));
  }

  public static async saveProvider(provider: AiProvider): Promise<AiProvider> {
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
  }
}
