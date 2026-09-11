import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Terminal,
  Activity,
  Filter,
  Search,
  Download,
  Trash2,
  Play,
  Pause,
  RefreshCw,
  Server,
  Shield,
  ShieldAlert,
  Globe,
  Sparkles,
  Database,
  Radio,
  Sliders,
  Calendar,
  AlertTriangle,
  AlertCircle,
  Info,
  Check,
  Copy,
  ChevronDown,
  ChevronRight,
  Send,
  X,
  Code,
  ArrowDownCircle,
  Eye,
  Zap,
} from 'lucide-react';
import {
  SystemLogEntry,
  SystemLogLevel,
  SystemLogService,
  SystemLogStats,
} from '../../types/pbx';

interface SystemLogsViewProps {
  initialService?: SystemLogService | 'all';
}

export const SystemLogsView: React.FC<SystemLogsViewProps> = ({ initialService = 'all' }) => {
  // Dados de Logs
  const [logs, setLogs] = useState<SystemLogEntry[]>([]);
  const [stats, setStats] = useState<SystemLogStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Filtros
  const [selectedService, setSelectedService] = useState<string>(initialService);
  const [selectedLevel, setSelectedLevel] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<string>('all');
  const [customDate, setCustomDate] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Controles de Streaming em Tempo Real
  const [isLiveStreaming, setIsLiveStreaming] = useState<boolean>(true);
  const [autoScroll, setAutoScroll] = useState<boolean>(true);
  const [viewMode, setViewMode] = useState<'terminal' | 'table'>('terminal');
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Modal para Simular / Injetar Evento
  const [isSimulateModalOpen, setIsSimulateModalOpen] = useState<boolean>(false);
  const [simService, setSimService] = useState<SystemLogService>('asterisk');
  const [simLevel, setSimLevel] = useState<SystemLogLevel>('WARNING');
  const [simComponent, setSimComponent] = useState<string>('res_pjsip_registrar.c');
  const [simMessage, setSimMessage] = useState<string>('Falha de autenticação SIP para ramal 4105. Verifique a senha.');
  const [simSubmitting, setSimSubmitting] = useState<boolean>(false);

  // Feedback de Ações
  const [actionAlert, setActionAlert] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const logsEndRef = useRef<HTMLDivElement>(null);
  const logsContainerRef = useRef<HTMLDivElement>(null);
  const lastTimestampRef = useRef<string | null>(null);

  const showAlert = (text: string, type: 'success' | 'error' = 'success') => {
    setActionAlert({ text, type });
    setTimeout(() => setActionAlert(null), 3500);
  };

  // Buscar logs da API
  const fetchLogs = async (isIncremental: boolean = false) => {
    try {
      if (!isIncremental) setRefreshing(true);

      const params = new URLSearchParams();
      if (selectedService !== 'all') params.append('service', selectedService);
      if (selectedLevel !== 'all') params.append('level', selectedLevel);
      if (dateFilter === 'custom' && customDate) {
        params.append('date', customDate);
      } else if (dateFilter !== 'all') {
        params.append('date', dateFilter);
      }
      if (searchQuery.trim()) params.append('search', searchQuery.trim());
      params.append('limit', '250');

      const res = await fetch(`/api/v1/system/logs?${params.toString()}`);
      if (!res.ok) throw new Error('Falha ao obter logs do sistema');
      const data = await res.json();

      setLogs(data.logs || []);
      setStats(data.stats || null);
      if (data.logs && data.logs.length > 0) {
        lastTimestampRef.current = data.logs[0].timestamp;
      }
    } catch (err) {
      console.error('Erro ao carregar logs:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Carregar inicial e quando filtros mudarem
  useEffect(() => {
    fetchLogs(false);
  }, [selectedService, selectedLevel, dateFilter, customDate, searchQuery]);

  // Loop de Streaming em tempo real (polling a cada 2.5s se isLiveStreaming estiver ativo)
  useEffect(() => {
    if (!isLiveStreaming) return;

    const interval = setInterval(() => {
      fetchLogs(true);
    }, 2500);

    return () => clearInterval(interval);
  }, [isLiveStreaming, selectedService, selectedLevel, dateFilter, customDate, searchQuery]);

  // Autoscroll para o topo ou final dependendo da visualização
  useEffect(() => {
    if (autoScroll && logsContainerRef.current) {
      // No terminal tradicional, rolar suave para o topo se a ordem é decrescente
      logsContainerRef.current.scrollTop = 0;
    }
  }, [logs, autoScroll]);

  // Limpar logs
  const handleClearLogs = async () => {
    try {
      const res = await fetch('/api/v1/system/logs/clear', { method: 'POST' });
      if (res.ok) {
        showAlert('Buffer de logs limpo com sucesso.');
        fetchLogs(false);
      }
    } catch (e) {
      showAlert('Erro ao limpar logs.', 'error');
    }
  };

  // Download de logs filtrados
  const handleDownloadLogs = () => {
    const params = new URLSearchParams();
    if (selectedService !== 'all') params.append('service', selectedService);
    if (selectedLevel !== 'all') params.append('level', selectedLevel);
    if (dateFilter === 'custom' && customDate) {
      params.append('date', customDate);
    } else if (dateFilter !== 'all') {
      params.append('date', dateFilter);
    }
    if (searchQuery.trim()) params.append('search', searchQuery.trim());

    window.open(`/api/v1/system/logs/download?${params.toString()}`, '_blank');
  };

  // Copiar linha do log
  const handleCopyLog = (log: SystemLogEntry) => {
    const text = `[${log.timestamp}] [${log.level}] [${log.service}] ${log.component ? `[${log.component}] ` : ''}${log.message}`;
    navigator.clipboard.writeText(text);
    setCopiedId(log.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Simular evento
  const handleSimulateLog = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!simMessage.trim()) return;

    setSimSubmitting(true);
    try {
      const res = await fetch('/api/v1/system/logs/simulate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          service: simService,
          level: simLevel,
          component: simComponent,
          message: simMessage,
        }),
      });
      if (res.ok) {
        showAlert('Evento de log injetado no fluxo com sucesso!');
        setIsSimulateModalOpen(false);
        fetchLogs(true);
      }
    } catch (err) {
      showAlert('Falha ao injetar log de teste.', 'error');
    } finally {
      setSimSubmitting(false);
    }
  };

  // Ícone por serviço
  const getServiceIcon = (service: SystemLogService) => {
    switch (service) {
      case 'asterisk':
        return <Server className="w-3.5 h-3.5 text-blue-400" />;
      case 'nginx':
        return <Globe className="w-3.5 h-3.5 text-emerald-400" />;
      case 'wireguard':
        return <Shield className="w-3.5 h-3.5 text-blue-500" />;
      case 'zerotier':
        return <Globe className="w-3.5 h-3.5 text-amber-400" />;
      case 'fail2ban':
        return <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />;
      case 'gemini-gateway':
        return <Sparkles className="w-3.5 h-3.5 text-purple-400" />;
      case 'postgresql':
        return <Database className="w-3.5 h-3.5 text-cyan-400" />;
      case 'redis':
        return <Radio className="w-3.5 h-3.5 text-red-400" />;
      case 'audiosocket':
        return <Activity className="w-3.5 h-3.5 text-teal-400" />;
      default:
        return <Terminal className="w-3.5 h-3.5 text-slate-400" />;
    }
  };

  // Estilo por severidade
  const getLevelBadgeClass = (level: SystemLogLevel, isTerminal: boolean = false) => {
    if (isTerminal) {
      switch (level) {
        case 'CRITICAL':
          return 'bg-red-950 text-red-300 border border-red-800 font-bold';
        case 'ERROR':
          return 'bg-rose-950/80 text-rose-300 border border-rose-800 font-semibold';
        case 'WARNING':
          return 'bg-amber-950/80 text-amber-300 border border-amber-800 font-medium';
        case 'NOTICE':
          return 'bg-indigo-950/80 text-indigo-300 border border-indigo-800';
        case 'INFO':
          return 'bg-cyan-950/70 text-cyan-300 border border-cyan-800';
        case 'DEBUG':
        default:
          return 'bg-slate-800 text-slate-400 border border-slate-700';
      }
    } else {
      switch (level) {
        case 'CRITICAL':
          return 'bg-red-100 text-red-800 border border-red-200 font-bold';
        case 'ERROR':
          return 'bg-rose-50 text-rose-700 border border-rose-200 font-semibold';
        case 'WARNING':
          return 'bg-amber-50 text-amber-700 border border-amber-200 font-medium';
        case 'NOTICE':
          return 'bg-indigo-50 text-indigo-700 border border-indigo-200';
        case 'INFO':
          return 'bg-sky-50 text-sky-700 border border-sky-200';
        case 'DEBUG':
        default:
          return 'bg-slate-100 text-slate-600 border border-slate-200';
      }
    }
  };

  // Formatador de timestamp
  const formatTimestamp = (isoString: string) => {
    try {
      const d = new Date(isoString);
      const hours = String(d.getHours()).padStart(2, '0');
      const mins = String(d.getMinutes()).padStart(2, '0');
      const secs = String(d.getSeconds()).padStart(2, '0');
      const ms = String(d.getMilliseconds()).padStart(3, '0');
      return `${hours}:${mins}:${secs}.${ms}`;
    } catch {
      return isoString;
    }
  };

  const formatDateShort = (isoString: string) => {
    try {
      const d = new Date(isoString);
      return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
    } catch {
      return '';
    }
  };

  return (
    <div className="space-y-5">
      {/* Alerta / Notificação */}
      {actionAlert && (
        <div
          className={`px-4 py-3 rounded-xl text-sm font-medium flex items-center justify-between border ${
            actionAlert.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
              : 'bg-rose-50 text-rose-800 border-rose-200'
          }`}
        >
          <div className="flex items-center gap-2">
            {actionAlert.type === 'success' ? (
              <Check className="w-4 h-4 text-emerald-600" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600" />
            )}
            <span>{actionAlert.text}</span>
          </div>
          <button onClick={() => setActionAlert(null)} className="text-slate-400 hover:text-slate-600">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Top Header Card */}
      <div className="p-5 rounded-2xl bg-white border border-slate-200/90 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <div className="p-2 rounded-xl bg-slate-900 text-white shadow-sm">
                <Terminal className="w-5 h-5 text-emerald-400" />
              </div>
              <h1 className="text-xl font-bold text-slate-900">Logs do Sistema em Tempo Real</h1>
              <div
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${
                  isLiveStreaming
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    : 'bg-amber-50 text-amber-700 border-amber-200'
                }`}
              >
                <span
                  className={`w-2 h-2 rounded-full ${
                    isLiveStreaming ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'
                  }`}
                />
                <span>{isLiveStreaming ? 'LIVE STREAM ATIVO' : 'STREAM PAUSADO'}</span>
              </div>
              <span className="text-xs text-slate-400 font-mono">Asterisk 20.17 LTS · Syslog Gateway</span>
            </div>
            <p className="text-xs text-slate-500 mt-1.5 max-w-3xl">
              Captura e telemetria unificada de eventos operacionais, falhas de autenticação SIP, túneis VPN, regras do
              Fail2ban e requisições HTTP do Nginx em tempo real.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => setIsLiveStreaming(!isLiveStreaming)}
              className={`flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded-xl transition shadow-sm ${
                isLiveStreaming
                  ? 'bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100'
                  : 'bg-emerald-600 text-white hover:bg-emerald-700'
              }`}
              title={isLiveStreaming ? 'Pausar atualização em tempo real' : 'Retomar atualização em tempo real'}
            >
              {isLiveStreaming ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
              <span>{isLiveStreaming ? 'Pausar' : 'Transmitir'}</span>
            </button>

            <button
              onClick={() => fetchLogs(false)}
              disabled={refreshing}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition border border-slate-200"
              title="Recarregar logs imediatamente"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
              <span>Recarregar</span>
            </button>

            <button
              onClick={() => setIsSimulateModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-xl transition border border-blue-200"
              title="Injetar evento de teste no syslog"
            >
              <Zap className="w-3.5 h-3.5 text-blue-600" />
              <span>Simular Evento</span>
            </button>

            <button
              onClick={handleDownloadLogs}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition border border-slate-200"
              title="Baixar arquivo de logs filtrado (.log)"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Exportar .log</span>
            </button>

            <button
              onClick={handleClearLogs}
              className="flex items-center gap-1.5 px-2.5 py-2 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 rounded-xl transition border border-rose-200"
              title="Limpar buffer de visualização"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Limpar</span>
            </button>
          </div>
        </div>

        {/* Stats Strip */}
        {stats && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 mt-4 pt-4 border-t border-slate-100">
            <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
              <span className="text-[10px] text-slate-500 uppercase font-semibold">Total no Buffer</span>
              <div className="text-base font-bold text-slate-900 mt-0.5">{stats.total}</div>
            </div>
            <div className="p-2.5 rounded-xl bg-rose-50/70 border border-rose-100">
              <span className="text-[10px] text-rose-600 uppercase font-semibold">Erros & Críticos</span>
              <div className="text-base font-bold text-rose-700 mt-0.5">
                {(stats.byLevel.ERROR || 0) + (stats.byLevel.CRITICAL || 0)}
              </div>
            </div>
            <div className="p-2.5 rounded-xl bg-amber-50/70 border border-amber-100">
              <span className="text-[10px] text-amber-700 uppercase font-semibold">Alertas (Warning)</span>
              <div className="text-base font-bold text-amber-800 mt-0.5">{stats.byLevel.WARNING || 0}</div>
            </div>
            <div className="p-2.5 rounded-xl bg-indigo-50/70 border border-indigo-100">
              <span className="text-[10px] text-indigo-600 uppercase font-semibold">Notices / Registros</span>
              <div className="text-base font-bold text-indigo-700 mt-0.5">{stats.byLevel.NOTICE || 0}</div>
            </div>
            <div className="p-2.5 rounded-xl bg-cyan-50/70 border border-cyan-100">
              <span className="text-[10px] text-cyan-700 uppercase font-semibold">Informativos (Info)</span>
              <div className="text-base font-bold text-cyan-800 mt-0.5">{stats.byLevel.INFO || 0}</div>
            </div>
            <div className="p-2.5 rounded-xl bg-slate-100 border border-slate-200">
              <span className="text-[10px] text-slate-500 uppercase font-semibold">Taxa de Eventos</span>
              <div className="text-base font-bold text-slate-800 mt-0.5 flex items-center gap-1">
                <span>~{stats.eventsPerMinute}</span>
                <span className="text-[10px] font-normal text-slate-500">/min</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Control Bar: Filters & Visual Mode */}
      <div className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-sm space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3 items-center">
          {/* Busca Textual */}
          <div className="lg:col-span-4 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Buscar em mensagens, IPs, canais, ramais..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-8 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Filtro por Serviço */}
          <div className="lg:col-span-3">
            <div className="relative">
              <select
                value={selectedService}
                onChange={(e) => setSelectedService(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
              >
                <option value="all">Todos os Serviços (Asterisk, Nginx, VPN...)</option>
                <option value="asterisk">Asterisk Core (PJSIP & Dialplan)</option>
                <option value="nginx">Nginx Gateway (Proxy & WSS)</option>
                <option value="wireguard">WireGuard VPN (Kernel wg0)</option>
                <option value="zerotier">ZeroTier One (SD-WAN)</option>
                <option value="fail2ban">Fail2ban Defense (Firewall)</option>
                <option value="gemini-gateway">AI Voice Bridge (MaIA & Gemini)</option>
                <option value="postgresql">PostgreSQL 16 (Database)</option>
                <option value="redis">Redis Cache & Buffers</option>
                <option value="audiosocket">AudioSocket Gateway</option>
              </select>
            </div>
          </div>

          {/* Filtro por Severidade */}
          <div className="lg:col-span-2">
            <select
              value={selectedLevel}
              onChange={(e) => setSelectedLevel(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
            >
              <option value="all">Todas as Severidades</option>
              <option value="CRITICAL">CRITICAL (Crítico)</option>
              <option value="ERROR">ERROR (Erro)</option>
              <option value="WARNING">WARNING (Aviso)</option>
              <option value="NOTICE">NOTICE (Notificação)</option>
              <option value="INFO">INFO (Informativo)</option>
              <option value="DEBUG">DEBUG (Depuração)</option>
            </select>
          </div>

          {/* Filtro por Data */}
          <div className="lg:col-span-3 flex items-center gap-2">
            <select
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
            >
              <option value="all">Todas as Datas</option>
              <option value="today">Hoje (Últimas 24 horas)</option>
              <option value="yesterday">Ontem</option>
              <option value="custom">Data Específica...</option>
            </select>

            {dateFilter === 'custom' && (
              <input
                type="date"
                value={customDate}
                onChange={(e) => setCustomDate(e.target.value)}
                className="px-2 py-1.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-slate-800"
              />
            )}
          </div>
        </div>

        {/* Linha inferior de opções de exibição */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100 text-xs text-slate-600">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-500">Modo de Visualização:</span>
            <div className="inline-flex bg-slate-100 p-0.5 rounded-lg border border-slate-200">
              <button
                onClick={() => setViewMode('terminal')}
                className={`px-2.5 py-1 rounded-md text-xs font-semibold transition flex items-center gap-1 ${
                  viewMode === 'terminal'
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Terminal className="w-3 h-3 text-emerald-400" />
                <span>Terminal Dark</span>
              </button>
              <button
                onClick={() => setViewMode('table')}
                className={`px-2.5 py-1 rounded-md text-xs font-semibold transition flex items-center gap-1 ${
                  viewMode === 'table'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Sliders className="w-3 h-3 text-blue-600" />
                <span>Tabela Estruturada</span>
              </button>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={autoScroll}
                onChange={(e) => setAutoScroll(e.target.checked)}
                className="w-3.5 h-3.5 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
              />
              <span className="text-slate-600 font-medium">Manter mais recente no topo</span>
            </label>

            <span className="text-slate-400">|</span>

            <span className="text-slate-500">
              Exibindo <span className="font-bold text-slate-800">{logs.length}</span> entradas
            </span>
          </div>
        </div>
      </div>

      {/* Main Logs Display */}
      {viewMode === 'terminal' ? (
        /* MODO TERMINAL DARK */
        <div className="rounded-2xl overflow-hidden border border-slate-800 bg-[#0B0F19] shadow-lg font-mono">
          {/* Terminal Titlebar */}
          <div className="px-4 py-2.5 bg-[#121827] border-b border-slate-800 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-rose-500/80 inline-block" />
                <span className="w-3 h-3 rounded-full bg-amber-500/80 inline-block" />
                <span className="w-3 h-3 rounded-full bg-emerald-500/80 inline-block" />
              </div>
              <span className="text-slate-400 ml-2 font-semibold flex items-center gap-1.5">
                <Terminal className="w-3.5 h-3.5 text-emerald-400" />
                <span>enlace-pbx:/var/log/syslog (journalctl -f)</span>
              </span>
            </div>
            <div className="flex items-center gap-3 text-[11px] text-slate-400">
              <span>Encoding: UTF-8</span>
              <span className="text-slate-600">•</span>
              <span className="text-emerald-400 font-semibold">PJSIP SIP/2.0 Socket: ONLINE</span>
            </div>
          </div>

          {/* Terminal Body */}
          <div
            ref={logsContainerRef}
            className="p-3 overflow-y-auto max-h-[580px] space-y-1 text-[12px] leading-relaxed select-text custom-scrollbar"
          >
            {loading ? (
              <div className="py-16 text-center text-slate-500">
                <RefreshCw className="w-6 h-6 animate-spin mx-auto text-emerald-400 mb-2" />
                <p>Conectando ao daemon de syslog do Asterisk...</p>
              </div>
            ) : logs.length === 0 ? (
              <div className="py-16 text-center text-slate-500">
                <Info className="w-6 h-6 mx-auto text-slate-600 mb-2" />
                <p>Nenhum registro encontrado para os filtros selecionados.</p>
                <button
                  onClick={() => {
                    setSelectedService('all');
                    setSelectedLevel('all');
                    setDateFilter('all');
                    setSearchQuery('');
                  }}
                  className="mt-3 px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs"
                >
                  Limpar todos os filtros
                </button>
              </div>
            ) : (
              logs.map((log) => {
                const isExpanded = expandedLogId === log.id;
                return (
                  <div
                    key={log.id}
                    className={`group px-2 py-1.5 rounded transition hover:bg-slate-800/60 border border-transparent hover:border-slate-700/50 ${
                      log.level === 'CRITICAL' || log.level === 'ERROR'
                        ? 'bg-rose-950/20'
                        : log.level === 'WARNING'
                        ? 'bg-amber-950/15'
                        : ''
                    }`}
                  >
                    <div className="flex items-start gap-2 flex-wrap sm:flex-nowrap">
                      {/* Timestamp */}
                      <span className="text-slate-500 shrink-0 select-none font-mono text-[11px] pt-0.5">
                        {formatDateShort(log.timestamp)} {formatTimestamp(log.timestamp)}
                      </span>

                      {/* Level Badge */}
                      <span
                        className={`px-1.5 py-0.2 rounded text-[10px] tracking-wide shrink-0 ${getLevelBadgeClass(
                          log.level,
                          true
                        )}`}
                      >
                        {log.level.padEnd(7)}
                      </span>

                      {/* Service Tag */}
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded text-[10px] font-semibold bg-slate-800/90 text-slate-300 border border-slate-700 shrink-0">
                        {getServiceIcon(log.service)}
                        <span>{log.service}</span>
                      </span>

                      {/* Component */}
                      {log.component && (
                        <span className="text-slate-400 text-[11px] shrink-0 font-medium">
                          [{log.component}]:
                        </span>
                      )}

                      {/* Message */}
                      <span
                        className={`flex-1 break-all text-slate-200 ${
                          log.level === 'CRITICAL'
                            ? 'text-red-300 font-bold'
                            : log.level === 'ERROR'
                            ? 'text-rose-300'
                            : log.level === 'WARNING'
                            ? 'text-amber-200'
                            : log.level === 'NOTICE'
                            ? 'text-indigo-200'
                            : 'text-slate-200'
                        }`}
                      >
                        {log.message}
                      </span>

                      {/* Action Tools on Hover */}
                      <div className="opacity-0 group-hover:opacity-100 transition flex items-center gap-1 shrink-0 ml-auto">
                        {log.metadata && Object.keys(log.metadata).length > 0 && (
                          <button
                            onClick={() => setExpandedLogId(isExpanded ? null : log.id)}
                            className="p-1 text-slate-400 hover:text-white bg-slate-800 rounded"
                            title="Ver metadados"
                          >
                            <Code className="w-3 h-3" />
                          </button>
                        )}
                        <button
                          onClick={() => handleCopyLog(log)}
                          className="p-1 text-slate-400 hover:text-white bg-slate-800 rounded"
                          title="Copiar linha"
                        >
                          {copiedId === log.id ? (
                            <Check className="w-3 h-3 text-emerald-400" />
                          ) : (
                            <Copy className="w-3 h-3" />
                          )}
                        </button>
                      </div>
                    </div>

                    {/* Metadata Drawer if expanded */}
                    {isExpanded && log.metadata && (
                      <div className="mt-2 ml-4 p-2.5 rounded bg-[#0f172a]/90 border border-slate-800 text-[11px] text-cyan-300">
                        <span className="text-slate-500 uppercase font-sans text-[10px] block mb-1">
                          Metadados Estruturados (JSON Payload):
                        </span>
                        <pre className="overflow-x-auto text-[11px]">{JSON.stringify(log.metadata, null, 2)}</pre>
                      </div>
                    )}
                  </div>
                );
              })
            )}
            <div ref={logsEndRef} />
          </div>
        </div>
      ) : (
        /* MODO TABELA ESTRUTURADA CLEAN LIGHT */
        <div className="rounded-2xl overflow-hidden border border-slate-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50/90 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[10px]">
                  <th className="px-4 py-3">Timestamp</th>
                  <th className="px-3 py-3">Severidade</th>
                  <th className="px-3 py-3">Serviço</th>
                  <th className="px-3 py-3">Componente</th>
                  <th className="px-4 py-3">Mensagem do Evento</th>
                  <th className="px-3 py-3 text-right">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-sans">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-slate-400">
                      <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-blue-600" />
                      Carregando logs do sistema...
                    </td>
                  </tr>
                ) : logs.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-slate-400">
                      Nenhum registro encontrado.
                    </td>
                  </tr>
                ) : (
                  logs.map((log) => {
                    const isExpanded = expandedLogId === log.id;
                    return (
                      <React.Fragment key={log.id}>
                        <tr
                          className={`hover:bg-slate-50/80 transition ${
                            log.level === 'CRITICAL' || log.level === 'ERROR'
                              ? 'bg-rose-50/30'
                              : log.level === 'WARNING'
                              ? 'bg-amber-50/20'
                              : ''
                          }`}
                        >
                          <td className="px-4 py-2.5 font-mono text-slate-600 whitespace-nowrap text-[11px]">
                            <span className="text-slate-400 mr-1">{formatDateShort(log.timestamp)}</span>
                            {formatTimestamp(log.timestamp)}
                          </td>
                          <td className="px-3 py-2.5 whitespace-nowrap">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] ${getLevelBadgeClass(
                                log.level,
                                false
                              )}`}
                            >
                              {log.level}
                            </span>
                          </td>
                          <td className="px-3 py-2.5 whitespace-nowrap">
                            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg text-xs font-medium bg-slate-100 text-slate-800">
                              {getServiceIcon(log.service)}
                              <span>{log.serviceLabel}</span>
                            </span>
                          </td>
                          <td className="px-3 py-2.5 font-mono text-slate-500 text-[11px] whitespace-nowrap">
                            {log.component || '—'}
                          </td>
                          <td className="px-4 py-2.5 text-slate-800 font-medium">
                            <span>{log.message}</span>
                          </td>
                          <td className="px-3 py-2.5 text-right whitespace-nowrap">
                            <div className="flex items-center justify-end gap-1">
                              {log.metadata && Object.keys(log.metadata).length > 0 && (
                                <button
                                  onClick={() => setExpandedLogId(isExpanded ? null : log.id)}
                                  className="p-1 text-slate-500 hover:text-slate-800 rounded hover:bg-slate-100"
                                  title="Expandir metadados"
                                >
                                  <Code className="w-3.5 h-3.5" />
                                </button>
                              )}
                              <button
                                onClick={() => handleCopyLog(log)}
                                className="p-1 text-slate-500 hover:text-slate-800 rounded hover:bg-slate-100"
                                title="Copiar linha"
                              >
                                {copiedId === log.id ? (
                                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                                ) : (
                                  <Copy className="w-3.5 h-3.5" />
                                )}
                              </button>
                            </div>
                          </td>
                        </tr>
                        {isExpanded && log.metadata && (
                          <tr className="bg-slate-50/90 border-b border-slate-200">
                            <td colSpan={6} className="px-6 py-3 font-mono text-xs text-slate-700">
                              <span className="text-[10px] text-slate-500 uppercase font-bold block mb-1 font-sans">
                                JSON Metadata:
                              </span>
                              <pre className="bg-white p-3 rounded-lg border border-slate-200 overflow-x-auto text-[11px]">
                                {JSON.stringify(log.metadata, null, 2)}
                              </pre>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal de Simular / Injetar Evento de Log */}
      {isSimulateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0f172a]/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-lg w-full border border-slate-200 shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-blue-50 text-blue-700">
                  <Zap className="w-4 h-4" />
                </div>
                <h3 className="font-bold text-slate-900">Simular Disparo de Log do Sistema</h3>
              </div>
              <button
                onClick={() => setIsSimulateModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSimulateLog} className="p-5 space-y-4">
              <p className="text-xs text-slate-500">
                Injeta uma mensagem no fluxo de telemetria para testar filtros, alertas e auditoria em tempo real.
              </p>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Serviço de Origem</label>
                  <select
                    value={simService}
                    onChange={(e) => setSimService(e.target.value as SystemLogService)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 text-slate-800"
                  >
                    <option value="asterisk">Asterisk Core</option>
                    <option value="nginx">Nginx Gateway</option>
                    <option value="wireguard">WireGuard VPN</option>
                    <option value="zerotier">ZeroTier SD-WAN</option>
                    <option value="fail2ban">Fail2ban Defense</option>
                    <option value="gemini-gateway">AI Voice Bridge</option>
                    <option value="postgresql">PostgreSQL 16</option>
                    <option value="redis">Redis Cache</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Severidade / Nível</label>
                  <select
                    value={simLevel}
                    onChange={(e) => setSimLevel(e.target.value as SystemLogLevel)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 text-slate-800"
                  >
                    <option value="DEBUG">DEBUG</option>
                    <option value="INFO">INFO</option>
                    <option value="NOTICE">NOTICE</option>
                    <option value="WARNING">WARNING</option>
                    <option value="ERROR">ERROR</option>
                    <option value="CRITICAL">CRITICAL</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Componente / Módulo</label>
                <input
                  type="text"
                  value={simComponent}
                  onChange={(e) => setSimComponent(e.target.value)}
                  placeholder="ex: res_pjsip_registrar.c ou wg0 ou firewall"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 font-mono text-slate-800"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Mensagem do Evento</label>
                <textarea
                  value={simMessage}
                  onChange={(e) => setSimMessage(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 text-slate-800 font-mono"
                  placeholder="Descreva a mensagem de log..."
                  required
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsSimulateModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={simSubmitting}
                  className="px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition shadow-sm flex items-center gap-1.5"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{simSubmitting ? 'Injetando...' : 'Injetar no Syslog'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
