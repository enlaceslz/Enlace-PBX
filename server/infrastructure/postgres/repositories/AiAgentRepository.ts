import {logOperational} from '../../security/OperationalLog.js';
import { postgresClient } from '../client.js';
import { AiAgent } from '../../../../src/types/pbx.js';
import { TenantContext } from '../../auth/tenantContext.js';

export class AiAgentRepository {
  public static async listAll(): Promise<AiAgent[]> {
    return this.listAllGlobalForSuperAdmin();
  }

  public static async listAllGlobalForSuperAdmin(): Promise<AiAgent[]> {
    return postgresClient.executeGlobalScoped(async (client) => {
      try {
        const res = await client.query('SELECT * FROM ai_agents ORDER BY name ASC');
        return res.rows.map(row => ({
          id: row.id,
          tenantId: row.tenant_id,
          name: row.name,
          description: row.description || '',
          providerId: row.provider_id || 'provider-gemini',
          model: row.model || 'gemini-flash-latest',
          voice: row.voice || 'pt-BR-Wavenet-A',
          voiceGender: (row.voice_gender || 'female') as any,
          avatarType: (row.avatar_type || 'octopus_ai') as any,
          language: row.language || 'pt-BR',
          systemInstruction: row.system_instruction || '',
          initialGreeting: row.initial_greeting || '',
          temperature: parseFloat(row.temperature ?? '0.7'),
          tools: typeof row.tools === 'string' ? JSON.parse(row.tools) : (row.tools || []),
          knowledgeSources: typeof row.knowledge_sources === 'string'
            ? JSON.parse(row.knowledge_sources)
            : (row.knowledge_sources || []),
          allowBargeIn: row.allow_barge_in ?? true,
          silenceTimeoutSeconds: row.silence_timeout_seconds || 3,
          maxSessionMinutes: row.max_session_minutes || 15,
          transferExtension: row.transfer_extension ?? '',
          fallbackAction: (row.fallback_action ?? 'hangup') as any,
          isActive: row.is_active ?? true,
        }));
      } catch (err: any) {
        logOperational('DB_OPERATION_FAILURE');
        throw err;
      }
    });
  }

  public static async listByTenant(contextOrTenant: TenantContext | string): Promise<AiAgent[]> {
    return postgresClient.executeTenantScoped(contextOrTenant, async (client, ctx) => {
      try {
        const res = await client.query(
          'SELECT * FROM ai_agents WHERE tenant_id = $1 ORDER BY name ASC',
          [ctx.tenantId]
        );
        return res.rows.map(row => ({
          id: row.id,
          tenantId: row.tenant_id,
          name: row.name,
          description: row.description || '',
          providerId: row.provider_id || 'provider-gemini',
          model: row.model || 'gemini-flash-latest',
          voice: row.voice || 'pt-BR-Wavenet-A',
          voiceGender: (row.voice_gender || 'female') as any,
          avatarType: (row.avatar_type || 'octopus_ai') as any,
          language: row.language || 'pt-BR',
          systemInstruction: row.system_instruction || '',
          initialGreeting: row.initial_greeting || '',
          temperature: parseFloat(row.temperature ?? '0.7'),
          tools: typeof row.tools === 'string' ? JSON.parse(row.tools) : (row.tools || []),
          knowledgeSources: typeof row.knowledge_sources === 'string'
            ? JSON.parse(row.knowledge_sources)
            : (row.knowledge_sources || []),
          allowBargeIn: row.allow_barge_in ?? true,
          silenceTimeoutSeconds: row.silence_timeout_seconds || 3,
          maxSessionMinutes: row.max_session_minutes || 15,
          transferExtension: row.transfer_extension ?? '',
          fallbackAction: (row.fallback_action ?? 'hangup') as any,
          isActive: row.is_active ?? true,
        }));
      } catch (err: any) {
        logOperational('DB_OPERATION_FAILURE');
        throw err;
      }
    });
  }

