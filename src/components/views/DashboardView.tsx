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
    <div className="space-y-6">
      {/* Top Banner / Hero Context */}
      <div className="bg-gradient-to-r from-blue-700 via-blue-600 to-sky-500 p-6 rounded-2xl border border-blue-400/50 shadow-lg shadow-blue-600/20 flex flex-col md:flex-row md:items-center justify-between gap-4 relative overflow-hidden">
        {/* Abstract background shapes */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3 pointer-events-none" />
        <div className="absolute bottom-0 left-10 w-40 h-40 bg-sky-300/20 rounded-full blur-2xl translate-y-1/2 pointer-events-none" />

        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-2">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-white/20 text-blue-50 border border-white/20 backdrop-blur-sm">
              Operação Nacional Brasil
            </span>
            <span className="text-xs text-blue-100 font-mono">Asterisk 20.17 LTS Puro • Google Gemini</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-black text-white tracking-tight drop-shadow-sm">
            Central de Controle Enlace-PBX
          </h1>
          <p className="text-sm text-blue-50/90 mt-1.5 max-w-2xl leading-relaxed">
            Telefonia IP corporativa com núcleo Asterisk aberto, orquestração de canais via ARI e agentes de voz inteligentes integrados ao Google Gemini Live API.
          </p>
        </div>

        <div className="flex items-center gap-2.5 relative z-10 shrink-0 mt-2 md:mt-0">
          <button
            onClick={() => onOpenWebphone('9001')}
            className="px-4 py-2.5 bg-white text-blue-700 hover:bg-blue-50 font-bold rounded-xl text-xs flex items-center gap-2 shadow-lg shadow-black/10 transition-all duration-300 hover:scale-105 active:scale-95"
          >
            <Bot className="w-4 h-4 text-blue-600" />
            Ligar para MaIA (IA)
          </button>
          <button
            onClick={() => onNavigate('extensions')}
            className="px-4 py-2.5 bg-blue-800/40 hover:bg-blue-800/60 text-white font-semibold rounded-xl text-xs border border-white/20 backdrop-blur-sm transition-all duration-300 hover:scale-105 active:scale-95"
          >
            Gerenciar Ramais
          </button>
        </div>
      </div>

      {/* Primary KPI Metrics Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1 */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md hover:-translate-y-1 transition-all duration-300">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium mb-2">
            <span>Chamadas Hoje</span>
            <PhoneCall className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-2xl font-black text-slate-900 font-mono">
            {metrics?.callsToday ?? 35}
          </div>
          <div className="flex items-center gap-1.5 mt-2 text-[11px] text-blue-600 font-medium">
            <span className="flex items-center">
              <ArrowUpRight className="w-3.5 h-3.5" />
              {metrics?.callsAnswered ?? 30} atendidas
            </span>
            <span className="text-slate-300">•</span>
            <span className="text-rose-500">{metrics?.callsMissed ?? 5} perdidas</span>
          </div>
        </div>

        {/* Metric 2 */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md hover:-translate-y-1 transition-all duration-300">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium mb-2">
            <span>Canais ARI Ativos</span>
            <Activity className="w-4 h-4 text-teal-600" />
          </div>
          <div className="text-2xl font-black text-slate-900 font-mono flex items-center gap-2">
            <span>{channels.length}</span>
            {channels.length > 0 && <span className="w-2.5 h-2.5 rounded-full bg-blue-500 animate-ping" />}
          </div>
          <div className="text-[11px] text-slate-500 mt-2 flex items-center gap-1 font-mono">
            <span>{channels.filter((c) => c.aiBridgeActive).length} canal em Stasis com Gemini</span>
          </div>
        </div>

        {/* Metric 3 */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md hover:-translate-y-1 transition-all duration-300">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium mb-2">
            <span>Ramais PJSIP Online</span>
            <Users className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-2xl font-black text-slate-900 font-mono">
            {metrics?.extensionsOnline ?? 4}
            <span className="text-xs text-slate-500 font-normal ml-1">/ {metrics?.extensionsTotal ?? 5}</span>
          </div>
          <div className="text-[11px] text-blue-600 mt-2 flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>WebRTC e SIP Realtime ativos</span>
          </div>
        </div>

        {/* Metric 4 */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md hover:-translate-y-1 transition-all duration-300">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium mb-2">
            <span>Troncos SIP Operadoras</span>
            <Radio className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-2xl font-black text-slate-900 font-mono">
            {metrics?.trunksOnline ?? 3}
            <span className="text-xs text-slate-500 font-normal ml-1">/ {metrics?.trunksTotal ?? 3}</span>
          </div>
          <div className="text-[11px] text-slate-500 mt-2 font-mono">
            Vivo Fibra • Claro 0800 • Algar
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
