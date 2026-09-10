import React from 'react';
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
      <div className="bg-gradient-to-r from-slate-900 via-slate-900 to-sky-950/40 p-6 rounded-2xl border border-slate-800/80 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-sky-500/20 text-sky-300 border border-sky-500/30">
              Operação Nacional Brasil
            </span>
            <span className="text-xs text-slate-400 font-mono">Asterisk 20.17 LTS Puro • Google Gemini</span>
          </div>
          <h1 className="text-2xl font-black text-slate-100 tracking-tight">
            Central de Controle Enlace-PBX
          </h1>
          <p className="text-xs text-slate-400 mt-1 max-w-2xl">
            Telefonia IP corporativa com núcleo Asterisk aberto, orquestração de canais via ARI e agentes de voz inteligentes integrados ao Google Gemini Live API.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => onOpenWebphone('9001')}
            className="px-4 py-2.5 bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold rounded-xl text-xs flex items-center gap-2 shadow-lg shadow-sky-950/50 transition active:scale-95"
          >
            <Bot className="w-4 h-4 fill-slate-950" />
            Ligar para MaIA (IA)
          </button>
          <button
            onClick={() => onNavigate('extensions')}
            className="px-3.5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold rounded-xl text-xs border border-slate-700 transition"
          >
            Gerenciar Ramais
          </button>
        </div>
      </div>

      {/* Primary KPI Metrics Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1 */}
        <div className="bg-slate-900/80 p-4 rounded-2xl border border-slate-800/80">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium mb-2">
            <span>Chamadas Hoje</span>
            <PhoneCall className="w-4 h-4 text-sky-400" />
          </div>
          <div className="text-2xl font-black text-slate-100 font-mono">
            {metrics?.callsToday ?? 35}
          </div>
          <div className="flex items-center gap-1.5 mt-2 text-[11px] text-sky-400 font-medium">
            <span className="flex items-center">
              <ArrowUpRight className="w-3.5 h-3.5" />
              {metrics?.callsAnswered ?? 30} atendidas
            </span>
            <span className="text-slate-500">•</span>
            <span className="text-rose-400">{metrics?.callsMissed ?? 5} perdidas</span>
          </div>
        </div>

        {/* Metric 2 */}
        <div className="bg-slate-900/80 p-4 rounded-2xl border border-slate-800/80">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium mb-2">
            <span>Canais ARI Ativos</span>
            <Activity className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-2xl font-black text-slate-100 font-mono flex items-center gap-2">
            <span>{channels.length}</span>
            {channels.length > 0 && <span className="w-2.5 h-2.5 rounded-full bg-sky-400 animate-ping" />}
          </div>
          <div className="text-[11px] text-slate-400 mt-2 flex items-center gap-1 font-mono">
            <span>{channels.filter((c) => c.aiBridgeActive).length} canal em Stasis com Gemini</span>
          </div>
        </div>

        {/* Metric 3 */}
        <div className="bg-slate-900/80 p-4 rounded-2xl border border-slate-800/80">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium mb-2">
            <span>Ramais PJSIP Online</span>
            <Users className="w-4 h-4 text-sky-400" />
          </div>
          <div className="text-2xl font-black text-slate-100 font-mono">
            {metrics?.extensionsOnline ?? 4}
            <span className="text-xs text-slate-400 font-normal ml-1">/ {metrics?.extensionsTotal ?? 5}</span>
          </div>
          <div className="text-[11px] text-sky-400 mt-2 flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>WebRTC e SIP Realtime ativos</span>
          </div>
        </div>

        {/* Metric 4 */}
        <div className="bg-slate-900/80 p-4 rounded-2xl border border-slate-800/80">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium mb-2">
            <span>Troncos SIP Operadoras</span>
            <Radio className="w-4 h-4 text-sky-400" />
          </div>
          <div className="text-2xl font-black text-slate-100 font-mono">
            {metrics?.trunksOnline ?? 3}
            <span className="text-xs text-slate-400 font-normal ml-1">/ {metrics?.trunksTotal ?? 3}</span>
          </div>
          <div className="text-[11px] text-slate-400 mt-2 font-mono">
            Vivo Fibra • Claro 0800 • Algar
          </div>
        </div>
      </div>

      {/* AI Gateway Specific KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-slate-900/70 p-4 rounded-2xl border border-slate-800/80 flex items-center gap-4">
          <div className="w-11 h-11 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
            <Zap className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              Latência Média de Resposta IA
            </div>
            <div className="text-xl font-black text-slate-100 font-mono mt-0.5">
              {metrics?.aiLatencyAvgMs ?? 355} ms
            </div>
            <p className="text-[10px] text-slate-400">Gemini Live API em tempo real</p>
          </div>
        </div>

        <div className="bg-slate-900/70 p-4 rounded-2xl border border-slate-800/80 flex items-center gap-4">
          <div className="w-11 h-11 rounded-xl bg-sky-500/10 border border-sky-500/30 flex items-center justify-center text-sky-400">
            <TrendingUp className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              Transbordo para Humanos
            </div>
            <div className="text-xl font-black text-slate-100 font-mono mt-0.5">
              {metrics?.humanTransferRatePercent ?? 28}%
            </div>
            <p className="text-[10px] text-slate-400">72% resolvidas integralmente pela IA</p>
          </div>
        </div>

        <div className="bg-slate-900/70 p-4 rounded-2xl border border-slate-800/80 flex items-center gap-4">
          <div className="w-11 h-11 rounded-xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              Duração Média das Chamadas
            </div>
            <div className="text-xl font-black text-slate-100 font-mono mt-0.5">
              {metrics?.avgCallDurationSeconds ? `${Math.floor(metrics.avgCallDurationSeconds / 60)}m ${metrics.avgCallDurationSeconds % 60}s` : '2m 45s'}
            </div>
            <p className="text-[10px] text-slate-400">Custo médio estimado: R$ 0,18/chamada</p>
          </div>
        </div>
      </div>

      {/* Realtime Asterisk Channels & Hourly Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Active ARI Channels Panel */}
        <div className="bg-slate-900/80 rounded-2xl border border-slate-800/80 p-5 flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-sky-400" />
              <h3 className="font-bold text-sm text-slate-100">Canais Ativos no Asterisk 20</h3>
            </div>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300">
              ARI Port: 8088
            </span>
          </div>

          {channels.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center py-8 text-center text-slate-500">
              <Phone className="w-8 h-8 stroke-slate-600 mb-2" />
              <p className="text-xs">Nenhum canal ativo no momento.</p>
              <button
                onClick={() => onOpenWebphone()}
                className="mt-3 text-xs text-sky-400 hover:underline font-semibold"
              >
                Discar pelo Webphone
              </button>
            </div>
          ) : (
            <div className="space-y-2.5 flex-1 overflow-y-auto">
              {channels.map((chan) => (
                <div
                  key={chan.id}
                  className="p-3 bg-slate-950/80 rounded-xl border border-slate-800/80 flex items-center justify-between"
                >
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-sky-400 animate-pulse" />
                      <span className="text-xs font-bold font-mono text-slate-200">{chan.name}</span>
                    </div>
                    <div className="text-[11px] text-slate-400 mt-1">
                      {chan.callerNumber} → <span className="text-sky-400 font-semibold">{chan.connectedLine}</span>
                    </div>
                    <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                      App: {chan.application} • Context: {chan.context}
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="text-xs font-mono font-bold text-slate-300">
                      {chan.durationSeconds}s
                    </span>
                    {chan.aiBridgeActive && (
                      <div className="text-[9px] font-bold text-cyan-400 bg-cyan-950/60 px-1.5 py-0.5 rounded border border-cyan-800/60 mt-1">
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
        <div className="lg:col-span-2 bg-slate-900/80 rounded-2xl border border-slate-800/80 p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-bold text-sm text-slate-100">Distribuição de Tráfego por Hora</h3>
                <p className="text-xs text-slate-400">Total de chamadas vs. Atendidas por IA Gemini</p>
              </div>
              <div className="flex items-center gap-3 text-xs">
                <span className="flex items-center gap-1 text-slate-300">
                  <span className="w-2.5 h-2.5 rounded-sm bg-sky-500 inline-block" /> Total
                </span>
                <span className="flex items-center gap-1 text-cyan-300">
                  <span className="w-2.5 h-2.5 rounded-sm bg-cyan-400 inline-block" /> Agente IA
                </span>
              </div>
            </div>

            {/* Simple Clean Bar Chart */}
            <div className="grid grid-cols-7 gap-3 pt-6 pb-2 items-end h-44">
              {metrics?.hourlyCallDistribution?.map((item, idx) => (
                <div key={idx} className="flex flex-col items-center gap-2 h-full justify-end group">
                  <div className="text-[10px] text-slate-400 opacity-0 group-hover:opacity-100 transition font-mono">
                    {item.total}
                  </div>
                  <div className="w-full max-w-[36px] flex items-end gap-1 h-32 bg-slate-950 rounded-lg p-1 border border-slate-800">
                    <div
                      className="flex-1 bg-sky-500 rounded-sm transition-all duration-300"
                      style={{ height: `${(item.total / 35) * 100}%` }}
                    />
                    <div
                      className="flex-1 bg-cyan-400 rounded-sm transition-all duration-300"
                      style={{ height: `${(item.ai / 35) * 100}%` }}
                    />
                  </div>
                  <span className="text-[10px] font-mono text-slate-400">{item.hour}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-4 border-t border-slate-800/80 flex flex-wrap items-center justify-between text-xs text-slate-400">
            <span>Fuso horário: America/Sao_Paulo (Horário de Brasília)</span>
            <span className="text-sky-400 font-semibold">SLA de Atendimento: 94.2%</span>
          </div>
        </div>
      </div>

      {/* Recent CDR Call Records Table */}
      <div className="bg-slate-900/80 rounded-2xl border border-slate-800/80 p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-bold text-sm text-slate-100">Chamadas Recentes (CDR)</h3>
            <p className="text-xs text-slate-400">Registros de chamadas internas, externas e sessões Gemini</p>
          </div>
          <button
            onClick={() => onNavigate('cdr')}
            className="text-xs text-sky-400 hover:text-sky-300 font-semibold"
          >
            Ver todos os registros →
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 text-[11px] font-mono uppercase">
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
            <tbody className="divide-y divide-slate-800/60 font-sans">
              {recentCdrs.slice(0, 5).map((cdr) => (
                <tr key={cdr.id} className="hover:bg-slate-800/40 transition">
                  <td className="py-3 px-3 font-mono font-semibold text-slate-200">{cdr.caller}</td>
                  <td className="py-3 px-3 font-mono text-slate-300">{cdr.callee}</td>
                  <td className="py-3 px-3 capitalize">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-semibold font-mono ${
                        cdr.direction === 'inbound'
                          ? 'bg-blue-950 text-blue-300'
                          : cdr.direction === 'outbound'
                          ? 'bg-purple-950 text-purple-300'
                          : 'bg-slate-800 text-slate-300'
                      }`}
                    >
                      {cdr.direction}
                    </span>
                  </td>
                  <td className="py-3 px-3 text-slate-400 font-mono text-[11px]">
                    {new Date(cdr.startTime).toLocaleTimeString('pt-BR')}
                  </td>
                  <td className="py-3 px-3 font-mono text-slate-300">
                    {Math.floor(cdr.duration / 60)}m {cdr.duration % 60}s
                  </td>
                  <td className="py-3 px-3">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        cdr.disposition === 'ANSWERED'
                          ? 'bg-sky-950/80 text-sky-300 border border-sky-800/60'
                          : 'bg-rose-950/80 text-rose-300 border border-rose-800/60'
                      }`}
                    >
                      {cdr.disposition}
                    </span>
                  </td>
                  <td className="py-3 px-3">
                    {cdr.aiAgentId ? (
                      <span className="inline-flex items-center gap-1 text-[11px] font-medium text-cyan-300 bg-cyan-950/60 px-2 py-0.5 rounded border border-cyan-800/60">
                        <Bot className="w-3 h-3 text-cyan-400" /> MaIA (Gemini)
                      </span>
                    ) : (
                      <span className="text-slate-500 text-[11px]">Humano</span>
                    )}
                  </td>
                  <td className="py-3 px-3 text-right">
                    <button
                      onClick={() => onOpenWebphone(cdr.caller)}
                      className="text-slate-400 hover:text-sky-400 p-1 transition"
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
