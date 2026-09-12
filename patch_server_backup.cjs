const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

const backupRoutes = `
  // System Backup & Restore
  app.get('/api/v1/system/backup', (req, res) => {
    // Generate a JSON snapshot of the entire DB
    const snapshot = {
      timestamp: new Date().toISOString(),
      version: '20.17.0',
      data: {
        tenants: db.tenants,
        extensions: db.extensions,
        trunks: db.trunks,
        inboundRoutes: db.inboundRoutes,
        outboundRoutes: db.outboundRoutes,
        ringGroups: db.ringGroups,
        queues: db.queues,
        ivrs: db.ivrs,
        cdrs: db.cdrs,
        aiAgents: db.aiAgents,
        aiKnowledge: db.aiKnowledge,
        whatsappConfigs: db.whatsappConfigs,
        omnichannelConversations: db.omnichannelConversations,
      }
    };
    res.setHeader('Content-disposition', 'attachment; filename=enlace-pbx-backup-' + Date.now() + '.json');
    res.setHeader('Content-type', 'application/json');
    res.json(snapshot);
  });

  app.post('/api/v1/system/restore', (req, res) => {
    const backup = req.body;
    if (!backup || !backup.data) {
      return res.status(400).json({ error: 'Formato de backup inválido.' });
    }
    
    // Naive restore - overwrite in-memory DB arrays
    if (backup.data.tenants) db.tenants = backup.data.tenants;
    if (backup.data.extensions) db.extensions = backup.data.extensions;
    if (backup.data.trunks) db.trunks = backup.data.trunks;
    if (backup.data.inboundRoutes) db.inboundRoutes = backup.data.inboundRoutes;
    if (backup.data.outboundRoutes) db.outboundRoutes = backup.data.outboundRoutes;
    if (backup.data.ringGroups) db.ringGroups = backup.data.ringGroups;
    if (backup.data.queues) db.queues = backup.data.queues;
    if (backup.data.ivrs) db.ivrs = backup.data.ivrs;
    if (backup.data.cdrs) db.cdrs = backup.data.cdrs;
    if (backup.data.aiAgents) db.aiAgents = backup.data.aiAgents;
    if (backup.data.aiKnowledge) db.aiKnowledge = backup.data.aiKnowledge;
    if (backup.data.whatsappConfigs) db.whatsappConfigs = backup.data.whatsappConfigs;
    if (backup.data.omnichannelConversations) db.omnichannelConversations = backup.data.omnichannelConversations;
    
    res.json({ success: true, message: 'Restore completed successfully' });
  });

`;

const anchor = "// Start polling for ARI events simulation";
code = code.replace(anchor, backupRoutes + '\n' + anchor);
fs.writeFileSync('server.ts', code);
console.log('Server backup routes added');
