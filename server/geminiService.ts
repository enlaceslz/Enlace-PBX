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
}

export class GeminiService {
  async processVoiceTurn(req: VoiceTurnRequest): Promise<VoiceTurnResponse> {
    const startTime = Date.now();
    const tenantId = req.tenantId || 'tenant-enlace-matriz';
    const agent = db.aiAgents.find((a) => a.id === req.agentId) || db.aiAgents[0];

    // Assemble Knowledge grounding
    const knowledgeSnippets = agent.knowledgeSources
      .map((kId) => db.aiKnowledge.find((k) => k.id === kId))
      .filter(Boolean)
      .map((k) => `[FONTE: ${k!.title} - ${k!.category}]\n${k!.content}`)
      .join('\n\n');

    const systemPrompt = `${agent.systemInstruction}

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
      return this.handleFallbackTurn(agent, req, startTime);
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
      const customerContact = db.crmContacts.find(c => c.phone.replace(/\D/g, '') === (req.callerNumber || '').replace(/\D/g, '') && c.tenantId === tenantId);
      const customerMem = customerContact ? db.customerMemories.find(m => m.contactId === customerContact.id) : null;
      let memoryContext = '';
      if (customerMem) {
        memoryContext = `[MEMÓRIA DO CLIENTE - ${customerContact?.name || 'Desconhecido'}]\nResumo: ${customerMem.summary}\nPreferências: ${customerMem.preferences.join(', ')}\nSentimento anterior: ${customerMem.sentimentHistory}\nRisco de Churn: ${customerMem.churnRisk}%\n\n`;
      }

      // Convert history
      const formattedHistory = req.history
        .filter((h) => h.role === 'user' || h.role === 'model')
        .slice(-6)
        .map((h) => `${h.role === 'user' ? 'Chamador' : 'MaIA'}: ${h.text}`)
        .join('\n');

      const userPromptWithContext = `${memoryContext}${formattedHistory ? `Histórico recente:\n${formattedHistory}\n\n` : ''}Chamador (${req.callerNumber || 'Desconhecido'}): "${req.userMessage}"`;

      const response = await ai.models.generateContent({
        model: agent.model || 'gemini-flash-latest',
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
        
        // AI Policy Engine: Strict validation
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
        replyText = 'Entendido. Em que mais posso te ajudar na Enlace Telecom?';
      }

      const latencyMs = Date.now() - startTime;

      // Log AI turn in session if needed
      return {
        replyText,
        toolCallExecuted,
        action,
        transferDestination,
        latencyMs,
        tokensUsed: {
          input: Math.round(userPromptWithContext.length / 4) + 120,
          output: Math.round(replyText.length / 4) + 20,
        },
      };
    } catch (err: unknown) {
      console.error('Gemini Voice Turn error:', err);
      return this.handleFallbackTurn(agent, req, startTime);
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
    agent: { name: string; transferExtension?: string },
    req: VoiceTurnRequest,
    startTime: number
  ): VoiceTurnResponse {
    const lower = req.userMessage.toLowerCase();
    let replyText = 'Olá! Sou a MaIA da Enlace Telecom. Como posso te auxiliar com seus serviços de telefonia ou internet?';
    let action: VoiceTurnResponse['action'] = 'none';
    let transferDestination: string | undefined = undefined;
    let toolCallExecuted: VoiceTurnResponse['toolCallExecuted'] = undefined;

    if (lower.includes('humano') || lower.includes('atendente') || lower.includes('transferir') || lower.includes('falar com alguém')) {
      action = 'transfer';
      transferDestination = agent.transferExtension || '4102';
      replyText = `Com certeza! Estou transferindo você agora mesmo para nosso ramal ${transferDestination}. Por favor, aguarde na linha.`;
      toolCallExecuted = {
        name: 'transferir_chamada',
        args: { destino: transferDestination, motivo: 'Solicitação de atendente humano' },
        result: { status: 'sucesso', canal_ari: `PJSIP/${transferDestination}-001a` },
      };
    } else if (lower.includes('fatura') || lower.includes('boleto') || lower.includes('pix') || lower.includes('pagar') || lower.includes('segunda via')) {
      replyText = 'Localizei sua fatura em aberto no valor de R$ 249,00 com vencimento em 15/09. Posso enviar o código Pix para você ou transferir para nosso setor de cobrança.';
      toolCallExecuted = {
        name: 'consultar_fatura',
        args: { cpf_cnpj: 'titular' },
        result: { valor: 'R$ 249,00', status: 'Aberta' },
      };
    } else if (lower.includes('suporte') || lower.includes('sem internet') || lower.includes('ramal') || lower.includes('mudo') || lower.includes('chiado')) {
      replyText = 'Entendi a dificuldade técnica. Recomendo verificar o cabo de rede ou reiniciar o aparelho por 30 segundos. Deseja que eu abra um chamado de suporte?';
      toolCallExecuted = {
        name: 'abrir_ticket',
        args: { categoria: 'suporte_tecnico', urgencia: 'alta' },
        result: { protocolo: `ENL-${Date.now().toString().slice(-5)}`, status: 'Aberto' },
      };
    } else if (lower.includes('tchau') || lower.includes('obrigado') || lower.includes('valeu') || lower.includes('desligar') || lower.includes('era isso')) {
      action = 'hangup';
      replyText = 'Foi um prazer te atender! A Enlace Telecom agradece sua ligação. Até logo!';
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
