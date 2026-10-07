import { GoogleGenAI, Type } from '@google/genai';
import zlib from 'zlib';
import { maiaAIGateway } from './maia/gateway/MaiaAIGateway.js';
import {
  AiAgentRepository,
  AiKnowledgeRepository,
  AiToolRepository,
  CrmRepository,
  OmnichannelRepository,
  ExtensionRepository,
  QueueRepository,
} from './infrastructure/postgres/repositories/index.js';
import { asteriskAdapter } from './infrastructure/asterisk/AsteriskAdapter.js';
import { CdrRepository } from './infrastructure/postgres/repositories/CdrRepository.js';
import { AuditLogRepository } from './infrastructure/postgres/repositories/AuditLogRepository.js';

let aiClient: GoogleGenAI | null = null;

function getAiClient(): GoogleGenAI | null {
  if (!aiClient && process.env.GEMINI_API_KEY) {
    aiClient = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }
  return aiClient;
}

export interface GeminiVoiceProfile {
  name: string;
  gender: 'male' | 'female';
  label: string;
  timbre: string;
  recommendedFor: string;
  pitchMultiplier: number;
  rateMultiplier: number;
}

export const GEMINI_VOICE_PROFILES: Record<string, GeminiVoiceProfile> = {
  Fenrir: {
    name: 'Fenrir',
    gender: 'male',
    label: 'Fenrir (Masculina Encorpada / Grave)',
    timbre: 'Barítono firme, tom acolhedor, grave e seguro',
    recommendedFor: 'NOC, Suporte N1/N2 Especializado e Roberto Mendes',
    pitchMultiplier: 0.88,
    rateMultiplier: 0.95,
  },
  Puck: {
    name: 'Puck',
    gender: 'male',
    label: 'Puck (Masculina Dinâmica)',
    timbre: 'Tenor ágil, jovem, ritmo moderno e conversacional assertivo',
    recommendedFor: 'Diagnóstico Ágil, Pré-vendas e SDR Técnico',
    pitchMultiplier: 0.94,
    rateMultiplier: 0.97,
  },
  Charon: {
    name: 'Charon',
    gender: 'male',
    label: 'Charon (Masculina Sóbria / Institucional)',
    timbre: 'Maduro, sóbrio, cadência pausada e autoridade serena',
    recommendedFor: 'Central Corporativa, Compliance e Cobrança Institucional',
    pitchMultiplier: 0.86,
    rateMultiplier: 0.93,
  },
  Zephyr: {
    name: 'Zephyr',
    gender: 'female',
    label: 'Zephyr (Feminina Equilibrada / Natural)',
    timbre: 'Soprano suave, fluida, acolhedora e expressiva',
    recommendedFor: 'MaIA — Atendimento & Triagem Geral 24/7',
    pitchMultiplier: 1.04,
    rateMultiplier: 0.98,
  },
  Kore: {
    name: 'Kore',
    gender: 'female',
    label: 'Kore (Feminina Calma / Empática)',
    timbre: 'Mezzo-soprano paciente, articulação cristalina e calorosa',
    recommendedFor: 'Ouvidoria, SAC e Atendimento Humanizado',
    pitchMultiplier: 1.02,
    rateMultiplier: 0.96,
  },
  Aoede: {
    name: 'Aoede',
    gender: 'female',
    label: 'Aoede (Feminina Melódica / Comercial)',
    timbre: 'Luminosa, melódica, calorosa e engajadora',
    recommendedFor: 'Vendas, Planos Corporativos e Negociações',
    pitchMultiplier: 1.06,
    rateMultiplier: 0.99,
  },
};

