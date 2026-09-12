const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

const oldWebhookHandler = `
  // Meta Webhook Receiving Messages
  app.post('/api/v1/webhooks/whatsapp', (req, res) => {
    const body = req.body;
    
    if (body.object) {
      if (body.entry && body.entry[0].changes && body.entry[0].changes[0] && body.entry[0].changes[0].value.messages && body.entry[0].changes[0].value.messages[0]) {
        const phone_number_id = body.entry[0].changes[0].value.metadata.phone_number_id;
        const from = body.entry[0].changes[0].value.messages[0].from; // sender number
        const msg_body = body.entry[0].changes[0].value.messages[0].text.body; 

        // Find or create conversation
        let conv = db.omnichannelConversations.find(c => c.contactId === from && c.channel === 'whatsapp');
        if (!conv) {
          conv = {
            id: \`conv-wa-\${Date.now()}\`,
            tenantId: 'tenant-enlace-matriz',
            contactId: from,
            channel: 'whatsapp',
            status: 'active',
            createdAt: new Date().toISOString(),
            messages: []
          };
          db.omnichannelConversations.push(conv);
        }

        conv.messages.push({
          id: body.entry[0].changes[0].value.messages[0].id,
          sender: 'user',
          text: msg_body,
          timestamp: new Date().toISOString()
        });
      }
      res.sendStatus(200);
    } else {
      res.sendStatus(404);
    }
  });`;

const newWebhookHandler = `
  // Meta Webhook Receiving Messages
  app.post('/api/v1/webhooks/whatsapp', async (req, res) => {
    const body = req.body;
    
    if (body.object) {
      if (body.entry && body.entry[0].changes && body.entry[0].changes[0] && body.entry[0].changes[0].value.messages && body.entry[0].changes[0].value.messages[0]) {
        const phone_number_id = body.entry[0].changes[0].value.metadata.phone_number_id;
        const from = body.entry[0].changes[0].value.messages[0].from; // sender number
        const msg_body = body.entry[0].changes[0].value.messages[0].text?.body; 

        if (!msg_body) {
           return res.sendStatus(200); // Ignore non-text for now
        }

        // Find or create conversation
        let conv = db.omnichannelConversations.find(c => c.contactId === from && c.channel === 'whatsapp');
        if (!conv) {
          conv = {
            id: \`conv-wa-\${Date.now()}\`,
            tenantId: 'tenant-enlace-matriz',
            contactId: from,
            channel: 'whatsapp',
            status: 'bot_handling', // Default to bot handling for new conversations
            createdAt: new Date().toISOString(),
            messages: []
          };
          db.omnichannelConversations.push(conv);
        }

        conv.messages.push({
          id: body.entry[0].changes[0].value.messages[0].id,
          sender: 'user',
          text: msg_body,
          timestamp: new Date().toISOString()
        });

        // Trigger AI response if in bot_handling status
        if (conv.status === 'bot_handling') {
           const { geminiService } = await import('./server/geminiService.js');
           const aiResponseText = await geminiService.processWhatsAppTurn(conv.id, msg_body);
           
           // Check if AI decided to transfer (simple keyword matching for demo purposes)
           if (aiResponseText.toLowerCase().includes('transferir') || aiResponseText.toLowerCase().includes('atendente')) {
              conv.status = 'queued'; // Transfer to human
           }
           
           const aiMsg = {
             id: \`msg-ai-\${Date.now()}\`,
             sender: 'bot' as const,
             text: aiResponseText,
             timestamp: new Date().toISOString()
           };
           conv.messages.push(aiMsg);

           // Actually send it via Meta API
           const config = db.whatsappConfigs[0];
           if (config && config.isActive && config.accessToken) {
             try {
               await fetch(\`https://graph.facebook.com/v17.0/\${config.phoneNumberId}/messages\`, {
                 method: 'POST',
                 headers: {
                   'Authorization': \`Bearer \${config.accessToken}\`,
                   'Content-Type': 'application/json'
                 },
                 body: JSON.stringify({
                   messaging_product: 'whatsapp',
                   to: from,
                   type: 'text',
                   text: { body: aiResponseText }
                 })
               });
             } catch(e) {
               console.error('Failed to send AI reply via Meta', e);
             }
           }
        }
      }
      res.sendStatus(200);
    } else {
      res.sendStatus(404);
    }
  });`;

code = code.replace(oldWebhookHandler, newWebhookHandler);
fs.writeFileSync('server.ts', code);
console.log('Server webhook patched');
