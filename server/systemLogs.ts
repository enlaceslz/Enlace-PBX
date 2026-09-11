import { SystemLogEntry, SystemLogLevel, SystemLogService, SystemLogStats } from '../src/types/pbx.js';

class SystemLogsManager {
  private logs: SystemLogEntry[] = [];
  private maxLogs: number = 600;

  constructor() {
    this.seedInitialLogs();
  }

  private seedInitialLogs() {
    const now = Date.now();
    const mockEvents: Array<{
      offsetMs: number;
      service: SystemLogService;
      serviceLabel: string;
      level: SystemLogLevel;
      component: string;
      message: string;
      metadata?: Record<string, string | number | boolean>;
    }> = [
      // Mais antigos (15 minutos atrás)
      {
        offsetMs: 15 * 60 * 1000,
        service: 'asterisk',
        serviceLabel: 'Asterisk Core',
        level: 'NOTICE',
        component: 'loader.c',
        message: 'Asterisk 20.17.0 LTS dynamic module loader started successfully.',
      },
      {
        offsetMs: 14 * 60 * 1000,
        service: 'postgresql',
        serviceLabel: 'PostgreSQL 16',
        level: 'INFO',
        component: 'postmaster',
        message: 'Database server ready to accept client connections on port 5432.',
        metadata: { max_connections: 100, pool: 'active' },
      },
      {
        offsetMs: 13 * 60 * 1000,
        service: 'redis',
        serviceLabel: 'Redis Cache',
        level: 'INFO',
        component: 'server',
        message: 'Running in standalone mode. RDB memory persistence snapshot loaded.',
        metadata: { memory_mb: 42.6 },
      },
      {
        offsetMs: 12 * 60 * 1000,
        service: 'wireguard',
        serviceLabel: 'WireGuard VPN',
        level: 'INFO',
        component: 'wg0',
        message: 'Interface wg0 initialized on port 51820/UDP (Address: 10.10.0.1/24). ChaCha20-Poly1305 active.',
        metadata: { interface: 'wg0', port: 51820 },
      },
      {
        offsetMs: 11 * 60 * 1000,
        service: 'zerotier',
        serviceLabel: 'ZeroTier One',
        level: 'INFO',
        component: 'zt0',
        message: 'Connected to planet root servers. Node ID: e3d4c892b1, assigned IP: 192.168.192.105/24.',
        metadata: { node: 'e3d4c892b1', network: '8056c2e21c000001' },
      },
      {
        offsetMs: 10 * 60 * 1000,
        service: 'nginx',
        serviceLabel: 'Nginx Gateway',
        level: 'INFO',
        component: 'nginx-core',
        message: 'Reverse proxy and WebSocket SSL/TLS terminating on 0.0.0.0:443 and 0.0.0.0:8089.',
      },
      {
        offsetMs: 9 * 60 * 1000,
        service: 'fail2ban',
        serviceLabel: 'Fail2ban Defense',
        level: 'INFO',
        component: 'server',
        message: 'Jail "asterisk-pjsip" and "ssh-asterisk" initialized with iptables action.',
        metadata: { jails_active: 4 },
      },
      {
        offsetMs: 8 * 60 * 1000,
        service: 'asterisk',
        serviceLabel: 'Asterisk Core',
        level: 'NOTICE',
        component: 'res_pjsip_registrar.c',
        message: 'Endpoint 4101 successfully registered from 10.10.0.2:52190 (WireGuard tunnel). Expiry: 3600s.',
        metadata: { extension: '4101', ip: '10.10.0.2', contact: 'sip:4101@10.10.0.2:52190' },
      },
      {
        offsetMs: 7 * 60 * 1000,
        service: 'asterisk',
        serviceLabel: 'Asterisk Core',
        level: 'NOTICE',
        component: 'res_pjsip_registrar.c',
        message: 'Endpoint 4102 successfully registered from 10.10.0.4:48920 (WireGuard tunnel). Expiry: 3600s.',
        metadata: { extension: '4102', ip: '10.10.0.4' },
      },
      {
        offsetMs: 6 * 60 * 1000,
        service: 'asterisk',
        serviceLabel: 'Asterisk Core',
        level: 'WARNING',
        component: 'res_pjsip_outbound_registration.c',
        message: 'Trunk "claro-0800": Retrying registration in 30s due to upstream DNS resolution timeout.',
        metadata: { trunk: 'claro-0800', host: 'sip0800.embratel.net.br' },
      },
      {
        offsetMs: 5 * 60 * 1000,
        service: 'asterisk',
        serviceLabel: 'Asterisk Core',
        level: 'NOTICE',
        component: 'res_pjsip_outbound_registration.c',
        message: 'Trunk "claro-0800": Registration successful with 200 OK. Next check in 300s.',
        metadata: { trunk: 'claro-0800', status: 'Registered' },
      },
      {
        offsetMs: 4 * 60 * 1000,
        service: 'fail2ban',
        serviceLabel: 'Fail2ban Defense',
        level: 'WARNING',
        component: 'fail2ban.actions',
        message: '[asterisk-pjsip] Ban 185.196.220.14: 7 failed REGISTER attempts detected via SIPVicious.',
        metadata: { ip: '185.196.220.14', jail: 'asterisk-pjsip', bantime: 86400 },
      },
      {
        offsetMs: 3 * 60 * 1000,
        service: 'gemini-gateway',
        serviceLabel: 'AI Voice Bridge',
        level: 'INFO',
        component: 'live-websocket',
        message: 'Gemini 3.1 Flash Live session channel opened. Audio streaming format: PCM 16kHz 16-bit mono.',
        metadata: { session: 'ai-sess-901', model: 'gemini-3.1-flash-live-preview' },
      },
      {
        offsetMs: 2 * 60 * 1000,
        service: 'audiosocket',
        serviceLabel: 'AudioSocket Bridge',
        level: 'DEBUG',
        component: 'app_audiosocket.c',
        message: 'Channel PJSIP/4101-0000000a connected to TCP 127.0.0.1:9092. Jitter buffer: 20ms.',
      },
      {
        offsetMs: 90 * 1000,
        service: 'nginx',
        serviceLabel: 'Nginx Gateway',
        level: 'INFO',
        component: 'http-access',
        message: 'GET /api/v1/health HTTP/1.1 200 OK - 1.4ms - 177.136.212.45',
        metadata: { status: 200, duration_ms: 1.4 },
      },
      {
        offsetMs: 60 * 1000,
        service: 'asterisk',
        serviceLabel: 'Asterisk Core',
        level: 'INFO',
        component: 'pjsip/dialplan',
        message: 'Inbound call from "11988887766" routed to context [from-trunk-vivo] -> Extension s@ivr-principal.',
        metadata: { caller: '11988887766', route: 'ivr-principal' },
      },
      {
        offsetMs: 40 * 1000,
        service: 'gemini-gateway',
        serviceLabel: 'AI Voice Bridge',
        level: 'INFO',
        component: 'bidi-stream',
        message: 'MaIA Voice synthesis complete for prompt chunk #3. Latency: 138ms.',
        metadata: { latency_ms: 138, tokens: 42 },
      },
      {
        offsetMs: 25 * 1000,
        service: 'wireguard',
        serviceLabel: 'WireGuard VPN',
        level: 'DEBUG',
        component: 'wg0/keepalive',
        message: 'Handshake completed for peer "Filial Imperatriz" (10.10.0.3). RTT: 28.4ms.',
      },
      {
        offsetMs: 10 * 1000,
        service: 'fail2ban',
        serviceLabel: 'Fail2ban Defense',
        level: 'NOTICE',
        component: 'iptables',
        message: 'Active iptables drop rule confirmed for 194.26.29.112 on port 5060/UDP.',
      },
      {
        offsetMs: 3 * 1000,
        service: 'asterisk',
        serviceLabel: 'Asterisk Core',
        level: 'INFO',
        component: 'res_rtp_asterisk.c',
        message: 'RTP stream quality report: Jitter 1.2ms, Packet Loss 0.0%, Round-trip 16.8ms.',
        metadata: { jitter: 1.2, loss: 0, rtt: 16.8 },
      },
    ];

    mockEvents.forEach((ev, idx) => {
      const time = new Date(now - ev.offsetMs).toISOString();
      this.logs.push({
        id: `syslog-${Date.now() - ev.offsetMs}-${idx}`,
        timestamp: time,
        service: ev.service,
        serviceLabel: ev.serviceLabel,
        level: ev.level,
        component: ev.component,
        message: ev.message,
        metadata: ev.metadata,
      });
    });

    // Ordenar do mais novo para o mais antigo
    this.logs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }

