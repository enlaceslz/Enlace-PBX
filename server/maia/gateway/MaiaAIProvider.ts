import {
  MaiaTextRequest,
  MaiaAIResponse,
  MaiaVoiceRequest,
  MaiaVoiceResponse,
  MaiaProviderHealth,
} from '../types.js';

export interface MaiaAIProvider {
  readonly id: string;
  readonly name: string;

  generateText(request: MaiaTextRequest): Promise<MaiaAIResponse>;

  generateVoice?(request: MaiaVoiceRequest): Promise<MaiaVoiceResponse>;

  healthCheck(): Promise<MaiaProviderHealth>;
}
