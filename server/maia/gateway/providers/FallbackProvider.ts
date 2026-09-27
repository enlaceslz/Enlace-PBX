import { MaiaAIProvider } from '../MaiaAIProvider.js';
import {
  MaiaTextRequest,
  MaiaAIResponse,
  MaiaProviderHealth,
} from '../../types.js';

/**
 * FallbackProvider — Resposta Segura e Não-Fictícia de Contingência
 * Regra Máxima: NUNCA inventar faturas, clientes, protocolos, canais ou transferências falsas.
 * Emite AI_PROVIDER_UNAVAILABLE, informa indisponibilidade e oferece transferência humana real.
 */
export class FallbackProvider implements MaiaAIProvider {
  public readonly id = 'fallback';
  public readonly name = 'Fallback Seguro da MaIA';

  public async generateText(request: MaiaTextRequest): Promise<MaiaAIResponse> {
    const lower = request.prompt.toLowerCase();

    // Se o chamador pedir transferência para atendente humano
    if (
      lower.includes('humano') ||
      lower.includes('atendente') ||
      lower.includes('transferir') ||
      lower.includes('falar com alguém') ||
      lower.includes('pessoa')
    ) {
      return {
        text: 'Compreendo. Estou solicitando a transferência da sua ligação para um de nossos atendentes. Por favor, aguarde na linha.',
        toolCalls: [
          {
            name: 'transferir_chamada',
            args: {
              motivo: 'Solicitação de atendente humano em modo de contingência',
            },
          },
        ],
        tokensUsed: { input: 20, output: 25 },
        modelUsed: 'system-contingency',
        providerId: this.id,
        latencyMs: 10,
      };
    }

    // Se o chamador estiver se despedindo ou encerrando
    if (
      lower.includes('tchau') ||
      lower.includes('obrigado') ||
      lower.includes('valeu') ||
      lower.includes('desligar') ||
      lower.includes('era só isso')
    ) {
      return {
        text: 'Agradeço pelo contato com a Enlace Telecom. Tenha um ótimo dia!',
        toolCalls: [
          {
            name: 'encerrar_chamada',
            args: {
              motivo: 'Encerramento solicitado pelo chamador',
            },
          },
        ],
        tokensUsed: { input: 15, output: 20 },
        modelUsed: 'system-contingency',
        providerId: this.id,
        latencyMs: 10,
      };
    }

    // Resposta padrão sem alucinação e com oferta transparente de atendimento humano
    return {
      text: 'Nosso assistente virtual de inteligência artificial está temporariamente indisponível no momento. Gostaria que eu transferisse sua ligação para um atendente humano?',
      tokensUsed: { input: 10, output: 30 },
      modelUsed: 'system-contingency',
      providerId: this.id,
      latencyMs: 10,
    };
  }

  public async healthCheck(): Promise<MaiaProviderHealth> {
    return {
      providerId: this.id,
      name: this.name,
      status: 'UP',
      latencyMs: 1,
      modelsAvailable: ['system-contingency'],
    };
  }
}