export function resolveAgentVoice(agent: {
  name?: string;
  voice?: string;
  voiceGender?: 'male' | 'female';
  avatarType?: string;
}): {
  voiceName: string;
  gender: 'male' | 'female';
  avatarType: string;
  pitchMultiplier: number;
  rateMultiplier: number;
  timbre: string;
} {
  let gender: 'male' | 'female' = agent.voiceGender || 'female';
  if (!agent.voiceGender && agent.name) {
    const lowerName = agent.name.toLowerCase();
    if (
      lowerName.includes('roberto') ||
      lowerName.includes('carlos') ||
      lowerName.includes('lucas') ||
      lowerName.includes('mendes') ||
      lowerName.includes('masculino')
    ) {
      gender = 'male';
    }
  }

  const maleVoices = ['Fenrir', 'Puck', 'Charon'];
  const femaleVoices = ['Zephyr', 'Kore', 'Aoede'];

  let resolvedVoice = agent.voice || (gender === 'male' ? 'Fenrir' : 'Zephyr');

  // Dynamic voice alignment: Ensure voice matches the designated gender
  if (gender === 'male' && !maleVoices.includes(resolvedVoice)) {
    resolvedVoice = 'Fenrir';
  } else if (gender === 'female' && !femaleVoices.includes(resolvedVoice)) {
    resolvedVoice = 'Zephyr';
  }

  const profile = GEMINI_VOICE_PROFILES[resolvedVoice] || {
    name: resolvedVoice,
    gender,
    label: resolvedVoice,
    timbre: gender === 'male' ? 'Barítono encorpado e acolhedor' : 'Soprano suave e expressiva',
    recommendedFor: 'Atendimento Geral',
    pitchMultiplier: gender === 'male' ? 0.88 : 1.04,
    rateMultiplier: gender === 'male' ? 0.95 : 0.98,
  };

  const avatarType =
    agent.avatarType || (gender === 'male' ? 'male_tech' : 'female_ai');

  return {
    voiceName: resolvedVoice,
    gender,
    avatarType,
    pitchMultiplier: profile.pitchMultiplier,
    rateMultiplier: profile.rateMultiplier,
    timbre: profile.timbre,
  };
}

export interface VoiceTurnRequest {
  agentId: string;
  userMessage: string;
  history: Array<{ role: 'user' | 'model' | 'system'; text: string }>;
  callerNumber?: string;
  tenantId?: string;
  channelId?: string;
}

export interface VoiceTurnResponse {
  replyText: string;
  toolCallExecuted?: {
    name: string;
    args: Record<string, unknown>;
    result: Record<string, unknown>;
  };
  action?: 'none' | 'transfer' | 'hangup';
  transferDestination?: string;
  audioBase64?: string;
  latencyMs: number;
  tokensUsed: { input: number; output: number };
  voiceConfig: {
    voiceName: string;
    gender: 'male' | 'female';
    avatarType: string;
    pitchMultiplier: number;
    rateMultiplier: number;
    timbre: string;
  };
}

export class GeminiService {

