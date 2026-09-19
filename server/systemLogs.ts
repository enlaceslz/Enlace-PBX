import crypto from 'crypto';
import { SystemLogEntry, SystemLogLevel, SystemLogService, SystemLogStats } from '../src/types/pbx.js';

class SystemLogsManager {
  private logs: SystemLogEntry[] = [];
  private maxLogs: number = 600;

  constructor() {
    // Inicia com buffer real limpo. Logs são capturados exclusivamente durante a operação do sistema.
    this.logs = [];
  }

  public addLog(entry: Omit<SystemLogEntry, 'id' | 'timestamp'> & { timestamp?: string }): SystemLogEntry {
    const fullEntry: SystemLogEntry = {
      id: `syslog-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`,
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

    // Cálculo real de eventos por minuto baseado no histórico dos últimos 60 segundos
    const oneMinuteAgo = Date.now() - 60000;
    const recentLogsCount = this.logs.filter(l => new Date(l.timestamp).getTime() >= oneMinuteAgo).length;

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
      eventsPerMinute: recentLogsCount,
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

  /**
   * Ingere linhas de log reais obtidas de arquivos de log do Asterisk (/var/log/asterisk/messages)
   * ou de saídas reais do CLI
   */
  public ingestAsteriskLogLine(rawLine: string): void {
    if (!rawLine || rawLine.trim() === '') return;
    const line = rawLine.trim();

    let level: SystemLogLevel = 'INFO';
    if (line.includes('[ERROR]') || line.includes('ERROR:')) level = 'ERROR';
    else if (line.includes('[WARNING]') || line.includes('WARNING:')) level = 'WARNING';
    else if (line.includes('[NOTICE]') || line.includes('NOTICE:')) level = 'NOTICE';
    else if (line.includes('[DEBUG]')) level = 'DEBUG';

    this.addLog({
      service: 'asterisk',
      serviceLabel: 'Asterisk Core',
      level,
      component: 'asterisk-engine',
      message: line,
    });
  }
}

export const systemLogsManager = new SystemLogsManager();

