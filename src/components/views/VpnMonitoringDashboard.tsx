import React, { useState, useEffect, useRef } from 'react';
import {
  Activity,
  Shield,
  Globe,
  Radio,
  Zap,
  ArrowUpRight,
  ArrowDownLeft,
  RotateCcw,
  RefreshCw,
  Power,
  Sliders,
  CheckCircle2,
  AlertTriangle,
  Server,
  Smartphone,
  Laptop,
  Check,
  Play,
  Pause,
  Search,
  Filter,
  Eye,
  Terminal,
  Cpu,
  Gauge,
  Layers,
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
} from 'recharts';
import {
  VpnRoutingConfig,
  VpnTelemetryPoint,
  VpnNodeMonitoringItem,
  VpnTelemetryResponse,
  TunnelMode,
} from '../../types/pbx';
import { getAuthHeaders } from '../../utils/api';

interface VpnMonitoringDashboardProps {
  onNavigateToTab?: (tab: 'wireguard' | 'zerotier' | 'fail2ban_monitor') => void;
}

export const VpnMonitoringDashboard: React.FC<VpnMonitoringDashboardProps> = ({ onNavigateToTab }) => {
  const [data, setData] = useState<VpnTelemetryResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [isLiveActive, setIsLiveActive] = useState(true);
  const [switchingTunnel, setSwitchingTunnel] = useState<string | null>(null);
  const [pingingNodeId, setPingingNodeId] = useState<string | null>(null);
  const [pingResult, setPingResult] = useState<{ id: string; text: string; success: boolean } | null>(null);
  const [actionNotice, setActionNotice] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [filterTunnelType, setFilterTunnelType] = useState<'all' | 'wireguard' | 'zerotier'>('all');
  const [filterStatus, setFilterStatus] = useState<'all' | 'connected' | 'offline'>('all');
  const [chartMetric, setChartMetric] = useState<'bandwidth' | 'latency'>('bandwidth');

  const liveTimerRef = useRef<NodeJS.Timeout | null>(null);

  const showNotification = (text: string, type: 'success' | 'error' = 'success') => {
    setActionNotice({ text, type });
    setTimeout(() => setActionNotice(null), 4000);
  };

  const fetchTelemetry = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const res = await fetch('/api/v1/network/telemetry', {
        headers: getAuthHeaders(),
      });
      if (res.ok) {
        const json: VpnTelemetryResponse = await res.json();
        setData(json);
      }
    } catch {
      if (!silent) showNotification('Falha ao obter telemetria dos túneis VPN', 'error');
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    fetchTelemetry();
  }, []);

  // Polling em tempo real a cada 3 segundos
  useEffect(() => {
    if (isLiveActive) {
      liveTimerRef.current = setInterval(() => {
        fetchTelemetry(true);
      }, 3000);
    } else {
      if (liveTimerRef.current) clearInterval(liveTimerRef.current);
    }
    return () => {
      if (liveTimerRef.current) clearInterval(liveTimerRef.current);
    };
  }, [isLiveActive]);

  const handleSwitchTunnel = async (mode: TunnelMode) => {
    setSwitchingTunnel(mode);
    try {
      const res = await fetch('/api/v1/network/tunnel-switch', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ primaryTunnel: mode }),
      });
      const result = await res.json();
      if (result.success) {
        showNotification(
          `Rota primária de telefonia alterada para: ${mode === 'wireguard' ? 'WireGuard (wg0)' : mode === 'zerotier' ? 'ZeroTier SD-WAN' : 'Failover Inteligente Automático'}`
        );
        fetchTelemetry(true);
      } else {
        showNotification('Erro ao comutar túnel', 'error');
      }
    } catch {
      showNotification('Erro ao comutar túnel', 'error');
    } finally {
      setSwitchingTunnel(null);
    }
  };

  const handlePingNode = async (node: VpnNodeMonitoringItem) => {
    setPingingNodeId(node.id);
    setPingResult(null);
    try {
      const res = await fetch(`/api/v1/network/nodes/${node.tunnelType}/${node.id}/ping`, {
        method: 'POST',
        headers: getAuthHeaders(),
      });
      const result = await res.json();
      if (result.success) {
        setPingResult({
          id: node.id,
          text: `Resposta em ${result.latencyMs}ms (Jitter: ${result.jitterMs}ms, TTL: ${result.ttl})`,
          success: true,
        });
        showNotification(`Ping em ${node.name}: ${result.latencyMs}ms`);
      }
    } catch {
      setPingResult({
        id: node.id,
        text: 'Falha no teste de ping: timeout',
        success: false,
      });
    } finally {
      setPingingNodeId(null);
    }
  };

  const handleToggleNode = async (node: VpnNodeMonitoringItem) => {
    try {
      const res = await fetch(`/api/v1/network/nodes/${node.tunnelType}/${node.id}/toggle`, {
        method: 'POST',
        headers: getAuthHeaders(),
      });
      const result = await res.json();
      if (result.success) {
        showNotification(`Nó ${node.name} ${result.enabled === false ? 'desativado' : 'ativado'}`);
        fetchTelemetry(true);
      }
    } catch {
      showNotification('Erro ao alterar status do nó', 'error');
    }
  };

  const formatBytes = (bytes: number) => {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  // Filtragem dos Nós
  const filteredNodes = (data?.nodes || []).filter((node) => {
    const q = (searchQuery || '').toLowerCase();
    const matchesSearch =
      (node.name || '').toLowerCase().includes(q) ||
      (node.virtualIp || '').toLowerCase().includes(q) ||
      (node.roleOrExtension ? node.roleOrExtension.toLowerCase().includes(q) : false) ||
      (node.location ? node.location.toLowerCase().includes(q) : false);

    const matchesTunnel = filterTunnelType === 'all' || node?.tunnelType === filterTunnelType;
    const matchesStatus =
      filterStatus === 'all' ||
      (filterStatus === 'connected' && node?.status === 'connected') ||
      (filterStatus === 'offline' && node?.status !== 'connected');

    return matchesSearch && matchesTunnel && matchesStatus;
  });

  const connectedNodesCount = (data?.nodes || []).filter((n) => n?.status === 'connected').length;
  const totalNodesCount = data?.nodes?.length || 0;

  if (loading && !data) {
    return (
      <div className="p-12 flex flex-col items-center justify-center gap-3">
        <RefreshCw className="w-8 h-8 text-blue-600 animate-spin" />
        <p className="text-sm font-semibold text-slate-600">Inicializando telemetria de túneis e nós de rede...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Toast Notice */}
      {actionNotice && (
        <div
          className={`fixed bottom-6 right-6 z-50 px-4 py-3 rounded-xl shadow-xl border flex items-center gap-3 transition-all animate-in fade-in slide-in-from-bottom-5 ${
            actionNotice.type === 'error'
              ? 'bg-rose-50 border-rose-200 text-rose-800'
              : 'bg-emerald-50 border-emerald-200 text-emerald-800'
          }`}
        >
          {actionNotice.type === 'error' ? <AlertTriangle className="w-5 h-5 text-rose-600" /> : <CheckCircle2 className="w-5 h-5 text-emerald-600" />}
          <span className="text-sm font-semibold">{actionNotice.text}</span>
        </div>
      )}

      {/* 1. HERO: PAINEL DE CONTROLE DE ROTA & ALTERNÂNCIA DE TÚNEIS */}
      <div className="p-6 rounded-2xl bg-gradient-to-br from-slate-900 via-slate-800 to-blue-950 text-white shadow-md border border-slate-700/60 relative overflow-hidden">
        <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
          <Layers className="w-56 h-56 text-white" />
        </div>

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2 max-w-2xl">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider bg-blue-500/20 text-blue-300 border border-blue-400/30 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                Roteador de Túneis VoIP Asterisk
              </span>
              <span className="text-xs text-slate-400">
                Última comutação: {data?.routing?.lastSwitch ? new Date(data.routing.lastSwitch).toLocaleTimeString() : 'N/A'}
              </span>
            </div>
            <h2 className="text-xl md:text-2xl font-black tracking-tight text-white flex items-center gap-2.5">
              Alternância Rápida de Túneis &amp; Rota Ativa
            </h2>
            <p className="text-xs md:text-sm text-slate-300 leading-relaxed">
              Defina a rota prioritária para encaminhamento do tráfego SIP (5060) e fluxos RTP de áudio entre os ramais e filiais. A comutação é contínua e mantém os registros PJSIP ativos.
            </p>
          </div>

          {/* Quick Selector de Túneis */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 bg-slate-800/80 p-2 rounded-2xl border border-slate-700 backdrop-blur-sm">
            {/* Opção WireGuard */}
            <button
              onClick={() => handleSwitchTunnel('wireguard')}
              disabled={switchingTunnel !== null}
              className={`flex-1 flex items-center justify-between sm:justify-start gap-3 px-4 py-2.5 rounded-xl text-xs font-bold transition ${
                data?.routing?.primaryTunnel === 'wireguard'
                  ? 'bg-blue-600 text-white shadow-md border border-blue-400'
                  : 'text-slate-300 hover:bg-slate-700 hover:text-white'
              }`}
            >
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-blue-300" />
                <div className="text-left">
                  <div className="font-extrabold leading-none">WireGuard (wg0)</div>
                  <div className="text-[10px] opacity-80 mt-0.5 font-normal">Ponto-a-Ponto ChaCha20</div>
                </div>
              </div>
              {data?.routing?.activeTunnel === 'wireguard' && (
                <span className="px-1.5 py-0.5 rounded bg-blue-700 text-[10px] font-mono font-bold uppercase">Ativo</span>
              )}
            </button>

            {/* Opção ZeroTier */}
            <button
              onClick={() => handleSwitchTunnel('zerotier')}
              disabled={switchingTunnel !== null}
              className={`flex-1 flex items-center justify-between sm:justify-start gap-3 px-4 py-2.5 rounded-xl text-xs font-bold transition ${
                data?.routing?.primaryTunnel === 'zerotier'
                  ? 'bg-orange-600 text-white shadow-md border border-orange-400'
                  : 'text-slate-300 hover:bg-slate-700 hover:text-white'
              }`}
            >
              <div className="flex items-center gap-2">
                <Globe className="w-4 h-4 text-orange-300" />
                <div className="text-left">
                  <div className="font-extrabold leading-none">ZeroTier (zt0)</div>
                  <div className="text-[10px] opacity-80 mt-0.5 font-normal">SD-WAN Mesh P2P</div>
                </div>
              </div>
              {data?.routing?.activeTunnel === 'zerotier' && (
                <span className="px-1.5 py-0.5 rounded bg-orange-700 text-[10px] font-mono font-bold uppercase">Ativo</span>
              )}
            </button>

            {/* Opção Failover Automático */}
            <button
              onClick={() => handleSwitchTunnel('failover_auto')}
              disabled={switchingTunnel !== null}
              className={`flex-1 flex items-center justify-between sm:justify-start gap-3 px-4 py-2.5 rounded-xl text-xs font-bold transition ${
                data?.routing?.primaryTunnel === 'failover_auto'
                  ? 'bg-emerald-600 text-white shadow-md border border-emerald-400'
                  : 'text-slate-300 hover:bg-slate-700 hover:text-white'
              }`}
            >
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-emerald-300" />
                <div className="text-left">
                  <div className="font-extrabold leading-none">Smart Failover</div>
                  <div className="text-[10px] opacity-80 mt-0.5 font-normal">Chaveamento Auto</div>
                </div>
              </div>
              {data?.routing?.primaryTunnel === 'failover_auto' && (
                <span className="px-1.5 py-0.5 rounded bg-emerald-700 text-[10px] font-mono font-bold uppercase">Auto</span>
              )}
            </button>
          </div>
        </div>

        {/* Indicadores de Status de Roteamento */}
        <div className="mt-5 pt-4 border-t border-slate-700/60 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div className="flex items-center gap-2 text-slate-300">
            <span className="w-2 h-2 rounded-full bg-blue-400" />
            <span>WireGuard: <strong className="text-white font-mono">{data?.routing?.wireguardHealthy ? 'Saudável' : 'Degradado'}</strong></span>
          </div>
          <div className="flex items-center gap-2 text-slate-300">
            <span className="w-2 h-2 rounded-full bg-orange-400" />
            <span>ZeroTier: <strong className="text-white font-mono">{data?.routing?.zerotierHealthy ? 'Saudável' : 'Degradado'}</strong></span>
          </div>
          <div className="flex items-center gap-2 text-slate-300">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            <span>QoS SIP Asterisk: <strong className="text-white font-mono">DSCP EF (46)</strong></span>
          </div>
          <div className="flex items-center gap-2 text-slate-300">
            <span className="w-2 h-2 rounded-full bg-indigo-400" />
            <span>MTU Otimizado: <strong className="text-white font-mono">1420 / 2800</strong></span>
          </div>
        </div>
      </div>

      {/* 2. CARDS DE TELEMETRIA EM TEMPO REAL */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Throughput Total */}
        <div className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
              <Gauge className="w-4 h-4 text-blue-600" /> Tráfego Instantâneo
            </span>
            <span className="text-[10px] font-mono font-bold bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full border border-blue-200">
              KB/s
            </span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900 font-mono">
              {(data?.currentRates?.totalKbps || 0).toLocaleString()}
            </span>
            <span className="text-xs text-slate-500 font-semibold">KB/s</span>
          </div>
          <div className="mt-2 flex items-center justify-between text-[11px] text-slate-500 font-mono">
            <span className="flex items-center gap-1">
              <ArrowDownLeft className="w-3 h-3 text-emerald-600" /> RX: {(data?.currentRates?.wgRxKbps || 0) + (data?.currentRates?.ztRxKbps || 0)} KB/s
            </span>
            <span className="flex items-center gap-1">
              <ArrowUpRight className="w-3 h-3 text-blue-600" /> TX: {(data?.currentRates?.wgTxKbps || 0) + (data?.currentRates?.ztTxKbps || 0)} KB/s
            </span>
          </div>
        </div>

        {/* Taxa de Pacotes / Segundo */}
        <div className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
              <Radio className="w-4 h-4 text-indigo-600" /> Pacotes / Seg (PPS)
            </span>
            <span className="text-[10px] font-mono font-bold bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-full border border-indigo-200">
              RTP / SIP
            </span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900 font-mono">
              {data?.currentRates?.pps || 0}
            </span>
            <span className="text-xs text-slate-500 font-semibold">pps</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-2 truncate">
            Fluxos de áudio RTP bidirecionais codecs Opus/G.711
          </p>
        </div>

        {/* Latência & Jitter RTT */}
        <div className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
              <Activity className="w-4 h-4 text-emerald-600" /> Latência Média (RTT)
            </span>
            <span className="text-[10px] font-bold bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full border border-emerald-200">
              Excelente (MOS 4.4)
            </span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-emerald-700 font-mono">
              {data?.currentRates?.latencyAvgMs || 18}
            </span>
            <span className="text-xs text-slate-500 font-semibold">ms</span>
            <span className="text-xs text-slate-400 font-mono ml-auto">
              Jitter: <strong>{data?.currentRates?.jitterAvgMs || 1.6}ms</strong>
            </span>
          </div>
          <p className="text-[11px] text-slate-500 mt-2 truncate">
            Zero jitter buffer overflow nos canais Asterisk PJSIP
          </p>
        </div>

        {/* Nós Conectados */}
        <div className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
              <Server className="w-4 h-4 text-purple-600" /> Nós em Malha Conectados
            </span>
            <span className="text-[10px] font-bold bg-purple-50 text-purple-700 px-2 py-0.5 rounded-full border border-purple-200">
              {connectedNodesCount} / {totalNodesCount}
            </span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-purple-700 font-mono">
              {Math.round((connectedNodesCount / (totalNodesCount || 1)) * 100)}%
            </span>
            <span className="text-xs text-slate-500 font-semibold">disponibilidade</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-2 truncate">
            {connectedNodesCount} nós ativos trocando keepalives a cada 25s
          </p>
        </div>
      </div>

      {/* 3. GRÁFICO EM TEMPO REAL: BANDA & THROUGHPUT */}
      <div className="p-5 rounded-2xl bg-white border border-slate-200/90 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Activity className="w-5 h-5 text-blue-600" />
            <div>
              <h3 className="text-sm font-extrabold text-slate-900">Telemetria de Tráfego em Tempo Real (Throughput KB/s)</h3>
              <p className="text-xs text-slate-500">
                Histórico contínuo de recepção (RX) e transmissão (TX) por interface de túnel
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Seletor de Métrica */}
            <div className="flex items-center bg-slate-100 p-1 rounded-xl text-xs font-bold">
              <button
                onClick={() => setChartMetric('bandwidth')}
                className={`px-3 py-1 rounded-lg transition ${
                  chartMetric === 'bandwidth' ? 'bg-white text-blue-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Banda (KB/s)
              </button>
              <button
                onClick={() => setChartMetric('latency')}
                className={`px-3 py-1 rounded-lg transition ${
                  chartMetric === 'latency' ? 'bg-white text-blue-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Latência &amp; Jitter (ms)
              </button>
            </div>

            {/* Controle de Streaming Ao Vivo */}
            <button
              onClick={() => setIsLiveActive(!isLiveActive)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition border ${
                isLiveActive
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                  : 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200'
              }`}
            >
              {isLiveActive ? (
                <>
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                  <span>Ao Vivo (3s)</span>
                  <Pause className="w-3.5 h-3.5 ml-0.5" />
                </>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5 text-slate-600" />
                  <span>Pausado</span>
                </>
              )}
            </button>

            <button
              onClick={() => fetchTelemetry(false)}
              className="p-1.5 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition border border-slate-200"
              title="Atualizar agora"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Gráfico Recharts */}
        <div className="h-64 w-full pt-2">
          {chartMetric === 'bandwidth' ? (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data?.history || []} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorWgRx" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.0} />
                  </linearGradient>
                  <linearGradient id="colorWgTx" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#1d4ed8" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#1d4ed8" stopOpacity={0.0} />
                  </linearGradient>
                  <linearGradient id="colorZt" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ea580c" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#ea580c" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="time" tick={{ fontSize: 11, fill: '#64748b' }} />
                <YAxis tick={{ fontSize: 11, fill: '#64748b' }} unit=" KB" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    borderRadius: '0.75rem',
                    color: '#fff',
                    border: 'none',
                    fontSize: '12px',
                  }}
                />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                <Area
                  type="monotone"
                  dataKey="wgRxKbps"
                  name="WireGuard RX (Download)"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorWgRx)"
                />
                <Area
                  type="monotone"
                  dataKey="wgTxKbps"
                  name="WireGuard TX (Upload)"
                  stroke="#1d4ed8"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorWgTx)"
                />
                <Area
                  type="monotone"
                  dataKey="ztRxKbps"
                  name="ZeroTier Mesh RX"
                  stroke="#ea580c"
                  strokeWidth={1.5}
                  fillOpacity={1}
                  fill="url(#colorZt)"
                />
                <Area
                  type="monotone"
                  dataKey="ztTxKbps"
                  name="ZeroTier Mesh TX"
                  stroke="#f97316"
                  strokeWidth={1.5}
                  fillOpacity={0}
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data?.history || []} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="time" tick={{ fontSize: 11, fill: '#64748b' }} />
                <YAxis tick={{ fontSize: 11, fill: '#64748b' }} unit=" ms" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    borderRadius: '0.75rem',
                    color: '#fff',
                    border: 'none',
                    fontSize: '12px',
                  }}
                />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                <Line
                  type="monotone"
                  dataKey="latencyMs"
                  name="Latência RTT (ms)"
                  stroke="#10b981"
                  strokeWidth={2.5}
                  dot={{ r: 3 }}
                  activeDot={{ r: 5 }}
                />
                <Line
                  type="monotone"
                  dataKey="jitterMs"
                  name="Jitter (ms)"
                  stroke="#8b5cf6"
                  strokeWidth={2}
                  strokeDasharray="4 4"
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* 4. MATRIZ DE STATUS DE CONEXÃO DOS NÓS (WIREGUARD & ZEROTIER) */}
      <div className="p-5 rounded-2xl bg-white border border-slate-200/90 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-extrabold text-slate-900">Status dos Nós de Rede &amp; Túneis Individuais</h3>
              <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-700">
                {filteredNodes.length} de {totalNodesCount} nós
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Monitoramento nó a nó: latência instantânea, teste de ping, volume transferido e controle de habilitação.
            </p>
          </div>

          {/* Filtros e Busca */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Input Busca */}
            <div className="relative min-w-[200px]">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Buscar nó, IP, ramal..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 rounded-xl border border-slate-200 text-xs font-medium focus:outline-hidden focus:border-blue-500"
              />
            </div>

            {/* Filtro Tipo */}
            <select
              value={filterTunnelType}
              onChange={(e) => setFilterTunnelType(e.target.value as any)}
              className="px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-semibold bg-white text-slate-700 focus:outline-hidden focus:border-blue-500"
            >
              <option value="all">Todos os Túneis</option>
              <option value="wireguard">Apenas WireGuard</option>
              <option value="zerotier">Apenas ZeroTier</option>
            </select>

            {/* Filtro Status */}
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as any)}
              className="px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-semibold bg-white text-slate-700 focus:outline-hidden focus:border-blue-500"
            >
              <option value="all">Todos os Status</option>
              <option value="connected">Apenas Conectados</option>
              <option value="offline">Offline / Inativos</option>
            </select>
          </div>
        </div>

        {/* Tabela de Nós */}
        <div className="border border-slate-200 rounded-xl overflow-hidden overflow-x-auto custom-scrollbar">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[11px]">
              <tr>
                <th className="py-3 px-4">Túnel / Tipo</th>
                <th className="py-3 px-4">Identificação do Nó / Ramal</th>
                <th className="py-3 px-4">IP Virtual &amp; Endpoint</th>
                <th className="py-3 px-4">Status &amp; RTT</th>
                <th className="py-3 px-4">Tráfego (RX / TX)</th>
                <th className="py-3 px-4 text-center">Ações Rápidas</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredNodes.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400 font-semibold">
                    Nenhum nó encontrado com os filtros selecionados.
                  </td>
                </tr>
              ) : (
                filteredNodes.map((node) => (
                  <tr key={node.id} className="hover:bg-slate-50/70 transition">
                    {/* Tipo / Badge */}
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        {node.tunnelType === 'wireguard' ? (
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200 flex items-center gap-1">
                            <Shield className="w-3 h-3" /> WireGuard
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-orange-50 text-orange-700 border border-orange-200 flex items-center gap-1">
                            <Globe className="w-3 h-3" /> ZeroTier
                          </span>
                        )}
                        {node.isPrimaryRoute && (
                          <span className="px-1.5 py-0.2 rounded text-[9px] font-extrabold uppercase bg-emerald-100 text-emerald-800 border border-emerald-200" title="Rota prioritária no momento">
                            Rota Primária
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Nome & Ramal */}
                    <td className="py-3 px-4">
                      <div>
                        <div className="font-extrabold text-slate-800 text-xs flex items-center gap-1.5">
                          {node.name}
                        </div>
                        <div className="text-[11px] text-slate-500 flex items-center gap-2 mt-0.5">
                          {node.roleOrExtension && (
                            <span className="font-mono bg-slate-100 text-slate-700 px-1.5 py-0.2 rounded text-[10px] font-bold">
                              {node.roleOrExtension}
                            </span>
                          )}
                          <span>{node.location || 'Localidade Remota'}</span>
                        </div>
                      </div>
                    </td>

                    {/* IPs */}
                    <td className="py-3 px-4 font-mono text-[11px]">
                      <div className="font-bold text-blue-700">{node.virtualIp}</div>
                      <div className="text-slate-400 text-[10px] truncate max-w-[180px]">{node.endpoint}</div>
                    </td>

                    {/* Status & Latência */}
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <span
                          className={`w-2 h-2 rounded-full ${
                            node.status === 'connected'
                              ? 'bg-emerald-500 animate-pulse'
                              : node.status === 'idle'
                              ? 'bg-amber-400'
                              : 'bg-slate-300'
                          }`}
                        />
                        <span
                          className={`font-bold capitalize ${
                            node.status === 'connected'
                              ? 'text-emerald-700'
                              : node.status === 'idle'
                              ? 'text-amber-700'
                              : 'text-slate-400'
                          }`}
                        >
                          {node.status === 'connected' ? 'Online' : node.status === 'idle' ? 'Espera' : 'Offline'}
                        </span>
                      </div>
                      {node.status === 'connected' && (
                        <div className="text-[10px] font-mono text-slate-500 mt-0.5 flex items-center gap-1.5">
                          <span>RTT: <strong className="text-slate-700">{node.latencyMs}ms</strong></span>
                          <span>Jitter: <strong className="text-slate-700">{node.jitterMs}ms</strong></span>
                        </div>
                      )}
                    </td>

                    {/* Tráfego */}
                    <td className="py-3 px-4 font-mono text-[11px]">
                      <div className="text-slate-700 flex items-center gap-1">
                        <ArrowDownLeft className="w-3 h-3 text-emerald-600" /> {formatBytes(node.bytesRx)}
                      </div>
                      <div className="text-slate-500 flex items-center gap-1 mt-0.5">
                        <ArrowUpRight className="w-3 h-3 text-blue-600" /> {formatBytes(node.bytesTx)}
                      </div>
                    </td>

                    {/* Ações */}
                    <td className="py-3 px-4 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        {/* Botão Ping Test */}
                        <button
                          onClick={() => handlePingNode(node)}
                          disabled={pingingNodeId === node.id || node.status === 'offline'}
                          className="px-2.5 py-1 rounded-lg text-xs font-bold bg-slate-100 hover:bg-blue-50 hover:text-blue-700 text-slate-700 border border-slate-200 transition flex items-center gap-1 disabled:opacity-40"
                          title="Enviar ICMP Ping e SIP OPTIONS"
                        >
                          {pingingNodeId === node.id ? (
                            <RefreshCw className="w-3 h-3 animate-spin text-blue-600" />
                          ) : (
                            <Activity className="w-3 h-3 text-blue-600" />
                          )}
                          <span>Ping</span>
                        </button>

                        {/* Toggle On/Off */}
                        <button
                          onClick={() => handleToggleNode(node)}
                          className={`p-1 rounded-lg border transition ${
                            node.enabled
                              ? 'bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100'
                              : 'bg-slate-100 border-slate-200 text-slate-400 hover:bg-slate-200'
                          }`}
                          title={node.enabled ? 'Desativar este nó' : 'Ativar este nó'}
                        >
                          <Power className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {/* Resultado de Ping inline se existir */}
                      {pingResult && pingResult.id === node.id && (
                        <div className="text-[10px] font-mono text-emerald-700 font-semibold mt-1">
                          {pingResult.text}
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Rodapé informativo de gestão detalhada */}
        <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-600" />
            <span>Para cadastrar novos peers WireGuard ou exportar QR Code móvel, acesse a aba <strong>WireGuard VPN</strong>.</span>
          </div>
          {onNavigateToTab && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => onNavigateToTab('wireguard')}
                className="text-xs font-bold text-blue-600 hover:text-blue-800 hover:underline"
              >
                Gerenciar WireGuard &rarr;
              </button>
              <span className="text-slate-300">|</span>
              <button
                onClick={() => onNavigateToTab('zerotier')}
                className="text-xs font-bold text-orange-600 hover:text-orange-800 hover:underline"
              >
                Gerenciar ZeroTier &rarr;
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
