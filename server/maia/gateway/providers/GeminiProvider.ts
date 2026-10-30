import { GoogleGenAI, Type } from '@google/genai';
import { MaiaAIProvider } from '../MaiaAIProvider.js';
import {
  MaiaTextRequest,
  MaiaAIResponse,
  MaiaVoiceRequest,
  MaiaVoiceResponse,
  MaiaProviderHealth,
} from '../../types.js';

/**
 * GeminiProvider — Encapsulamento oficial do Google GenAI SDK (@google/genai)
 * Regra: Nenhuma API key deve ser exposta ao frontend, banco de dados ou logs.
 */
export class GeminiProvider implements MaiaAIProvider {
  public readonly id = 'gemini';
  public readonly name = 'Google Gemini (GenAI SDK Oficial)';

  private client: GoogleGenAI | null = null;

  constructor() {
    this.initClient();
  }

  private initClient(): GoogleGenAI | null {
    if (!this.client && process.env.GEMINI_API_KEY) {
      this.client = new GoogleGenAI({
        apiKey: process.env.GEMINI_API_KEY,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          },
        },
      });
    }
    return this.client;
  }

  public async generateText(request: MaiaTextRequest): Promise<MaiaAIResponse> {
    const ai = this.initClient();
    if (!ai) {
      throw new Error('AI_PROVIDER_UNAVAILABLE: Chave GEMINI_API_KEY não configurada no servidor.');
    }

    const startTime = Date.now();
    const model = request.model || 'gemini-flash-latest';

    // Constrói functionDeclarations se houver ferramentas solicitadas
    const functionDeclarations = (request.tools || []).map((tool) => ({
      name: tool.name,
      description: tool.description,
      parameters: {
        type: Type.OBJECT,
        properties: tool.parameters.properties as any,
        required: tool.parameters.required,
      },
    }));

    try {
      const response = await ai.models.generateContent({
        model,
        contents: request.prompt,
        config: {
          systemInstruction: request.systemPrompt,
          temperature: request.temperature ?? 0.3,
          ...(functionDeclarations.length > 0 && {
            tools: [{ functionDeclarations }],
          }),
        },
      });

      const latencyMs = Date.now() - startTime;
      const text = response.text || '';

      const toolCalls = (response.functionCalls || []).map((fc) => ({
        name: fc.name,
        args: (fc.args as Record<string, unknown>) || {},
      }));

      const inputTokens=response.usageMetadata?.promptTokenCount;
      const outputTokens=response.usageMetadata?.candidatesTokenCount;
      if(!Number.isSafeInteger(inputTokens)||inputTokens!<0||!Number.isSafeInteger(outputTokens)||outputTokens!<0)throw new Error('Consumo não informado pelo provedor.');

      return {
        text,
        toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
        tokensUsed: {
          input: inputTokens!,
          output: outputTokens!,
        },
        modelUsed: response.modelVersion || model,
        providerId: this.id,
        latencyMs,
      };
    } catch (err: any) {
      throw new Error('Falha na geração de texto do Gemini.');
    }
  }

  public async generateVoice(request: MaiaVoiceRequest): Promise<MaiaVoiceResponse> {
    const ai = this.initClient();
    if (!ai) {
      throw new Error('AI_PROVIDER_UNAVAILABLE: Gemini TTS não configurado.');
    }

    const ttsModel = 'gemini-3.8-flash-lite-tts';

    try {
      const response = await ai.models.generateContent({
        model: ttsModel,
        contents: [{ parts: [{ text: request.text }] }],
        config: {
          responseModalities: ['AUDIO'],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: {
                voiceName: request.voiceName,
              },
            },
          },
        },
      });

      const audioBase64 = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
      if (!audioBase64) {
        throw new Error('Resposta de áudio vazia do Gemini TTS.');
      }

      return {
        audioBase64,
        format: 'wav',
      };
    } catch (err: any) {
      throw new Error('Falha na síntese de voz do Gemini.');
    }
  }

  public async healthCheck(): Promise<MaiaProviderHealth> {
    if (!process.env.GEMINI_API_KEY) {
      return {
        providerId: this.id,
        name: this.name,
        status: 'NOT_CONFIGURED',
        modelsAvailable: [],
      };
    }

    const start = Date.now();
    try {
      const ai = this.initClient();
      if (!ai) throw new Error('Não inicializado');

      // Teste ultraleve de inferência
      await ai.models.generateContent({
        model: 'gemini-flash-latest',
        contents: 'ping',
        config: { maxOutputTokens: 2 },
      });

      return {
        providerId: this.id,
        name: this.name,
        status: 'UP',
        latencyMs: Date.now() - start,
        modelsAvailable: ['gemini-flash-latest'],
      };
    } catch (err: any) {
      return {
        providerId: this.id,
        name: this.name,
        status: 'DOWN',
        latencyMs: Date.now() - start,
        error: 'Falha na comunicação com o Gemini.',
        modelsAvailable: [],
      };
    }
  }
}
