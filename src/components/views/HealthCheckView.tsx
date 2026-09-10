import React, { useState, useEffect } from 'react';
import { Activity, Server, Database, PhoneCall, Bot, Radio, Wifi, HeartPulse, RefreshCw, CheckCircle2, AlertTriangle, Zap, ServerCrash } from 'lucide-react';

interface HealthStatus {
  status: string;
  timestamp: string;
  platform: string;
  version: string;
  components: {
    asterisk: { status: 'up' | 'down'; version: string; uptime: string };
    postgresql: { status: 'up' | 'down'; latencyMs: number; pool: string };
    redis: { status: 'up' | 'down'; memoryUsedMb: number };
    ari: { status: 'up' | 'down'; port: number; apps: string[] };
    pjsip: { status: 'up' | 'down'; endpointsOnline: number; trunksRegistered: number };
    audioSocket: { status: 'up' | 'down'; activeStreams: number; bufferLatencyMs: number };
    aiGateway: { status: 'up' | 'down'; activeSessions: number };
    geminiApi: { status: string; model: string; liveVoiceModel: string; defaultVoice: string };
  };
}

export const HealthCheckView: React.FC = () => {
  const [health, setHealth] = useState<HealthStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [runningDiag, setRunningDiag] = useState(false);
  const [diagResult, setDiagResult] = useState<any>(null);

  const fetchHealth = async () => {
    try {
      const res = await fetch('/api/v1/health');
      if (res.ok) {
        const data = await res.json();
        setHealth(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHealth();
    // Auto-refresh every 10 seconds
    const interval = setInterval(fetchHealth, 10000);
    return () => clearInterval(interval);
  }, []);

  const runDiagnostic = async () => {
    setRunningDiag(true);
    setDiagResult(null);
    try {
      // Small artificial delay for visual effect
      await new Promise(resolve => setTimeout(resolve, 1500));
      const res = await fetch('/api/v1/health/run-diagnostic', { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        setDiagResult(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setRunningDiag(false);
    }
  };

  if (loading && !health) {
    return <div className="p-8 text-center text-slate-500">Buscando telemetria do sistema...</div>;
  }

  if (!health) {
    return <div className="p-8 text-center text-rose-500 flex flex-col items-center gap-2">
      <ServerCrash className="w-8 h-8" />
      <span>Falha grave de comunicação com o NOC.</span>
    </div>;
  }

  const getStatusIcon = (status: string) => {
    return status === 'up' || status === 'connected' ? (
      <CheckCircle2 className="w-5 h-5 text-emerald-500" />
    ) : (
      <AlertTriangle className="w-5 h-5 text-rose-500" />
    );
  };

  const getStatusColor = (status: string) => {
    return status === 'up' || status === 'connected' ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-rose-200 bg-rose-50 text-rose-800';
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <HeartPulse className="w-6 h-6 text-rose-600" />
            Health Check do PBX
          </h2>
          <p className="text-sm text-slate-500 mt-1">Telemetria em tempo real, status dos componentes Asterisk e latências da IA.</p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={runDiagnostic}
            disabled={runningDiag}
            className="px-4 py-2 bg-slate-900 text-white rounded-lg text-sm font-semibold hover:bg-slate-800 flex items-center gap-2 transition disabled:opacity-70 disabled:cursor-wait shadow-sm"
          >
            {runningDiag ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
            {runningDiag ? 'Testando Malha...' : 'Executar Diagnóstico NOC'}
          </button>
        </div>
      </div>

      {/* Global Status Banner */}
      <div className="bg-gradient-to-r from-emerald-600 to-emerald-500 rounded-2xl p-6 text-white shadow-lg flex items-center justify-between relative overflow-hidden">
        <div className="absolute right-0 top-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -mr-10 -mt-10" />
        <div className="relative z-10 flex items-center gap-5">
          <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-sm border border-white/20">
            <Activity className="w-8 h-8 text-white" />
          </div>
          <div>
            <div className="text-emerald-100 text-sm font-bold tracking-wider uppercase mb-1">Status Global (NOC)</div>
            <div className="text-3xl font-black">{health.status === 'healthy' ? 'SISTEMA SAUDÁVEL' : 'ATENÇÃO NECESSÁRIA'}</div>
          </div>
        </div>
        <div className="relative z-10 text-right hidden md:block">
          <div className="text-sm text-emerald-100 mb-1">{health.platform}</div>
          <div className="font-mono bg-black/20 px-3 py-1.5 rounded-lg text-sm inline-block">v{health.version}</div>
        </div>
      </div>

      {/* Diagnostic Results (if run) */}
      {diagResult && (
        <div className="bg-slate-900 rounded-2xl p-5 text-emerald-400 font-mono text-xs sm:text-sm shadow-inner overflow-x-auto border border-slate-700">
          <div className="flex items-center gap-2 mb-3 text-white border-b border-slate-700 pb-2">
            <Terminal className="w-4 h-4 text-emerald-400" />
            <span className="font-bold">Resultado do Diagnóstico NOC</span>
          </div>
          <pre>{JSON.stringify(diagResult, null, 2)}</pre>
        </div>
      )}

      {/* Components Grid */}
      <h3 className="text-lg font-bold text-slate-800 mt-8 mb-4 flex items-center gap-2">
        <Server className="w-5 h-5 text-slate-400" />
        Monitoramento de Microserviços
      </h3>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Asterisk Core */}
        <div className={`p-5 rounded-2xl border ${getStatusColor(health.components.asterisk.status)}`}>
          <div className="flex justify-between items-start mb-4">
            <div className="p-2 bg-white/50 rounded-xl"><Radio className="w-5 h-5" /></div>
            {getStatusIcon(health.components.asterisk.status)}
          </div>
          <h4 className="font-bold mb-1">Asterisk Core</h4>
          <div className="text-xs opacity-80 mb-3">{health.components.asterisk.version}</div>
          <div className="text-sm font-semibold">Uptime: {health.components.asterisk.uptime}</div>
        </div>

        {/* SIP / PJSIP */}
        <div className={`p-5 rounded-2xl border ${getStatusColor(health.components.pjsip.status)}`}>
          <div className="flex justify-between items-start mb-4">
            <div className="p-2 bg-white/50 rounded-xl"><PhoneCall className="w-5 h-5" /></div>
            {getStatusIcon(health.components.pjsip.status)}
          </div>
          <h4 className="font-bold mb-1">Stack PJSIP</h4>
          <div className="text-xs opacity-80 mb-3">Registros Ativos</div>
          <div className="flex justify-between text-sm font-semibold">
            <span>Ramais: {health.components.pjsip.endpointsOnline}</span>
            <span>Troncos: {health.components.pjsip.trunksRegistered}</span>
          </div>
        </div>

        {/* ARI & WebSockets */}
        <div className={`p-5 rounded-2xl border ${getStatusColor(health.components.ari.status)}`}>
          <div className="flex justify-between items-start mb-4">
            <div className="p-2 bg-white/50 rounded-xl"><Wifi className="w-5 h-5" /></div>
            {getStatusIcon(health.components.ari.status)}
          </div>
          <h4 className="font-bold mb-1">Stasis (ARI)</h4>
          <div className="text-xs opacity-80 mb-3">WebSocket (Porta {health.components.ari.port})</div>
          <div className="text-sm font-semibold">Apps: {health.components.ari.apps.join(', ')}</div>
        </div>

        {/* Gemini AI Gateway */}
        <div className={`p-5 rounded-2xl border ${getStatusColor(health.components.geminiApi.status)}`}>
          <div className="flex justify-between items-start mb-4">
            <div className="p-2 bg-white/50 rounded-xl"><Bot className="w-5 h-5" /></div>
            {getStatusIcon(health.components.geminiApi.status)}
          </div>
          <h4 className="font-bold mb-1">Gemini AI Engine</h4>
          <div className="text-xs opacity-80 mb-3 truncate" title={health.components.geminiApi.model}>{health.components.geminiApi.model}</div>
          <div className="text-sm font-semibold capitalize">{health.components.geminiApi.status.replace('-', ' ')}</div>
        </div>

        {/* AudioSocket */}
        <div className={`p-5 rounded-2xl border ${getStatusColor(health.components.audioSocket.status)}`}>
          <div className="flex justify-between items-start mb-4">
            <div className="p-2 bg-white/50 rounded-xl"><Zap className="w-5 h-5" /></div>
            {getStatusIcon(health.components.audioSocket.status)}
          </div>
          <h4 className="font-bold mb-1">AudioSocket / RTP</h4>
          <div className="text-xs opacity-80 mb-3">Ponte de Áudio IA</div>
          <div className="flex justify-between text-sm font-semibold">
            <span>Streams: {health.components.audioSocket.activeStreams}</span>
            <span>Latência: {health.components.audioSocket.bufferLatencyMs}ms</span>
          </div>
        </div>

        {/* PostgreSQL */}
        <div className={`p-5 rounded-2xl border ${getStatusColor(health.components.postgresql.status)}`}>
          <div className="flex justify-between items-start mb-4">
            <div className="p-2 bg-white/50 rounded-xl"><Database className="w-5 h-5" /></div>
            {getStatusIcon(health.components.postgresql.status)}
          </div>
          <h4 className="font-bold mb-1">PostgreSQL</h4>
          <div className="text-xs opacity-80 mb-3">Banco Principal</div>
          <div className="flex justify-between text-sm font-semibold">
            <span>Pool: {health.components.postgresql.pool}</span>
            <span>Ping: {health.components.postgresql.latencyMs}ms</span>
          </div>
        </div>

        {/* Redis */}
        <div className={`p-5 rounded-2xl border ${getStatusColor(health.components.redis.status)}`}>
          <div className="flex justify-between items-start mb-4">
            <div className="p-2 bg-white/50 rounded-xl"><Database className="w-5 h-5" /></div>
            {getStatusIcon(health.components.redis.status)}
          </div>
          <h4 className="font-bold mb-1">Redis (Cache)</h4>
          <div className="text-xs opacity-80 mb-3">Gerenciador de Sessões</div>
          <div className="text-sm font-semibold">Memória: {health.components.redis.memoryUsedMb}MB</div>
        </div>

      </div>

    </div>
  );
};

// Temp mock for Terminal icon
function Terminal(props: any) {
  return <Server {...props} />;
}
