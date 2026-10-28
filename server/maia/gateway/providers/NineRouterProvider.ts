import { outboundJson } from '../../../infrastructure/security/OutboundHttp.js';
import { MaiaAIProvider } from '../MaiaAIProvider.js';
import {
  MaiaTextRequest,
  MaiaAIResponse,
  MaiaProviderHealth,
} from '../../types.js';

/**
 * NineRouterProvider — Integração com o Gateway de Roteamento 9router
 * Contrato HTTP de texto e catálogo compatível com a API OpenAI.
 */
export class NineRouterProvider implements MaiaAIProvider {
  public readonly id = '9router';
  public readonly name = '9router Enterprise Gateway';

  private endpointUrl: string;
  private apiKey?: string;

  constructor() {
    this.endpointUrl = (process.env.NINEROUTER_URL || '').replace(/\/$/, '');
    this.apiKey = process.env.NINEROUTER_API_KEY;
  }

  public async generateText(request: MaiaTextRequest): Promise<MaiaAIResponse> {
    if (!this.apiKey || !this.endpointUrl) {
      throw new Error('AI_PROVIDER_UNAVAILABLE: 9router não configurado.');
    }

    const model = request.model || process.env.NINEROUTER_MODEL;
    if (!model) throw new Error('Modelo do 9router não configurado.');
    const response = await outboundJson(`${this.endpointUrl}/chat/completions`, {
      method: 'POST', headers: { Authorization: `Bearer ${this.apiKey}`, 'X-Enlace-Request-Id': request.correlationId }, timeoutMs: 30000,
      body: { model, messages: [{ role: 'system', content: request.systemPrompt }, { role: 'user', content: request.prompt }], temperature: request.temperature ?? 0.3 },
    });
    const data = response.data as any;
    const reply = data?.choices?.[0]?.message?.content;
    const input = data?.usage?.prompt_tokens; const output = data?.usage?.completion_tokens;
    if (typeof reply !== 'string' || !reply.trim() || !Number.isSafeInteger(input) || input < 0 || !Number.isSafeInteger(output) || output < 0) {
      throw new Error('Resposta do 9router sem texto ou contagem válida de tokens.');
    }
    return { text: reply, tokensUsed: { input, output }, modelUsed: typeof data.model === 'string' ? data.model : model,
      providerId: this.id, latencyMs: response.durationMs };
  }

  public async healthCheck(): Promise<MaiaProviderHealth> {
    if (!this.apiKey || !this.endpointUrl) {
      return {
        providerId: this.id,
        name: this.name,
        status: 'NOT_CONFIGURED',
        modelsAvailable: [],
      };
    }

    try {
      const response = await outboundJson(`${this.endpointUrl}/models`, { headers: { Authorization: `Bearer ${this.apiKey}` } });
      const data = response.data as any;
      if (!Array.isArray(data?.data) || data.data.length > 1000 || data.data.some((entry: any) => typeof entry?.id !== 'string' || !entry.id.trim())) throw new Error('Catálogo de modelos inválido.');
      return { providerId: this.id, name: this.name, status: 'UP', latencyMs: response.durationMs,
        modelsAvailable: data.data.map((entry: any) => entry.id) };
    } catch (err: any) {
      return {
        providerId: this.id,
        name: this.name,
        status: 'DOWN',
        error: err.message,
        modelsAvailable: [],
      };
    }
  }
}
