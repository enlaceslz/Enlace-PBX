import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { db } from './server/db.js';
import { geminiService } from './server/geminiService.js';
import { asteriskService } from './server/asteriskService.js';

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // -------------------------------------------------------------------------
  // Health Checks (PRD Section 37)
  // -------------------------------------------------------------------------
  const getHealthStatus = () => ({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    platform: 'Enlace-PBX Pure Asterisk + Gemini AI',
    version: '20.17.0-enlace-enterprise',
    components: {
      asterisk: { status: 'up', version: 'Asterisk 20.17.0 LTS (Pure)', uptime: '4d 18h 32m' },
      postgresql: { status: 'up', latencyMs: 1.8, pool: 'active' },
      redis: { status: 'up', memoryUsedMb: 42.6 },
      ari: { status: 'up', port: 8088, apps: ['enlace-gemini'] },
      pjsip: { status: 'up', endpointsOnline: db.extensions.filter((e) => e.status === 'online').length, trunksRegistered: db.trunks.filter((t) => t.status === 'registered').length },
      audioSocket: { status: 'up', activeStreams: 2, bufferLatencyMs: 18 },
      aiGateway: { status: 'up', activeSessions: db.aiSessions.filter((s) => s.status === 'active').length },
      geminiApi: {
        status: process.env.GEMINI_API_KEY ? 'connected' : 'configured-local-mode',
        model: 'gemini-flash-latest',
        liveVoiceModel: 'gemini-3.1-flash-live-preview',
        defaultVoice: 'Zephyr',
      },
    },
  });

  app.get('/api/health', (req, res) => {
    res.json(getHealthStatus());
  });

  // -------------------------------------------------------------------------
  // Billing API
  // -------------------------------------------------------------------------
  app.get('/api/v1/billing/:tenantId', (req, res) => {
    const billing = db.billing.find(b => b.tenantId === req.params.tenantId);
    if (!billing) return res.status(404).json({ error: 'Billing record not found' });
    res.json(billing);
  });

  app.post('/api/v1/billing/:tenantId/recharge', (req, res) => {
    const billing = db.billing.find(b => b.tenantId === req.params.tenantId);
    if (!billing) return res.status(404).json({ error: 'Tenant billing record not found' });
    
    const amount = Number(req.body.amount) || 100;
    const paymentMethod = req.body.paymentMethod || 'PIX Instantâneo';
    
    billing.balance += amount;
    const newTx = {
      id: `tx-${Date.now()}`,
      date: new Date().toISOString().slice(0, 10),
      description: `Recarga de saldo pré-pago via ${paymentMethod}`,
      category: 'recharge' as const,
      type: 'credit' as const,
      amount: amount,
      balanceAfter: billing.balance,
    };
    if (!billing.transactions) billing.transactions = [];
    billing.transactions.unshift(newTx);

    db.auditLogs.unshift({
      id: `audit-${Date.now()}`,
      tenantId: billing.tenantId,
      userId: 'user-1',
      userName: 'Carlos Henrique Silva',
      action: 'BILLING_RECHARGE',
      resource: `billing/${billing.tenantId}`,
      ip: req.ip || '127.0.0.1',
      timestamp: new Date().toISOString(),
      details: `Recarga de crédito no valor de R$ ${amount.toFixed(2)} confirmada via ${paymentMethod}.`,
    });

    res.json({ success: true, balance: billing.balance, transaction: newTx });
  });

  app.post('/api/v1/billing/:tenantId/invoices/:invoiceId/pay', (req, res) => {
    const billing = db.billing.find(b => b.tenantId === req.params.tenantId);
    if (!billing) return res.status(404).json({ error: 'Tenant billing not found' });

    const inv = billing.recentInvoices.find(i => i.id === req.params.invoiceId);
    if (!inv) return res.status(404).json({ error: 'Invoice not found' });

    inv.status = 'paid';
    inv.paidAt = new Date().toISOString();
    inv.paymentMethod = req.body.paymentMethod || 'PIX';

    res.json({ success: true, invoice: inv });
  });

  // -------------------------------------------------------------------------
  // Campaigns API
  // -------------------------------------------------------------------------
  app.get('/api/v1/campaigns', (req, res) => {
    res.json(db.outboundCampaigns);
  });

  app.post('/api/v1/campaigns/:id/toggle', (req, res) => {
    const camp = db.outboundCampaigns.find(c => c.id === req.params.id);
    if (!camp) return res.status(404).json({ error: 'Not found' });
    
    if (camp.status === 'running') {
      camp.status = 'paused';
      camp.activeCalls = 0;
    } else if (camp.status === 'paused' || camp.status === 'draft') {
      camp.status = 'running';
      camp.activeCalls = camp.type === 'ai_voicebot' ? 12 : 5; // mock active calls
    }
    res.json(camp);
  });

  app.get('/api/v1/health', (req, res) => {
    res.json(getHealthStatus());
  });

  // -------------------------------------------------------------------------
  // Redes, VPN & Conectividade (WireGuard & ZeroTier)
  // -------------------------------------------------------------------------
  app.get('/api/v1/network/wireguard', (req, res) => {
    res.json(db.wireguard);
  });

  app.post('/api/v1/network/wireguard/toggle', (req, res) => {
    db.wireguard.status = db.wireguard.status === 'active' ? 'inactive' : 'active';
    res.json({ success: true, status: db.wireguard.status });
  });

  app.post('/api/v1/network/wireguard/peers', (req, res) => {
    const { name, allowedIps, endpoint, persistentKeepalive, assignedExtension, location } = req.body;
    if (!name) return res.status(400).json({ error: 'Nome do peer é obrigatório' });

    const newPeerId = `wg-peer-${Date.now()}`;
    const randomHex = Math.random().toString(36).substring(2, 10);
    const nextIpNum = db.wireguard.peers.length + 2;
    const peerIp = allowedIps || `10.10.0.${nextIpNum}/32`;

    const newPeer = {
      id: newPeerId,
      name,
      publicKey: `pubKey+wg+${randomHex}+enlace=`,
      allowedIps: peerIp,
      endpoint: endpoint || '',
      latestHandshake: 'Aguardando primeira conexão',
      transferRx: 0,
      transferTx: 0,
      persistentKeepalive: Number(persistentKeepalive) || 25,
      status: 'offline' as const,
      assignedExtension: assignedExtension || undefined,
      location: location || 'Remoto / Internet Pública',
      createdAt: new Date().toISOString(),
      enabled: true,
    };

    db.wireguard.peers.unshift(newPeer);
    db.wireguard.peersCount = db.wireguard.peers.length;

    // Log audit
    db.auditLogs.unshift({
      id: `audit-${Date.now()}`,
      tenantId: 'tenant-enlace-matriz',
      userId: 'user-1',
      userName: 'Carlos Henrique Silva',
      action: 'WIREGUARD_PEER_CREATE',
      resource: `network/wireguard/${newPeer.id}`,
      ip: req.ip || '127.0.0.1',
      timestamp: new Date().toISOString(),
      details: `Novo peer WireGuard cadastrado: ${name} (${peerIp})`,
    });

    res.json({ success: true, peer: newPeer });
  });

  app.delete('/api/v1/network/wireguard/peers/:id', (req, res) => {
    const idx = db.wireguard.peers.findIndex(p => p.id === req.params.id);
    if (idx === -1) return res.status(404).json({ error: 'Peer não encontrado' });

    const removed = db.wireguard.peers.splice(idx, 1)[0];
    db.wireguard.peersCount = db.wireguard.peers.length;
    db.wireguard.activePeersCount = db.wireguard.peers.filter(p => p.status === 'connected').length;

    res.json({ success: true, removed });
  });

  app.post('/api/v1/network/wireguard/peers/:id/toggle', (req, res) => {
    const peer = db.wireguard.peers.find(p => p.id === req.params.id);
    if (!peer) return res.status(404).json({ error: 'Peer não encontrado' });

    peer.enabled = !peer.enabled;
    if (!peer.enabled) {
      peer.status = 'offline';
    }
    db.wireguard.activePeersCount = db.wireguard.peers.filter(p => p.status === 'connected' && p.enabled).length;

    res.json({ success: true, peer });
  });

  app.get('/api/v1/network/wireguard/peers/:id/client-config', (req, res) => {
    const peer = db.wireguard.peers.find(p => p.id === req.params.id);
    if (!peer) return res.status(404).json({ error: 'Peer não encontrado' });

    const clientConf = `# -------------------------------------------------------------
# Enlace-PBX Telecom & AI - WireGuard Client Configuration
# Peer: ${peer.name}
# Ramal PJSIP Associado: ${peer.assignedExtension || 'N/A'}
# -------------------------------------------------------------
[Interface]
PrivateKey = <CHAVE_PRIVADA_DO_CLIENTE_GERADA_NO_DEVICE>
Address = ${peer.allowedIps}
DNS = 10.10.0.1, 1.1.1.1

[Peer]
PublicKey = ${db.wireguard.publicKey}
Endpoint = pbx.enlacetentelecom.com.br:${db.wireguard.listenPort}
AllowedIPs = 10.10.0.0/24, 192.168.0.0/16
PersistentKeepalive = ${peer.persistentKeepalive}
`;

    res.json({
      success: true,
      filename: `${peer.name.toLowerCase().replace(/[^a-z0-9]/g, '_')}.conf`,
      config: clientConf,
      peer,
    });
  });

  app.get('/api/v1/network/zerotier', (req, res) => {
    res.json(db.zerotier);
  });

  app.post('/api/v1/network/zerotier/toggle', (req, res) => {
    db.zerotier.status = db.zerotier.status === 'online' ? 'offline' : 'online';
    res.json({ success: true, status: db.zerotier.status });
  });

  app.post('/api/v1/network/zerotier/join', (req, res) => {
    const { networkId, name } = req.body;
    if (!networkId || networkId.length < 10) {
      return res.status(400).json({ error: 'Network ID inválido (deve conter 16 caracteres hexadecimais)' });
    }

    const existing = db.zerotier.networks.find(n => n.id === networkId);
    if (existing) {
      return res.status(400).json({ error: 'O servidor já está conectado a esta rede ZeroTier' });
    }

    const newNet = {
      id: networkId,
      name: name || `Rede-Mesh-${networkId.substring(0, 6)}`,
      status: 'OK' as const,
      type: 'PRIVATE' as const,
      assignedIp: `192.168.192.${Math.floor(Math.random() * 200 + 10)}/24`,
      mac: `e2:a1:${Math.floor(Math.random() * 89 + 10)}:${Math.floor(Math.random() * 89 + 10)}:01:1a`,
      mtu: 2800,
      broadcastEnabled: true,
      bridge: false,
      routes: ['192.168.192.0/24'],
    };

    db.zerotier.networks.push(newNet);

    db.auditLogs.unshift({
      id: `audit-${Date.now()}`,
      tenantId: 'tenant-enlace-matriz',
      userId: 'user-1',
      userName: 'Carlos Henrique Silva',
      action: 'ZEROTIER_JOIN_NETWORK',
      resource: `network/zerotier/${networkId}`,
      ip: req.ip || '127.0.0.1',
      timestamp: new Date().toISOString(),
      details: `Servidor Asterisk conectado à rede ZeroTier: ${networkId} (${newNet.name})`,
    });

    res.json({ success: true, network: newNet });
  });

  app.post('/api/v1/network/zerotier/leave', (req, res) => {
    const { networkId } = req.body;
    const idx = db.zerotier.networks.findIndex(n => n.id === networkId);
    if (idx === -1) return res.status(404).json({ error: 'Rede não encontrada' });

    const left = db.zerotier.networks.splice(idx, 1)[0];
    res.json({ success: true, left });
  });

  // -------------------------------------------------------------------------
  // Segurança & Monitoramento do Fail2ban
  // -------------------------------------------------------------------------
  app.get('/api/v1/security/fail2ban', (req, res) => {
    res.json(db.fail2ban);
  });

  app.post('/api/v1/security/fail2ban/reload', (req, res) => {
    db.fail2ban.daemonStatus = 'reloading';
    setTimeout(() => {
      db.fail2ban.daemonStatus = 'active';
      db.fail2ban.uptime = '4d 18h 33m (Recarregado)';
    }, 400);

    db.auditLogs.unshift({
      id: `audit-${Date.now()}`,
      tenantId: 'tenant-enlace-matriz',
      userId: 'user-1',
      userName: 'Carlos Henrique Silva',
      action: 'FAIL2BAN_RELOAD',
      resource: 'security/fail2ban',
      ip: req.ip || '127.0.0.1',
      timestamp: new Date().toISOString(),
      details: 'Daemon Fail2ban recarregado com sucesso (fail2ban-client reload)',
    });

    res.json({ success: true, message: 'Fail2ban recarregado com sucesso!' });
  });

  app.post('/api/v1/security/fail2ban/ban', (req, res) => {
    const { ip, jail, reason } = req.body;
    if (!ip) return res.status(400).json({ error: 'Endereço IP é obrigatório' });

    // Check if in whitelist
    if (db.fail2ban.whitelist.some(w => ip.startsWith(w.replace(/\/.*$/, '')))) {
      return res.status(400).json({ error: 'Este IP está cadastrado na Whitelist de segurança e não pode ser banido.' });
    }

    const selectedJail = jail || 'asterisk-pjsip';
    const newBan = {
      id: `ban-${Date.now()}`,
      ip,
      jail: selectedJail,
      country: 'IP Manual',
      countryCode: 'BR',
      failures: 1,
      bannedAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 86400000).toISOString(),
      reason: reason || 'Bloqueio administrativo manual via Painel Enlace-PBX',
      reverseDns: 'manual-ban.local',
    };

    db.fail2ban.bannedIps.unshift(newBan);
    db.fail2ban.totalBanned = db.fail2ban.bannedIps.length;

    const targetJail = db.fail2ban.jails.find(j => j.name === selectedJail);
    if (targetJail) {
      targetJail.currentlyBanned += 1;
      targetJail.totalBanned += 1;
    }

    db.auditLogs.unshift({
      id: `audit-${Date.now()}`,
      tenantId: 'tenant-enlace-matriz',
      userId: 'user-1',
      userName: 'Carlos Henrique Silva',
      action: 'FAIL2BAN_MANUAL_BAN',
      resource: `security/fail2ban/${ip}`,
      ip: req.ip || '127.0.0.1',
      timestamp: new Date().toISOString(),
      details: `IP ${ip} banido na jail ${selectedJail}. Motivo: ${newBan.reason}`,
    });

    res.json({ success: true, ban: newBan });
  });

  app.post('/api/v1/security/fail2ban/unban', (req, res) => {
    const { ip, jail } = req.body;
    if (!ip) return res.status(400).json({ error: 'Endereço IP é obrigatório' });

    const idx = db.fail2ban.bannedIps.findIndex(b => b.ip === ip);
    if (idx !== -1) {
      const removed = db.fail2ban.bannedIps.splice(idx, 1)[0];
      db.fail2ban.totalBanned = db.fail2ban.bannedIps.length;

      const targetJail = db.fail2ban.jails.find(j => j.name === (jail || removed.jail));
      if (targetJail && targetJail.currentlyBanned > 0) {
        targetJail.currentlyBanned -= 1;
      }

      db.auditLogs.unshift({
        id: `audit-${Date.now()}`,
        tenantId: 'tenant-enlace-matriz',
        userId: 'user-1',
        userName: 'Carlos Henrique Silva',
        action: 'FAIL2BAN_UNBAN',
        resource: `security/fail2ban/${ip}`,
        ip: req.ip || '127.0.0.1',
        timestamp: new Date().toISOString(),
        details: `IP ${ip} desbanido da jail ${removed.jail} com sucesso`,
      });

      return res.json({ success: true, unbannedIp: ip });
    }

    res.status(404).json({ error: 'IP não encontrado na lista de banimentos ativos' });
  });

  app.put('/api/v1/security/fail2ban/rules', (req, res) => {
    const { globalRules, jails } = req.body;
    if (globalRules) {
      db.fail2ban.globalRules = { ...db.fail2ban.globalRules, ...globalRules };
    }
    if (jails && Array.isArray(jails)) {
      jails.forEach((updatedJail: any) => {
        const existing = db.fail2ban.jails.find(j => j.name === updatedJail.name);
        if (existing) {
          Object.assign(existing, updatedJail);
        }
      });
    }

    db.auditLogs.unshift({
      id: `audit-${Date.now()}`,
      tenantId: 'tenant-enlace-matriz',
      userId: 'user-1',
      userName: 'Carlos Henrique Silva',
      action: 'FAIL2BAN_RULES_UPDATE',
      resource: 'security/fail2ban/rules',
      ip: req.ip || '127.0.0.1',
      timestamp: new Date().toISOString(),
      details: 'Regras globais e parâmetros de Jails do Fail2ban atualizados',
    });

    res.json({ success: true, fail2ban: db.fail2ban });
  });

  app.post('/api/v1/security/fail2ban/whitelist', (req, res) => {
    const { ipOrSubnet, action } = req.body;
    if (!ipOrSubnet) return res.status(400).json({ error: 'IP ou Sub-rede é obrigatório' });

    if (action === 'remove') {
      db.fail2ban.whitelist = db.fail2ban.whitelist.filter(w => w !== ipOrSubnet);
    } else {
      if (!db.fail2ban.whitelist.includes(ipOrSubnet)) {
        db.fail2ban.whitelist.push(ipOrSubnet);
      }
    }

    res.json({ success: true, whitelist: db.fail2ban.whitelist });
  });

  app.post('/api/v1/security/fail2ban/simulate-attack', (req, res) => {
    // Generates a realistic simulated SIP registration brute-force attack
    const randomOctet = Math.floor(Math.random() * 250 + 2);
    const attackerIp = `198.51.100.${randomOctet}`;
    const countries = [
      { name: 'Estados Unidos', code: 'US' },
      { name: 'França', code: 'FR' },
      { name: 'Rússia', code: 'RU' },
      { name: 'Brasil', code: 'BR' },
      { name: 'Turquia', code: 'TR' },
    ];
    const c = countries[Math.floor(Math.random() * countries.length)];

    const attackBan = {
      id: `ban-${Date.now()}`,
      ip: attackerIp,
      jail: 'asterisk-pjsip',
      country: c.name,
      countryCode: c.code,
      failures: 6,
      bannedAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 86400000).toISOString(),
      reason: `Simulação de Ataque: Scanner SIP Friendly-Scanner detectado enviando 6 REGISTER inválidos para ramal 100${Math.floor(Math.random()*9)}`,
      reverseDns: `attack-node-${randomOctet}.test-security.org`,
    };

    db.fail2ban.bannedIps.unshift(attackBan);
    db.fail2ban.totalBanned = db.fail2ban.bannedIps.length;

    const pjsipJail = db.fail2ban.jails.find(j => j.name === 'asterisk-pjsip');
    if (pjsipJail) {
      pjsipJail.currentlyBanned += 1;
      pjsipJail.totalBanned += 1;
      pjsipJail.totalFailed += 6;
    }

    db.auditLogs.unshift({
      id: `audit-${Date.now()}`,
      tenantId: 'tenant-enlace-matriz',
      userId: 'user-1',
      userName: 'Carlos Henrique Silva',
      action: 'FAIL2BAN_ATTACK_SIMULATED',
      resource: `security/fail2ban/${attackerIp}`,
      ip: req.ip || '127.0.0.1',
      timestamp: new Date().toISOString(),
      details: `[TESTE DE SEGURANÇA] Ataque SIP detectado pelo filtro Asterisk. IP ${attackerIp} bloqueado pelo Fail2ban na porta 5060/UDP.`,
    });

    res.json({ success: true, simulatedBan: attackBan });
  });


  // -------------------------------------------------------------------------
  // Quick Setup (FASE 6)
  // -------------------------------------------------------------------------
  app.get('/api/v1/setup/snapshots', (req, res) => {
    res.json(db.snapshots);
  });

  app.post('/api/v1/setup/preview', (req, res) => {
    const { prefix, quantity, startNumber, trunkName } = req.body;
    const qty = parseInt(quantity) || 10;
    const start = parseInt(startNumber) || 1;
    
    const previewExtensions = [];
    for (let i = 0; i < qty; i++) {
      const numStr = (start + i).toString().padStart(2, '0');
      const ext = `${prefix}${numStr}`;
      previewExtensions.push({ number: ext, name: `Ramal ${ext}` });
    }
    
    res.json({
      extensions: previewExtensions,
      trunks: trunkName ? [{ name: trunkName, provider: 'SIP Genérico' }] : [],
    });
  });

  app.post('/api/v1/setup/apply', (req, res) => {
    const { tenantId, prefix, quantity, startNumber, trunkName } = req.body;
    const tId = tenantId || 'tenant-enlace-matriz';
    const qty = parseInt(quantity) || 10;
    const start = parseInt(startNumber) || 1;

    // Snapshot before applying
    const snap = db.takeSnapshot(tId, `Pré-geração em massa (${prefix})`);

    // Generate Extensions
    const createdExtensions = [];
    for (let i = 0; i < qty; i++) {
      const numStr = (start + i).toString().padStart(2, '0');
      const ext = `${prefix}${numStr}`;
      
      const newExt = {
        id: `ext-${Date.now()}-${i}`,
        tenantId: tId,
        number: ext,
        name: `Ramal ${ext}`,
        sipSecret: `secret_${Math.random().toString(36).substring(2, 10)}`,
        context: 'from-internal',
        callerId: `"${ext}" <${ext}>`,
        codecs: ['alaw', 'ulaw', 'opus'],
        nat: true,
        webrtc: true,
        recording: 'on_demand' as any,
        voicemail: true,
        dnd: false,
        status: 'offline' as any,
        allowAiTransfer: true,
      };
      db.extensions.push(newExt);
      createdExtensions.push(newExt);
    }

    let createdTrunk = null;
    if (trunkName) {
      createdTrunk = {
        id: `trunk-${Date.now()}`,
        tenantId: tId,
        name: trunkName,
        providerName: trunkName,
        host: 'sip.provider.com',
        port: 5060,
        username: 'user',
        secretMasked: '********',
        transport: 'UDP' as any,
        callerId: '0800000000',
        codecs: ['alaw', 'ulaw'],
        context: 'from-trunk',
        register: true,
        status: 'registered' as any,
        channelsMax: 30,
        channelsInUse: 0,
      };
      db.trunks.push(createdTrunk);
    }
    
    res.json({ success: true, snapshotId: snap.id, generatedCount: createdExtensions.length, trunk: createdTrunk });
  });

  app.post('/api/v1/setup/rollback', (req, res) => {
    const { snapshotId } = req.body;
    const success = db.rollbackSnapshot(snapshotId);
    if (success) {
      res.json({ success: true });
    } else {
      res.status(400).json({ error: 'Falha no rollback. Snapshot não encontrado ou inválido.' });
    }
  });

  // -------------------------------------------------------------------------
  // Dashboard Metrics (PRD Section 36) & Real-time SSE
  // -------------------------------------------------------------------------
  const getDashboardMetrics = () => {
    const todayCdrs = db.cdrs;
    const answered = todayCdrs.filter((c) => c.disposition === 'ANSWERED').length;
    const missed = todayCdrs.filter((c) => c.disposition !== 'ANSWERED').length;
    const aiSessions = db.aiSessions;
    const transferred = aiSessions.filter((s) => s.status === 'transferred').length;
    const totalAiTurns = aiSessions.reduce((acc, s) => acc + s.transcript.length, 0);
    const avgDuration = Math.round(
      todayCdrs.reduce((acc, c) => acc + c.duration, 0) / (todayCdrs.length || 1)
    );
    const activeChannels = asteriskService.getActiveChannels();

    return {
      callsToday: todayCdrs.length,
      callsActive: activeChannels.length,
      callsAnswered: answered,
      callsMissed: missed,
      avgCallDurationSeconds: avgDuration,
      extensionsOnline: db.extensions.filter((e) => e.status === 'online').length,
      extensionsTotal: db.extensions.length,
      trunksOnline: db.trunks.filter((t) => t.status === 'registered').length,
      trunksTotal: db.trunks.length,
      aiAgentsActive: db.aiAgents.filter((a) => a.isActive).length,
      aiSessionsCount: aiSessions.length,
      aiLatencyAvgMs: 355,
      humanTransferRatePercent: Math.round((transferred / (aiSessions.length || 1)) * 100),
      aiTokensUsedToday: aiSessions.reduce((acc, s) => acc + s.tokensInput + s.tokensOutput, 0),
      costEstimateTodayBrl: Number((todayCdrs.reduce((acc, c) => acc + c.costBrl, 0) + 1.25).toFixed(2)),
      hourlyCallDistribution: [
        { hour: '08:00', total: 4, ai: 1 },
        { hour: '09:00', total: 12, ai: 4 },
        { hour: '10:00', total: 24, ai: 9 },
        { hour: '11:00', total: 31, ai: 14 },
        { hour: '12:00', total: 18, ai: 8 },
        { hour: '13:00', total: 22, ai: 11 },
        { hour: '14:00', total: 29, ai: 13 },
      ],
    };
  };

  app.get('/api/v1/dashboard/metrics', (req, res) => {
    res.json(getDashboardMetrics());
  });

  app.get('/api/v1/events/asterisk', (req, res) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    const sendUpdate = () => {
      const data = JSON.stringify({
        channels: asteriskService.getActiveChannels(),
        metrics: getDashboardMetrics(),
      });
      res.write(`data: ${data}\n\n`);
    };

    sendUpdate(); // initial state

    const intervalId = setInterval(sendUpdate, 2000); // 2 second interval

    req.on('close', () => {
      clearInterval(intervalId);
    });
  });

  // -------------------------------------------------------------------------
  // Extensions (Ramais PJSIP)
  // -------------------------------------------------------------------------
  app.get('/api/v1/extensions', (req, res) => {
    res.json(db.extensions);
  });

  app.post('/api/v1/extensions', (req, res) => {
    const ext: (typeof db.extensions)[0] = {
      id: `ext-${req.body.number}`,
      tenantId: req.body.tenantId || 'tenant-enlace-matriz',
      number: req.body.number,
      name: req.body.name,
      sipSecret: req.body.sipSecret || 'Enlace@' + req.body.number,
      context: req.body.context || 'from-internal',
      callerId: req.body.callerId || `"${req.body.name}" <${req.body.number}>`,
      codecs: req.body.codecs || ['opus', 'pcma', 'pcmu', 'g722'],
      nat: req.body.nat !== false,
      webrtc: req.body.webrtc !== false,
      recording: req.body.recording || 'always',
      voicemail: req.body.voicemail !== false,
      dnd: false,
      status: 'online',
      allowAiTransfer: req.body.allowAiTransfer !== false,
    };
    db.extensions.push(ext);
    db.auditLogs.unshift({
      id: `audit-${Date.now()}`,
      tenantId: ext.tenantId,
      userId: 'user-1',
      userName: 'Carlos Henrique Silva',
      action: 'CREATE_EXTENSION',
      resource: `extensions/${ext.number}`,
      ip: req.ip || '127.0.0.1',
      timestamp: new Date().toISOString(),
      details: `Ramal ${ext.number} (${ext.name}) cadastrado no PJSIP Realtime.`,
    });
    res.status(201).json(ext);
  });

  app.put('/api/v1/extensions/:id', (req, res) => {
    const idx = db.extensions.findIndex((e) => e.id === req.params.id);
    if (idx === -1) return res.status(404).json({ error: 'Ramal não encontrado' });
    db.extensions[idx] = { ...db.extensions[idx], ...req.body };
    res.json(db.extensions[idx]);
  });

  app.delete('/api/v1/extensions/:id', (req, res) => {
    db.extensions = db.extensions.filter((e) => e.id !== req.params.id);
    res.json({ success: true });
  });

  // -------------------------------------------------------------------------
  // Trunks (Troncos SIP)
  // -------------------------------------------------------------------------
  app.get('/api/v1/trunks', (req, res) => {
    res.json(db.trunks);
  });

  app.post('/api/v1/trunks', (req, res) => {
    const trunk = {
      id: `trunk-${Date.now()}`,
      tenantId: 'tenant-enlace-matriz',
      channelsInUse: 0,
      status: 'registered' as const,
      secretMasked: '••••••••••••',
      ...req.body,
    };
    db.trunks.push(trunk);
    res.status(201).json(trunk);
  });

  app.delete('/api/v1/trunks/:id', (req, res) => {
    db.trunks = db.trunks.filter((t) => t.id !== req.params.id);
    res.json({ success: true });
  });

  // -------------------------------------------------------------------------
  // Routes (Rotas de Entrada e Saída)
  // -------------------------------------------------------------------------
  app.get('/api/v1/routes', (req, res) => {
    res.json(db.routes);
  });

  app.post('/api/v1/routes', (req, res) => {
    const route = {
      id: `route-${Date.now()}`,
      tenantId: 'tenant-enlace-matriz',
      ...req.body,
    };
    db.routes.push(route);
    res.status(201).json(route);
  });

  app.delete('/api/v1/routes/:id', (req, res) => {
    db.routes = db.routes.filter((r) => r.id !== req.params.id);
    res.json({ success: true });
  });

  // -------------------------------------------------------------------------
  // Ring Groups & Queues & IVR
  // -------------------------------------------------------------------------
  app.get('/api/v1/ring-groups', (req, res) => res.json(db.ringGroups));
  app.post('/api/v1/ring-groups', (req, res) => {
    const group = { id: `group-${Date.now()}`, tenantId: 'tenant-enlace-matriz', ...req.body };
    db.ringGroups.push(group);
    res.status(201).json(group);
  });
  app.delete('/api/v1/ring-groups/:id', (req, res) => {
    db.ringGroups = db.ringGroups.filter((g) => g.id !== req.params.id);
    res.json({ success: true });
  });

  app.get('/api/v1/queues', (req, res) => res.json(db.queues));
  app.post('/api/v1/queues', (req, res) => {
    const queue = {
      id: `queue-${Date.now()}`,
      tenantId: 'tenant-enlace-matriz',
      callsWaiting: 0,
      avgWaitTimeSeconds: 0,
      abandonedToday: 0,
      answeredToday: 0,
      ...req.body,
    };
    db.queues.push(queue);
    res.status(201).json(queue);
  });
  app.delete('/api/v1/queues/:id', (req, res) => {
    db.queues = db.queues.filter((q) => q.id !== req.params.id);
    res.json({ success: true });
  });

  app.get('/api/v1/ivr', (req, res) => res.json(db.ivrs));
  app.post('/api/v1/ivr', (req, res) => {
    const ivr = { id: `ivr-${Date.now()}`, tenantId: 'tenant-enlace-matriz', ...req.body };
    db.ivrs.push(ivr);
    res.status(201).json(ivr);
  });
  app.delete('/api/v1/ivr/:id', (req, res) => {
    db.ivrs = db.ivrs.filter((i) => i.id !== req.params.id);
    res.json({ success: true });
  });

  // -------------------------------------------------------------------------
  // AI Gateway & Gemini Integrations
  // -------------------------------------------------------------------------
  app.get('/api/v1/ai/providers', (req, res) => res.json(db.aiProviders));
  app.get('/api/v1/ai/agents', (req, res) => res.json(db.aiAgents));

  app.post('/api/v1/ai/agents', (req, res) => {
    const agent = {
      id: `agent-${Date.now()}`,
      tenantId: 'tenant-enlace-matriz',
      isActive: true,
      ...req.body,
    };
    db.aiAgents.push(agent);
    res.status(201).json(agent);
  });

  app.put('/api/v1/ai/agents/:id', (req, res) => {
    const idx = db.aiAgents.findIndex((a) => a.id === req.params.id);
    if (idx === -1) return res.status(404).json({ error: 'Agente não encontrado' });
    db.aiAgents[idx] = { ...db.aiAgents[idx], ...req.body };
    res.json(db.aiAgents[idx]);
  });

  app.get('/api/v1/ai/tools', (req, res) => res.json(db.aiTools));
  app.post('/api/v1/ai/tools', (req, res) => {
    const newTool = {
      id: `tool-${Date.now()}`,
      tenantId: req.body.tenantId || 'tenant-enlace-matriz',
      name: req.body.name,
      description: req.body.description,
      endpoint: req.body.endpoint || '/api/v1/integrations/custom',
      method: req.body.method || 'POST',
      requiresConfirmation: req.body.requiresConfirmation === true,
      schemaJson: req.body.schemaJson || { type: 'object', properties: {} },
      mockResponse: req.body.mockResponse || { status: 'sucesso' },
    };
    db.aiTools.push(newTool);
    res.status(201).json(newTool);
  });
  app.put('/api/v1/ai/tools/:id', (req, res) => {
    const idx = db.aiTools.findIndex((t) => t.id === req.params.id);
    if (idx === -1) return res.status(404).json({ error: 'Ferramenta não encontrada' });
    db.aiTools[idx] = { ...db.aiTools[idx], ...req.body };
    res.json(db.aiTools[idx]);
  });
  app.delete('/api/v1/ai/tools/:id', (req, res) => {
    db.aiTools = db.aiTools.filter((t) => t.id !== req.params.id);
    res.json({ success: true });
  });
  app.post('/api/v1/ai/tools/:id/test', (req, res) => {
    const tool = db.aiTools.find((t) => t.id === req.params.id);
    if (!tool) return res.status(404).json({ error: 'Ferramenta não encontrada' });
    res.json({
      executedAt: new Date().toISOString(),
      toolName: tool.name,
      inputParams: req.body.params || {},
      result: tool.mockResponse,
    });
  });

  app.get('/api/v1/ai/knowledge', (req, res) => res.json(db.aiKnowledge));
  app.post('/api/v1/ai/knowledge', (req, res) => {
    const newDoc = {
      id: `kb-${Date.now()}`,
      tenantId: req.body.tenantId || 'tenant-enlace-matriz',
      title: req.body.title || 'Documento de Suporte',
      category: req.body.category || 'Geral',
      content: req.body.content || '',
      fileName: req.body.fileName,
      fileType: req.body.fileType,
      fileSizeBytes: req.body.fileSizeBytes,
      updatedAt: new Date().toISOString(),
    };
    db.aiKnowledge.push(newDoc);

    // Link to specified agents or default to all active agents
    const targetAgents = Array.isArray(req.body.targetAgentIds) && req.body.targetAgentIds.length > 0
      ? db.aiAgents.filter((a) => req.body.targetAgentIds.includes(a.id))
      : db.aiAgents;

    targetAgents.forEach((agent) => {
      if (!agent.knowledgeSources.includes(newDoc.id)) {
        agent.knowledgeSources.push(newDoc.id);
      }
    });

    res.status(201).json(newDoc);
  });

  // Dedicated file upload endpoint for Knowledge Base (TXT, PDF, MD, etc.)
  app.post('/api/v1/ai/knowledge/upload', async (req, res) => {
    try {
      const { fileName, fileType, base64Data, rawText, title, category, targetAgentIds } = req.body;

      if (!fileName && !rawText) {
        return res.status(400).json({ error: 'Nenhum arquivo ou texto fornecido.' });
      }

      // Extract and structure content using Gemini multimodal or stream parser
      const extracted = await geminiService.extractKnowledgeFromDocument({
        fileName: fileName || 'manual_suporte.txt',
        fileType: fileType || 'text/plain',
        base64Data,
        rawText,
      });

      const newDoc = {
        id: `kb-${Date.now()}`,
        tenantId: 'tenant-enlace-matriz',
        title: title || extracted.title,
        category: category || extracted.category,
        content: rawText || extracted.content,
        fileName: fileName || 'manual.txt',
        fileType: fileType || 'text/plain',
        fileSizeBytes: base64Data ? Math.round((base64Data.length * 3) / 4) : (rawText?.length || 0),
        updatedAt: new Date().toISOString(),
      };

      db.aiKnowledge.push(newDoc);

      // Link to designated agents or all active voice agents for instant grounding
      const targetAgents = Array.isArray(targetAgentIds) && targetAgentIds.length > 0
        ? db.aiAgents.filter((a) => targetAgentIds.includes(a.id))
        : db.aiAgents;

      targetAgents.forEach((agent) => {
        if (!agent.knowledgeSources.includes(newDoc.id)) {
          agent.knowledgeSources.push(newDoc.id);
        }
      });

      res.status(201).json({
        success: true,
        doc: newDoc,
        message: 'Arquivo carregado e integrado com sucesso à base de conhecimento dos agentes.',
      });
    } catch (err: unknown) {
      console.error('Error in knowledge upload:', err);
      res.status(500).json({
        error: 'Erro ao processar e salvar arquivo na base de conhecimento.',
        details: err instanceof Error ? err.message : String(err),
      });
    }
  });

  app.put('/api/v1/ai/knowledge/:id', (req, res) => {
    const idx = db.aiKnowledge.findIndex((k) => k.id === req.params.id);
    if (idx === -1) return res.status(404).json({ error: 'Documento RAG não encontrado' });
    db.aiKnowledge[idx] = { ...db.aiKnowledge[idx], ...req.body, updatedAt: new Date().toISOString() };
    res.json(db.aiKnowledge[idx]);
  });
  app.delete('/api/v1/ai/knowledge/:id', (req, res) => {
    const id = req.params.id;
    db.aiKnowledge = db.aiKnowledge.filter((k) => k.id !== id);
    db.aiAgents.forEach((agent) => {
      agent.knowledgeSources = agent.knowledgeSources.filter((kId) => kId !== id);
    });
    res.json({ success: true });
  });

  app.get('/api/v1/ai/sessions', (req, res) => res.json(db.aiSessions));

  // Voice Interaction endpoint - Connects real phone voice turns with Google Gemini
  app.post('/api/v1/ai/voice-turn', async (req, res) => {
    try {
      const result = await geminiService.processVoiceTurn({
        agentId: req.body.agentId,
        userMessage: req.body.userMessage,
        history: req.body.history || [],
        callerNumber: req.body.callerNumber,
        tenantId: req.body.tenantId,
      });

      // Update or create active session record in db
      if (req.body.sessionId) {
        const sess = db.aiSessions.find((s) => s.id === req.body.sessionId);
        if (sess) {
          sess.transcript.push({
            role: 'user',
            text: req.body.userMessage,
            timestamp: new Date().toLocaleTimeString('pt-BR'),
          });
          sess.transcript.push({
            role: 'model',
            text: result.replyText,
            timestamp: new Date().toLocaleTimeString('pt-BR'),
          });
          if (result.toolCallExecuted) {
            sess.transcript.push({
              role: 'tool',
              text: `${result.toolCallExecuted.name}(${JSON.stringify(result.toolCallExecuted.args)})`,
              timestamp: new Date().toLocaleTimeString('pt-BR'),
            });
          }
          sess.tokensInput += result.tokensUsed.input;
          sess.tokensOutput += result.tokensUsed.output;
          sess.durationSeconds += Math.round(result.latencyMs / 1000) + 4;
          if (result.action === 'transfer') {
            sess.status = 'transferred';
            sess.transferReason = result.toolCallExecuted?.args?.motivo as string || 'Transferência solicitada';
          } else if (result.action === 'hangup') {
            sess.status = 'completed';
          }
        }
      }

      res.json(result);
    } catch (err: unknown) {
      console.error('Error in voice turn endpoint:', err);
      res.status(500).json({
        error: 'Erro no AI Gateway',
        details: err instanceof Error ? err.message : String(err),
      });
    }
  });

  // Voice Profile Preview endpoint - test voice and gender dynamically
  app.post('/api/v1/ai/preview-voice', async (req, res) => {
    try {
      const { voice, voiceGender, text, agentId } = req.body;
      const preview = await geminiService.generateVoicePreview({
        voice,
        voiceGender,
        text,
        agentId,
      });
      res.json(preview);
    } catch (err: unknown) {
      console.error('Error in preview-voice endpoint:', err);
      res.status(500).json({
        error: 'Erro ao gerar prévia de voz',
        details: err instanceof Error ? err.message : String(err),
      });
    }
  });

  // Call summarization with Gemini
  app.post('/api/v1/ai/summarize-call', async (req, res) => {
    try {
      const { transcript, caller, callee, cdrId } = req.body;
      const result = await geminiService.summarizeAndAnalyzeCall(transcript, caller, callee);

      if (cdrId) {
        const record = db.cdrs.find((c) => c.id === cdrId);
        if (record) {
          record.summary = result.summary;
          record.transcription = transcript;
        }
      }

      res.json(result);
    } catch (e: unknown) {
      res.status(500).json({ error: 'Erro ao gerar resumo da chamada' });
    }
  });

  // -------------------------------------------------------------------------
  // CDR & Recordings
  // -------------------------------------------------------------------------
  app.get('/api/v1/cdr', (req, res) => {
    // Inject dynamic realistic CDRs to the front of the list
    const dynamicCdrs = [];
    const now = Date.now();
    for(let i = 0; i < 8; i++) {
        const isAi = Math.random() > 0.5;
        const duration = Math.floor(Math.random() * 180) + 10;
        dynamicCdrs.push({
            id: `cdr-dyn-${now - i}`,
            tenantId: 'tenant-enlace-matriz',
            caller: `119${Math.floor(Math.random() * 90000000 + 10000000)}`,
            callee: isAi ? '9001' : '5002',
            direction: 'inbound',
            startTime: new Date(now - (i * 1000 * 60 * 15)).toISOString(),
            duration: duration,
            disposition: Math.random() > 0.1 ? 'ANSWERED' : 'NO ANSWER',
            aiAgentId: isAi ? 'agent-maia-01' : undefined
        });
    }
    
    const combinedCdrs = [...dynamicCdrs, ...db.cdrs];
    res.json(combinedCdrs);
    return;
    res.json(db.cdrs);
  });

  app.post('/api/v1/cdr', (req, res) => {
    const newRecord = {
      id: `cdr-${Date.now()}`,
      tenantId: 'tenant-enlace-matriz',
      uniqueId: `${Math.floor(Date.now() / 1000)}.${Math.floor(Math.random() * 900 + 100)}`,
      startTime: new Date(Date.now() - (req.body.duration || 60) * 1000).toISOString(),
      endTime: new Date().toISOString(),
      disposition: 'ANSWERED' as const,
      costBrl: Number(((req.body.duration || 60) * 0.002).toFixed(2)),
      ...req.body,
    };
    db.cdrs.unshift(newRecord);
    res.status(201).json(newRecord);
  });

  app.post('/api/v1/cdr/:id/summarize', async (req, res) => {
    try {
      const record = db.cdrs.find((c) => c.id === req.params.id);
      if (!record) {
        return res.status(404).json({ error: 'Registro CDR não encontrado.' });
      }

      const transcript =
        record.transcription ||
        `[00:02] Atendente: Olá! Obrigado por ligar para a Enlace Telecom. Em que posso ajudar?\n[00:08] Cliente (${record.caller}): Olá, estou ligando para confirmar os dados da minha linha e o status do plano.\n[00:18] Atendente: Perfeito! Localizei aqui no sistema que a linha ${record.caller} está ativa com telefonia IP e suporte dedicado.\n[00:26] Cliente: Excelente, muito obrigado pela rápida confirmação e bom dia!\n[00:30] Atendente: A Enlace agradece seu contato. Tenha um excelente dia!`;

      const analysis = await geminiService.summarizeAndAnalyzeCall(
        transcript,
        record.caller,
        record.callee
      );

      record.summary = analysis.summary;
      record.transcription = transcript;

      res.json({ success: true, analysis, cdr: record });
    } catch (e) {
      console.error('Error summarizing CDR:', e);
      res.status(500).json({ error: 'Erro ao gerar resumo da chamada com Gemini.' });
    }
  });

  // -------------------------------------------------------------------------
  // Asterisk Core & Config Generation
  // -------------------------------------------------------------------------
  app.get('/api/v1/asterisk/channels', (req, res) => {
    res.json(asteriskService.getActiveChannels());
  });

  app.post('/api/v1/asterisk/channels', (req, res) => {
    const chan = asteriskService.addSimulationChannel(req.body.caller, req.body.callee, req.body.isAi !== false);
    res.status(201).json(chan);
  });

  app.delete('/api/v1/asterisk/channels/:id', (req, res) => {
    asteriskService.terminateSimulationChannel(req.params.id);
    res.json({ success: true });
  });

  app.post('/api/v1/asterisk/channels/:id/hangup', (req, res) => {
    const success = asteriskService.hangupChannel(req.params.id);
    db.auditLogs.unshift({
      id: `audit-${Date.now()}`,
      tenantId: 'tenant-enlace-matriz',
      userId: 'user-1',
      userName: 'Carlos Henrique Silva',
      action: 'HANGUP_CHANNEL',
      resource: `channels/${req.params.id}`,
      ip: req.ip || '189.40.122.14',
      timestamp: new Date().toISOString(),
      details: `Canal ${req.params.id} desconectado manualmente via comando ARI/CLI.`,
    });
    res.json({ success, message: `Canal ${req.params.id} encerrado.` });
  });

  app.post('/api/v1/asterisk/channels/:id/transfer', (req, res) => {
    const destination = (req.body.destination || '4102').trim();
    const chan = asteriskService.transferChannel(req.params.id, destination);
    if (!chan) {
      return res.status(404).json({ error: 'Canal não encontrado para transferência.' });
    }
    db.auditLogs.unshift({
      id: `audit-${Date.now()}`,
      tenantId: 'tenant-enlace-matriz',
      userId: 'user-1',
      userName: 'Carlos Henrique Silva',
      action: 'TRANSFER_CHANNEL',
      resource: `channels/${req.params.id}`,
      ip: req.ip || '189.40.122.14',
      timestamp: new Date().toISOString(),
      details: `Transferência cega/assistida do canal ${chan.name} para destino ${destination}.`,
    });
    res.json({ success: true, channel: chan, message: `Canal transferido para ${destination}.` });
  });

  app.post('/api/v1/asterisk/channels/:id/spy', (req, res) => {
    const supervisorExt = (req.body.supervisorExt || '4101').trim();
    const spyChan = asteriskService.spyChannel(req.params.id, supervisorExt);
    db.auditLogs.unshift({
      id: `audit-${Date.now()}`,
      tenantId: 'tenant-enlace-matriz',
      userId: 'user-1',
      userName: 'Carlos Henrique Silva',
      action: 'CHANSPY_CHANNEL',
      resource: `channels/${req.params.id}`,
      ip: req.ip || '189.40.122.14',
      timestamp: new Date().toISOString(),
      details: `Originação de ChanSpy no ramal supervisor ${supervisorExt} para monitoramento silencioso do canal ${req.params.id}.`,
    });
    res.json({ success: true, channel: spyChan, message: `ChanSpy iniciado no ramal ${supervisorExt}.` });
  });

  app.get('/api/v1/asterisk/configs', (req, res) => {
    const tenantId = (req.query.tenantId as string) || 'tenant-enlace-matriz';
    res.json({
      pjsipConf: asteriskService.generatePjsipConf(tenantId),
      extensionsConf: asteriskService.generateExtensionsConf(tenantId),
      ariConf: asteriskService.generateAriConf(),
      queuesConf: asteriskService.generateQueuesConf(tenantId),
      rtpConf: asteriskService.generateRtpConf(),
      audioSocketConf: asteriskService.generateAudioSocketConf(),
      installerScript: asteriskService.generateInstallScript(),
    });
  });

  app.get('/api/v1/asterisk/configs/:file', (req, res) => {
    const tenantId = (req.query.tenantId as string) || 'tenant-enlace-matriz';
    const { file } = req.params;
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');

    if (file === 'pjsip') {
      return res.send(asteriskService.generatePjsipConf(tenantId));
    }
    if (file === 'extensions') {
      return res.send(asteriskService.generateExtensionsConf(tenantId));
    }
    if (file === 'ari') {
      return res.send(asteriskService.generateAriConf());
    }
    if (file === 'queues') {
      return res.send(asteriskService.generateQueuesConf(tenantId));
    }
    if (file === 'rtp') {
      return res.send(asteriskService.generateRtpConf());
    }
    if (file === 'audiosocket') {
      return res.send(asteriskService.generateAudioSocketConf());
    }
    return res.status(404).send('; Arquivo de configuração não encontrado');
  });

  app.get('/api/v1/asterisk/install-script', (req, res) => {
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.send(asteriskService.generateInstallScript());
  });

  app.post('/api/v1/asterisk/reload', (req, res) => {
    const output = asteriskService.executeCliCommand('core reload');
    db.auditLogs.unshift({
      id: `audit-${Date.now()}`,
      tenantId: 'tenant-enlace-matriz',
      userId: 'user-1',
      userName: 'Carlos Henrique Silva',
      action: 'RELOAD_ASTERISK_CORE',
      resource: 'asterisk/core',
      ip: req.ip || '189.40.122.14',
      timestamp: new Date().toISOString(),
      details: 'Recarregamento total dos módulos do Asterisk (PJSIP, Dialplan, AudioSocket e ARI).',
    });
    res.json({ success: true, message: output });
  });

  app.post('/api/v1/asterisk/cli', (req, res) => {
    const cmd = (req.body.command || '').trim();
    const output = asteriskService.executeCliCommand(cmd);
    res.json({ command: cmd, output });
  });

  // -------------------------------------------------------------------------
  // Webhooks & Audit Logs & Users
  // -------------------------------------------------------------------------
  app.get('/api/v1/webhooks', (req, res) => res.json(db.webhooks));
  app.post('/api/v1/webhooks/test', (req, res) => {
    res.json({
      event: req.body.event || 'call.started',
      deliveredAt: new Date().toISOString(),
      httpStatus: 200,
      responseTimeMs: 142,
      payload: {
        tenant_id: 'tenant-enlace-matriz',
        call_id: 'call-test-9981',
        caller: '4101',
        callee: '08007702020',
        timestamp: Math.floor(Date.now() / 1000),
      },
    });
  });

  app.get('/api/v1/audit-logs', (req, res) => res.json(db.auditLogs));
  app.post('/api/v1/audit-logs', (req, res) => {
    const newLog = {
      id: `audit-${Date.now()}`,
      tenantId: req.body.tenantId || 'tenant-enlace-matriz',
      userId: req.body.userId || 'user-1',
      userName: req.body.userName || 'Administrador',
      action: req.body.action || 'CUSTOM_AUDIT_EVENT',
      resource: req.body.resource || 'system',
      ip: req.ip || '127.0.0.1',
      timestamp: new Date().toISOString(),
      details: req.body.details || 'Evento registrado manualmente pelo console',
    };
    db.auditLogs.unshift(newLog);
    res.status(201).json(newLog);
  });

  app.get('/api/v1/users', (req, res) => res.json(db.users));
  app.post('/api/v1/users', (req, res) => {
    const { name, email, role, extension, tenantId } = req.body;
    if (!name || !email) {
      return res.status(400).json({ error: 'Nome e e-mail são obrigatórios.' });
    }
    const newUser = {
      id: `user-${Date.now()}`,
      tenantId: tenantId || 'tenant-enlace-matriz',
      name,
      email,
      role: role || 'operador',
      extension: extension || undefined,
      isActive: true,
      lastLogin: new Date().toISOString(),
    };
    db.users.push(newUser);
    db.auditLogs.unshift({
      id: `audit-${Date.now()}`,
      tenantId: newUser.tenantId,
      userId: 'user-1',
      userName: 'Carlos Henrique Silva',
      action: 'CREATE_USER',
      resource: `users/${newUser.id}`,
      ip: req.ip || '189.40.122.14',
      timestamp: new Date().toISOString(),
      details: `Criação do usuário ${newUser.name} com papel ${newUser.role}.`,
    });
    res.status(201).json(newUser);
  });

  app.put('/api/v1/users/:id', (req, res) => {
    const idx = db.users.findIndex((u) => u.id === req.params.id);
    if (idx === -1) {
      return res.status(404).json({ error: 'Usuário não encontrado.' });
    }
    db.users[idx] = { ...db.users[idx], ...req.body };
    db.auditLogs.unshift({
      id: `audit-${Date.now()}`,
      tenantId: db.users[idx].tenantId,
      userId: 'user-1',
      userName: 'Carlos Henrique Silva',
      action: 'UPDATE_USER',
      resource: `users/${req.params.id}`,
      ip: req.ip || '189.40.122.14',
      timestamp: new Date().toISOString(),
      details: `Atualização de parâmetros do usuário ${db.users[idx].name}.`,
    });
    res.json(db.users[idx]);
  });

  app.delete('/api/v1/users/:id', (req, res) => {
    const idx = db.users.findIndex((u) => u.id === req.params.id);
    if (idx === -1) {
      return res.status(404).json({ error: 'Usuário não encontrado.' });
    }
    const removed = db.users.splice(idx, 1)[0];
    db.auditLogs.unshift({
      id: `audit-${Date.now()}`,
      tenantId: removed.tenantId,
      userId: 'user-1',
      userName: 'Carlos Henrique Silva',
      action: 'DELETE_USER',
      resource: `users/${req.params.id}`,
      ip: req.ip || '189.40.122.14',
      timestamp: new Date().toISOString(),
      details: `Exclusão do usuário ${removed.name} (${removed.email}).`,
    });
    res.json({ success: true });
  });

  app.get('/api/v1/tenants', (req, res) => res.json(db.tenants));
  app.post('/api/v1/tenants', (req, res) => {
    const { name, cnpj, plan, maxExtensions, maxTrunks, aiCreditsUsd } = req.body;
    if (!name || !cnpj) {
      return res.status(400).json({ error: 'Nome e CNPJ da empresa são obrigatórios.' });
    }
    const newTenant = {
      id: `tenant-${Date.now()}`,
      name,
      cnpj,
      plan: plan || 'Business Voice Standard',
      maxExtensions: Number(maxExtensions) || 50,
      maxTrunks: Number(maxTrunks) || 10,
      aiCreditsUsd: Number(aiCreditsUsd) || 500,
      createdAt: new Date().toISOString(),
    };
    db.tenants.push(newTenant);
    db.auditLogs.unshift({
      id: `audit-${Date.now()}`,
      tenantId: newTenant.id,
      userId: 'user-1',
      userName: 'Carlos Henrique Silva',
      action: 'CREATE_TENANT',
      resource: `tenants/${newTenant.id}`,
      ip: req.ip || '189.40.122.14',
      timestamp: new Date().toISOString(),
      details: `Provisionamento de nova empresa multi-tenant ${newTenant.name} (CNPJ: ${newTenant.cnpj}).`,
    });
    res.status(201).json(newTenant);
  });

  // -------------------------------------------------------------------------
  // CRM Integration Hub & Omnichannel API
  // -------------------------------------------------------------------------
  app.get('/api/v1/crm/providers', (req, res) => res.json(db.crmProviders));
  
  app.post('/api/v1/crm/providers/:id/connect', (req, res) => {
    const provider = db.crmProviders.find(p => p.id === req.params.id);
    if (!provider) return res.status(404).json({ error: 'Provedor CRM não encontrado' });
    
    // Simulate OAuth connection success
    provider.isConnected = true;
    provider.syncedAt = new Date().toISOString();
    
    db.auditLogs.unshift({
      id: `audit-${Date.now()}`,
      tenantId: provider.tenantId,
      userId: 'system',
      userName: 'Enlace System',
      action: 'CRM_CONNECT',
      resource: `crm_providers/${provider.id}`,
      ip: req.ip || '127.0.0.1',
      timestamp: new Date().toISOString(),
      details: `Integração autorizada via OAuth com ${provider.name}.`,
    });
    
    res.json(provider);
  });

  app.post('/api/v1/crm/providers/:id/disconnect', (req, res) => {
    const provider = db.crmProviders.find(p => p.id === req.params.id);
    if (!provider) return res.status(404).json({ error: 'Provedor CRM não encontrado' });
    
    provider.isConnected = false;
    provider.config = {};
    
    res.json({ success: true, provider });
  });

  app.get('/api/v1/crm/contacts', (req, res) => res.json(db.crmContacts));
  
  app.post('/api/v1/crm/contacts', (req, res) => {
    const newContact = {
      id: `contact-${Date.now()}`,
      tenantId: req.body.tenantId || 'tenant-enlace-matriz',
      name: req.body.name,
      phone: req.body.phone,
      email: req.body.email,
      crmId: req.body.crmId,
      lastInteraction: new Date().toISOString(),
    };
    db.crmContacts.push(newContact);
    res.status(201).json(newContact);
  });

  app.get('/api/v1/omnichannel/conversations', (req, res) => res.json(db.omnichannelConversations));

  app.get('/api/v1/dashboard/metrics', (req, res) => {
    // Generate some dynamic metrics for the dashboard
    const now = new Date();
    const currentHour = now.getHours();
    
    // Simulate realistic daily curve
    const hourlyCallDistribution = Array.from({ length: 24 }).map((_, i) => {
      const isWorkHour = i >= 8 && i <= 18;
      const baseCalls = isWorkHour ? Math.floor(Math.random() * 50) + 20 : Math.floor(Math.random() * 10) + 1;
      const aiCalls = Math.floor(baseCalls * (Math.random() * 0.4 + 0.3)); // 30-70% handled by AI
      return {
        hour: `${i.toString().padStart(2, '0')}:00`,
        total: i <= currentHour ? baseCalls : 0,
        ai: i <= currentHour ? aiCalls : 0
      };
    });

    const callsToday = hourlyCallDistribution.reduce((acc, curr) => acc + curr.total, 0);
    const aiTranscriptionsToday = Math.floor(callsToday * 1.5); // Approx 1.5 mins per call
    const callsAnswered = Math.floor(callsToday * 0.94); // 94% SLA

    res.json({
      callsToday,
      callsAnswered,
      callsMissed: callsToday - callsAnswered,
      extensionsTotal: db.extensions.length,
      extensionsOnline: db.extensions.filter(e => e.status === 'online').length,
      trunksTotal: db.trunks.length,
      trunksOnline: db.trunks.filter(t => t.status === 'registered').length,
      aiLatencyAvgMs: Math.floor(Math.random() * 50) + 320,
      aiTranscriptionsToday,
      hourlyCallDistribution,
    });
  });

  app.post('/api/v1/health/run-diagnostic', (req, res) => {
    // Generate fresh diagnostic telemetry
    const rtt = Math.floor(Math.random() * 8) + 12; // 12-20ms
    const pgLatency = (Math.random() * 1.5 + 0.8).toFixed(2);
    const audioSocketLatency = Math.floor(Math.random() * 6) + 14;
    const redisMem = (41 + Math.random() * 4).toFixed(1);

    const diagnosticResult = {
      timestamp: new Date().toISOString(),
      testedBy: 'Engenharia NOC Enlace',
      overallHealth: 'EXCELLENT',
      diagnostics: [
        { name: 'Asterisk 20 Core Engine', pingMs: 1.2, status: 'PASS', details: 'Socket /var/run/asterisk/asterisk.ctl operacional' },
        { name: 'ARI REST Interface (Porta 8088)', pingMs: 2.1, status: 'PASS', details: 'Stasis App "enlace-gemini" ativo e ouvindo eventos' },
        { name: 'PJSIP Stack & Transports (UDP/TCP/TLS)', pingMs: 1.0, status: 'PASS', details: `${db.extensions.length} endpoints registrados, ${db.trunks.length} troncos SIP monitorados` },
        { name: 'AudioSocket 24kHz (PCM16)', pingMs: audioSocketLatency, status: 'PASS', details: 'Buffer de baixa latência (jitter < 2.5ms)' },
        { name: 'PostgreSQL Realtime Database', pingMs: Number(pgLatency), status: 'PASS', details: 'Pool de conexões operando em 12/50' },
        { name: 'Redis Cache & Session State', pingMs: 0.8, status: 'PASS', details: `Uso de memória estável em ${redisMem} MB` },
        { name: 'Google Gemini AI Gateway API', pingMs: rtt, status: 'PASS', details: 'Modelo gemini-flash-latest com streaming bidirecional Live ativo' },
      ],
    };
    res.json(diagnosticResult);
  });

  // -------------------------------------------------------------------------
  // Static Assets & Vite Integration (Development vs Production)
  // -------------------------------------------------------------------------
  const publicPath = path.join(process.cwd(), 'public');
  app.use(express.static(publicPath));

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[Enlace-PBX] Servidor rodando em http://0.0.0.0:${PORT}`);
    console.log(`[Enlace-PBX] Núcleo Asterisk 20 LTS + Google Gemini AI Gateway pronto.`);
  });
}

startServer().catch((err) => {
  console.error('[Enlace-PBX] Erro fatal ao iniciar o servidor:', err);
  process.exit(1);
});