  public addLog(entry: Omit<SystemLogEntry, 'id' | 'timestamp'> & { timestamp?: string }): SystemLogEntry {
    const fullEntry: SystemLogEntry = {
      id: `syslog-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      timestamp: entry.timestamp || new Date().toISOString(),
      service: entry.service,
      serviceLabel: entry.serviceLabel || this.getServiceDefaultLabel(entry.service),
      level: entry.level,
      component: entry.component,
      message: entry.message,
      metadata: entry.metadata,
    };

    this.logs.unshift(fullEntry);
    if (this.logs.length > this.maxLogs) {
      this.logs.pop();
    }
    return fullEntry;
  }

  private getServiceDefaultLabel(service: SystemLogService): string {
    switch (service) {
      case 'asterisk': return 'Asterisk Core';
      case 'nginx': return 'Nginx Gateway';
      case 'wireguard': return 'WireGuard VPN';
      case 'zerotier': return 'ZeroTier One';
      case 'fail2ban': return 'Fail2ban Defense';
      case 'postgresql': return 'PostgreSQL 16';
      case 'redis': return 'Redis Cache';
      case 'gemini-gateway': return 'AI Voice Bridge';
      case 'audiosocket': return 'AudioSocket Bridge';
      default: return 'Sistema Linux';
    }
  }

  public getLogs(params: {
    service?: string;
    level?: string;
    date?: string;
    search?: string;
    since?: string;
    limit?: number;
  }): { logs: SystemLogEntry[]; stats: SystemLogStats; hasMore: boolean } {
    let filtered = [...this.logs];

    // Filtro por Serviço
    if (params.service && params.service !== 'all') {
      filtered = filtered.filter((l) => l.service.toLowerCase() === params.service!.toLowerCase());
    }

    // Filtro por Severidade
    if (params.level && params.level !== 'all') {
      filtered = filtered.filter((l) => l.level.toUpperCase() === params.level!.toUpperCase());
    }

    // Filtro por Data
    if (params.date && params.date !== 'all') {
      const todayStr = new Date().toISOString().split('T')[0];
      if (params.date === 'today') {
        filtered = filtered.filter((l) => l.timestamp.startsWith(todayStr));
      } else if (params.date === 'yesterday') {
        const yDate = new Date();
        yDate.setDate(yDate.getDate() - 1);
        const yStr = yDate.toISOString().split('T')[0];
        filtered = filtered.filter((l) => l.timestamp.startsWith(yStr));
      } else {
        // Data arbitrária YYYY-MM-DD
        filtered = filtered.filter((l) => l.timestamp.startsWith(params.date!));
      }
    }

    // Filtro por Texto Livre / Busca
    if (params.search && params.search.trim()) {
      const q = params.search.toLowerCase().trim();
      filtered = filtered.filter(
        (l) =>
          l.message.toLowerCase().includes(q) ||
          (l.component && l.component.toLowerCase().includes(q)) ||
          l.serviceLabel.toLowerCase().includes(q) ||
          l.service.toLowerCase().includes(q) ||
          (l.metadata && JSON.stringify(l.metadata).toLowerCase().includes(q))
      );
    }

    // Filtro por 'since' (para streaming incremental em tempo real)
    if (params.since) {
      const sinceTime = new Date(params.since).getTime();
      filtered = filtered.filter((l) => new Date(l.timestamp).getTime() > sinceTime);
    }

    // Estatísticas
    const stats: SystemLogStats = {
      total: this.logs.length,
      byLevel: {
        DEBUG: 0,
        INFO: 0,
        NOTICE: 0,
        WARNING: 0,
        ERROR: 0,
        CRITICAL: 0,
      },
      byService: {},
      eventsPerMinute: Math.floor(18 + Math.random() * 8),
      lastTimestamp: this.logs[0]?.timestamp || new Date().toISOString(),
    };

    this.logs.forEach((log) => {
      if (stats.byLevel[log.level] !== undefined) {
        stats.byLevel[log.level]++;
      }
      stats.byService[log.service] = (stats.byService[log.service] || 0) + 1;
    });

    const limit = params.limit || 200;
    const paginated = filtered.slice(0, limit);

    return {
      logs: paginated,
      stats,
      hasMore: filtered.length > limit,
    };
  }

  public clearLogs(): void {
    this.logs = [];
    this.addLog({
      service: 'asterisk',
      serviceLabel: 'Asterisk Core',
      level: 'NOTICE',
      component: 'syslog',
      message: 'Buffer de logs em tempo real limpo pelo administrador.',
    });
  }

  // Gera evento aleatório dinâmico para simulação em tempo real
  public generateRandomEvent(): SystemLogEntry {
    const templates = [
      {
        service: 'asterisk' as SystemLogService,
        serviceLabel: 'Asterisk Core',
        level: 'INFO' as SystemLogLevel,
        component: 'pjsip/channel',
        message: `PJSIP/4101-${Math.floor(100000 + Math.random() * 900000)} RTP audio packet stats: 0 packet loss, 1.4ms jitter.`,
      },
      {
        service: 'asterisk' as SystemLogService,
        serviceLabel: 'Asterisk Core',
        level: 'NOTICE' as SystemLogLevel,
        component: 'res_pjsip_registrar.c',
        message: `Endpoint 410${Math.floor(Math.random() * 3 + 1)} keepalive OPTIONS ping acknowledged.`,
      },
      {
        service: 'nginx' as SystemLogService,
        serviceLabel: 'Nginx Gateway',
        level: 'INFO' as SystemLogLevel,
        component: 'http-access',
        message: `GET /api/v1/network/telemetry HTTP/1.1 200 OK (${(Math.random() * 2 + 0.8).toFixed(1)}ms) - 10.10.0.1`,
      },
      {
        service: 'wireguard' as SystemLogService,
        serviceLabel: 'WireGuard VPN',
        level: 'DEBUG' as SystemLogLevel,
        component: 'wg0',
        message: `Peer handshake renewal successful for 10.10.0.${Math.floor(Math.random() * 4 + 2)}/32.`,
      },
      {
        service: 'gemini-gateway' as SystemLogService,
        serviceLabel: 'AI Voice Bridge',
        level: 'INFO' as SystemLogLevel,
        component: 'live-stream',
        message: `MaIA Voice buffer processed 320 audio bytes. Round-trip inference latency: ${(135 + Math.random() * 15).toFixed(0)}ms.`,
      },
      {
        service: 'fail2ban' as SystemLogService,
        serviceLabel: 'Fail2ban Defense',
        level: 'DEBUG' as SystemLogLevel,
        component: 'filter.asterisk',
        message: `Log line inspected: /var/log/asterisk/messages (0 failure matches).`,
      },
      {
        service: 'postgresql' as SystemLogService,
        serviceLabel: 'PostgreSQL 16',
        level: 'DEBUG' as SystemLogLevel,
        component: 'connection-pool',
        message: `Connection released back to pool. Active connections: 4/100.`,
      },
    ];

    const pick = templates[Math.floor(Math.random() * templates.length)];
    return this.addLog(pick);
  }
}

export const systemLogsManager = new SystemLogsManager();
