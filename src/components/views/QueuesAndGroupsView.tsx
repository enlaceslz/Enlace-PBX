import React, { useState } from 'react';
import {
  Layers,
  Split,
  Users,
  Clock,
  CheckCircle2,
  TrendingUp,
  AlertCircle,
  Phone,
} from 'lucide-react';
import { Queue, RingGroup } from '../../types/pbx';

interface QueuesAndGroupsProps {
  queues: Queue[];
  ringGroups: RingGroup[];
  onOpenWebphone: (num: string) => void;
}

export const QueuesAndGroupsView: React.FC<QueuesAndGroupsProps> = ({
  queues,
  ringGroups,
  onOpenWebphone,
}) => {
  const [activeTab, setActiveTab] = useState<'queues' | 'ring_groups'>('queues');

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-xl font-black text-slate-800 tracking-tight">
              Filas e Grupos de Chamada
            </h1>
            <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-mono">
              app_queue • Asterisk 20
            </span>
          </div>
          <p className="text-xs text-slate-400">
            Distribuição automática de chamadas (ACD) com estratégias roundrobin, ringall, SLAs e música em espera.
          </p>
        </div>

        <div className="flex bg-white p-1 rounded-xl border border-slate-200">
          <button
            onClick={() => setActiveTab('queues')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
              activeTab === 'queues'
                ? 'bg-blue-600 text-white shadow'
                : 'text-slate-400 hover:text-slate-700'
            }`}
          >
            Filas de Atendimento (ACD)
          </button>
          <button
            onClick={() => setActiveTab('ring_groups')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
              activeTab === 'ring_groups'
                ? 'bg-blue-600 text-white shadow'
                : 'text-slate-400 hover:text-slate-700'
            }`}
          >
            Grupos de Toque (Ring Groups)
          </button>
        </div>
      </div>

      {/* Queues Tab */}
      {activeTab === 'queues' && (
        <div className="space-y-4">
          {queues.map((q) => (
            <div
              key={q.id}
              className="bg-white rounded-2xl border border-slate-100 p-5 space-y-4"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-600/10 border border-sky-500/30 flex items-center justify-center text-blue-600 font-mono font-bold">
                    {q.number}
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-800 text-base">{q.name}</h3>
                    <p className="text-xs text-slate-400">
                      Estratégia: <span className="font-mono text-slate-600">{q.strategy}</span> • Música em Espera: {q.mohSound}
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => onOpenWebphone(q.number)}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl flex items-center gap-1.5 self-start"
                >
                  <Phone className="w-3.5 h-3.5 text-blue-600" />
                  Testar Fila ({q.number})
                </button>
              </div>

              {/* Realtime Queue Stats */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                  <span className="text-[10px] text-slate-400 uppercase font-mono">Em Espera Agora</span>
                  <div className="text-xl font-bold font-mono text-blue-600 mt-0.5">
                    {q.callsWaiting}
                  </div>
                </div>

                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                  <span className="text-[10px] text-slate-400 uppercase font-mono">Espera Média</span>
                  <div className="text-xl font-bold font-mono text-slate-700 mt-0.5">
                    {q.avgWaitTimeSeconds}s
                  </div>
                </div>

                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                  <span className="text-[10px] text-slate-400 uppercase font-mono">Atendidas Hoje</span>
                  <div className="text-xl font-bold font-mono text-slate-700 mt-0.5">
                    {q.answeredToday}
                  </div>
                </div>

                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                  <span className="text-[10px] text-slate-400 uppercase font-mono">Meta de SLA</span>
                  <div className="text-xl font-bold font-mono text-teal-600 mt-0.5">
                    {q.slaTargetSeconds}s
                  </div>
                </div>
              </div>

              {/* Members */}
              <div className="pt-2">
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-2">
                  Agentes / Ramais Vinculados ({q.members.length}):
                </span>
                <div className="flex flex-wrap gap-2">
                  {q.members.map((mem) => (
                    <span
                      key={mem}
                      className="px-2.5 py-1 rounded-lg bg-slate-100 border border-slate-300 text-xs font-mono text-slate-600"
                    >
                      Ramal {mem}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Ring Groups Tab */}
      {activeTab === 'ring_groups' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {ringGroups.map((rg) => (
            <div
              key={rg.id}
              className="bg-white rounded-2xl border border-slate-100 p-5 space-y-3"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono font-bold text-blue-600 bg-sky-950/60 px-2 py-0.5 rounded border border-sky-800">
                  Grupo {rg.number}
                </span>
                <span className="text-xs text-slate-400 font-mono">Timeout: {rg.timeoutSeconds}s</span>
              </div>

              <h3 className="font-bold text-slate-800 text-base">{rg.name}</h3>
              <p className="text-xs text-slate-400">
                Estratégia: <strong className="text-slate-600">{rg.strategy}</strong>
              </p>

              <div className="pt-2">
                <span className="text-[10px] uppercase font-semibold text-slate-400 block mb-1.5">
                  Ramais do Grupo:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {rg.members.map((m) => (
                    <span
                      key={m}
                      className="px-2 py-0.5 rounded bg-slate-100 text-xs font-mono text-slate-700"
                    >
                      {m}
                    </span>
                  ))}
                </div>
              </div>

              <div className="pt-3 border-t border-slate-200 text-xs text-slate-400">
                Destino se ninguém atender:{' '}
                <strong className="text-slate-700 uppercase">{rg.failoverDestination}</strong>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
