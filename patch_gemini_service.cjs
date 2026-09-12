const fs = require('fs');
let code = fs.readFileSync('server/geminiService.ts', 'utf8');

const newMethod = `
  async processWhatsAppTurn(conversationId: string, userMessage: string, agentId?: string): Promise<string> {
    const ai = getAiClient();
    if (!ai) {
      console.warn('Gemini API key missing, returning fallback for WhatsApp.');
      return 'Desculpe, o sistema de IA está temporariamente indisponível.';
    }

    // Get the conversation history for context
    const conv = db.omnichannelConversations.find(c => c.id === conversationId);
    let historyContext = '';
    if (conv) {
      // Get last 5 messages for context
      historyContext = conv.messages.slice(-5).map(m => \`\${m.sender === 'user' ? 'Cliente' : 'IA'}: \${m.text}\`).join('\\n');
    }

    const agent = agentId ? (db.aiAgents.find((a) => a.id === agentId) || db.aiAgents[0]) : db.aiAgents[0];

    // Assemble Knowledge grounding
    const knowledgeSnippets = agent.knowledgeSources
      .map((kId) => db.aiKnowledge.find((k) => k.id === kId))
      .filter(Boolean)
      .map((k) => \`[FONTE: \${k!.title} - \${k!.category}]\\n\${k!.content}\`)
      .join('\\n\\n');

    const systemPrompt = \`
Você é "\${agent.name}", um assistente virtual operando pelo WhatsApp da Enlace Telecom.
SUA MISSÃO: \${agent.role}

REGRAS ESTABELECIDAS:
\${agent.systemPrompt}

DIRETRIZES PARA WHATSAPP:
- Seja conciso e direto, mensagens curtas são melhores para chat.
- Use emojis moderadamente para tornar a conversa amigável.
- Se o cliente pedir para falar com um humano, diga que está transferindo.

BASE DE CONHECIMENTO (Use para responder dúvidas, se aplicável):
\${knowledgeSnippets}

HISTÓRICO RECENTE DA CONVERSA:
\${historyContext}
\`;

    try {
      const response = await ai.models.generateContent({
        model: agent.model,
        contents: userMessage,
        config: {
          systemInstruction: systemPrompt,
          temperature: agent.temperature,
          topP: 0.95,
        }
      });
      return response.text() || "Desculpe, não consegui formular uma resposta.";
    } catch (e) {
      console.error('Gemini API error during WhatsApp turn:', e);
      return 'Desculpe, ocorreu um erro interno ao processar sua mensagem.';
    }
  }
`;

code = code.replace('  async processVoiceTurn', newMethod + '\n  async processVoiceTurn');
fs.writeFileSync('server/geminiService.ts', code);
console.log('GeminiService patched');