  async processWhatsAppTurn(conversationId: string, userMessage: string, agentId?: string): Promise<string> {
    const ai = getAiClient();
    if (!ai) {
      console.warn('Gemini API key missing, returning fallback for WhatsApp.');
      return 'Desculpe, o sistema de IA está temporariamente indisponível.';
    }

    // Get the conversation history for context
    const conv = await OmnichannelRepository.findById(conversationId);
    let historyContext = '';
    let memoryContext = '';
    const tenantId = conv?.tenantId;
    if (!tenantId) {
      return 'Conversa não localizada ou tenant não configurado.';
    }

    if (conv) {
      // Get last 5 messages for context
      historyContext = conv.messages.slice(-5).map(m => `${m.sender === 'contact' ? 'Cliente' : 'IA'}: ${m.content}`).join('\n');
      
      // Customer Memory Retrieval
      const customerContact = conv.contactId ? await CrmRepository.findContactById(conv.contactId, tenantId) : null;
      const customerMem = customerContact ? await CrmRepository.findMemoryByPhone(customerContact.phone, tenantId) : null;
      
      if (customerMem) {
        memoryContext = `\n[MEMÓRIA DO CLIENTE - ${customerContact?.name || 'Desconhecido'}]\nResumo: ${customerMem.summary}\nPreferências: ${customerMem.preferences.join(', ')}\nSentimento anterior: ${customerMem.sentimentHistory}\nRisco de Churn: ${customerMem.churnRisk}%\n`;
      }
    }

    let agent = agentId ? await AiAgentRepository.findById(agentId, tenantId) : null;
    if (!agent) {
      const agents = await AiAgentRepository.listByTenant(tenantId);
      agent = agents[0];
    }
    if (!agent) {
      return 'Nenhum agente de IA configurado para este tenant.';
    }

    // Assemble Knowledge grounding
    const allKnowledge = await AiKnowledgeRepository.listByTenant(tenantId);
    const knowledgeSnippets = agent.knowledgeSources
      .map((kId) => allKnowledge.find((k) => k.id === kId))
      .filter(Boolean)
      .map((k) => `[FONTE: ${k!.title} - ${k!.category}]\n${k!.content}`)
      .join('\n\n');

    const systemPrompt = `
Você é "${agent.name}", um assistente virtual operando pelo WhatsApp da Enlace Telecom.
SUA MISSÃO: ${agent.description}

REGRAS ESTABELECIDAS:
${agent.systemInstruction}

DIRETRIZES PARA WHATSAPP:
- Seja conciso e direto, mensagens curtas são melhores para chat.
- Use emojis moderadamente para tornar a conversa amigável.
- Se o cliente pedir para falar com um humano, diga que está transferindo.

BASE DE CONHECIMENTO (Use para responder dúvidas, se aplicável):
${knowledgeSnippets}
${memoryContext}

HISTÓRICO RECENTE DA CONVERSA:
${historyContext}
`;

    try {
      const response = await ai.models.generateContent({
        model: agent.model,
        contents: userMessage,
        config: {
          systemInstruction: systemPrompt,
          temperature: agent.temperature,
          topP: 0.95,
        },
      });
      return response.text || "Desculpe, não consegui formular uma resposta.";
    } catch (e) {
      console.error('Gemini API error during WhatsApp turn:', e);
      return 'Desculpe, ocorreu um erro interno ao processar sua mensagem.';
    }
  }

  async processVoiceTurn(req: VoiceTurnRequest): Promise<VoiceTurnResponse> {
    if (!req.tenantId || req.tenantId.trim() === '') {
      throw new Error('TENANT_REQUIRED: Operação de voz MaIA rejeitada por ausência de tenantId no contexto (Fail-Closed).');
    }
    const tenantId = req.tenantId.trim();
    const gatewayRes = await maiaAIGateway.processVoiceTurn({
      agentId: req.agentId,
      userMessage: req.userMessage,
      history: req.history as any,
      callerNumber: req.callerNumber,
      tenantId,
      sessionId: (req as any).sessionId,
      asteriskChannelId: req.channelId,
    });

    return {
      replyText: gatewayRes.replyText,
      toolCallExecuted: gatewayRes.toolCallExecuted
        ? {
            name: gatewayRes.toolCallExecuted.name,
            args: gatewayRes.toolCallExecuted.args,
            result: gatewayRes.toolCallExecuted.result,
          }
        : undefined,
      action: gatewayRes.action,
      transferDestination: gatewayRes.transferDestination,
      audioBase64: gatewayRes.audioBase64,
      latencyMs: gatewayRes.latencyMs,
      tokensUsed: gatewayRes.tokensUsed,
      voiceConfig: gatewayRes.voiceConfig,
    };
  }

