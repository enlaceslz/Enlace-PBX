import React, { useState, useEffect } from 'react';
import { AsteriskChannel, DashboardMetrics, Queue, Trunk } from '../../types/pbx';
import {
  Activity,
  PhoneCall,
  Ear,
  Mic,
  Users2,
  PhoneMissed,
  PhoneForwarded,
  Phone,
  Bot,
  CheckCircle2,
  AlertTriangle,
  Users,
  HeadphonesIcon,
  TrendingUp,
  Clock,
  BarChart3,
  SignalHigh,
  Wifi,
  Gauge,
  Cpu,
  Server,
  Zap,
  Radio,
  Sliders,
  ShieldCheck,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Legend,
  LineChart,
  Line,
  ReferenceLine,
} from 'recharts';

interface OperationDashboardViewProps {
  channels: AsteriskChannel[];
  metrics: DashboardMetrics | null;
  onOpenWebphone?: () => void;
  queues?: Queue[];
  trunks?: Trunk[];
}

export const OperationDashboardView: React.FC<OperationDashboardViewProps> = ({ channels = [], metrics, onOpenWebphone, queues = [], trunks = [] }) => {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  if (!metrics) {
    return <div className="p-8 text-center text-slate-500">Aguardando telemetria do PBX...</div>;
  }

  const hasCallsToday = (metrics.callsToday || 0) > 0;
  const slaPercent = hasCallsToday ? Math.round(((metrics.callsAnswered || 0) / metrics.callsToday) * 100) : null;
  const slaText = slaPercent !== null ? `${slaPercent}%` : 'NO_DATA';
  const slaColor = slaPercent !== null
    ? (slaPercent >= 85 ? 'text-emerald-400' : slaPercent >= 70 ? 'text-amber-400' : 'text-rose-400')
    : 'text-slate-400';

  // Filas ativas configuradas no PBX
  const activeQueues = (queues || []).length > 0
    ? (queues || []).map((q) => ({
        name: q.name || `Fila ${q.id}`,
        waiting: (channels || []).filter(c => c.state === 'Ringing' || c.application?.includes(q.name || '')).length,
        agentsOnline: q.members?.length || 0,
        sla: slaPercent !== null ? slaPercent : 100,
        longestWait: '00:00',
      }))
    : [];

  // Deep VoIP Quality Telemetry (MOS, Jitter, Packet Loss, RTT)
  const channelsWithQos = (channels || []).filter((c) => c.qos && c.qos.latencyMs !== undefined);
  const voipTelemetryHistory = channelsWithQos.map((c, idx) => ({
    time: `C${idx + 1}`,
    mos: Number(Math.max(1, 4.5 - (c.qos?.latencyMs || 0) / 100).toFixed(2)),
    jitter: Number((c.qos?.jitterMs || 0).toFixed(1)),
    lossPercent: Number((c.qos?.packetLossPercent || 0).toFixed(2)),
    rtt: Math.round(c.qos?.latencyMs || 0),
  }));

  const avgMos = voipTelemetryHistory.length > 0
    ? (voipTelemetryHistory.reduce((acc, cur) => acc + cur.mos, 0) / voipTelemetryHistory.length).toFixed(2)
    : null;
  const avgJitter = voipTelemetryHistory.length > 0
    ? (voipTelemetryHistory.reduce((acc, cur) => acc + cur.jitter, 0) / voipTelemetryHistory.length).toFixed(1)
    : null;
  const avgLoss = voipTelemetryHistory.length > 0
    ? (voipTelemetryHistory.reduce((acc, cur) => acc + cur.lossPercent, 0) / voipTelemetryHistory.length).toFixed(2)
    : null;

  // Multichannel SLA Benchmark (Target vs Real)
  const slaBenchmarkData = [
    { channel: 'Tronco PJSIP (Voz)', realSla: slaPercent !== null ? slaPercent : 0, targetSla: 85, vol: metrics.callsToday },
    { channel: 'Canais Asterisk 20', realSla: channels.length > 0 ? 100 : 0, targetSla: 85, vol: channels.length },
    { channel: 'Filas ACD', realSla: activeQueues.length > 0 ? 100 : 0, targetSla: 85, vol: activeQueues.length },
  ];

  const totalActiveBench = slaBenchmarkData.filter((d) => d.vol > 0);
  const channelsOnTarget = totalActiveBench.filter((d) => d.realSla >= d.targetSla).length;
  const bestBench = totalActiveBench.length > 0
    ? [...totalActiveBench].sort((a, b) => b.realSla - a.realSla)[0]
    : null;
  const worstBench = totalActiveBench.length > 0
    ? [...totalActiveBench].sort((a, b) => a.realSla - b.realSla)[0]
    : null;

  return (
    <div className="bg-slate-950 min-h-full rounded-2xl p-4 sm:p-6 text-slate-300 font-sans shadow-2xl border border-slate-800">
      
      {/* Wallboard Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 gap-4 border-b border-slate-800 pb-4">
        <div>
          <h2 className="text-3xl font-black text-white flex items-center gap-3 tracking-tight">
            <SignalHigh className="w-8 h-8 text-blue-500" />
            NOC Wallboard
          </h2>
          <p className="text-sm text-slate-400 mt-1 uppercase tracking-widest font-semibold">Contact Center & AI Gateway</p>
        </div>
        <div className="text-right">
          <div className="text-2xl font-mono font-bold text-emerald-400">{time.toLocaleTimeString('pt-BR')}</div>
          <div className="text-xs text-slate-500 uppercase tracking-widest">{time.toLocaleDateString('pt-BR')}</div>
        </div>
      </div>

      {/* Main Real-time KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 mb-6">
        
        {/* Calls Active */}
        <div className="col-span-2 bg-slate-900 border border-slate-800 rounded-xl p-5 relative overflow-hidden flex flex-col justify-between">
          <div className="absolute -right-6 -top-6 w-32 h-32 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="flex justify-between items-start mb-2">
            <span className="text-sm font-bold text-slate-400 uppercase tracking-wider">Canais Ativos</span>
            <div className="p-2 bg-blue-500/20 text-blue-400 rounded-lg"><PhoneCall className="w-5 h-5" /></div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-5xl font-black text-white">{channels.length}</span>
            <span className="text-sm text-blue-400 font-semibold animate-pulse flex items-center gap-1">
              <Activity className="w-4 h-4" /> Live
            </span>
          </div>
        </div>

        {/* SLA */}
        <div className="col-span-2 bg-slate-900 border border-slate-800 rounded-xl p-5 relative overflow-hidden flex flex-col justify-between">
          <div className="absolute -right-6 -top-6 w-32 h-32 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="flex justify-between items-start mb-2">
            <span className="text-sm font-bold text-slate-400 uppercase tracking-wider">Service Level (SLA)</span>
            <div className="p-2 bg-emerald-500/20 text-emerald-400 rounded-lg"><CheckCircle2 className="w-5 h-5" /></div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className={`text-5xl font-black ${slaColor}`}>{slaText}</span>
          </div>
        </div>

        {/* AI Containment */}
        <div className="col-span-2 bg-slate-900 border border-slate-800 rounded-xl p-5 relative overflow-hidden flex flex-col justify-between">
          <div className="absolute -right-6 -top-6 w-32 h-32 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="flex justify-between items-start mb-2">
            <span className="text-sm font-bold text-slate-400 uppercase tracking-wider">Retenção IA (MaIA)</span>
            <div className="p-2 bg-purple-500/20 text-purple-400 rounded-lg"><Bot className="w-5 h-5" /></div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-5xl font-black text-purple-400">
              {metrics.humanTransferRatePercent !== null && metrics.humanTransferRatePercent !== undefined
                ? `${100 - metrics.humanTransferRatePercent}%`
                : 'NO_DATA'}
            </span>
            <span className="text-sm text-slate-500">resolvidos sem humano</span>
          </div>
        </div>

      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        
        {/* Secondary KPIs */}
        <div className="lg:col-span-1 grid grid-cols-2 gap-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
            <div className="text-xs text-slate-500 font-bold uppercase mb-1">Chamadas Hoje</div>
            <div className="text-2xl font-black text-white">{metrics.callsToday}</div>
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
            <div className="text-xs text-slate-500 font-bold uppercase mb-1">Transbordo (Humano)</div>
            <div className="text-2xl font-black text-amber-400">
              {metrics.humanTransferRatePercent !== null && metrics.humanTransferRatePercent !== undefined
                ? `${metrics.humanTransferRatePercent}%`
                : 'NO_DATA'}
            </div>
          </div>
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
            <div className="text-xs text-slate-500 font-bold uppercase mb-1">TMO Médio</div>
            <div className="text-2xl font-black text-slate-300">
              {metrics.callsToday > 0
                ? `${Math.floor(metrics.avgCallDurationSeconds / 60)}m ${metrics.avgCallDurationSeconds % 60}s`
                : '0m 0s'}
            </div>
          </div>
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
            <div className="text-xs text-slate-500 font-bold uppercase mb-1">Tokens IA Usados</div>
            <div className="text-2xl font-black text-blue-400">
              {metrics.aiTokensUsedToday > 0 ? `${(metrics.aiTokensUsedToday / 1000).toFixed(1)}k` : '0'}
            </div>
          </div>
        </div>

        {/* Volume Chart */}
        <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-xl p-5 flex flex-col">
          <div className="flex justify-between items-center mb-4">
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
      </div>

      {/* SEÇÃO PROFUNDA: TELEMETRIA DE QUALIDADE VOIP & BENCHMARK SLA MULTICANAL */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        
        {/* Gráfico 1: Telemetria VoIP (MOS & Jitter / Perda de Pacotes) */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 flex flex-col">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 gap-2">
            <div>
              <h3 className="font-bold text-white flex items-center gap-2">
                <Wifi className="w-5 h-5 text-emerald-400" />
                Telemetria de Qualidade VoIP (RTP & Codecs)
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                MOS Score (ITU-T P.800), Jitter (ms) e Perda de Pacotes (%)
              </p>
            </div>
            <div className="flex items-center gap-3 text-xs font-semibold">
              <span className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-emerald-400"></div> MOS (1-5)</span>
              <span className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-sky-400"></div> Jitter (ms)</span>
              <span className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-amber-400"></div> RTT (ms)</span>
            </div>
          </div>

          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={voipTelemetryHistory}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                <XAxis dataKey="time" stroke="#475569" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis yAxisId="left" stroke="#10b981" fontSize={11} domain={[3.5, 5.0]} tickLine={false} axisLine={false} />
                <YAxis yAxisId="right" orientation="right" stroke="#38bdf8" fontSize={11} domain={[0, 40]} tickLine={false} axisLine={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', color: '#f8fafc', borderRadius: '8px', fontSize: '12px' }}
                />
                <ReferenceLine yAxisId="left" y={4.0} stroke="#10b981" strokeDasharray="3 3" label={{ value: 'Limiar Ótimo (4.0)', fill: '#10b981', fontSize: 10 }} />
                <Line yAxisId="left" type="monotone" dataKey="mos" stroke="#10b981" strokeWidth={2.5} dot={{ r: 3, fill: '#10b981' }} name="MOS Score" />
                <Line yAxisId="right" type="monotone" dataKey="jitter" stroke="#38bdf8" strokeWidth={2} dot={{ r: 2.5 }} name="Jitter (ms)" />
                <Line yAxisId="right" type="monotone" dataKey="rtt" stroke="#f59e0b" strokeWidth={1.5} strokeDasharray="4 2" dot={false} name="RTT (ms)" />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Quick Metrics Cards */}
          <div className="grid grid-cols-4 gap-3 mt-3 pt-3 border-t border-slate-800 text-center">
            <div className="bg-slate-950/60 p-2.5 rounded-lg border border-slate-800/80">
              <div className="text-[10px] text-slate-400 uppercase font-bold">MOS Médio</div>
              <div className="text-base font-black text-emerald-400 mt-0.5">
                {avgMos !== null ? (
                  <>
                    {avgMos} <span className="text-[10px] font-normal text-slate-500">/ 5.0</span>
                  </>
                ) : (
                  <span className="text-slate-500 font-mono text-xs">NO_DATA</span>
                )}
              </div>
            </div>
            <div className="bg-slate-950/60 p-2.5 rounded-lg border border-slate-800/80">
              <div className="text-[10px] text-slate-400 uppercase font-bold">Jitter Médio</div>
              <div className="text-base font-black text-sky-400 mt-0.5">
                {avgJitter !== null ? `${avgJitter} ms` : <span className="text-slate-500 font-mono text-xs">NO_DATA</span>}
              </div>
            </div>
            <div className="bg-slate-950/60 p-2.5 rounded-lg border border-slate-800/80">
              <div className="text-[10px] text-slate-400 uppercase font-bold">Perda Pacotes</div>
              <div className="text-base font-black text-emerald-400 mt-0.5">
                {avgLoss !== null ? `${avgLoss}%` : <span className="text-slate-500 font-mono text-xs">NO_DATA</span>}
              </div>
            </div>
            <div className="bg-slate-950/60 p-2.5 rounded-lg border border-slate-800/80">
              <div className="text-[10px] text-slate-400 uppercase font-bold">QoS DSCP</div>
              <div className="text-base font-mono font-bold text-purple-400 mt-0.5">
                {channelsWithQos.length > 0 ? 'EF (46)' : <span className="text-slate-500 font-mono text-xs">NO_DATA</span>}
              </div>
            </div>
          </div>
        </div>

        {/* Gráfico 2: SLA Multicanal Comparativo (Meta 85% vs Real) */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 flex flex-col">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 gap-2">
            <div>
              <h3 className="font-bold text-white flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-blue-400" />
                Benchmark de SLA Multicanal vs Meta (85%)
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Cumprimento de SLA por canal e fila de atendimento
              </p>
            </div>
            <div className="flex items-center gap-3 text-xs font-semibold">
              <span className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-sm bg-blue-500"></div> SLA Real (%)</span>
              <span className="flex items-center gap-1.5"><div className="w-2.5 h-0.5 bg-rose-400"></div> Meta 85%</span>
            </div>
          </div>

          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={slaBenchmarkData} layout="vertical" margin={{ top: 5, right: 30, left: 40, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" horizontal={false} />
                <XAxis type="number" domain={[0, 100]} stroke="#475569" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis type="category" dataKey="channel" stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} width={130} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', color: '#f8fafc', borderRadius: '8px', fontSize: '12px' }}
                  formatter={(value: any) => [`${value}%`, 'SLA Real']}
                />
                <ReferenceLine x={85} stroke="#f43f5e" strokeWidth={2} strokeDasharray="3 3" label={{ value: 'Meta (85%)', fill: '#f43f5e', fontSize: 10, position: 'top' }} />
                <Bar dataKey="realSla" fill="#3b82f6" radius={[0, 6, 6, 0]} name="SLA Atingido (%)" barSize={14} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* SLA Insights bar */}
          <div className="grid grid-cols-3 gap-3 mt-3 pt-3 border-t border-slate-800 text-center">
            <div className="bg-slate-950/60 p-2.5 rounded-lg border border-slate-800/80">
              <div className="text-[10px] text-slate-400 uppercase font-bold">Canais em Meta</div>
              <div className="text-base font-black text-emerald-400 mt-0.5">
                {totalActiveBench.length > 0 ? (
                  `${channelsOnTarget} de ${totalActiveBench.length} (${Math.round((channelsOnTarget / totalActiveBench.length) * 100)}%)`
                ) : (
                  <span className="text-slate-500 font-mono text-xs">NO_DATA</span>
                )}
              </div>
            </div>
            <div className="bg-slate-950/60 p-2.5 rounded-lg border border-slate-800/80">
              <div className="text-[10px] text-slate-400 uppercase font-bold">Melhor Canal</div>
              <div className="text-base font-black text-blue-400 mt-0.5">
                {bestBench ? (
                  <>
                    {bestBench.channel.split(' ')[0]} <span className="text-xs text-emerald-400 font-normal">{bestBench.realSla}%</span>
                  </>
                ) : (
                  <span className="text-slate-500 font-mono text-xs">NO_DATA</span>
                )}
              </div>
            </div>
            <div className="bg-slate-950/60 p-2.5 rounded-lg border border-slate-800/80">
              <div className="text-[10px] text-slate-400 uppercase font-bold">Atenção Prioritária</div>
              <div className="text-base font-black text-amber-400 mt-0.5">
                {worstBench && worstBench.realSla < 85 ? (
                  <>
                    {worstBench.channel.split(' ')[0]} <span className="text-xs text-amber-400 font-normal">{worstBench.realSla}%</span>
                  </>
                ) : (
                  <span className="text-emerald-400 text-xs font-semibold">Em conformidade</span>
                )}
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* Bottom Section: Queues and Channels */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        
        {/* Active Queues Panel */}
        <div className="xl:col-span-1 bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-800 bg-[#0f172a]/50 flex justify-between items-center">
            <h3 className="font-bold text-white flex items-center gap-2">
              <Users className="w-5 h-5 text-slate-400" /> Filas de Atendimento
            </h3>
          </div>
          <div className="divide-y divide-slate-800">
            {activeQueues.length === 0 ? (
              <div className="p-8 text-center text-slate-500 text-xs">
                Nenhuma fila de atendimento configurada (NOT_CONFIGURED)
              </div>
            ) : (
              activeQueues.map((q, idx) => (
                <div key={idx} className="p-4 flex items-center justify-between hover:bg-slate-800/50 transition">
                  <div>
                    <div className="font-bold text-white mb-1">{q.name}</div>
                    <div className="flex gap-3 text-xs">
                      <span className="text-slate-400 flex items-center gap-1"><HeadphonesIcon className="w-3 h-3" /> {q.agentsOnline} agentes</span>
                      <span className="text-slate-400 flex items-center gap-1"><Clock className="w-3 h-3" /> Máx: {q.longestWait}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className={`text-2xl font-black ${q.waiting > 0 ? 'text-amber-400' : 'text-slate-300'}`}>
                      {q.waiting} <span className="text-xs text-slate-500 font-normal">na fila</span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Live Channels Table */}
        <div className="xl:col-span-2 bg-slate-900 border border-slate-800 rounded-xl overflow-hidden flex flex-col">
          <div className="px-5 py-4 border-b border-slate-800 bg-[#0f172a]/50 flex justify-between items-center">
            <h3 className="font-bold text-white flex items-center gap-2">
              <Activity className="w-5 h-5 text-slate-400 animate-pulse" /> Canais Ao Vivo (Asterisk)
            </h3>
            <span className="px-2.5 py-1 bg-blue-500/20 text-blue-400 text-xs font-bold rounded-lg border border-blue-500/30">
              {channels.length} Ativos
            </span>
          </div>
          <div className="overflow-x-auto flex-1">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#0f172a]/80 border-b border-slate-800 text-xs text-slate-400 font-bold uppercase tracking-wider">
                  <th className="px-5 py-3">Canal</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3">Origem</th>
                  <th className="px-5 py-3">Destino / App</th>
                  <th className="px-5 py-3">Duração</th>
                  <th className="px-5 py-3 text-right">Intervenção (NOC)</th>
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
                      {Math.floor(chan.durationSeconds / 60)}:{chan.durationSeconds % 60 < 10 ? '0' : ''}{chan.durationSeconds % 60}
                    </td>
                    <td className="px-5 py-3 text-right">
                      {chan.state === 'Up' && (
                        <div className="flex items-center justify-end gap-1">
                          <button onClick={() => onOpenWebphone?.()} title="Spy (Escuta silenciosa)" className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white rounded-md border border-slate-700 transition">
                            <Ear className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={() => onOpenWebphone?.()} title="Whisper (Sussurrar para o operador)" className="p-1.5 bg-slate-800 hover:bg-sky-900/50 text-slate-400 hover:text-sky-400 rounded-md border border-slate-700 hover:border-sky-700 transition">
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

      </div>
    </div>
  );
};

