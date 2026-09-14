import { GoogleGenAI, Type, Modality } from '@google/genai';
import zlib from 'zlib';
import { db } from './db.js';

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

/**
 * Converte ou encapsula áudio PCM bruto (24kHz, 16-bit, mono) em contêiner padrão RIFF/WAVE.
 * Se já contiver cabeçalho RIFF/WAVE, retorna intacto.
 */
export function ensureWavAudio(
  base64Data: string,
  sampleRate = 24000,
  numChannels = 1,
  bitsPerSample = 16
): string {
  try {
    const rawBuffer = Buffer.from(base64Data, 'base64');
    if (
      rawBuffer.length >= 12 &&
      rawBuffer.toString('ascii', 0, 4) === 'RIFF' &&
      rawBuffer.toString('ascii', 8, 12) === 'WAVE'
    ) {
      return base64Data;
    }

    const pcmLength = rawBuffer.length;
    const header = Buffer.alloc(44);

    header.write('RIFF', 0);
    header.writeUInt32LE(36 + pcmLength, 4);
    header.write('WAVE', 8);

    header.write('fmt ', 12);
    header.writeUInt32LE(16, 16);
    header.writeUInt16LE(1, 20); // 1 = PCM
    header.writeUInt16LE(numChannels, 22);
    header.writeUInt32LE(sampleRate, 24);
    const byteRate = sampleRate * numChannels * (bitsPerSample / 8);
    header.writeUInt32LE(byteRate, 28);
    const blockAlign = numChannels * (bitsPerSample / 8);
    header.writeUInt16LE(blockAlign, 32);
    header.writeUInt16LE(bitsPerSample, 34);

    header.write('data', 36);
    header.writeUInt32LE(pcmLength, 40);

    const wavBuffer = Buffer.concat([header, rawBuffer]);
    return wavBuffer.toString('base64');
  } catch (err) {
    console.warn('Erro ao normalizar WAV:', err);
    return base64Data;
  }
}

/**
 * Limpa e prepara texto para síntese de fala TTS humanizada:
 * Remove formatações de markdown e símbolos que geram pausas robóticas;
 * Expande siglas telefônicas para pronúncia natural em português brasileiro.
 */
