import React, { useState, useEffect } from 'react';
import { AsteriskChannel, DashboardMetrics } from '../../types/pbx';
import { Activity, PhoneCall, PhoneMissed, PhoneForwarded, Phone, Bot, CheckCircle2, AlertTriangle, Users, HeadphonesIcon, TrendingUp, Clock, BarChart3, SignalHigh } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Legend } from 'recharts';

interface OperationDashboardViewProps {
  channels: AsteriskChannel[];
  metrics: DashboardMetrics | null;
}

export const OperationDashboardView: React.FC<OperationDashboardViewProps> = ({ channels, metrics }) => {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  if (!metrics) {
    return <div className="p-8 text-center text-slate-500">Aguardando telemetria do PBX...</div>;
  }

  const slaPercent = Math.round((metrics.callsAnswered / Math.max(metrics.callsToday, 1)) * 100);
  const slaColor = slaPercent >= 85 ? 'text-emerald-400' : slaPercent >= 70 ? 'text-amber-400' : 'text-rose-400';

  // Mocking active queues for the wallboard
  const activeQueues = [
    { name: 'Suporte Técnico N1', waiting: 3, agentsOnline: 5, sla: 92, longestWait: '01:42' },
    { name: 'Vendas & Retenção', waiting: 0, agentsOnline: 4, sla: 98, longestWait: '00:00' },
    { name: 'Faturamento', waiting: 1, agentsOnline: 2, sla: 76, longestWait: '04:15' },
    { name: 'Ouvidoria', waiting: 0, agentsOnline: 1, sla: 100, longestWait: '00:00' },
  ];

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
            <span className={`text-5xl font-black ${slaColor}`}>{slaPercent}%</span>
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
            <span className="text-5xl font-black text-purple-400">{100 - metrics.humanTransferRatePercent}%</span>
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
            <div className="text-2xl font-black text-amber-400">{metrics.humanTransferRatePercent}%</div>
          </div>
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
            <div className="text-xs text-slate-500 font-bold uppercase mb-1">TMO Médio</div>
            <div className="text-2xl font-black text-slate-300">
              {Math.floor(metrics.avgCallDurationSeconds / 60)}m {metrics.avgCallDurationSeconds % 60}s
            </div>
          </div>
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
            <div className="text-xs text-slate-500 font-bold uppercase mb-1">Tokens IA Usados</div>
            <div className="text-2xl font-black text-blue-400">{(metrics.aiTokensUsedToday / 1000).toFixed(1)}k</div>
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

      {/* Bottom Section: Queues and Channels */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        
        {/* Active Queues Panel */}
        <div className="xl:col-span-1 bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-800 bg-slate-900/50 flex justify-between items-center">
            <h3 className="font-bold text-white flex items-center gap-2">
              <Users className="w-5 h-5 text-slate-400" /> Filas de Atendimento
            </h3>
          </div>
          <div className="divide-y divide-slate-800">
            {activeQueues.map((q, idx) => (
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
            ))}
          </div>
        </div>

        {/* Live Channels Table */}
        <div className="xl:col-span-2 bg-slate-900 border border-slate-800 rounded-xl overflow-hidden flex flex-col">
          <div className="px-5 py-4 border-b border-slate-800 bg-slate-900/50 flex justify-between items-center">
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
                <tr className="bg-slate-900/80 border-b border-slate-800 text-xs text-slate-400 font-bold uppercase tracking-wider">
                  <th className="px-5 py-3">Canal</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3">Origem</th>
                  <th className="px-5 py-3">Destino / App</th>
                  <th className="px-5 py-3">Duração</th>
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
                  </tr>
                ))}
                {channels.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-5 py-12 text-center text-slate-500">
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

