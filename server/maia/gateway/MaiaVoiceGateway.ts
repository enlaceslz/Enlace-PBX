import { MaiaRouter } from './MaiaRouter.js';
import { MaiaVoiceRequest, MaiaVoiceResponse } from '../types.js';

export interface VoiceGatewayOptions {
  preferredProviderId?: string;
  enableFallback?: boolean;
}

/**
 * MaiaVoiceGateway — Gateway abstrato e desacoplado de síntese de voz (TTS)
 * Não se acopla rigidamente a nenhum provedor específico. Permite roteamento
 * dinâmico para Google GenAI, 9router ou provedores neurais futuros.
 */
export class MaiaVoiceGateway {
  constructor(private router: MaiaRouter) {}

  public async synthesize(
    request: MaiaVoiceRequest,
    options?: VoiceGatewayOptions
  ): Promise<MaiaVoiceResponse | null> {
    const providerId = options?.preferredProviderId || 'gemini';

    // 1. Tenta o provedor preferencial
    const provider = this.router.getProvider(providerId) as any;
    if (provider && typeof provider.generateVoice === 'function') {
      try {
        const res = await provider.generateVoice(request);
        if (res && res.audioBase64) {
          return res;
        }
      } catch (err: any) {
        console.warn(`[MaiaVoiceGateway] Provedor preferencial '${providerId}' falhou para síntese de voz:`, err.message);
      }
    }

    // 2. Se fallback habilitado, busca qualquer outro provedor que suporte síntese de voz
    if (options?.enableFallback !== false) {
      for (const p of this.router.getAllProviders()) {
        if (p.id !== providerId && typeof (p as any).generateVoice === 'function') {
          try {
            console.log(`[MaiaVoiceGateway] Acionando contingência de voz via provedor '${p.id}'...`);
            const res = await (p as any).generateVoice(request);
            if (res && res.audioBase64) {
              return res;
            }
          } catch (fallbackErr: any) {
            console.warn(`[MaiaVoiceGateway] Fallback '${p.id}' também falhou:`, fallbackErr.message);
          }
        }
      }
    }

    return null;
  }
}
