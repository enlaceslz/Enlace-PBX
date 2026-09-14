import React, { useState, useEffect, useRef } from 'react';
import { AsteriskChannel, DashboardMetrics } from '../../types/pbx';
import { 
  Activity, PhoneCall, Ear, Mic, Users2, 
  PhoneMissed, PhoneForwarded, Phone, Bot, CheckCircle2, AlertTriangle, Users, HeadphonesIcon, TrendingUp, Clock, BarChart3, SignalHigh, 
  Maximize, Minimize, LayoutGrid, List 
} from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface OperationDashboardViewProps {
  channels: AsteriskChannel[];
  metrics: DashboardMetrics | null;
  onOpenWebphone?: () => void;
}

// Mock Agents for Wallboard Grid
const MOCK_AGENTS = [
  { id: '1001', name: 'Ana Souza', status: 'incall', time: '04:12', queue: 'Suporte N1', avatar: 'AS' },
  { id: '1002', name: 'Carlos Lima', status: 'available', time: '12:45', queue: 'Suporte N1', avatar: 'CL' },
  { id: '1003', name: 'Bruno Costa', status: 'paused', time: '15:00', queue: 'Vendas', avatar: 'BC', pauseReason: 'Almoço' },
  { id: '1004', name: 'Daniela Paz', status: 'incall', time: '01:05', queue: 'Vendas', avatar: 'DP' },
  { id: '1005', name: 'Eduardo Silva', status: 'available', time: '02:30', queue: 'Faturamento', avatar: 'ES' },
  { id: '1006', name: 'Fernanda Rosa', status: 'offline', time: '00:00', queue: 'Ouvidoria', avatar: 'FR' },
  { id: '1007', name: 'Gabriel Torres', status: 'ringing', time: '00:12', queue: 'Suporte N1', avatar: 'GT' },
  { id: '1008', name: 'MaIA (Bot)', status: 'incall', time: '10:42', queue: 'Triagem IA', avatar: 'IA', isBot: true },
];

