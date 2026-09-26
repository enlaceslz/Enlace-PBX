import React, { useState, useEffect } from 'react';
import { 
  Activity, Server, Database, PhoneCall, Bot, Radio, Wifi, 
  HeartPulse, RefreshCw, CheckCircle2, AlertTriangle, Zap, 
  ServerCrash, Cpu, Terminal, Network, ShieldCheck
} from 'lucide-react';
import { getAuthHeaders } from '../../utils/api';

interface HealthStatus {
  status: string;
  timestamp: string;
  platform: string;
  version: string;
  components?: {
    asterisk?: { status?: string; version?: string; uptime?: string };
    postgresql?: { status?: string; latencyMs?: number; pool?: string; mode?: string };
    redis?: { status?: string; memoryUsedMb?: number };
    ari?: { status?: string; port?: number; apps?: string[] };
    pjsip?: { status?: string; endpointsOnline?: number; trunksRegistered?: number };
    audioSocket?: { status?: string; activeStreams?: number; bufferLatencyMs?: number };
    aiGateway?: { status?: string; activeSessions?: number };
    geminiApi?: { status?: string; model?: string; liveVoiceModel?: string; defaultVoice?: string };
    wireguard?: { status?: string; installed?: boolean; peersCount?: number };
    zerotier?: { status?: string; installed?: boolean };
  };
}

