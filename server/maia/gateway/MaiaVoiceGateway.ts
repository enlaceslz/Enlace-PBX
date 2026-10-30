import {validatedWavAudio,validateVoiceRequest} from '../../infrastructure/ai/VoiceAudio.js';
import {logOperational} from '../../infrastructure/security/OperationalLog.js';
import { MaiaRouter } from './MaiaRouter.js';
import { MaiaVoiceRequest, MaiaVoiceResponse } from '../types.js';

export interface VoiceGatewayOptions {
  preferredProviderId?: string;
  enableFallback?: boolean;
}

/** Síntese com saída WAV validada e contingência entre provedores somente explícita. */
export class MaiaVoiceGateway {
  constructor(private router: MaiaRouter) {}

  public async synthesize(
    request: MaiaVoiceRequest,
    options?: VoiceGatewayOptions
  ): Promise<MaiaVoiceResponse | null> {
    validateVoiceRequest(request);
    if(options?.enableFallback!==undefined&&typeof options.enableFallback!=='boolean'||options?.preferredProviderId!==undefined&&(typeof options.preferredProviderId!=='string'||!/^[-A-Za-z0-9_]{1,64}$/.test(options.preferredProviderId)))throw new Error('Opções de síntese de voz inválidas.');
    const providerId = options?.preferredProviderId ?? 'gemini';
    const checked=(result:MaiaVoiceResponse):MaiaVoiceResponse=>{
      if(result?.format!=='wav')throw new Error('Formato de síntese não suportado.');
      return {audioBase64:validatedWavAudio({data:result.audioBase64,mimeType:'audio/wav'}),format:'wav'};
    };

    // 1. Tenta o provedor preferencial
    const provider = this.router.getProvider(providerId) as any;
    if (provider && typeof provider.generateVoice === 'function') {
      try {
        const res = await provider.generateVoice(request);
        if (res && res.audioBase64) {
          return checked(res);
        }
      } catch (err: any) {
        logOperational('AI_PROVIDER_FAILURE');
      }
    }

    // 2. Se fallback habilitado, busca qualquer outro provedor que suporte síntese de voz
    if (options?.enableFallback === true) {
      for (const p of this.router.getAllProviders()) {
        if (p.id !== providerId && typeof (p as any).generateVoice === 'function') {
          try {
            logOperational('AI_PROVIDER_FALLBACK');
            const res = await (p as any).generateVoice(request);
            if (res && res.audioBase64) {
              return checked(res);
            }
          } catch (fallbackErr: any) {
            logOperational('AI_PROVIDER_FAILURE');
          }
        }
      }
    }

    return null;
  }
}
