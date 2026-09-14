import React from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, CartesianGrid } from 'recharts';
import {
  Phone,
  PhoneCall,
  PhoneIncoming,
  PhoneMissed,
  Users,
  Radio,
  Bot,
  Activity,
  Zap,
  TrendingUp,
  Clock,
  ArrowUpRight,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Play,
} from 'lucide-react';
import { DashboardMetrics, AsteriskChannel, CdrRecord } from '../../types/pbx';

interface DashboardViewProps {
  metrics: DashboardMetrics | null;
  channels: AsteriskChannel[];
  recentCdrs: CdrRecord[];
  onOpenWebphone: (number?: string) => void;
  onNavigate: (view: any) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  metrics,
  channels,
  recentCdrs,
  onOpenWebphone,
  onNavigate,
}) => {
  return (
    <div className="max-w-[1400px] mx-auto space-y-8 pb-12">
      {/* Premium Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-6">
        <div className="flex items-center gap-4">
          <div className="p-2 bg-white rounded-2xl border border-slate-200 shadow-sm shrink-0 hidden sm:block">
            <img 
              src="/logo-icon.png" 
              alt="Enlace-PBX Mascote" 
              className="w-12 h-12 object-contain"
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).src = '/logo-icon.svg';
              }}
            />
          </div>
          <div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
              <Radio className="w-8 h-8 text-blue-600 fill-blue-600 sm:hidden" />
              Central de Operações Enlace-PBX
            </h1>
            <p className="text-sm font-medium text-slate-500 mt-1">
              Plataforma de Telefonia IP baseada no núcleo Asterisk 20.17 LTS e integração nativa ao Google Gemini Live.
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
            <button
              onClick={() => onNavigate('extensions')}
              className="px-5 py-2.5 bg-white text-slate-700 hover:bg-slate-50 font-bold rounded-xl text-sm border border-slate-200 transition-all flex items-center gap-2 shadow-sm"
            >
              Gerenciar Extensões
            </button>
            <button
              onClick={() => onOpenWebphone('9001')}
              className="px-5 py-2.5 bg-blue-600 text-white hover:bg-blue-700 font-bold rounded-xl text-sm border border-blue-700 transition-all flex items-center gap-2 shadow-md shadow-blue-600/20"
            >
              <Bot className="w-4 h-4" /> Discar para Agente IA
            </button>
        </div>
      </div>

      {/* NOC / Wallboard KPI Metrics Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1 */}
        <div className="bg-slate-900 rounded-2xl p-5 relative overflow-hidden flex items-center gap-4 border border-slate-800 shadow-lg group hover:border-blue-500/50 transition-colors">
          <div className="absolute right-0 top-0 w-24 h-24 bg-blue-500/10 rounded-bl-full -mr-4 -mt-4 z-0 transition-transform group-hover:scale-110" />
          <div className="w-12 h-12 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center relative z-10 border border-blue-500/30">
            <PhoneCall className="w-6 h-6" />
          </div>
          <div className="relative z-10 flex-1">
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Tráfego Hoje</div>
            <div className="text-2xl font-black text-white font-mono flex items-end gap-2">
              {metrics?.callsToday ?? 35} <span className="text-[10px] text-slate-500 font-sans mb-1 font-bold">chamadas</span>
            </div>
            <div className="flex items-center gap-1.5 mt-1 text-[10px] text-emerald-400 font-bold">
              <ArrowUpRight className="w-3 h-3" /> {(metrics?.callsAnswered ?? 30)} ACD
            </div>
          </div>
        </div>

        {/* Metric 2 */}
        <div className="bg-slate-900 rounded-2xl p-5 relative overflow-hidden flex items-center gap-4 border border-slate-800 shadow-lg group hover:border-cyan-500/50 transition-colors">
          <div className="absolute right-0 top-0 w-24 h-24 bg-cyan-500/10 rounded-bl-full -mr-4 -mt-4 z-0 transition-transform group-hover:scale-110" />
          <div className="w-12 h-12 rounded-xl bg-cyan-500/20 text-cyan-400 flex items-center justify-center relative z-10 border border-cyan-500/30">
            <Activity className="w-6 h-6" />
          </div>
          <div className="relative z-10 flex-1">
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5 flex justify-between items-center">
              Canais ARI
              {channels.length > 0 && <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping mr-1" />}
            </div>
            <div className="text-2xl font-black text-white font-mono flex items-end gap-2">
              {channels.length} <span className="text-[10px] text-slate-500 font-sans mb-1 font-bold">ativos</span>
            </div>
            <div className="mt-1 text-[10px] text-cyan-400 font-mono">
              {channels.filter((c) => c.aiBridgeActive).length} STASIS/RAG
            </div>
          </div>
        </div>

        {/* Metric 3 */}
        <div className="bg-slate-900 rounded-2xl p-5 relative overflow-hidden flex items-center gap-4 border border-slate-800 shadow-lg group hover:border-emerald-500/50 transition-colors">
          <div className="absolute right-0 top-0 w-24 h-24 bg-emerald-500/10 rounded-bl-full -mr-4 -mt-4 z-0 transition-transform group-hover:scale-110" />
          <div className="w-12 h-12 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center relative z-10 border border-emerald-500/30">
            <Users className="w-6 h-6" />
          </div>
          <div className="relative z-10 flex-1">
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">SIP Endpoints</div>
            <div className="text-2xl font-black text-white font-mono flex items-end gap-2">
              {metrics?.extensionsOnline ?? 4} <span className="text-[10px] text-slate-500 font-sans mb-1 font-bold">/ {metrics?.extensionsTotal ?? 5} online</span>
            </div>
            <div className="mt-1 text-[10px] text-emerald-400 font-bold flex items-center gap-1">
               <CheckCircle2 className="w-3 h-3" /> WebRTC OK
            </div>
          </div>
        </div>

        {/* Metric 4 */}
        <div className="bg-slate-900 rounded-2xl p-5 relative overflow-hidden flex items-center gap-4 border border-slate-800 shadow-lg group hover:border-purple-500/50 transition-colors">
          <div className="absolute right-0 top-0 w-24 h-24 bg-purple-500/10 rounded-bl-full -mr-4 -mt-4 z-0 transition-transform group-hover:scale-110" />
          <div className="w-12 h-12 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center relative z-10 border border-purple-500/30">
            <Radio className="w-6 h-6" />
          </div>
          <div className="relative z-10 flex-1">
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Gateway PJSIP</div>
            <div className="text-2xl font-black text-white font-mono flex items-end gap-2">
              {metrics?.trunksOnline ?? 3} <span className="text-[10px] text-slate-500 font-sans mb-1 font-bold">/ {metrics?.trunksTotal ?? 3} troncos</span>
            </div>
            <div className="mt-1 text-[10px] text-slate-500 font-mono truncate">
               Vivo Fibra / Algar
            </div>
          </div>
        </div>
      </div>

      {/* AI Gateway Specific KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow flex items-center gap-4">
          <div className="w-11 h-11 rounded-xl bg-cyan-50 border border-cyan-100 flex items-center justify-center text-teal-600">
            <Zap className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              Latência Média de Resposta IA
            </div>
            <div className="text-xl font-black text-slate-900 font-mono mt-0.5">
              {metrics?.aiLatencyAvgMs ?? 355} ms
            </div>
            <p className="text-[10px] text-slate-500">Gemini Live API em tempo real</p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow flex items-center gap-4">
          <div className="w-11 h-11 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600">
            <TrendingUp className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              Transbordo para Humanos
            </div>
            <div className="text-xl font-black text-slate-900 font-mono mt-0.5">
              {metrics?.humanTransferRatePercent ?? 28}%
            </div>
            <p className="text-[10px] text-slate-500">72% resolvidas integralmente pela IA</p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow flex items-center gap-4">
          <div className="w-11 h-11 rounded-xl bg-purple-50 border border-purple-100 flex items-center justify-center text-purple-600">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              Duração Média das Chamadas
            </div>
            <div className="text-xl font-black text-slate-900 font-mono mt-0.5">
              {metrics?.avgCallDurationSeconds ? `${Math.floor(metrics.avgCallDurationSeconds / 60)}m ${metrics.avgCallDurationSeconds % 60}s` : '2m 45s'}
            </div>
            <p className="text-[10px] text-slate-500">Custo médio estimado: R$ 0,18/chamada</p>
          </div>
        </div>
      </div>

      {/* Realtime Asterisk Channels & Hourly Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Active ARI Channels Panel */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-blue-600" />
              <h3 className="font-bold text-sm text-slate-900">Canais Ativos no Asterisk 20</h3>
            </div>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-100 border border-slate-200 text-slate-700">
              ARI Port: 8088
            </span>
          </div>

          {channels.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center py-8 text-center text-slate-500">
              <Phone className="w-8 h-8 text-slate-300 mb-3" />
              <p className="text-xs">Nenhum canal ativo no momento.</p>
              <button
                onClick={() => onOpenWebphone()}
                className="mt-3 text-xs text-blue-600 hover:text-blue-700 font-semibold transition"
              >
                Discar pelo Webphone
              </button>
            </div>
          ) : (
            <div className="space-y-2.5 flex-1 overflow-y-auto">
              {channels.map((chan) => (
                <div
                  key={chan.id}
                  className="p-3 bg-white hover:bg-slate-50 transition rounded-xl border border-slate-200 shadow-sm flex items-center justify-between"
                >
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                      <span className="text-xs font-bold font-mono text-slate-700">{chan.name}</span>
                    </div>
                    <div className="text-[11px] text-slate-500 mt-1">
                      {chan.callerNumber} → <span className="text-blue-600 font-semibold">{chan.connectedLine}</span>
                    </div>
                    <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                      App: {chan.application} • Context: {chan.context}
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="text-xs font-mono font-bold text-slate-700">
                      {chan.durationSeconds}s
                    </span>
                    {chan.aiBridgeActive && (
                      <div className="text-[9px] font-bold text-teal-700 bg-teal-50 px-1.5 py-0.5 rounded border border-teal-200 mt-1 shadow-sm">
                        Gemini Live
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Hourly Distribution & AI Performance */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-sm p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-bold text-sm text-slate-900">Distribuição de Tráfego por Hora</h3>
                <p className="text-xs text-slate-500">Total de chamadas vs. Atendidas por IA Gemini</p>
              </div>
            </div>

            <div className="w-full h-52 mt-2">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={metrics?.hourlyCallDistribution || []} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                  <XAxis dataKey="hour" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748b' }} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748b' }} />
                  <Tooltip
                    cursor={{ fill: '#f8fafc' }}
                    contentStyle={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0', borderRadius: '12px', fontSize: '12px', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                    itemStyle={{ color: '#0f172a' }}
                  />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: '11px', paddingTop: '10px', color: '#64748b' }} />
                  <Bar dataKey="total" name="Total (PJSIP)" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={24} />
                  <Bar dataKey="ai" name="Agente IA (Gemini)" fill="#06b6d4" radius={[4, 4, 0, 0]} barSize={24} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-200 flex flex-wrap items-center justify-between text-xs text-slate-500">
            <span>Fuso horário: America/Sao_Paulo (Horário de Brasília)</span>
            <span className="text-blue-600 font-semibold">SLA de Atendimento: 94.2%</span>
          </div>
        </div>
      </div>

      {/* Recent CDR Call Records Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-bold text-sm text-slate-900">Chamadas Recentes (CDR)</h3>
            <p className="text-xs text-slate-500">Registros de chamadas internas, externas e sessões Gemini</p>
          </div>
          <button
            onClick={() => onNavigate('cdr')}
            className="text-xs text-blue-600 hover:text-blue-700 font-semibold"
          >
            Ver todos os registros →
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 text-slate-500 text-[11px] font-mono uppercase bg-slate-50">
                <th className="py-2.5 px-3">Origem</th>
                <th className="py-2.5 px-3">Destino</th>
                <th className="py-2.5 px-3">Direção</th>
                <th className="py-2.5 px-3">Início</th>
                <th className="py-2.5 px-3">Duração</th>
                <th className="py-2.5 px-3">Status</th>
                <th className="py-2.5 px-3">Atendimento IA</th>
                <th className="py-2.5 px-3 text-right">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-sans">
              {recentCdrs.slice(0, 5).map((cdr) => (
                <tr key={cdr.id} className="hover:bg-slate-50 transition">
                  <td className="py-3 px-3 font-mono font-semibold text-slate-900">{cdr.caller}</td>
                  <td className="py-3 px-3 font-mono text-slate-700">{cdr.callee}</td>
                  <td className="py-3 px-3 capitalize">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-semibold font-mono ${
                        cdr.direction === 'inbound'
                          ? 'bg-blue-50 text-blue-600 border border-blue-200'
                          : cdr.direction === 'outbound'
                          ? 'bg-purple-50 text-purple-600 border border-purple-200'
                          : 'bg-slate-100 text-slate-700 border border-slate-200'
                      }`}
                    >
                      {cdr.direction}
                    </span>
                  </td>
                  <td className="py-3 px-3 text-slate-500 font-mono text-[11px]">
                    {new Date(cdr.startTime).toLocaleTimeString('pt-BR')}
                  </td>
                  <td className="py-3 px-3 font-mono text-slate-700">
                    {Math.floor(cdr.duration / 60)}m {cdr.duration % 60}s
                  </td>
                  <td className="py-3 px-3">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        cdr.disposition === 'ANSWERED'
                          ? 'bg-green-50 text-green-700 border border-green-200'
                          : 'bg-rose-50 text-rose-700 border border-rose-200'
                      }`}
                    >
                      {cdr.disposition}
                    </span>
                  </td>
                  <td className="py-3 px-3">
                    {cdr.aiAgentId ? (
                      <span className="inline-flex items-center gap-1 text-[11px] font-medium text-cyan-700 bg-cyan-50 px-2 py-0.5 rounded border border-cyan-200">
                        <Bot className="w-3 h-3 text-cyan-600" /> MaIA (Gemini)
                      </span>
                    ) : (
                      <span className="text-slate-500 text-[11px]">Humano</span>
                    )}
                  </td>
                  <td className="py-3 px-3 text-right">
                    <button
                      onClick={() => onOpenWebphone(cdr.caller)}
                      className="text-slate-500 hover:text-blue-600 p-1 transition"
                      title="Retornar ligação via Webphone"
                    >
                      <Phone className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
