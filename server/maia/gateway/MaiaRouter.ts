import { MaiaAIProvider } from './MaiaAIProvider.js';
import { GeminiProvider } from './providers/GeminiProvider.js';
import { NineRouterProvider } from './providers/NineRouterProvider.js';
import { FallbackProvider } from './providers/FallbackProvider.js';
import {
  MaiaRoutingProfile,
  MaiaTextRequest,
  MaiaAIResponse,
} from '../types.js';

export interface RouteTarget {
  provider: MaiaAIProvider;
  model: string;
  timeoutMs: number;
}

export class MaiaRouter {
  private providers: Map<string, MaiaAIProvider> = new Map();
  private fallbackProvider: FallbackProvider;

  constructor() {
    const gemini = new GeminiProvider();
    const nineRouter = new NineRouterProvider();
    this.fallbackProvider = new FallbackProvider();

    this.providers.set(gemini.id, gemini);
    this.providers.set(nineRouter.id, nineRouter);
    this.providers.set(this.fallbackProvider.id, this.fallbackProvider);
  }

  public getProvider(id: string): MaiaAIProvider | undefined {
    return this.providers.get(id);
  }

  /**
   * Resolve a cadeia de execução com base no perfil de roteamento
   */
  public resolveRouteChain(profile: MaiaRoutingProfile, requestedModel?: string): RouteTarget[] {
    const gemini = this.providers.get('gemini')!;
    const nineRouter = this.providers.get('9router')!;
    const fallback = this.fallbackProvider;

    switch (profile) {
      case 'ECONOMICO':
        // Prioridade: 1. Custo, 2. Latência, 3. Qualidade
        return [
          { provider: gemini, model: 'gemini-flash-latest', timeoutMs: 3500 },
          { provider: nineRouter, model: 'gpt-4o-mini', timeoutMs: 4000 },
          { provider: fallback, model: 'system-contingency', timeoutMs: 1000 },
        ];

      case 'ALTA_CAPACIDADE':
        // Prioridade: 1. Qualidade, 2. Raciocínio, 3. Contexto
        return [
          { provider: gemini, model: requestedModel || 'gemini-2.5-flash', timeoutMs: 6000 },
          { provider: nineRouter, model: 'claude-3-5-sonnet', timeoutMs: 7000 },
          { provider: fallback, model: 'system-contingency', timeoutMs: 1000 },
        ];

      case 'VOICE_REALTIME':
        // Prioridade: 1. Latência (<800ms), 2. Streaming, 3. Estabilidade
        return [
          { provider: gemini, model: 'gemini-flash-latest', timeoutMs: 2500 },
          { provider: fallback, model: 'system-contingency', timeoutMs: 1000 },
        ];

      case 'BALANCEADO':
      default:
        // Prioridade: 1. Qualidade, 2. Custo, 3. Latência
        return [
          { provider: gemini, model: requestedModel || 'gemini-flash-latest', timeoutMs: 4500 },
          { provider: nineRouter, model: 'claude-3-5-haiku', timeoutMs: 4500 },
          { provider: fallback, model: 'system-contingency', timeoutMs: 1000 },
        ];
    }
  }

  /**
   * Executa a requisição percorrendo a cadeia com fallback transparente e seguro
   */
  public async executeWithFallback(request: MaiaTextRequest): Promise<MaiaAIResponse> {
    const profile = request.routingProfile || 'BALANCEADO';
    const chain = this.resolveRouteChain(profile, request.model);

    let lastError: Error | null = null;

    for (const target of chain) {
      try {
        const timeoutPromise = new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error(`Timeout de ${target.timeoutMs}ms excedido no provider ${target.provider.id}`)), target.timeoutMs)
        );

        const execPromise = target.provider.generateText({
          ...request,
          model: target.model,
        });

        const res = await Promise.race([execPromise, timeoutPromise]);
        return res;
      } catch (err: any) {
        lastError = err;
        console.warn(`[MaiaRouter] Falha no provider '${target.provider.id}' (${err.message}). Avançando para próximo elo da cadeia...`);
      }
    }

    // Se até o fallback falhou de forma catastrófica (não esperado), devolve contingência pura
    return {
      text: 'Desculpe, o serviço de atendimento inteligente está momentaneamente indisponível.',
      tokensUsed: { input: 0, output: 0 },
      modelUsed: 'system-emergency-fallback',
      providerId: 'emergency',
      latencyMs: 1,
    };
  }
}
