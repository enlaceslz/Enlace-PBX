import { GoogleGenAI, Type } from '@google/genai';
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
  async processVoiceTurn(req: VoiceTurnRequest): Promise<VoiceTurnResponse> {
    const startTime = Date.now();
    const tenantId = req.tenantId || 'tenant-enlace-matriz';
    const agent = db.aiAgents.find((a) => a.id === req.agentId) || db.aiAgents[0];
    const voiceConfig = resolveAgentVoice(agent);

    // Assemble Knowledge grounding
    const knowledgeSnippets = agent.knowledgeSources
      .map((kId) => db.aiKnowledge.find((k) => k.id === kId))
      .filter(Boolean)
      .map((k) => `[FONTE: ${k!.title} - ${k!.category}]\n${k!.content}`)
      .join('\n\n');

    const voiceGuidance =
      voiceConfig.gender === 'male'
        ? `DIRETRIZ DE VOZ MASCULINA HUMANIZADA:
- Você é um atendente masculino profissional da Enlace Telecom (${agent.name.split('—')[0].trim() || 'Roberto'}).
- Fale com voz masculina segura, firme, acolhedora e natural (timbre: ${voiceConfig.timbre}).
- Evite entonação mecânica, tom robótico ou monotonia. Use pausas naturais e vocabulário conversacional em português do Brasil.`
        : `DIRETRIZ DE VOZ FEMININA HUMANIZADA:
- Você é uma atendente feminina profissional e acolhedora da Enlace Telecom (${agent.name.split('—')[0].trim() || 'MaIA'}).
- Fale com voz feminina clara, fluida, empática e expressiva (timbre: ${voiceConfig.timbre}).
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
      if (selectedModel.includes('2.5')) {
        selectedModel = 'gemini-flash-latest';
      }

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
            ? 'Entendido. Aqui é o suporte da Enlace Telecom, como posso te ajudar?'
            : 'Entendido. Em que mais posso te ajudar na Enlace Telecom?';
      }

      // Try Gemini TTS synthesis for natural human-like voice
      let audioBase64: string | undefined = undefined;
      try {
        const ttsResponse = await ai.models.generateContent({
          model: 'gemini-3.1-flash-tts-preview',
          contents: [{ parts: [{ text: replyText }] }],
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
        const inlineAudio = ttsResponse.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
        if (inlineAudio) {
          audioBase64 = inlineAudio;
        }
      } catch {
        // Fallback smoothly to browser humanized Web Speech API
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
    const voiceConfig = providedVoiceConfig || resolveAgentVoice(agent);
    const isMale = voiceConfig.gender === 'male';
    const lower = req.userMessage.toLowerCase();

    let replyText = isMale
      ? 'Olá! Aqui é o Roberto do Suporte Técnico da Enlace Telecom. Como posso ajudar com sua conexão, ramal ou chamado hoje?'
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
        ? 'Entendido perfeitamente. Como especialista de suporte, sugiro verificar se o cabo de rede está firme e reiniciar o aparelho telefônico por 30 segundos. Deseja que eu abra um chamado no NOC agora?'
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
          model: 'gemini-3.1-flash-tts-preview',
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
      } catch {
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
        }
      });
      const text = response.text;
      return JSON.parse(text || '{}');
    } catch (e) {
      console.error('Supervisor Evaluation failed', e);
      return null;
    }
  }
}

export const geminiService = new GeminiService();
