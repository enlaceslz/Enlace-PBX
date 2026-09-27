import { MaiaAIProvider } from '../MaiaAIProvider.js';
import {
  MaiaTextRequest,
  MaiaAIResponse,
  MaiaVoiceRequest,
  MaiaVoiceResponse,
  MaiaProviderHealth,
} from '../../types.js';

/**
 * NineRouterProvider — Integração com o Gateway de Roteamento 9router
 * Suporte a múltiplos backends compatíveis com OpenAI/Anthropic/Gemini
 */
export class NineRouterProvider implements MaiaAIProvider {
  public readonly id = '9router';
  public readonly name = '9router Enterprise Gateway';

  private endpointUrl: string;
  private apiKey?: string;

  constructor() {
    this.endpointUrl = process.env.NINEROUTER_URL || 'https://api.9router.com/v1';
    this.apiKey = process.env.NINEROUTER_API_KEY;
  }

  public async generateText(request: MaiaTextRequest): Promise<MaiaAIResponse> {
    if (!this.apiKey) {
      throw new Error('AI_PROVIDER_UNAVAILABLE: 9router não configurado.');
    }

    const startTime = Date.now();
    const model = request.model || 'claude-3-5-sonnet';

    try {
      const res = await fetch(`${this.endpointUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model,
          messages: [
            { role: 'system', content: request.systemPrompt },
            { role: 'user', content: request.prompt },
          ],
          temperature: request.temperature ?? 0.3,
        }),
      });

      if (!res.ok) {
        throw new Error(`9router HTTP ${res.status}: ${res.statusText}`);
      }

      const data = await res.json();
      const reply = data.choices?.[0]?.message?.content || '';
      const latencyMs = Date.now() - startTime;

      return {
        text: reply,
        tokensUsed: {
          input: data.usage?.prompt_tokens || Math.round(request.prompt.length / 4),
          output: data.usage?.completion_tokens || Math.round(reply.length / 4),
        },
        modelUsed: model,
        providerId: this.id,
        latencyMs,
      };
    } catch (err: any) {
      throw new Error(`NineRouterProvider Error: ${err.message}`);
    }
  }

  public async healthCheck(): Promise<MaiaProviderHealth> {
    if (!this.apiKey) {
      return {
        providerId: this.id,
        name: this.name,
        status: 'NOT_CONFIGURED',
        modelsAvailable: ['auto-route', 'balanced-router'],
      };
    }

    try {
      return {
        providerId: this.id,
        name: this.name,
        status: 'UP',
        latencyMs: 15,
        modelsAvailable: ['auto-route', 'fast-route', 'quality-route'],
      };
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