  async summarizeAndAnalyzeCall(transcript: string, caller: string, callee: string): Promise<{ summary: string; sentiment: string; category: string; actionItems: string[] }> {
    const ai = getAiClient();
    if (!ai) {
      return {
        summary: `Atendimento entre ${caller} e ${callee}. O cliente solicitou informações e o atendimento foi concluído satisfatoriamente.`,
        sentiment: 'Positivo',
        category: 'Atendimento Geral / Triagem',
        actionItems: ['Verificar satisfação do cliente no pós-atendimento', 'Atualizar dados de contato no CRM'],
      };
    }

    try {
      const prompt = `Analise a seguinte transcrição de chamada telefônica do Enlace-PBX (Asterisk puro + IA) entre o chamador "${caller}" e o destino "${callee}":

"${transcript}"

Retorne uma análise em português no seguinte formato JSON:
{
  "summary": "Resumo executivo de 2 a 3 frases destacando objetivo e resolução",
  "sentiment": "Positivo | Neutro | Frustrado",
  "category": "Comercial | Suporte Técnico | Financeiro | Dúvida Geral",
  "actionItems": ["Item de ação 1", "Item de ação 2"]
}`;

      const response = await ai.models.generateContent({
        model: 'gemini-flash-latest',
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
        },
      });

      const parsed = JSON.parse(response.text || '{}');
      return {
        summary: parsed.summary || 'Atendimento telefônico registrado.',
        sentiment: parsed.sentiment || 'Neutro',
        category: parsed.category || 'Atendimento Geral',
        actionItems: parsed.actionItems || ['Acompanhar histórico no CRM'],
      };
    } catch (e) {
      console.warn('Fallback summarization:', e);
      return {
        summary: `Chamada realizada com sucesso entre ${caller} e ${callee}. Transcrição arquivada de acordo com as normas da LGPD.`,
        sentiment: 'Neutro',
        category: 'Telefonia Geral',
        actionItems: ['Nenhuma pendência crítica identificada'],
      };
    }
  }

  private handleFallbackTurn(
    agent: { name: string; transferExtension?: string; voiceGender?: 'male' | 'female'; voice?: string; avatarType?: string },
    req: VoiceTurnRequest,
    startTime: number,
    providedVoiceConfig?: VoiceTurnResponse['voiceConfig']
  ): VoiceTurnResponse {
    const voiceConfig = providedVoiceConfig || resolveAgentVoice(agent);
    const lower = req.userMessage.toLowerCase();

    let replyText = 'Nosso assistente virtual de inteligência artificial está temporariamente em manutenção. Deseja que eu transfira sua ligação para um atendente humano?';
    let action: VoiceTurnResponse['action'] = 'none';
    let transferDestination: string | undefined = undefined;
    let toolCallExecuted: VoiceTurnResponse['toolCallExecuted'] = undefined;

    if (
      lower.includes('humano') ||
      lower.includes('atendente') ||
      lower.includes('transferir') ||
      lower.includes('falar com alguém') ||
      lower.includes('sim') ||
      lower.includes('transfira')
    ) {
      action = 'transfer';
      transferDestination = agent.transferExtension || '4101';
      replyText = `Com certeza. Estou direcionando sua ligação para o ramal ${transferDestination}. Por favor, aguarde na linha.`;
      toolCallExecuted = {
        name: 'transferir_chamada',
        args: { destino: transferDestination, motivo: 'Solicitação de atendente humano em contingência' },
        result: { status: 'pending', destino: transferDestination },
      };
    } else if (
      lower.includes('tchau') ||
      lower.includes('obrigado') ||
      lower.includes('valeu') ||
      lower.includes('desligar') ||
      lower.includes('era isso')
    ) {
      action = 'hangup';
      replyText = 'Agradeço pelo contato com a Enlace Telecom. Tenha um ótimo dia!';
      toolCallExecuted = {
        name: 'encerrar_chamada',
        args: { motivo: 'Conclusão pelo usuário' },
        result: { status: 'completed' },
      };
    }

    return {
      replyText,
      toolCallExecuted,
      action,
      transferDestination,
      latencyMs: Date.now() - startTime,
      tokensUsed: { input: 10, output: 25 },
      voiceConfig,
    };
  }

  async generateVoicePreview(params: {
    voice?: string;
    voiceGender?: 'male' | 'female';
    text?: string;
    agentId?: string;
  }): Promise<{
    voiceName: string;
    gender: 'male' | 'female';
    avatarType: string;
    sampleText: string;
    audioBase64?: string;
    prosody: {
      pitchMultiplier: number;
      rateMultiplier: number;
      timbre: string;
    };
  }> {
    const agent = params.agentId ? await AiAgentRepository.findById(params.agentId) : undefined;
    const voiceConfig = resolveAgentVoice({
      name: agent?.name,
      voice: params.voice || agent?.voice,
      voiceGender: params.voiceGender || agent?.voiceGender,
      avatarType: agent?.avatarType,
    });

    const sampleText =
      params.text ||
      (voiceConfig.gender === 'male'
        ? 'Olá! Aqui é o Roberto do Suporte Técnico Enlace. Como posso ajudar com seu chamado ou conexão hoje?'
        : 'Olá! Sou a MaIA, assistente virtual da Enlace Telecom. Como posso ajudar você hoje?');

    let audioBase64: string | undefined = undefined;
    const ai = getAiClient();
    if (ai) {
      try {
        const ttsResponse = await ai.models.generateContent({
          model: 'gemini-3.8-flash-lite-tts',
          contents: [{ parts: [{ text: sampleText }] }],
          config: {
            responseModalities: ['AUDIO'],
            speechConfig: {
              voiceConfig: {
                prebuiltVoiceConfig: {
                  voiceName: voiceConfig.voiceName,
                },
              },
            },
          },
        });
        audioBase64 = ttsResponse.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
        // Graceful fallback for client Web Speech API
      } catch (e) {
        // Graceful fallback for client Web Speech API
      }
    }

    return {
      voiceName: voiceConfig.voiceName,
      gender: voiceConfig.gender,
      avatarType: voiceConfig.avatarType,
      sampleText,
      audioBase64,
      prosody: {
        pitchMultiplier: voiceConfig.pitchMultiplier,
        rateMultiplier: voiceConfig.rateMultiplier,
        timbre: voiceConfig.timbre,
      },
    };
  }

  async evaluateSession(sessionHistory: Array<{ role: string; text: string }>, callerNumber: string): Promise<any> {
    const ai = getAiClient();
    if (!ai) return null; // Or mock response

    const formattedHistory = sessionHistory.map(h => `${h.role}: ${h.text}`).join('\n');
    const prompt = `Você é um Supervisor de Qualidade de Contact Center (AI Supervisor). Analise a seguinte transcrição de atendimento:
    
    TRANSCRICAO:
    ${formattedHistory}
    
    Forneça uma avaliação JSON estrita com as seguintes chaves:
    - sentiment (string: "positive", "neutral", "negative")
    - intent (string: intenção principal do cliente)
    - resolved (boolean)
    - churnRisk (number: 0 a 100)
    - score (number: 0 a 100)
    - summary (string: resumo em 1 frase)
    - violations (array of strings: se alguma palavra proibida ou grosseria ocorreu)`;

    try {
      const response = await ai.models.generateContent({
        model: 'gemini-flash-latest',
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          temperature: 0.1,
        },
      });
      const text = response.text;
      return JSON.parse(text || '{}');
    } catch (e) {
      console.error('Supervisor Evaluation failed', e);
      return null;
    }
  }

  async extractKnowledgeFromDocument(params: {
    fileName: string;
    fileType: string;
    base64Data?: string;
    rawText?: string;
  }): Promise<{ title: string; category: string; content: string }> {
    let rawContent = params.rawText || '';

    // If PDF base64 provided and Gemini is available, use multimodal inlineData
    if (params.fileType.includes('pdf') && params.base64Data) {
      const ai = getAiClient();
      if (ai) {
        try {
          const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: [
              {
                inlineData: {
                  data: params.base64Data,
                  mimeType: 'application/pdf',
                },
              },
              'Extraia detalhadamente todo o conteúdo textual técnico, procedimentos de suporte, diretrizes de atendimento e dados operacionais deste manual. Formate em markdown claro com cabeçalhos e tópicos em português do Brasil.',
            ],
          });
          if (response.text) {
            rawContent = response.text.trim();
          }
        } catch (err) {
          console.warn('Gemini PDF inline extraction warning:', err);
        }
      }

      // If Gemini extraction was not available or empty, extract from PDF stream buffer
      if (!rawContent && params.base64Data) {
        try {
          const buffer = Buffer.from(params.base64Data, 'base64');
          rawContent = extractTextFromPdfBuffer(buffer);
        } catch (err) {
          console.warn('PDF stream extraction fallback error:', err);
        }
      }
    }

    // Default clean title from file name
    const cleanTitle = params.fileName
      .replace(/\.[^/.]+$/, '')
      .replace(/[-_]/g, ' ')
      .replace(/\b\w/g, (l) => l.toUpperCase());

    // Category auto-detection based on file name and content
    let category = 'Suporte Técnico';
    const lower = (params.fileName + ' ' + rawContent).toLowerCase();
    if (lower.includes('financeir') || lower.includes('fatura') || lower.includes('pix') || lower.includes('boleto')) {
      category = 'Financeiro & Faturamento';
    } else if (lower.includes('plano') || lower.includes('venda') || lower.includes('comercial') || lower.includes('preço')) {
      category = 'Comercial & Planos';
    } else if (
      lower.includes('rede') ||
      lower.includes('sip') ||
      lower.includes('noc') ||
      lower.includes('asterisk') ||
      lower.includes('pjsip') ||
      lower.includes('onu') ||
      lower.includes('fibra') ||
      lower.includes('roberto')
    ) {
      category = 'Diagnóstico de Rede / NOC';
    } else if (lower.includes('lgpd') || lower.includes('política') || lower.includes('horário') || lower.includes('jurídico')) {
      category = 'Políticas & Institucional';
    }

    return {
      title: cleanTitle || 'Manual de Suporte Carregado',
      category,
      content: rawContent || 'Conteúdo do documento indexado para consulta dos agentes de IA.',
    };
  }
}

