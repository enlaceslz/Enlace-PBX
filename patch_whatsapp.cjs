const fs = require('fs');

let server = fs.readFileSync('server.ts', 'utf-8');

server = server.replace(
  /const aiResponseText = await geminiService\.processWhatsAppTurn\(conv\.id, msg_body\);\s*\n\s*\/\/ Check if AI decided to transfer.*?if \(aiResponseText\.toLowerCase\(\).*?\{.*?\}/s,
  `const aiResponse = await geminiService.processWhatsAppTurn(conv.id, msg_body);
           const aiResponseText = typeof aiResponse === 'string' ? aiResponse : aiResponse.text;
           
           if (typeof aiResponse !== 'string' && aiResponse.transfer) {
              conv.status = 'queued'; // Transfer to human
              conv.messages.push({
                id: \`msg-sys-\${Date.now()}\`,
                sender: 'agent',
                text: '[Sistema]: O agente MaIA solicitou transbordo para fila humana.',
                timestamp: new Date().toISOString()
              });
           }`
);
fs.writeFileSync('server.ts', server);

let gemini = fs.readFileSync('server/geminiService.ts', 'utf-8');
gemini = gemini.replace(
  /async processWhatsAppTurn.*?Promise<string> \{.*?(const systemPrompt = .*?);.*?(try \{.*?return response\.text \|\| "Desculpe, não consegui formular uma resposta\.";).*?\} catch/s,
  `async processWhatsAppTurn(conversationId: string, userMessage: string, agentId?: string): Promise<{ text: string; transfer: boolean } | string> {
    const ai = getAiClient();
    if (!ai) {
      console.warn('Gemini API key missing, returning fallback for WhatsApp.');
      return 'Desculpe, o sistema de IA está temporariamente indisponível.';
    }

    const conv = db.omnichannelConversations.find(c => c.id === conversationId);
    let historyContext = '';
    let memoryContext = '';

    if (conv) {
      historyContext = conv.messages.slice(-5).map(m => \`\${m.sender === 'user' ? 'Cliente' : 'IA'}: \${m.text}\`).join('\\n');
      const customerContact = db.crmContacts.find(c => c.id === conv.contactId || c.phone.replace(/\\D/g, '') === conv.contactId.replace(/\\D/g, ''));
      const customerMem = customerContact ? db.customerMemories.find(m => m.contactId === customerContact.id) : null;
      if (customerMem) {
        memoryContext = \`\\n[MEMÓRIA DO CLIENTE - \${customerContact?.name || 'Desconhecido'}]\\nResumo: \${customerMem.summary}\\nPreferências: \${customerMem.preferences.join(', ')}\\nSentimento anterior: \${customerMem.sentimentHistory}\\nRisco de Churn: \${customerMem.churnRisk}%\\n\`;
      }
    }

    const agent = agentId ? (db.aiAgents.find((a) => a.id === agentId) || db.aiAgents[0]) : db.aiAgents[0];

    const knowledgeSnippets = agent.knowledgeSources
      .map((kId) => db.aiKnowledge.find((k) => k.id === kId))
      .filter(Boolean)
      .map((k) => \`[FONTE: \${k!.title} - \${k!.category}]\\n\${k!.content}\`)
      .join('\\n\\n');

    const systemPrompt = \`Você é "\${agent.name}", um assistente virtual operando pelo WhatsApp da Enlace Telecom.
SUA MISSÃO: \${agent.description}

REGRAS ESTABELECIDAS:
\${agent.systemInstruction}

DIRETRIZES PARA WHATSAPP:
- Seja conciso e direto, mensagens curtas são melhores para chat.
- Use emojis moderadamente.
- Se o cliente solicitar atendimento humano/falar com atendente, você DEVE retornar a intent de transbordo chamando a function apropriada ou respondendo no formato estruturado.

BASE DE CONHECIMENTO:
\${knowledgeSnippets}
\${memoryContext}

HISTÓRICO RECENTE:
\${historyContext}\`;

    try {
      const response = await ai.models.generateContent({
        model: agent.model,
        contents: userMessage,
        config: {
          systemInstruction: systemPrompt,
          temperature: agent.temperature,
          tools: [{
            functionDeclarations: [
              {
                name: "transfer_to_human",
                description: "Transfere o atendimento para um operador humano na fila. Chame esta função se o usuário solicitar falar com um humano, suporte humano, ou atendente.",
                parameters: {
                  type: "OBJECT",
                  properties: {
                    reason: {
                      type: "STRING",
                      description: "Motivo da transferência"
                    }
                  },
                  required: ["reason"]
                }
              }
            ]
          }]
        },
      });

      const functionCall = response.functionCalls?.[0];
      if (functionCall && functionCall.name === "transfer_to_human") {
         return {
           text: "Um momento, por favor. Estou transferindo você para um dos nossos operadores humanos...",
           transfer: true
         };
      }

      return response.text || "Desculpe, não consegui formular uma resposta.";`
);
fs.writeFileSync('server/geminiService.ts', gemini);
console.log('Patched whatsapp logic');
