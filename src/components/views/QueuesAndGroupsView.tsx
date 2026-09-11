import React, { useState, useEffect } from 'react';
import {
  Layers,
  Split,
  Users,
  Clock,
  CheckCircle2,
  TrendingUp,
  AlertCircle,
  Phone,
  Plus,
  Trash2,
  X,
} from 'lucide-react';
import { Queue, RingGroup } from '../../types/pbx';

interface QueuesAndGroupsProps {
  queues: Queue[];
  ringGroups: RingGroup[];
  initialTab?: 'queues' | 'ring_groups';
  onOpenWebphone: (num: string) => void;
  onRefresh?: () => void;
}

export const QueuesAndGroupsView: React.FC<QueuesAndGroupsProps> = ({
  queues,
  ringGroups,
  initialTab = 'queues',
  onOpenWebphone,
  onRefresh,
}) => {
  const [activeTab, setActiveTab] = useState<'queues' | 'ring_groups'>(initialTab);

  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form states for Queue
  const [queueForm, setQueueForm] = useState({
    name: '',
    number: '5002',
    strategy: 'roundrobin' as 'ringall' | 'roundrobin' | 'leastrecent' | 'fewestcalls' | 'random' | 'linear',
    mohSound: 'bossa-nova',
    slaTargetSeconds: 20,
    members: '4101, 4102',
  });

  // Form states for Ring Group
  const [rgForm, setRgForm] = useState({
    name: '',
    number: '7002',
    strategy: 'ringall' as 'ringall' | 'hunt' | 'memoryhunt',
    timeoutSeconds: 20,
    failoverDestination: 'ivr',
    members: '4101, 4102',
  });

  const handleCreateQueue = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!queueForm.name || !queueForm.number) return;
    setIsSubmitting(true);
    try {
      const membersArray = queueForm.members
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);

      await fetch('/api/v1/queues', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: queueForm.name,
          number: queueForm.number,
          strategy: queueForm.strategy,
          mohSound: queueForm.mohSound,
          slaTargetSeconds: Number(queueForm.slaTargetSeconds) || 20,
          members: membersArray,
        }),
      });
      setIsModalOpen(false);
      if (onRefresh) onRefresh();
    } catch (err) {
      console.error('Erro ao cadastrar fila:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreateRingGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rgForm.name || !rgForm.number) return;
    setIsSubmitting(true);
    try {
      const membersArray = rgForm.members
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);

      await fetch('/api/v1/ring-groups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: rgForm.name,
          number: rgForm.number,
          strategy: rgForm.strategy,
          timeoutSeconds: Number(rgForm.timeoutSeconds) || 20,
          failoverDestination: rgForm.failoverDestination,
          members: membersArray,
        }),
      });
      setIsModalOpen(false);
      if (onRefresh) onRefresh();
    } catch (err) {
      console.error('Erro ao cadastrar grupo:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteQueue = async (id: string, name: string) => {
    if (!confirm(`Deseja realmente excluir a fila "${name}"?`)) return;
    try {
      await fetch(`/api/v1/queues/${id}`, { method: 'DELETE' });
      if (onRefresh) onRefresh();
    } catch (err) {
      console.error('Erro ao excluir fila:', err);
    }
  };

  const handleDeleteRingGroup = async (id: string, name: string) => {
    if (!confirm(`Deseja realmente excluir o grupo "${name}"?`)) return;
    try {
      await fetch(`/api/v1/ring-groups/${id}`, { method: 'DELETE' });
      if (onRefresh) onRefresh();
    } catch (err) {
      console.error('Erro ao excluir grupo:', err);
    }
  };

  return (
    <div className="max-w-[1400px] mx-auto space-y-8 pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
              <Layers className="w-8 h-8 text-blue-600 fill-blue-600" />
              Filas & Grupos (ACD)
            </h1>
            <span className="px-2.5 py-1 bg-slate-900 text-white border border-slate-700 rounded-lg text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 ml-2 shadow-sm">
               Asterisk app_queue
            </span>
          </div>
          <p className="text-sm font-medium text-slate-500 mt-1">
            Distribuição automática de chamadas, SLAs, música em espera e estratégias de ring avançadas.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start">
          <div className="flex bg-slate-100 p-1.5 rounded-xl border border-slate-200 shadow-sm">
            <button
              onClick={() => setActiveTab('queues')}
              className={`px-5 py-2 rounded-lg text-xs font-bold transition flex items-center gap-2 ${
                activeTab === 'queues'
                  ? 'bg-white text-blue-700 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700 hover:bg-white/50'
              }`}
            >
              <Split className="w-4 h-4" /> Filas de Atendimento (ACD)
            </button>
            <button
              onClick={() => setActiveTab('ring_groups')}
              className={`px-5 py-2 rounded-lg text-xs font-bold transition flex items-center gap-2 ${
                activeTab === 'ring_groups'
                  ? 'bg-white text-blue-700 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700 hover:bg-white/50'
              }`}
            >
              <Users className="w-4 h-4" /> Grupos de Toque (Ring Groups)
            </button>
          </div>

          <button
            onClick={() => setIsModalOpen(true)}
            className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-sm transition"
          >
            <Plus className="w-3.5 h-3.5" />
            {activeTab === 'queues' ? 'Nova Fila' : 'Novo Grupo'}
          </button>
        </div>
      </div>

      {/* Queues Tab */}
      {activeTab === 'queues' && (
        <div className="space-y-4">
          {queues.length === 0 ? (
            <div className="p-8 text-center bg-white rounded-2xl border border-slate-200 text-slate-500 text-xs">
              Nenhuma fila cadastrada. Clique em "Nova Fila" acima.
            </div>
          ) : (
            queues.map((q) => (
              <div
                key={q.id}
                className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-4"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600 font-mono font-bold">
                      {q.number}
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-900 text-base">{q.name}</h3>
                      <p className="text-xs text-slate-500">
                        Estratégia: <span className="font-mono text-slate-700">{q.strategy}</span> • Música em Espera: {q.mohSound}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-start">
                    <button
                      onClick={() => onOpenWebphone(q.number)}
                      className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl flex items-center gap-1.5 transition"
                    >
                      <Phone className="w-3.5 h-3.5 text-blue-600" />
                      Testar Fila ({q.number})
                    </button>
                    <button
                      onClick={() => handleDeleteQueue(q.id, q.name)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                      title="Excluir Fila"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Realtime Queue Stats */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                    <span className="text-[10px] text-slate-500 uppercase font-mono">Em Espera Agora</span>
                    <div className="text-xl font-bold font-mono text-blue-600 mt-0.5">
                      {q.callsWaiting}
                    </div>
                  </div>

                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                    <span className="text-[10px] text-slate-500 uppercase font-mono">Espera Média</span>
                    <div className="text-xl font-bold font-mono text-slate-700 mt-0.5">
                      {q.avgWaitTimeSeconds}s
                    </div>
                  </div>

                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                    <span className="text-[10px] text-slate-500 uppercase font-mono">Atendidas Hoje</span>
                    <div className="text-xl font-bold font-mono text-slate-700 mt-0.5">
                      {q.answeredToday}
                    </div>
                  </div>

                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                    <span className="text-[10px] text-slate-500 uppercase font-mono">Meta de SLA</span>
                    <div className="text-xl font-bold font-mono text-teal-600 mt-0.5">
                      {q.slaTargetSeconds}s
                    </div>
                  </div>
                </div>

                {/* Members */}
                <div className="pt-2">
                  <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block mb-2">
                    Agentes / Ramais Vinculados ({q.members.length}):
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {q.members.map((mem) => (
                      <span
                        key={mem}
                        className="px-2.5 py-1 rounded-lg bg-slate-100 border border-slate-200 text-xs font-mono text-slate-700"
                      >
                        Ramal {mem}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Ring Groups Tab */}
      {activeTab === 'ring_groups' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {ringGroups.length === 0 ? (
            <div className="p-8 text-center bg-white rounded-2xl border border-slate-200 text-slate-500 text-xs col-span-2">
              Nenhum grupo de toque cadastrado. Clique em "Novo Grupo" acima.
            </div>
          ) : (
            ringGroups.map((rg) => (
              <div
                key={rg.id}
                className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-3"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                    Grupo {rg.number}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-500 font-mono">Timeout: {rg.timeoutSeconds}s</span>
                    <button
                      onClick={() => handleDeleteRingGroup(rg.id, rg.name)}
                      className="p-1 text-slate-400 hover:text-rose-600 rounded transition"
                      title="Excluir Grupo"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <h3 className="font-bold text-slate-900 text-base">{rg.name}</h3>
                <p className="text-xs text-slate-500">
                  Estratégia: <strong className="text-slate-700">{rg.strategy}</strong>
                </p>

                <div className="pt-2">
                  <span className="text-[10px] uppercase font-semibold text-slate-500 block mb-1.5">
                    Ramais do Grupo:
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {rg.members.map((m) => (
                      <span
                        key={m}
                        className="px-2 py-0.5 rounded bg-slate-100 text-xs font-mono text-slate-700 border border-slate-200"
                      >
                        {m}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-200 text-xs text-slate-500">
                  Destino se ninguém atender:{' '}
                  <strong className="text-slate-700 uppercase">{rg.failoverDestination}</strong>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* CREATE MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-lg w-full max-h-[90vh] flex flex-col my-auto">
            <div className="p-5 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600">
                  <Layers className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-slate-900">
                    {activeTab === 'queues' ? 'Cadastrar Nova Fila ACD' : 'Cadastrar Novo Grupo de Toque'}
                  </h3>
                  <p className="text-xs text-slate-500">
                    Configuração de atendimento Asterisk 20
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {activeTab === 'queues' ? (
              <form onSubmit={handleCreateQueue} className="p-5 space-y-4 overflow-y-auto">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-slate-700 block mb-1">
                      Nome da Fila *
                    </label>
                    <input
                      type="text"
                      required
                      value={queueForm.name}
                      onChange={(e) => setQueueForm({ ...queueForm, name: e.target.value })}
                      className="w-full text-xs bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-800"
                      placeholder="Ex: Fila VIP Comercial"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-700 block mb-1">
                      Número da Fila *
                    </label>
                    <input
                      type="text"
                      required
                      value={queueForm.number}
                      onChange={(e) => setQueueForm({ ...queueForm, number: e.target.value })}
                      className="w-full text-xs font-mono bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-800"
                      placeholder="Ex: 5002"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-slate-700 block mb-1">
                      Estratégia de Distribuição
                    </label>
                    <select
                      value={queueForm.strategy}
                      onChange={(e) =>
                        setQueueForm({ ...queueForm, strategy: e.target.value as any })
                      }
                      className="w-full text-xs bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-800"
                    >
                      <option value="roundrobin">Round-Robin (Alternado)</option>
                      <option value="ringall">Ring-All (Toca Todos)</option>
                      <option value="leastrecent">Least Recent (Menos recente)</option>
                      <option value="fewestcalls">Fewest Calls (Menos atendidas)</option>
                      <option value="linear">Linear</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-700 block mb-1">
                      Música em Espera (MOH)
                    </label>
                    <select
                      value={queueForm.mohSound}
                      onChange={(e) => setQueueForm({ ...queueForm, mohSound: e.target.value })}
                      className="w-full text-xs bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-800"
                    >
                      <option value="bossa-nova">Bossa Nova MPB (Brasil)</option>
                      <option value="default">Default Asterisk</option>
                      <option value="jazz-espera">Jazz Suave</option>
                      <option value="silence">Silêncio</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    Meta de SLA (Tempo Máximo de Espera Alvo em Segundos)
                  </label>
                  <input
                    type="number"
                    min="5"
                    max="120"
                    value={queueForm.slaTargetSeconds}
                    onChange={(e) =>
                      setQueueForm({
                        ...queueForm,
                        slaTargetSeconds: parseInt(e.target.value) || 20,
                      })
                    }
                    className="w-full text-xs font-mono bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-800"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    Ramais Membros (separados por vírgula)
                  </label>
                  <input
                    type="text"
                    value={queueForm.members}
                    onChange={(e) => setQueueForm({ ...queueForm, members: e.target.value })}
                    className="w-full text-xs font-mono bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-800"
                    placeholder="Ex: 4101, 4102, 4103"
                  />
                </div>

                <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow transition disabled:opacity-50 flex items-center gap-1.5"
                  >
                    <Layers className="w-3.5 h-3.5" />
                    {isSubmitting ? 'Criando...' : 'Criar Fila'}
                  </button>
                </div>
              </form>
            ) : (
              <form onSubmit={handleCreateRingGroup} className="p-5 space-y-4 overflow-y-auto">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-slate-700 block mb-1">
                      Nome do Grupo *
                    </label>
                    <input
                      type="text"
                      required
                      value={rgForm.name}
                      onChange={(e) => setRgForm({ ...rgForm, name: e.target.value })}
                      className="w-full text-xs bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-800"
                      placeholder="Ex: Grupo Suporte Geral"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-700 block mb-1">
                      Número do Grupo *
                    </label>
                    <input
                      type="text"
                      required
                      value={rgForm.number}
                      onChange={(e) => setRgForm({ ...rgForm, number: e.target.value })}
                      className="w-full text-xs font-mono bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-800"
                      placeholder="Ex: 7002"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-slate-700 block mb-1">
                      Estratégia de Toque
                    </label>
                    <select
                      value={rgForm.strategy}
                      onChange={(e) =>
                        setRgForm({ ...rgForm, strategy: e.target.value as any })
                      }
                      className="w-full text-xs bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-800"
                    >
                      <option value="ringall">Ring-All (Toca Todos Juntos)</option>
                      <option value="hunt">Hunt (Sequencial)</option>
                      <option value="memoryhunt">Memory Hunt (Cumulativo)</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-700 block mb-1">
                      Tempo de Toque (Timeout)
                    </label>
                    <input
                      type="number"
                      min="5"
                      max="60"
                      value={rgForm.timeoutSeconds}
                      onChange={(e) =>
                        setRgForm({
                          ...rgForm,
                          timeoutSeconds: parseInt(e.target.value) || 20,
                        })
                      }
                      className="w-full text-xs font-mono bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-800"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    Destino se Ninguém Atender (Transbordo)
                  </label>
                  <select
                    value={rgForm.failoverDestination}
                    onChange={(e) =>
                      setRgForm({ ...rgForm, failoverDestination: e.target.value })
                    }
                    className="w-full text-xs bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-800"
                  >
                    <option value="ivr">URA Principal (6001)</option>
                    <option value="queue">Fila Suporte (5001)</option>
                    <option value="voicemail">Caixa Postal / VoiceMail</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    Ramais do Grupo (separados por vírgula)
                  </label>
                  <input
                    type="text"
                    value={rgForm.members}
                    onChange={(e) => setRgForm({ ...rgForm, members: e.target.value })}
                    className="w-full text-xs font-mono bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-800"
                    placeholder="Ex: 4101, 4102"
                  />
                </div>

                <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow transition disabled:opacity-50 flex items-center gap-1.5"
                  >
                    <Split className="w-3.5 h-3.5" />
                    {isSubmitting ? 'Criando...' : 'Criar Grupo'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