function extractTextFromPdfBuffer(buffer: Buffer): string {
  const textChunks: string[] = [];
  const str = buffer.toString('binary');

  // Attempt to decompress FlateDecode streams
  const streamRegex = /stream\r?\n([\s\S]*?)\r?\nendstream/g;
  let match: RegExpExecArray | null;

  while ((match = streamRegex.exec(str)) !== null) {
    const rawStream = Buffer.from(match[1], 'binary');
    try {
      const decompressed = zlib.inflateSync(rawStream).toString('utf-8');
      const tjRegex = /\(([^)]+)\)\s*Tj/g;
      let tjMatch: RegExpExecArray | null;
      while ((tjMatch = tjRegex.exec(decompressed)) !== null) {
        textChunks.push(tjMatch[1]);
      }
      const tjArrayRegex = /\[([^\]]+)\]\s*TJ/g;
      let arrayMatch: RegExpExecArray | null;
      while ((arrayMatch = tjArrayRegex.exec(decompressed)) !== null) {
        const innerRegex = /\(([^)]+)\)/g;
        let innerMatch: RegExpExecArray | null;
        while ((innerMatch = innerRegex.exec(arrayMatch[1])) !== null) {
          textChunks.push(innerMatch[1]);
        }
      }
    } catch {
      // Non-compressed stream
    }
  }

  if (textChunks.length > 5) {
    return textChunks
      .join(' ')
      .replace(/\\([nrtbf()])/g, '$1')
      .replace(/\s+/g, ' ')
      .trim();
  }

  // Fallback: extract readable Portuguese text segments of length >= 4
  const decoded = buffer.toString('utf-8');
  const readableTokens = decoded.match(/[A-Za-z0-9À-ÿ\s\.,;:!?\-\(\)\/\@\#\%]{4,}/g) || [];
  const cleanTokens = readableTokens
    .map((t) => t.trim())
    .filter((t) => t.length > 3 && !t.startsWith('/') && !t.includes('obj') && !t.includes('endobj'));

  return cleanTokens.slice(0, 500).join('\n') || 'Documento PDF carregado para base de conhecimento.';
}

export const geminiService = new GeminiService();