  public static async findById(id: string, contextOrTenant?: TenantContext | string): Promise<AiAgent | null> {
    if (!contextOrTenant || (typeof contextOrTenant === 'string' && contextOrTenant.trim() === '')) {
      // Regra Fail-Closed CS-199: Tenant ausente produz recusa estrita de recurso
      return null;
    }
    return postgresClient.executeTenantScoped(contextOrTenant, async (client, ctx) => {
      try {
        const res = await client.query(
          'SELECT * FROM ai_agents WHERE id = $1 AND tenant_id = $2',
          [id, ctx.tenantId]
        );
        if (res.rows.length > 0) {
          const row = res.rows[0];
          return {
            id: row.id,
            tenantId: row.tenant_id,
            name: row.name,
            description: row.description || '',
            providerId: row.provider_id || 'provider-gemini',
            model: row.model || 'gemini-flash-latest',
            voice: row.voice || 'pt-BR-Wavenet-A',
            voiceGender: (row.voice_gender || 'female') as any,
            avatarType: (row.avatar_type || 'octopus_ai') as any,
            language: row.language || 'pt-BR',
            systemInstruction: row.system_instruction || '',
            initialGreeting: row.initial_greeting || '',
            temperature: parseFloat(row.temperature ?? '0.7'),
            tools: typeof row.tools === 'string' ? JSON.parse(row.tools) : (row.tools || []),
            knowledgeSources: typeof row.knowledge_sources === 'string'
              ? JSON.parse(row.knowledge_sources)
              : (row.knowledge_sources || []),
            allowBargeIn: row.allow_barge_in ?? true,
            silenceTimeoutSeconds: row.silence_timeout_seconds || 3,
            maxSessionMinutes: row.max_session_minutes || 15,
            transferExtension: row.transfer_extension ?? '',
            fallbackAction: (row.fallback_action ?? 'hangup') as any,
            isActive: row.is_active ?? true,
          };
        }
        return null;
      } catch (err: any) {
        logOperational('DB_OPERATION_FAILURE');
        throw err;
      }
    });
  }

  public static async findAnyByIdForSuperAdmin(id: string): Promise<AiAgent | null> {
    return postgresClient.executeGlobalScoped(async (client) => {
      try {
        const res = await client.query('SELECT * FROM ai_agents WHERE id = $1', [id]);
        if (res.rows.length > 0) {
          const row = res.rows[0];
          return {
            id: row.id,
            tenantId: row.tenant_id,
            name: row.name,
            description: row.description || '',
            providerId: row.provider_id || 'provider-gemini',
            model: row.model || 'gemini-flash-latest',
            voice: row.voice || 'pt-BR-Wavenet-A',
            voiceGender: (row.voice_gender || 'female') as any,
            avatarType: (row.avatar_type || 'octopus_ai') as any,
            language: row.language || 'pt-BR',
            systemInstruction: row.system_instruction || '',
            initialGreeting: row.initial_greeting || '',
            temperature: parseFloat(row.temperature ?? '0.7'),
            tools: typeof row.tools === 'string' ? JSON.parse(row.tools) : (row.tools || []),
            knowledgeSources: typeof row.knowledge_sources === 'string'
              ? JSON.parse(row.knowledge_sources)
              : (row.knowledge_sources || []),
            allowBargeIn: row.allow_barge_in ?? true,
            silenceTimeoutSeconds: row.silence_timeout_seconds || 3,
            maxSessionMinutes: row.max_session_minutes || 15,
            transferExtension: row.transfer_extension ?? '',
            fallbackAction: (row.fallback_action ?? 'hangup') as any,
            isActive: row.is_active ?? true,
          };
        }
        return null;
      } catch (err: any) {
        logOperational('DB_OPERATION_FAILURE');
        throw err;
      }
    });
  }

  public static async delete(id: string, contextOrTenant?: TenantContext | string): Promise<boolean> {
    if (!contextOrTenant || (typeof contextOrTenant === 'string' && contextOrTenant.trim() === '')) {
      throw new Error('TENANT_REQUIRED: Deleção de agente de IA requer tenantId explícito (Fail-Closed).');
    }
    return postgresClient.executeTenantScoped(contextOrTenant, async (client, ctx) => {
      try {
        const res = await client.query(
          'DELETE FROM ai_agents WHERE id = $1 AND tenant_id = $2',
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