export function cleanTextForTTS(rawText: string): string {
  if (!rawText) return '';
  return rawText
    .replace(/[*_#`~[\]()]/g, ' ')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/gu, ' ')
    .replace(/\bURA\b/gi, 'U R A')
    .replace(/\bPJSIP\b/gi, 'P J SIP')
    .replace(/\bSIP\b/gi, 'SIP')
    .replace(/\bVoIP\b/gi, 'Vóip')
    .replace(/\bARI\b/gi, 'A R I')
    .replace(/\bPBX\b/gi, 'P B X')
    .replace(/\bNOC\b/gi, 'N O C')
    .replace(/\bSAC\b/gi, 'S A C')
    .replace(/\bLGPD\b/gi, 'L G P D')
    .replace(/\bN1\b/gi, 'N um')
    .replace(/\bN2\b/gi, 'N dois')
    .replace(/\b24\/7\b/gi, 'vinte e quatro horas por dia')
    .replace(/\bRamal\s*4101\b/gi, 'Ramal quarenta e um zero um')
    .replace(/\bRamal\s*4102\b/gi, 'Ramal quarenta e um zero dois')
    .replace(/\bRamal\s*4103\b/gi, 'Ramal quarenta e um zero três')
    .replace(/\bRamal\s*4201\b/gi, 'Ramal quarenta e dois zero um')
    .replace(/\bFila\s*7001\b/gi, 'Fila sete zero zero um')
    .replace(/\bFila\s*7002\b/gi, 'Fila sete zero zero dois')
    .replace(/\bRamal\s*9001\b/gi, 'Ramal nove zero zero um')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Detecta inteligentemente o gênero e identidade do locutor baseado no texto gerado e contexto de telefonia.
 * Exemplo: Se for Roberto falando, retorna gênero masculino e perfil humanizado.
 */
export function detectVoiceGenderFromText(
  text: string,
  context?: {
    callerNumber?: string;
    destination?: string;
    speakerName?: string;
    agentName?: string;
  },
  fallback: 'male' | 'female' = 'female'
): {
  gender: 'male' | 'female';
  detectedSpeaker: string;
  confidence: number;
} {
  const lower = (text || '').toLowerCase();
  const dest = (context?.destination || '').toLowerCase();
  const speaker = (context?.speakerName || '').toLowerCase();
  const agent = (context?.agentName || '').toLowerCase();

  // Pistas prioritárias de locutor masculino: Roberto Mendes (Suporte N1/NOC, Ramal 4102)
  if (
    lower.includes('roberto falando') ||
    lower.includes('roberto mendes') ||
    lower.includes('aqui é o roberto') ||
    lower.includes('sou o roberto') ||
    lower.includes('roberto do suporte') ||
    lower.includes('com o roberto') ||
    dest.includes('4102') ||
    dest.includes('roberto') ||
    speaker.includes('roberto') ||
    agent.includes('roberto')
  ) {
    return {
      gender: 'male',
      detectedSpeaker: 'Roberto Mendes (Suporte Técnico N1 • Voz Masculina)',
      confidence: 0.99,
    };
  }

  // Pistas de locutor masculino: Carlos Silva (Central/Recepção, Ramal 4101)
  if (
    lower.includes('carlos falando') ||
    lower.includes('carlos silva') ||
    lower.includes('aqui é o carlos') ||
    lower.includes('sou o carlos') ||
    dest.includes('4101') ||
    speaker.includes('carlos') ||
    agent.includes('carlos')
  ) {
    return {
      gender: 'male',
      detectedSpeaker: 'Carlos Silva (Central Telefônica • Voz Masculina)',
      confidence: 0.95,
    };
  }

  // Outros padrões masculinos gerais
  const maleKeywords = [
    'lucas falando',
    'sou o especialista',
    'atendente masculino',
    'atencioso e prestativo',
    'obrigado pelo contato',
  ];
  if (maleKeywords.some((k) => lower.includes(k))) {
    return {
      gender: 'male',
      detectedSpeaker: 'Atendente Masculino (Suporte)',
      confidence: 0.85,
    };
  }

  // Pistas prioritárias de locutora feminina: MaIA (Assistente Virtual 24/7)
  if (
    lower.includes('maia falando') ||
    lower.includes('sou a maia') ||
    lower.includes('assistente virtual da enlace') ||
    lower.includes('assistente virtual') ||
    speaker.includes('maia') ||
    agent.includes('maia')
  ) {
    return {
      gender: 'female',
      detectedSpeaker: 'MaIA (Assistente Virtual 24/7 • Voz Feminina)',
      confidence: 0.99,
    };
  }

  // Pistas de locutora feminina: Mariana Costa (Comercial, Ramal 4103)
  if (
    lower.includes('mariana falando') ||
    lower.includes('mariana costa') ||
    dest.includes('4103') ||
    speaker.includes('mariana')
  ) {
    return {
      gender: 'female',
      detectedSpeaker: 'Mariana Costa (Comercial • Voz Feminina)',
      confidence: 0.95,
    };
  }

  // Pistas de locutora feminina: Renata Lima (Financeiro, Ramal 4201)
  if (
    lower.includes('renata falando') ||
    lower.includes('renata lima') ||
    dest.includes('4201') ||
    speaker.includes('renata')
  ) {
    return {
      gender: 'female',
      detectedSpeaker: 'Renata Lima (Financeiro • Voz Feminina)',
      confidence: 0.95,
    };
  }

  return {
    gender: fallback,
    detectedSpeaker:
      fallback === 'male'
        ? 'Roberto Mendes (Voz Masculina)'
        : 'MaIA (Voz Feminina)',
    confidence: 0.5,
  };
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

export function resolveAgentVoice(
  agent?: {
    name?: string;
    voice?: string;
    voiceGender?: 'male' | 'female';
    avatarType?: string;
  },
  context?: {
    userMessage?: string;
    replyText?: string;
    destination?: string;
    callerNumber?: string;
    speakerName?: string;
    forcedGender?: 'male' | 'female';
  }
): {
  voiceName: string;
  gender: 'male' | 'female';
  avatarType: string;
  pitchMultiplier: number;
  rateMultiplier: number;
  timbre: string;
  detectedSpeaker: string;
} {
  // Se houver texto gerado na resposta, verifica prioritariamente quem está falando
  let detected = detectVoiceGenderFromText(
    context?.replyText || context?.userMessage || '',
    {
      destination: context?.destination,
      speakerName: context?.speakerName,
      agentName: agent?.name,
    },
    agent?.voiceGender || 'female'
  );

  let gender: 'male' | 'female' = context?.forcedGender || detected.gender;

  // Verificação adicional por nome do agente caso não tenha detectado explicitamente
  if (!context?.forcedGender && !context?.replyText && agent?.name) {
    const lowerName = agent.name.toLowerCase();
    if (
      lowerName.includes('roberto') ||
      lowerName.includes('carlos') ||
      lowerName.includes('lucas') ||
      lowerName.includes('mendes') ||
      lowerName.includes('masculino')
    ) {
      gender = 'male';
      detected.detectedSpeaker = 'Roberto Mendes (Suporte Técnico N1 • Voz Masculina)';
    }
  }

  const maleVoices = ['Fenrir', 'Puck', 'Charon'];
  const femaleVoices = ['Zephyr', 'Kore', 'Aoede'];

  let resolvedVoice = agent?.voice || (gender === 'male' ? 'Fenrir' : 'Zephyr');

  // Dynamic voice alignment: Garante que a voz do Gemini corresponda estritamente ao gênero do locutor
  if (gender === 'male' && !maleVoices.includes(resolvedVoice)) {
    resolvedVoice = 'Fenrir';
  } else if (gender === 'female' && !femaleVoices.includes(resolvedVoice)) {
    resolvedVoice = 'Zephyr';
  }

  const profile = GEMINI_VOICE_PROFILES[resolvedVoice] || {
    name: resolvedVoice,
    gender,
    label: resolvedVoice,
    timbre:
      gender === 'male'
        ? 'Barítono encorpado, tom acolhedor, grave e seguro'
        : 'Soprano suave, fluida, acolhedora e expressiva',
    recommendedFor: 'Atendimento Geral',
    pitchMultiplier: gender === 'male' ? 0.88 : 1.04,
    rateMultiplier: gender === 'male' ? 0.95 : 0.98,
  };

  const avatarType =
    gender === 'male'
      ? (agent?.avatarType?.startsWith('male') ? agent.avatarType : 'male_tech')
      : (agent?.avatarType?.startsWith('female') ? agent.avatarType : 'female_ai');

  return {
    voiceName: resolvedVoice,
    gender,
    avatarType,
    pitchMultiplier: profile.pitchMultiplier,
    rateMultiplier: profile.rateMultiplier,
    timbre: profile.timbre,
    detectedSpeaker: detected.detectedSpeaker,
  };
}

export interface VoiceTurnRequest {
  agentId: string;
  userMessage: string;
  history: Array<{ role: 'user' | 'model' | 'system'; text: string }>;
  callerNumber?: string;
  tenantId?: string;
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
    detectedSpeaker?: string;
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
    const conv = db.omnichannelConversations.find(c => c.id === conversationId);
    let historyContext = '';
    let memoryContext = '';

    if (conv) {
      // Get last 5 messages for context
      historyContext = conv.messages.slice(-5).map(m => `${m.sender === 'user' ? 'Cliente' : 'IA'}: ${m.text}`).join('\n');
      
      // Customer Memory Retrieval
      const customerContact = db.crmContacts.find(c => c.id === conv.contactId || c.phone.replace(/\D/g, '') === conv.contactId.replace(/\D/g, ''));
      const customerMem = customerContact ? db.customerMemories.find(m => m.contactId === customerContact.id) : null;
      
      if (customerMem) {
        memoryContext = `\n[MEMÓRIA DO CLIENTE - ${customerContact?.name || 'Desconhecido'}]\nResumo: ${customerMem.summary}\nPreferências: ${customerMem.preferences.join(', ')}\nSentimento anterior: ${customerMem.sentimentHistory}\nRisco de Churn: ${customerMem.churnRisk}%\n`;
      }
    }

    const agent = agentId ? (db.aiAgents.find((a) => a.id === agentId) || db.aiAgents[0]) : db.aiAgents[0];

    // Assemble Knowledge grounding
    const knowledgeSnippets = agent.knowledgeSources
      .map((kId) => db.aiKnowledge.find((k) => k.id === kId))
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
    const startTime = Date.now();
    const tenantId = req.tenantId || 'tenant-enlace-matriz';
    const agent = db.aiAgents.find((a) => a.id === req.agentId) || db.aiAgents[0];
    let voiceConfig = resolveAgentVoice(agent, {
      userMessage: req.userMessage,
      destination: req.callerNumber,
    });

    // Assemble Knowledge grounding
    const knowledgeSnippets = agent.knowledgeSources
      .map((kId) => db.aiKnowledge.find((k) => k.id === kId))
      .filter(Boolean)
      .map((k) => `[FONTE: ${k!.title} - ${k!.category}]\n${k!.content}`)
      .join('\n\n');

    const voiceGuidance =
      voiceConfig.gender === 'male'
        ? `DIRETRIZ DE VOZ MASCULINA HUMANIZADA:
- Você é Roberto Mendes, especialista sênior de suporte técnico N1/N2 da Enlace Telecom (Ramal 4102).
- Ao se identificar ou iniciar diálogo, declare com naturalidade: "Alô! Suporte Técnico Enlace, Roberto falando." ou "Aqui é o Roberto do suporte técnico."
- Fale com voz masculina segura, firme, acolhedora, humana e resolutiva (timbre: ${voiceConfig.timbre}).
- NUNCA use tom mecânico ou robótico. Use pausas naturais e vocabulário conversacional em português do Brasil.`
        : `DIRETRIZ DE VOZ FEMININA HUMANIZADA:
- Você é MaIA, assistente virtual receptiva 24/7 da Enlace Telecom (Ramal 9001).
- Ao se identificar ou iniciar diálogo, fale: "Olá! Sou a MaIA da Enlace Telecom."
- Fale com voz feminina clara, fluida, empática, acolhedora e expressiva (timbre: ${voiceConfig.timbre}).
- Evite tom robótico ou frio. Use entonação natural e acolhedora em português do Brasil.`;

    const systemPrompt = `${agent.systemInstruction}

${voiceGuidance}

DIRETRIZES DA TELEFONIA ENLACE-PBX:
1. Você está atendendo uma chamada telefônica em tempo real no Asterisk. Responda em português brasileiro culto, coloquial, amigável e direto.
2. Cada resposta sua deve ter entre 1 e 3 frases curtas para não sobrecarregar o ouvinte.
3. Se o chamador pedir transferência para atendente humano ou setor específico, use a ferramenta transferir_chamada.
4. Se o chamador confirmar que terminou ou se despedir, use a ferramenta encerrar_chamada.
5. Baseie suas respostas nas seguintes fontes de conhecimento oficiais da empresa:

${knowledgeSnippets}`;

    const ai = getAiClient();

    if (!ai) {
      // Intelligent fallback when GEMINI_API_KEY is not configured
      return this.handleFallbackTurn(agent, req, startTime, voiceConfig);
    }

    try {
      // Build function declarations for tools authorized for this agent
      const functionDeclarations = agent.tools
        .map((tId) => db.aiTools.find((t) => t.id === tId))
        .filter(Boolean)
        .map((tool) => ({
          name: tool!.name,
          description: tool!.description,
          parameters: {
            type: Type.OBJECT,
            properties: {
              ...(tool!.name === 'consultar_cliente' && {
                cpf_cnpj: { type: Type.STRING, description: 'CPF ou CNPJ informado pelo chamador' },
                telefone: { type: Type.STRING, description: 'Telefone do chamador' },
              }),
              ...(tool!.name === 'consultar_fatura' && {
                cpf_cnpj: { type: Type.STRING, description: 'CPF ou CNPJ do titular' },
              }),
              ...(tool!.name === 'abrir_ticket' && {
                categoria: { type: Type.STRING, description: 'Categoria do problema (lentidão, sem_conexão, ramal)' },
                descricao: { type: Type.STRING, description: 'Descrição suscinta do problema' },
                urgencia: { type: Type.STRING, description: 'baixa, media ou alta' },
              }),
              ...(tool!.name === 'transferir_chamada' && {
                destino: { type: Type.STRING, description: 'Ramal (ex: 4101, 4102) ou fila (ex: 7001)' },
                motivo: { type: Type.STRING, description: 'Motivo do transbordo' },
              }),
              ...(tool!.name === 'encerrar_chamada' && {
                motivo: { type: Type.STRING, description: 'Motivo do término' },
              }),
            },
          },
        }));

      // Customer Memory Retrieval
      const customerContact = db.crmContacts.find(
        (c) =>
          c.phone.replace(/\D/g, '') === (req.callerNumber || '').replace(/\D/g, '') &&
          c.tenantId === tenantId
      );
      const customerMem = customerContact
        ? db.customerMemories.find((m) => m.contactId === customerContact.id)
        : null;
      let memoryContext = '';
      if (customerMem) {
        memoryContext = `[MEMÓRIA DO CLIENTE - ${customerContact?.name || 'Desconhecido'}]\nResumo: ${customerMem.summary}\nPreferências: ${customerMem.preferences.join(', ')}\nSentimento anterior: ${customerMem.sentimentHistory}\nRisco de Churn: ${customerMem.churnRisk}%\n\n`;
      }

      // Convert history with correct persona label
      const agentSpeakerName = agent.name.split(' ')[0] || (voiceConfig.gender === 'male' ? 'Roberto' : 'MaIA');
      const formattedHistory = req.history
        .filter((h) => h.role === 'user' || h.role === 'model')
        .slice(-6)
        .map((h) => `${h.role === 'user' ? 'Chamador' : agentSpeakerName}: ${h.text}`)
        .join('\n');

      const userPromptWithContext = `${memoryContext}${formattedHistory ? `Histórico recente:\n${formattedHistory}\n\n` : ''}Chamador (${req.callerNumber || 'Desconhecido'}): "${req.userMessage}"`;

      // Safe model selection avoiding deprecated models
      let selectedModel = agent.model || 'gemini-flash-latest';

      const response = await ai.models.generateContent({
        model: selectedModel,
        contents: userPromptWithContext,
        config: {
          systemInstruction: systemPrompt,
          temperature: agent.temperature || 0.3,
          ...(functionDeclarations.length > 0 && {
            tools: [{ functionDeclarations }],
          }),
        },
      });

      let replyText = response.text || '';
      let toolCallExecuted: VoiceTurnResponse['toolCallExecuted'] = undefined;
      let action: VoiceTurnResponse['action'] = 'none';
      let transferDestination: string | undefined = undefined;

      // Handle function calls if model invoked any
      const functionCalls = response.functionCalls;
      if (functionCalls && functionCalls.length > 0) {
        const fc = functionCalls[0];
        const toolObj = db.aiTools.find((t) => t.name === fc.name);

        if (!toolObj || !agent.tools.includes(toolObj.id)) {
          throw new Error(`Policy Engine Violation: Agent attempted to execute unauthorized tool ${fc.name}`);
        }

        const args = (fc.args as Record<string, unknown>) || {};
        let result: Record<string, unknown> = toolObj ? { ...toolObj.mockResponse } : { status: 'ok' };

        // Log AI tool execution to Audit
        db.auditLogs.unshift({
          id: `audit-${Date.now()}`,
          tenantId,
          userId: 'ai-gateway',
          userName: `AI Agent: ${agent.name}`,
          action: 'EXECUTE_TOOL',
          resource: `ai_tools/${toolObj.id}`,
          ip: 'internal',
          timestamp: new Date().toISOString(),
          details: `Execução da ferramenta ${fc.name} com os argumentos: ${JSON.stringify(args)}`,
        });

        if (fc.name === 'transferir_chamada') {
          action = 'transfer';
          transferDestination = (args.destino as string) || agent.transferExtension || '4101';
          result = {
            sucesso: true,
            canal_ari: `PJSIP/${transferDestination}-transfer`,
            mensagem: `Transferindo para ramal/fila ${transferDestination}`,
          };
          if (!replyText) {
            replyText = `Com certeza! Estou transferindo sua ligação para o ramal ${transferDestination}. Um momento, por favor.`;
          }
        } else if (fc.name === 'encerrar_chamada') {
          action = 'hangup';
          if (!replyText) {
            replyText = 'Agradeço pelo contato com a Enlace Telecom. Tenha um ótimo dia!';
          }
        } else if (fc.name === 'consultar_cliente') {
          result = {
            status: 'encontrado',
            nome: 'Cliente Enlace Telecom',
            plano: 'Fibra Óptica Dedicada + Telefonia IP',
            financeiro: 'Em dia',
          };
          if (!replyText) {
            replyText = 'Localizei seu cadastro ativo aqui na Enlace Telecom. Como posso te auxiliar hoje?';
          }
        } else if (fc.name === 'consultar_fatura') {
          result = {
            status: 'Aberta',
            valor: 'R$ 249,00',
            vencimento: '15/09/2026',
            codigo_pix: 'pix-copia-e-cola-enlace-telecom',
          };
          if (!replyText) {
            replyText = 'Sua fatura de R$ 249,00 está em aberto com vencimento para 15 de setembro. Posso te enviar o código Pix por SMS ou transferir para o financeiro.';
          }
        }

        toolCallExecuted = {
          name: fc.name,
          args,
          result,
        };
      }

      if (!replyText) {
        replyText =
          voiceConfig.gender === 'male'
            ? 'Alô! Suporte Técnico Enlace, Roberto falando. Como posso te ajudar hoje?'
            : 'Olá! Sou a MaIA da Enlace Telecom. Em que posso te ajudar hoje?';
      }

      // Reavalia dinamicamente o locutor e a voz após a formulação do texto
      // Exemplo: se a IA começou com "Roberto falando", detecta masculino e ajusta para Fenrir
      voiceConfig = resolveAgentVoice(agent, {
        userMessage: req.userMessage,
        replyText,
        destination: req.callerNumber,
        forcedGender: voiceConfig.gender === 'male' ? 'male' : undefined,
      });

      // Síntese de voz com Gemini TTS de alta fidelidade
      let audioBase64: string | undefined = undefined;
      try {
        const cleanedSpeechText = cleanTextForTTS(replyText);
        const speechPrompt =
          voiceConfig.gender === 'male'
            ? `Fale em português do Brasil com voz masculina firme, humana, acolhedora e natural de especialista de suporte técnico:\n\n${cleanedSpeechText}`
            : `Fale em português do Brasil com voz feminina suave, clara, empática e acolhedora de assistente virtual:\n\n${cleanedSpeechText}`;

        const ttsResponse = await ai.models.generateContent({
          model: 'gemini-3.1-flash-tts-preview',
          contents: [{ parts: [{ text: speechPrompt }] }],
          config: {
            responseModalities: [Modality.AUDIO],
            speechConfig: {
              voiceConfig: {
                prebuiltVoiceConfig: {
                  voiceName: voiceConfig.voiceName,
                },
              },
            },
          },
        });
        const inlineAudio = ttsResponse.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
        if (inlineAudio) {
          audioBase64 = ensureWavAudio(inlineAudio, 24000, 1, 16);
        }
      } catch (e) {
        console.warn('Gemini TTS offline, delegando reprodução para Web Speech API:', e);
      }

      const latencyMs = Date.now() - startTime;

      return {
        replyText,
        toolCallExecuted,
        action,
        transferDestination,
        audioBase64,
        latencyMs,
        tokensUsed: {
          input: Math.round(userPromptWithContext.length / 4) + 120,
          output: Math.round(replyText.length / 4) + 20,
        },
        voiceConfig,
      };
    } catch (err: unknown) {
      console.error('Gemini Voice Turn error:', err);
      return this.handleFallbackTurn(agent, req, startTime, voiceConfig);
    }
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
    const lower = req.userMessage.toLowerCase();
    const isExplicitRoberto =
      lower.includes('roberto') ||
      lower.includes('suporte') ||
      req.callerNumber?.includes('4102') ||
      agent.name.toLowerCase().includes('roberto');

    const voiceConfig =
      providedVoiceConfig ||
      resolveAgentVoice(agent, {
        userMessage: req.userMessage,
        forcedGender: isExplicitRoberto ? 'male' : undefined,
      });
    const isMale = voiceConfig.gender === 'male';

    let replyText = isMale
      ? 'Alô! Suporte Técnico Enlace, Roberto falando. Como posso ajudar com sua conexão, ramal ou chamado hoje?'
      : 'Olá! Sou a MaIA da Enlace Telecom. Como posso te auxiliar com seus serviços de telefonia ou internet?';
    let action: VoiceTurnResponse['action'] = 'none';
    let transferDestination: string | undefined = undefined;
    let toolCallExecuted: VoiceTurnResponse['toolCallExecuted'] = undefined;

    if (lower.includes('humano') || lower.includes('atendente') || lower.includes('transferir') || lower.includes('falar com alguém')) {
      action = 'transfer';
      transferDestination = agent.transferExtension || (isMale ? '4101' : '4102');
      replyText = `Com certeza! Estou transferindo você agora mesmo para o ramal ${transferDestination}. Por favor, aguarde na linha.`;
      toolCallExecuted = {
        name: 'transferir_chamada',
        args: { destino: transferDestination, motivo: 'Solicitação de atendente humano' },
        result: { status: 'sucesso', canal_ari: `PJSIP/${transferDestination}-001a` },
      };
    } else if (lower.includes('fatura') || lower.includes('boleto') || lower.includes('pix') || lower.includes('pagar') || lower.includes('segunda via')) {
      replyText = isMale
        ? 'Localizei sua fatura aqui no sistema: valor de R$ 249,00 com vencimento em 15/09. Posso enviar o código Pix por SMS ou transferir para a Renata no Financeiro.'
        : 'Localizei sua fatura em aberto no valor de R$ 249,00 com vencimento em 15/09. Posso enviar o código Pix para você ou transferir para nosso setor de cobrança.';
      toolCallExecuted = {
        name: 'consultar_fatura',
        args: { cpf_cnpj: 'titular' },
        result: { valor: 'R$ 249,00', status: 'Aberta' },
      };
    } else if (lower.includes('suporte') || lower.includes('sem internet') || lower.includes('ramal') || lower.includes('mudo') || lower.includes('chiado')) {
      replyText = isMale
        ? 'Alô! Suporte Técnico Enlace, Roberto falando. Entendi perfeitamente a dificuldade. Recomendo reiniciar o aparelho telefônico e checar o cabo de rede. Deseja que eu abra um chamado no NOC agora?'
        : 'Entendi a dificuldade técnica. Recomendo verificar o cabo de rede ou reiniciar o aparelho por 30 segundos. Deseja que eu abra um chamado de suporte?';
      toolCallExecuted = {
        name: 'abrir_ticket',
        args: { categoria: 'suporte_tecnico', urgencia: 'alta' },
        result: { protocolo: `ENL-${Date.now().toString().slice(-5)}`, status: 'Aberto' },
      };
    } else if (lower.includes('tchau') || lower.includes('obrigado') || lower.includes('valeu') || lower.includes('desligar') || lower.includes('era isso')) {
      action = 'hangup';
      replyText = isMale
        ? 'Obrigado pelo contato com o suporte Enlace Telecom! Qualquer dúvida, estamos à disposição no ramal 4102. Tenha um ótimo dia!'
        : 'Foi um prazer te atender! A Enlace Telecom agradece sua ligação. Até logo!';
      toolCallExecuted = {
        name: 'encerrar_chamada',
        args: { motivo: 'Conclusão pelo usuário' },
        result: { status: 'finalizado' },
      };
    }

    return {
      replyText,
      toolCallExecuted,
      action,
      transferDestination,
      latencyMs: Date.now() - startTime + 180,
      tokensUsed: { input: 120, output: 45 },
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
    const agent = params.agentId ? db.aiAgents.find((a) => a.id === params.agentId) : undefined;
    const voiceConfig = resolveAgentVoice(
      {
        name: agent?.name,
        voice: params.voice || agent?.voice,
        voiceGender: params.voiceGender || agent?.voiceGender,
        avatarType: agent?.avatarType,
      },
      {
        replyText: params.text,
        forcedGender: params.voiceGender,
      }
    );

    const sampleText =
      params.text ||
      (voiceConfig.gender === 'male'
        ? 'Alô! Suporte Técnico Enlace, Roberto falando. Como posso ajudar com seu chamado ou conexão hoje?'
        : 'Olá! Sou a MaIA, assistente virtual da Enlace Telecom. Como posso ajudar você hoje?');

    let audioBase64: string | undefined = undefined;
    const ai = getAiClient();
    if (ai) {
      try {
        const cleanedSpeechText = cleanTextForTTS(sampleText);
        const speechPrompt =
          voiceConfig.gender === 'male'
            ? `Fale em português do Brasil com voz masculina firme, humana, empática e acolhedora de especialista de suporte técnico:\n\n${cleanedSpeechText}`
            : `Fale em português do Brasil com voz feminina suave, clara, empática e acolhedora de assistente virtual:\n\n${cleanedSpeechText}`;

        const ttsResponse = await ai.models.generateContent({
          model: 'gemini-3.1-flash-tts-preview',
          contents: [{ parts: [{ text: speechPrompt }] }],
          config: {
            responseModalities: [Modality.AUDIO],
            speechConfig: {
              voiceConfig: {
                prebuiltVoiceConfig: {
                  voiceName: voiceConfig.voiceName,
                },
              },
            },
          },
        });
        const inlineAudio = ttsResponse.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
        if (inlineAudio) {
          audioBase64 = ensureWavAudio(inlineAudio, 24000, 1, 16);
        }
      } catch (e) {
        console.warn('Gemini TTS preview fallback to client audio:', e);
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
            model: 'gemini-3.8-flash',
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