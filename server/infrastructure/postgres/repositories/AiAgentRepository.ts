import { postgresClient } from '../client';
import { AiAgent } from '../../../../src/types/pbx';
import { initialSeedData } from '../seedData';

export class AiAgentRepository {
  public static async listByTenant(tenantId: string): Promise<AiAgent[]> {
    if (postgresClient.isConnected()) {
      try {
        const res = await postgresClient.query(
          'SELECT * FROM ai_agents WHERE tenant_id = $1 ORDER BY name ASC',
          [tenantId]
        );
        if (res.rows.length > 0) {
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
            temperature: parseFloat(row.temperature || '0.7'),
            tools: typeof row.tools === 'string' ? JSON.parse(row.tools) : (row.tools || []),
            knowledgeSources: typeof row.knowledge_sources === 'string' 
              ? JSON.parse(row.knowledge_sources) 
              : (row.knowledge_sources || []),
            allowBargeIn: row.allow_barge_in ?? true,
            silenceTimeoutSeconds: row.silence_timeout_seconds || 3,
            maxSessionMinutes: row.max_session_minutes || 15,
            transferExtension: row.transfer_extension || '4101',
            fallbackAction: (row.fallback_action || 'transfer_human') as any,
            isActive: row.is_active ?? true,
          }));
        }
      } catch (err: any) {
        console.error('[AiAgentRepository] Erro ao listar agentes no PostgreSQL:', err.message);
      }
    }

    return initialSeedData.aiAgents.filter(a => a.tenantId === tenantId);
  }

  public static async findById(id: string, tenantId?: string): Promise<AiAgent | null> {
    if (postgresClient.isConnected()) {
      try {
        let query = 'SELECT * FROM ai_agents WHERE id = $1';
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
            description: row.description || '',
            providerId: row.provider_id || 'provider-gemini',
            model: row.model || 'gemini-flash-latest',
            voice: row.voice || 'pt-BR-Wavenet-A',
            voiceGender: (row.voice_gender || 'female') as any,
            avatarType: (row.avatar_type || 'octopus_ai') as any,
            language: row.language || 'pt-BR',
            systemInstruction: row.system_instruction || '',
            initialGreeting: row.initial_greeting || '',
            temperature: parseFloat(row.temperature || '0.7'),
            tools: typeof row.tools === 'string' ? JSON.parse(row.tools) : (row.tools || []),
            knowledgeSources: typeof row.knowledge_sources === 'string' 
              ? JSON.parse(row.knowledge_sources) 
              : (row.knowledge_sources || []),
            allowBargeIn: row.allow_barge_in ?? true,
            silenceTimeoutSeconds: row.silence_timeout_seconds || 3,
            maxSessionMinutes: row.max_session_minutes || 15,
            transferExtension: row.transfer_extension || '4101',
            fallbackAction: (row.fallback_action || 'transfer_human') as any,
            isActive: row.is_active ?? true,
          };
        }
        return null;
      } catch (err: any) {
        console.error('[AiAgentRepository] Erro ao buscar agente de IA por ID:', err.message);
      }
    }

    return initialSeedData.aiAgents.find(a => a.id === id && (!tenantId || a.tenantId === tenantId)) || null;
  }

  public static async save(agent: AiAgent): Promise<AiAgent> {
    if (postgresClient.isConnected()) {
      try {
        await postgresClient.query(
          `INSERT INTO ai_agents (
            id, tenant_id, name, description, model, voice, voice_gender,
            avatar_type, language, system_instruction, initial_greeting,
            temperature, tools, knowledge_sources, allow_barge_in,
            silence_timeout_seconds, max_session_minutes, transfer_extension,
            fallback_action, is_active
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20)
          ON CONFLICT (id) DO UPDATE SET
            name = EXCLUDED.name,
            description = EXCLUDED.description,
            model = EXCLUDED.model,
            voice = EXCLUDED.voice,
            voice_gender = EXCLUDED.voice_gender,
            avatar_type = EXCLUDED.avatar_type,
            language = EXCLUDED.language,
            system_instruction = EXCLUDED.system_instruction,
            initial_greeting = EXCLUDED.initial_greeting,
            temperature = EXCLUDED.temperature,
            tools = EXCLUDED.tools,
            knowledge_sources = EXCLUDED.knowledge_sources,
            allow_barge_in = EXCLUDED.allow_barge_in,
            silence_timeout_seconds = EXCLUDED.silence_timeout_seconds,
            max_session_minutes = EXCLUDED.max_session_minutes,
            transfer_extension = EXCLUDED.transfer_extension,
            fallback_action = EXCLUDED.fallback_action,
            is_active = EXCLUDED.is_active,
            updated_at = CURRENT_TIMESTAMP`,
          [
            agent.id,
            agent.tenantId,
            agent.name,
            agent.description || '',
            agent.model || 'gemini-flash-latest',
            agent.voice || 'pt-BR-Wavenet-A',
            agent.voiceGender || 'female',
            agent.avatarType || 'octopus_ai',
            agent.language || 'pt-BR',
            agent.systemInstruction || '',
            agent.initialGreeting || '',
            agent.temperature || 0.7,
            JSON.stringify(agent.tools || []),
            JSON.stringify(agent.knowledgeSources || []),
            agent.allowBargeIn ?? true,
            agent.silenceTimeoutSeconds || 3,
            agent.maxSessionMinutes || 15,
            agent.transferExtension || '4101',
            agent.fallbackAction || 'transfer_human',
            agent.isActive ?? true
          ]
        );
      } catch (err: any) {
        console.error('[AiAgentRepository] Erro ao salvar agente no PostgreSQL:', err.message);
      }
    }

    const idx = initialSeedData.aiAgents.findIndex(a => a.id === agent.id);
    if (idx >= 0) {
      initialSeedData.aiAgents[idx] = agent;
    } else {
      initialSeedData.aiAgents.push(agent);
    }
    return agent;
  }

  public static async delete(id: string, tenantId: string): Promise<boolean> {
    if (postgresClient.isConnected()) {
      try {
        await postgresClient.query(
          'DELETE FROM ai_agents WHERE id = $1 AND tenant_id = $2',
          [id, tenantId]
        );
      } catch (err: any) {
        console.error('[AiAgentRepository] Erro ao deletar agente no PostgreSQL:', err.message);
      }
    }

    const initialLen = initialSeedData.aiAgents.length;
    initialSeedData.aiAgents = initialSeedData.aiAgents.filter(a => !(a.id === id && a.tenantId === tenantId));
    return initialSeedData.aiAgents.length < initialLen;
  }
}