export const OperationDashboardView: React.FC<OperationDashboardViewProps> = ({ channels, metrics, onOpenWebphone }) => {
  const [time, setTime] = useState(new Date());
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [viewMode, setViewMode] = useState<'classic' | 'agents'>('classic');
  const dashboardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      dashboardRef.current?.requestFullscreen().catch(err => console.error(err));
    } else {
      document.exitFullscreen();
    }
  };

  if (!metrics) {
    return <div className="p-8 text-center text-slate-500">Aguardando telemetria do PBX...</div>;
  }

  const slaPercent = Math.round((metrics.callsAnswered / Math.max(metrics.callsToday, 1)) * 100);
  const slaColor = slaPercent >= 85 ? 'text-emerald-400' : slaPercent >= 70 ? 'text-amber-400' : 'text-rose-400';

  const activeQueues = [
    { name: 'Suporte Técnico N1', waiting: 3, agentsOnline: 5, sla: 92, longestWait: '01:42' },
    { name: 'Vendas & Retenção', waiting: 0, agentsOnline: 4, sla: 98, longestWait: '00:00' },
    { name: 'Faturamento', waiting: 1, agentsOnline: 2, sla: 76, longestWait: '04:15' },
    { name: 'Ouvidoria', waiting: 0, agentsOnline: 1, sla: 100, longestWait: '00:00' },
  ];

  const renderAgentGrid = () => (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 mt-4">
      {MOCK_AGENTS.map((agent) => {
        let bgClass = 'bg-slate-900 border-slate-800';
        let statusColor = 'text-slate-500';
        let statusText = 'Offline';
        let pulse = false;

        if (agent.status === 'available') {
          bgClass = 'bg-emerald-950/20 border-emerald-900/50 hover:border-emerald-700/50';
          statusColor = 'text-emerald-500';
          statusText = 'Disponível';
        } else if (agent.status === 'incall') {
          bgClass = 'bg-blue-950/20 border-blue-900/50 hover:border-blue-700/50';
          statusColor = 'text-blue-500';
          statusText = 'Em Chamada';
        } else if (agent.status === 'ringing') {
          bgClass = 'bg-amber-950/20 border-amber-900/50 hover:border-amber-700/50';
          statusColor = 'text-amber-500';
          statusText = 'Chamando...';
          pulse = true;
        } else if (agent.status === 'paused') {
          bgClass = 'bg-rose-950/20 border-rose-900/50 hover:border-rose-700/50';
          statusColor = 'text-rose-500';
          statusText = `Pausa: ${agent.pauseReason}`;
        }

        return (
          <div key={agent.id} className={`border rounded-xl p-4 flex flex-col transition-all ${bgClass} ${pulse ? 'animate-pulse' : ''}`}>
            <div className="flex justify-between items-start mb-3">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm ${agent.isBot ? 'bg-purple-900/50 text-purple-400' : 'bg-slate-800 text-slate-300'}`}>
                {agent.isBot ? <Bot className="w-5 h-5" /> : agent.avatar}
              </div>
              <div className="text-right">
                <div className={`text-[10px] font-bold uppercase tracking-wider ${statusColor}`}>{statusText}</div>
                <div className="text-sm font-mono text-slate-300 font-bold">{agent.time}</div>
              </div>
            </div>
            <div className="mt-auto pt-4">
              <div className="font-bold text-white text-sm truncate">{agent.name}</div>
              <div className="text-[10px] text-slate-500 truncate flex items-center gap-1 mt-0.5">
                <HeadphonesIcon className="w-3 h-3" /> {agent.queue}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );

  return (
    <div ref={dashboardRef} className={`bg-slate-950 rounded-2xl p-4 sm:p-6 text-slate-300 font-sans border border-slate-800 flex flex-col ${isFullscreen ? "fixed inset-0 z-50 rounded-none h-screen w-screen overflow-y-auto" : "min-h-full shadow-2xl"}`}>
      
      {/* Wallboard Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 gap-4 border-b border-slate-800 pb-4 shrink-0">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-white flex items-center gap-3">
            <SignalHigh className="w-8 h-8 text-blue-500" />
            NOC Wallboard
          </h1>
          <p className="text-sm text-slate-400 mt-1 uppercase tracking-widest font-semibold">Contact Center & AI Gateway</p>
        </div>
        <div className="flex flex-col sm:flex-row items-end sm:items-center gap-4">
          <div className="text-right">
            <div className="text-2xl font-black font-mono text-white tracking-wider">{time.toLocaleTimeString('pt-BR')}</div>
            <div className="text-xs text-slate-500 uppercase tracking-widest">{time.toLocaleDateString('pt-BR')}</div>
          </div>
          
          <div className="flex items-center bg-slate-900 rounded-lg p-1 border border-slate-800 ml-0 sm:ml-4">
            <button 
              onClick={() => setViewMode('classic')}
              className={`p-2 rounded-md transition ${viewMode === 'classic' ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-500 hover:text-slate-300'}`}
              title="Visão Clássica (Filas e Canais)"
            >
              <List className="w-4 h-4" />
            </button>
            <button 
              onClick={() => setViewMode('agents')}
              className={`p-2 rounded-md transition ${viewMode === 'agents' ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-500 hover:text-slate-300'}`}
              title="Grid de Agentes (Painel TV)"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <div className="w-px h-4 bg-slate-700 mx-1"></div>
            <button 
              onClick={toggleFullscreen}
              className="p-2 rounded-md transition text-slate-500 hover:text-white hover:bg-slate-800"
              title={isFullscreen ? "Sair da Tela Cheia" : "Tela Cheia (NOC TV)"}
            >
              {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </div>

      {/* Top Metrics Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-8 gap-4 mb-6 shrink-0">
        
        {/* SLA */}
        <div className="col-span-2 bg-slate-900 border border-slate-800 rounded-xl p-5 relative overflow-hidden flex flex-col justify-between">
          <div className="relative z-10">
            <span className="text-sm font-bold text-slate-400 uppercase tracking-wider">Service Level (SLA)</span>
            <div className="mt-2 flex items-end gap-2">
              <span className={`text-5xl font-black ${slaColor}`}>{slaPercent}%</span>
              <span className="text-sm text-slate-500 mb-1">meta: 85%</span>
            </div>
          </div>
          {slaPercent < 85 && (
            <div className="absolute top-4 right-4 animate-pulse">
              <AlertTriangle className="w-6 h-6 text-rose-500" />
            </div>
          )}
          <div className={`absolute -bottom-10 -right-10 w-32 h-32 rounded-full opacity-10 blur-2xl ${slaPercent >= 85 ? 'bg-emerald-500' : 'bg-rose-500'}`} />
        </div>

        {/* AI Containment */}
        <div className="col-span-2 bg-slate-900 border border-slate-800 rounded-xl p-5 relative overflow-hidden flex flex-col justify-between">
          <div className="relative z-10">
            <span className="text-sm font-bold text-slate-400 uppercase tracking-wider">Retenção IA (MaIA)</span>
            <div className="mt-2 flex items-end gap-2">
              <span className="text-5xl font-black text-purple-400">42%</span>
              <span className="text-sm text-slate-500 mb-1">resolvidos sem humano</span>
            </div>
          </div>
          <div className="absolute top-4 right-4">
            <Bot className="w-6 h-6 text-purple-500 opacity-50" />
          </div>
          <div className="absolute -bottom-10 -right-10 w-32 h-32 rounded-full bg-purple-500 opacity-10 blur-2xl" />
        </div>

        {/* Mini Stats */}
        <div className="col-span-4 grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
            <div className="text-xs text-slate-500 font-bold uppercase mb-1">Chamadas Hoje</div>
            <div className="text-2xl font-black text-slate-300">{metrics.callsToday}</div>
          </div>
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
            <div className="text-xs text-slate-500 font-bold uppercase mb-1">Atendidas</div>
            <div className="text-2xl font-black text-emerald-400">{metrics.callsAnswered}</div>
          </div>
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
            <div className="text-xs text-slate-500 font-bold uppercase mb-1">Abandonadas</div>
            <div className="text-2xl font-black text-rose-400">{metrics.callsMissed}</div>
          </div>
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
            <div className="text-xs text-slate-500 font-bold uppercase mb-1">TMO Médio</div>
            <div className="text-2xl font-black text-slate-300">
              {Math.floor(metrics.averageTalkTime / 60)}:{(metrics.averageTalkTime % 60).toString().padStart(2, '0')}
            </div>
          </div>
        </div>
      </div>

      {viewMode === 'agents' ? (
        // AGENTS GRID VIEW (Painel TV)
        <div className="flex-1 flex flex-col min-h-0">
          <div className="px-5 py-4 border-b border-slate-800 bg-[#0f172a]/50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 rounded-t-xl shrink-0">
            <h3 className="font-bold text-white flex items-center gap-2">
              <Users className="w-5 h-5 text-slate-400" /> Grid de Operadores em Tempo Real
            </h3>
            <div className="flex flex-wrap gap-4 text-xs font-bold text-slate-400">
              <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-emerald-500"></div> 2 Disponíveis</span>
              <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-blue-500"></div> 3 Em Chamada</span>
              <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-amber-500"></div> 1 Chamando</span>
              <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-rose-500"></div> 1 Em Pausa</span>
            </div>
          </div>
          <div className="bg-[#0f172a]/30 p-4 rounded-b-xl overflow-y-auto flex-1 border border-t-0 border-slate-800">
            {renderAgentGrid()}
          </div>
        </div>
      ) : (
        // CLASSIC VIEW
        <>
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 mb-6">
            <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-xl p-5 flex flex-col">
              <div className="flex justify-between items-center mb-6">
                <h3 className="font-bold text-white flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-slate-400" /> Distribuição Horária
                </h3>
                <div className="flex gap-4 text-xs font-semibold">
                  <span className="flex items-center gap-1"><div className="w-3 h-3 bg-blue-500 rounded-sm"></div> Total</span>
                  <span className="flex items-center gap-1"><div className="w-3 h-3 bg-purple-500 rounded-sm"></div> Atendidas pela IA</span>
                </div>
              </div>
              <div className="flex-1 min-h-[200px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={metrics.hourlyCallDistribution}>
                    <defs>
                      <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="colorAi" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#a855f7" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#a855f7" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                    <XAxis dataKey="hour" stroke="#475569" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis stroke="#475569" fontSize={12} tickLine={false} axisLine={false} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', color: '#f8fafc', borderRadius: '8px' }}
                      itemStyle={{ fontSize: '14px', fontWeight: 'bold' }}
                    />
                    <Area type="monotone" dataKey="total" stroke="#3b82f6" strokeWidth={2} fillOpacity={1} fill="url(#colorTotal)" name="Volume Total" />
                    <Area type="monotone" dataKey="ai" stroke="#a855f7" strokeWidth={2} fillOpacity={1} fill="url(#colorAi)" name="Retenção IA" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Active Queues Panel */}
            <div className="xl:col-span-1 bg-slate-900 border border-slate-800 rounded-xl overflow-hidden flex flex-col">
              <div className="px-5 py-4 border-b border-slate-800 bg-[#0f172a]/50 flex justify-between items-center">
                <h3 className="font-bold text-white flex items-center gap-2">
                  <Users className="w-5 h-5 text-slate-400" /> Filas de Atendimento
                </h3>
              </div>
              <div className="divide-y divide-slate-800 overflow-y-auto flex-1">
                {activeQueues.map((q, idx) => (
                  <div key={idx} className={`p-4 flex items-center justify-between hover:bg-slate-800/50 transition ${q.waiting > 0 ? 'bg-amber-950/10' : ''}`}>
                    <div>
                      <div className="font-bold text-white mb-1 flex items-center gap-2">
                        {q.name}
                        {q.waiting > 0 && <span className="flex h-2 w-2 relative">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
                        </span>}
                      </div>
                      <div className="flex gap-3 text-xs">
                        <span className="text-slate-400 flex items-center gap-1"><HeadphonesIcon className="w-3 h-3" /> {q.agentsOnline} online</span>
                        <span className="text-slate-400 flex items-center gap-1"><Clock className="w-3 h-3" /> Máx: {q.longestWait}</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className={`text-3xl font-black tracking-tighter ${q.waiting > 0 ? 'text-amber-400' : 'text-slate-600'}`}>
                        {q.waiting}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Live Channels Table */}
          <div className="flex-1 bg-slate-900 border border-slate-800 rounded-xl overflow-hidden flex flex-col min-h-[300px]">
            <div className="px-5 py-4 border-b border-slate-800 bg-[#0f172a]/50 flex justify-between items-center shrink-0">
              <h3 className="font-bold text-white flex items-center gap-2">
                <Activity className="w-5 h-5 text-emerald-400 animate-pulse" /> Asterisk Live Channels
              </h3>
              <span className="px-2.5 py-1 bg-emerald-500/10 text-emerald-400 text-xs font-bold rounded-lg border border-emerald-500/20">
                {channels.length} Ativos
              </span>
            </div>
            <div className="overflow-x-auto overflow-y-auto flex-1">
              <table className="w-full text-left border-collapse">
                <thead className="sticky top-0 bg-[#0f172a] shadow-md z-10">
                  <tr className="border-b border-slate-800 text-xs text-slate-400 font-bold uppercase tracking-wider">
                    <th className="px-5 py-3">Canal</th>
                    <th className="px-5 py-3">Status</th>
                    <th className="px-5 py-3">Origem</th>
                    <th className="px-5 py-3">Destino / App</th>
                    <th className="px-5 py-3">Duração</th>
                    <th className="px-5 py-3 text-right">Intervenção NOC</th>
                  </tr>
                </thead>
                <tbody className="text-sm divide-y divide-slate-800/50">
                  {channels.map((chan) => (
                    <tr key={chan.id} className="hover:bg-slate-800/50 transition">
                      <td className="px-5 py-3 font-mono text-xs text-slate-300">{chan.name.split('-')[0]}</td>
                      <td className="px-5 py-3">
                        <span className={`px-2 py-0.5 text-[10px] font-bold rounded border uppercase tracking-wide ${
                          chan.state === 'Up' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                          chan.state === 'Ringing' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' :
                          'bg-slate-500/10 text-slate-400 border-slate-500/20'
                        }`}>
                          {chan.state}
                        </span>
                      </td>
                      <td className="px-5 py-3 font-mono text-xs text-white">{chan.callerNumber}</td>
                      <td className="px-5 py-3 text-slate-300">
                        <div className="font-bold text-white">{chan.connectedLine || '-'}</div>
                        <div className="text-[10px] font-mono text-slate-500">{chan.application}</div>
                      </td>
                      <td className="px-5 py-3 font-mono text-xs text-slate-300">
                        {Math.floor(chan.durationSeconds / 60)}:{(chan.durationSeconds % 60).toString().padStart(2, '0')}
                      </td>
                      <td className="px-5 py-3 text-right">
                        {chan.state === 'Up' && (
                          <div className="flex items-center justify-end gap-1">
                            <button onClick={() => onOpenWebphone?.()} title="Spy (Escuta silenciosa)" className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white rounded-md border border-slate-700 transition">
                              <Ear className="w-3.5 h-3.5" />
                            </button>
                            <button onClick={() => onOpenWebphone?.()} title="Whisper (Sussurrar)" className="p-1.5 bg-slate-800 hover:bg-sky-900/50 text-slate-400 hover:text-sky-400 rounded-md border border-slate-700 hover:border-sky-700 transition">
                              <Mic className="w-3.5 h-3.5" />
                            </button>
                            <button onClick={() => onOpenWebphone?.()} title="Barge (Intervenção a 3)" className="p-1.5 bg-slate-800 hover:bg-rose-900/50 text-slate-400 hover:text-rose-400 rounded-md border border-slate-700 hover:border-rose-700 transition">
                              <Users2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                  {channels.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-5 py-12 text-center text-slate-500">
                        <div className="flex flex-col items-center gap-2">
                          <Phone className="w-8 h-8 opacity-20" />
                          <span>Nenhuma chamada cruzando o core no momento.</span>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