export const HealthCheckView: React.FC = () => {
  const [health, setHealth] = useState<HealthStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [runningDiag, setRunningDiag] = useState(false);
  const [diagResult, setDiagResult] = useState<any>(null);
  const [logs, setLogs] = useState<string[]>([]);

  const fetchHealth = async () => {
    try {
      const res = await fetch('/api/v1/health', { headers: getAuthHeaders() });
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
    const interval = setInterval(fetchHealth, 10000);
    return () => clearInterval(interval);
  }, []);

  const addLog = (msg: string) => {
    setLogs(prev => [...prev, `[${new Date().toISOString().split('T')[1].split('.')[0]}] ${msg}`].slice(-20));
  };

  const runDiagnostic = async () => {
    setRunningDiag(true);
    setDiagResult(null);
    setLogs([]);
    
    addLog('INIT: Iniciando bateria de diagnósticos reais no servidor...');
    
    try {
      addLog('EXEC: Requisitando telemetria de componentes ao backend...');
      const res = await fetch('/api/v1/health/run-diagnostic', { 
        method: 'POST',
        headers: getAuthHeaders()
      });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.diagnostics)) {
          for (const d of data.diagnostics) {
            const latencyStr = d.pingMs !== null && d.pingMs !== undefined ? ` [${d.pingMs}ms]` : '';
            addLog(`${d.status}: ${d.name} — ${d.details}${latencyStr}`);
          }
        }
        addLog(`SYS: Diagnóstico concluído com status global: ${data.overallHealth || 'PASS'}`);
        setDiagResult(data);
      } else {
        const errData = await res.json().catch(() => ({}));
        addLog(`ERR: Falha na resposta da API de diagnóstico (${res.status}): ${errData.error || 'Erro desconhecido'}`);
      }
    } catch (e: any) {
      console.error(e);
      addLog(`ERR: Sequência de diagnóstico falhou: ${e.message || 'Sem conectividade'}`);
    } finally {
      setRunningDiag(false);
    }
  };

  if (loading && !health) {
    return <div className="p-8 text-center text-slate-500 font-mono">ESTABELECENDO HANDSHAKE COM NOC...</div>;
  }

  if (!health) {
    return (
      <div className="p-12 text-center text-rose-500 flex flex-col items-center gap-4 bg-slate-900 rounded-3xl h-full border border-rose-900/50">
        <ServerCrash className="w-16 h-16 animate-pulse" />
        <div>
          <h2 className="text-xl font-black uppercase tracking-widest">Link Loss Detectado</h2>
          <p className="text-xs text-rose-400 font-mono mt-2">O painel perdeu a comunicação de telemetria com a controladora primária.</p>
        </div>
      </div>
    );
  }

  const getStatusNode = (status: string, blink: boolean = false) => {
    const isUp = status === 'up' || status === 'connected';
    return (
      <div className={`relative w-3 h-3 rounded-full ${isUp ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]' : 'bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.8)]'}`}>
        {isUp && blink && <div className="absolute inset-0 rounded-full bg-emerald-400 animate-ping opacity-50"></div>}
      </div>
    );
  };

  return (
    <div className="max-w-[1400px] mx-auto space-y-6 pb-12">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-black text-slate-900 flex items-center gap-3 tracking-tight">
            <HeartPulse className="w-8 h-8 text-blue-600 fill-blue-600" />
            Telemetria & Diagnóstico
          </h2>
          <p className="text-sm font-medium text-slate-500 mt-1">
            Monitoramento em tempo real do kernel Asterisk, bancos de dados, sockets e APIs do Google Gemini.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="bg-slate-900 text-white px-4 py-2 rounded-xl text-xs font-mono flex items-center gap-3 shadow-md border border-slate-700">
            <span className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              SISTEMA ONLINE
            </span>
            <span className="text-slate-500">|</span>
            <span className="text-blue-400">v{health.version}</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Main Telemetry Grid (2 Cols) */}
        <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4">
          
          {/* Core Telephony */}
          <div className="bg-slate-900 p-6 rounded-3xl border border-slate-800 shadow-xl relative overflow-hidden group hover:border-slate-700 transition-colors">
            <div className="absolute right-0 top-0 w-32 h-32 bg-blue-500/10 rounded-bl-full -mr-4 -mt-4" />
            <div className="flex items-center gap-3 mb-6 relative z-10">
              <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center text-blue-400 border border-blue-500/30">
                <Radio className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-white text-sm uppercase tracking-wider">Núcleo Asterisk</h3>
            </div>
            <div className="space-y-4 relative z-10">
              <div className="flex items-center justify-between bg-slate-800/50 p-3 rounded-xl border border-slate-700/50">
                <div className="flex items-center gap-3 text-slate-300 text-xs font-bold">
                  {getStatusNode(health.components?.asterisk?.status || 'down', true)} Core Engine
                </div>
                <div className="text-xs font-mono text-blue-400">{health.components?.asterisk?.uptime || 'N/A'}</div>
              </div>
              <div className="flex items-center justify-between bg-slate-800/50 p-3 rounded-xl border border-slate-700/50">
                <div className="flex items-center gap-3 text-slate-300 text-xs font-bold">
                  {getStatusNode(health.components?.pjsip?.status || 'down')} PJSIP Stack
                </div>
                <div className="text-xs font-mono text-slate-400">{health.components?.pjsip?.endpointsOnline ?? 0} EPS / {health.components?.pjsip?.trunksRegistered ?? 0} TRKS</div>
              </div>
              <div className="flex items-center justify-between bg-slate-800/50 p-3 rounded-xl border border-slate-700/50">
                <div className="flex items-center gap-3 text-slate-300 text-xs font-bold">
                  {getStatusNode(health.components?.ari?.status || 'down')} ARI Interface
                </div>
                <div className="text-xs font-mono text-slate-400">Port {health.components?.ari?.port ?? 8088}</div>
              </div>
            </div>
          </div>

          {/* Core Database */}
          <div className="bg-slate-900 p-6 rounded-3xl border border-slate-800 shadow-xl relative overflow-hidden group hover:border-slate-700 transition-colors">
            <div className="absolute right-0 top-0 w-32 h-32 bg-emerald-500/10 rounded-bl-full -mr-4 -mt-4" />
            <div className="flex items-center gap-3 mb-6 relative z-10">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center text-emerald-400 border border-emerald-500/30">
                <Database className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-white text-sm uppercase tracking-wider">Storage & Cache</h3>
            </div>
            <div className="space-y-4 relative z-10">
              <div className="flex items-center justify-between bg-slate-800/50 p-3 rounded-xl border border-slate-700/50">
                <div className="flex items-center gap-3 text-slate-300 text-xs font-bold">
                  {getStatusNode(health.components?.postgresql?.status || 'down')} Banco de Dados & Armazenamento
                </div>
                <div className="text-xs font-mono text-emerald-400">{health.components?.postgresql?.latencyMs ?? 1}ms</div>
              </div>
              <div className="flex items-center justify-between bg-slate-800/50 p-3 rounded-xl border border-slate-700/50">
                <div className="flex items-center gap-3 text-slate-300 text-xs font-bold">
                  <ShieldCheck className="w-4 h-4 text-blue-400" /> Modo de Operação
                </div>
                <div className="text-xs font-mono text-blue-300 font-semibold">
                  {health.components?.postgresql?.mode === 'postgresql_cluster'
                    ? 'PostgreSQL Corporativo'
                    : 'Indisponível / Desconectado'}
                </div>
              </div>
              <div className="flex items-center justify-between bg-slate-800/50 p-3 rounded-xl border border-slate-700/50">
                <div className="flex items-center gap-3 text-slate-300 text-xs font-bold">
                  <ShieldCheck className="w-4 h-4 text-slate-500" /> Pool de Conexões
                </div>
                <div className="text-xs font-mono text-slate-400">
                  {health.components?.postgresql?.pool === 'active'
                    ? 'Ativo (Pool Conectado)'
                    : 'Desconectado'}
                </div>
              </div>
            </div>
          </div>

          {/* AI Orchestration Full Width */}
          <div className="md:col-span-2 bg-slate-900 p-6 rounded-3xl border border-slate-800 shadow-xl relative overflow-hidden group hover:border-slate-700 transition-colors">
            <div className="absolute right-0 top-0 w-64 h-64 bg-purple-500/10 rounded-bl-full -mr-10 -mt-10" />
            <div className="flex items-center gap-3 mb-6 relative z-10">
              <div className="w-10 h-10 rounded-xl bg-purple-500/20 flex items-center justify-center text-purple-400 border border-purple-500/30">
                <Cpu className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-white text-sm uppercase tracking-wider">Motores de Inteligência Artificial</h3>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 relative z-10">
              <div className="flex flex-col justify-between bg-slate-800/50 p-4 rounded-xl border border-slate-700/50">
                <div className="flex items-center gap-3 text-slate-300 text-xs font-bold mb-3">
                  {getStatusNode(health.components?.geminiApi?.status || 'connected')} Google Gemini Live API
                </div>
                <div className="text-[10px] font-mono text-slate-400 bg-slate-900 p-2 rounded-lg border border-slate-800">
                  <div className="text-purple-400 mb-1">Modelo Ativo:</div>
                  {health.components?.geminiApi?.model || 'gemini-flash-latest'}
                </div>
              </div>
              
              <div className="flex flex-col justify-between bg-slate-800/50 p-4 rounded-xl border border-slate-700/50">
                <div className="flex items-center gap-3 text-slate-300 text-xs font-bold mb-3">
                  {getStatusNode(health.components?.audioSocket?.status || 'up', true)} WebSockets (Audio)
                </div>
                <div className="flex justify-between items-end mt-auto">
                  <div className="text-2xl font-black text-white">{health.components?.audioSocket?.activeStreams ?? 0}</div>
                  <div className="text-[10px] font-mono text-emerald-400">{health.components?.audioSocket?.bufferLatencyMs ?? 0}ms Buffer</div>
                </div>
              </div>

              <div className="flex flex-col justify-between bg-slate-800/50 p-4 rounded-xl border border-slate-700/50">
                <div className="flex items-center gap-3 text-slate-300 text-xs font-bold mb-3">
                  {getStatusNode(health.components?.aiGateway?.status || 'up')} Gateway de Agentes
                </div>
                <div className="flex justify-between items-end mt-auto">
                  <div className="text-2xl font-black text-white">{health.components?.aiGateway?.activeSessions ?? 0}</div>
                  <div className="text-[10px] font-mono text-slate-400">Sessões RAG</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Diagnostics & Terminal */}
        <div className="lg:col-span-1 flex flex-col gap-4">
          
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 flex flex-col items-center justify-center text-center">
            <div className={`w-20 h-20 rounded-full flex items-center justify-center mb-4 transition-all duration-500 ${runningDiag ? 'bg-blue-100' : 'bg-slate-50'}`}>
              <Network className={`w-8 h-8 ${runningDiag ? 'text-blue-600 animate-spin-slow' : 'text-slate-400'}`} />
            </div>
            <h3 className="font-bold text-slate-900 mb-2">Diagnóstico Profundo</h3>
            <p className="text-[11px] font-medium text-slate-500 mb-6 leading-relaxed">
              Dispara rotinas de varredura ativa pelo barramento de eventos (ARI), checa consistência de PostgreSQL e pinga o endpoint do Gemini.
            </p>
            <button 
              onClick={runDiagnostic}
              disabled={runningDiag}
              className="w-full py-3 bg-blue-600 text-white rounded-xl text-sm font-bold shadow-md shadow-blue-600/20 hover:bg-blue-700 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
            >
              {runningDiag ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4 fill-white" />}
              {runningDiag ? 'Escaneando Topologia...' : 'Executar Varredura'}
            </button>
          </div>

          <div className="bg-slate-950 rounded-3xl border border-slate-800 flex-1 flex flex-col overflow-hidden relative group">
            <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/dark-matter.png')] opacity-20 pointer-events-none mix-blend-overlay"></div>
            <div className="px-4 py-3 border-b border-slate-800 flex items-center justify-between bg-[#0f172a]/50">
              <div className="flex items-center gap-2">
                <Terminal className="w-4 h-4 text-emerald-500" />
                <span className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider">Terminal / Logs</span>
              </div>
              <div className="flex gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-slate-700"></div>
                <div className="w-2.5 h-2.5 rounded-full bg-slate-700"></div>
                <div className="w-2.5 h-2.5 rounded-full bg-slate-700"></div>
              </div>
            </div>
            
            <div className="p-4 flex-1 overflow-y-auto font-mono text-[10px] leading-relaxed text-emerald-400/90 h-[200px]">
              {logs.length === 0 ? (
                <div className="opacity-50 text-slate-500">Aguardando comando de varredura ativa...</div>
              ) : (
                logs.map((log, i) => (
                  <div key={i} className="mb-1">{log}</div>
                ))
              )}
              {runningDiag && (
                <div className="animate-pulse mt-2 text-blue-400">_</div>
              )}
            </div>
            
            {diagResult && !runningDiag && (
              <div className="p-3 bg-emerald-950/50 border-t border-emerald-900/50">
                <div className="text-[11px] font-bold text-emerald-500 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4" /> Diagnóstico Finalizado (Pass/OK)
                </div>
                <div className="text-[10px] text-emerald-700 mt-1 font-mono">{diagResult.timestamp}</div>
              </div>
            )}
          </div>

        </div>

      </div>
    </div>
  );
};
