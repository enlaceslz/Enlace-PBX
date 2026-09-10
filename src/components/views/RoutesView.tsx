import React, { useState } from 'react';
import {
  GitFork,
  ArrowRight,
  Bot,
  PhoneCall,
  Split,
  Plus,
  Radio,
  Clock,
  CheckCircle2,
  Trash2,
  X,
  Layers,
} from 'lucide-react';
import { Route, Trunk } from '../../types/pbx';

interface RoutesViewProps {
  routes: Route[];
  trunks: Trunk[];
  onRefresh: () => void;
}

export const RoutesView: React.FC<RoutesViewProps> = ({ routes, trunks, onRefresh }) => {
  const [activeTab, setActiveTab] = useState<'inbound' | 'outbound'>('outbound');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    type: 'outbound' as 'inbound' | 'outbound',
    pattern: '_9XXXXXXXX',
    prefixRemove: '',
    trunkId: trunks[0]?.id || '',
    destinationType: 'trunk' as 'trunk' | 'ai_agent' | 'extension' | 'queue' | 'ivr',
    destinationId: trunks[0]?.id || '',
    priority: 1,
    fallbackType: 'human',
    fallbackTarget: '4101',
  });

  const filteredRoutes = routes.filter((r) => r.type === activeTab);

  const brazilianRulesHelper = [
    { pattern: '_9XXXXXXXX', desc: 'Celular Local (9 dígitos SP/Brasil)' },
    { pattern: '_[2-5]XXXXXXX', desc: 'Fixo Local (8 dígitos)' },
    { pattern: '_0XX9XXXXXXXX', desc: 'DDD Móvel Nacional (Ex: 011 98765-4321)' },
    { pattern: '_0XX[2-5]XXXXXXX', desc: 'DDD Fixo Nacional' },
    { pattern: '_0800XXXXXXX', desc: 'Chamadas Gratuitas 0800' },
  ];

  const routePresets = [
    {
      title: 'Saída Celular Local',
      type: 'outbound' as const,
      pattern: '_9XXXXXXXX',
      prefixRemove: '',
      destType: 'trunk' as const,
      priority: 1,
    },
    {
      title: 'Saída DDD Nacional (0 + DDD + Número)',
      type: 'outbound' as const,
      pattern: '_0XX9XXXXXXXX',
      prefixRemove: '0',
      destType: 'trunk' as const,
      priority: 2,
    },
    {
      title: 'Entrada DID 0800 → Agente IA Gemini',
      type: 'inbound' as const,
      pattern: '08007702020',
      prefixRemove: '',
      destType: 'ai_agent' as const,
      destId: 'agent-maia-247',
      priority: 1,
    },
    {
      title: 'Entrada DID Matriz → URA Principal',
      type: 'inbound' as const,
      pattern: '1130900100',
      prefixRemove: '',
      destType: 'ivr' as const,
      destId: 'ivr-principal',
      priority: 2,
    },
  ];

  const handleApplyPreset = (p: typeof routePresets[0]) => {
    setFormData((prev) => ({
      ...prev,
      name: p.title,
      type: p.type,
      pattern: p.pattern,
      prefixRemove: p.prefixRemove,
      destinationType: p.destType,
      destinationId: p.destId || (p.destType === 'trunk' ? trunks[0]?.id || '' : '4101'),
      trunkId: trunks[0]?.id || '',
      priority: p.priority,
    }));
  };

  const handleCreateRoute = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.pattern) return;
    setIsSubmitting(true);
    try {
      await fetch('/api/v1/routes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          type: formData.type,
          pattern: formData.pattern,
          prefixRemove: formData.prefixRemove || undefined,
          trunkId: formData.type === 'outbound' ? formData.trunkId : undefined,
          destinationType: formData.destinationType,
          destinationId: formData.type === 'outbound' ? formData.trunkId : formData.destinationId,
          priority: Number(formData.priority) || 1,
          fallbackType: formData.fallbackType,
          fallbackTarget: formData.fallbackTarget,
        }),
      });
      setIsModalOpen(false);
      onRefresh();
    } catch (err) {
      console.error('Erro ao cadastrar rota:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteRoute = async (id: string, name: string) => {
    if (!confirm(`Deseja realmente excluir a rota "${name}"?`)) return;
    try {
      await fetch(`/api/v1/routes/${id}`, { method: 'DELETE' });
      onRefresh();
    } catch (err) {
      console.error('Erro ao excluir rota:', err);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-xl font-black text-slate-900 tracking-tight">
              Rotas de Entrada e Saída (Dialplan)
            </h1>
            <span className="text-[10px] bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 rounded-full font-mono">
              extensions.conf • Padrão E.164 Brasil
            </span>
          </div>
          <p className="text-xs text-slate-500">
            Regras de discagem para operadoras nacionais, tratamento de DDD e direcionamento inteligente para IA Gemini.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start">
          {/* Tab Switcher */}
          <div className="flex bg-white p-1 rounded-xl border border-slate-200">
            <button
              onClick={() => setActiveTab('outbound')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                activeTab === 'outbound'
                  ? 'bg-blue-600 text-white shadow'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              Rotas de Saída (Outbound)
            </button>
            <button
              onClick={() => setActiveTab('inbound')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                activeTab === 'inbound'
                  ? 'bg-blue-600 text-white shadow'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              Rotas de Entrada (DIDs)
            </button>
          </div>

          <button
            onClick={() => {
              setFormData((prev) => ({ ...prev, type: activeTab }));
              setIsModalOpen(true);
            }}
            className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-sm transition"
          >
            <Plus className="w-3.5 h-3.5" />
            Nova Rota
          </button>
        </div>
      </div>

      {/* Rules Cheatsheet for Brazilian Dialing */}
      {activeTab === 'outbound' && (
        <div className="bg-white/80 rounded-2xl border border-slate-200 shadow-sm p-4">
          <div className="text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-2 font-mono flex items-center gap-2">
            <GitFork className="w-3.5 h-3.5 text-blue-600" />
            Expressões Regulares do Dialplan Brasileiro:
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 text-xs">
            {brazilianRulesHelper.map((rule, idx) => (
              <div key={idx} className="bg-slate-50 p-2 rounded-xl border border-slate-200 font-mono">
                <span className="text-blue-600 font-bold block">{rule.pattern}</span>
                <span className="text-[10px] text-slate-500 font-sans">{rule.desc}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Routes List */}
      <div className="space-y-3">
        {filteredRoutes.length === 0 ? (
          <div className="p-8 text-center bg-white rounded-2xl border border-slate-200 text-slate-500 text-xs">
            Nenhuma rota cadastrada para esta direção ({activeTab}). Clique em "Nova Rota" acima para adicionar.
          </div>
        ) : (
          filteredRoutes.map((route) => (
            <div
              key={route.id}
              className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 flex flex-col md:flex-row md:items-center justify-between gap-4"
            >
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center font-bold text-blue-600 font-mono text-xs">
                  P{route.priority}
                </div>

                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold text-slate-900">{route.name}</h3>
                    <span className="font-mono text-[11px] text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200 shadow-sm">
                      {route.pattern}
                    </span>
                  </div>
                  <div className="text-xs text-slate-500 mt-1 flex items-center gap-2">
                    {route.type === 'outbound' ? (
                      <span>
                        Tronco de Saída:{' '}
                        <strong className="text-slate-700">
                          {trunks.find((t) => t.id === route.trunkId)?.name || 'Padrão'}
                        </strong>
                      </span>
                    ) : (
                      <span>
                        Destino de Entrada:{' '}
                        <strong className="text-slate-700 uppercase">{route.destinationType}</strong>
                      </span>
                    )}
                    {route.prefixRemove && (
                      <span className="text-[10px] font-mono text-slate-500">
                        Remove Prefixo: {route.prefixRemove}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Target Destination, Fallback & Delete */}
              <div className="flex items-center gap-4 text-xs">
                <div className="text-right">
                  <div className="font-mono text-slate-700 flex items-center gap-1.5 justify-end">
                    <span>Destino:</span>
                    {route.destinationType === 'ai_agent' ? (
                      <span className="px-2 py-0.5 rounded bg-cyan-50 text-cyan-700 border border-cyan-200 shadow-sm font-sans font-bold flex items-center gap-1">
                        <Bot className="w-3 h-3 text-cyan-600" /> MaIA (Gemini IA)
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-mono">
                        {route.destinationId}
                      </span>
                    )}
                  </div>
                  {route.fallbackType && (
                    <div className="text-[10px] text-slate-500 mt-0.5">
                      Fallback: Transbordo para {route.fallbackType} ({route.fallbackTarget})
                    </div>
                  )}
                </div>

                <button
                  onClick={() => handleDeleteRoute(route.id, route.name)}
                  className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                  title="Excluir Rota"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* CREATE ROUTE MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-lg w-full max-h-[90vh] flex flex-col my-auto">
            <div className="p-5 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600">
                  <GitFork className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-slate-900">
                    Cadastrar Nova Rota no Dialplan
                  </h3>
                  <p className="text-xs text-slate-500">
                    Gera regras em extensions.conf compatíveis com Asterisk 20
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

            <form onSubmit={handleCreateRoute} className="p-5 space-y-4 overflow-y-auto">
              {/* Presets */}
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-1">
                  Atalhos de Discagem Brasileira:
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {routePresets.map((p, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleApplyPreset(p)}
                      className="p-2 rounded-xl border border-slate-200 bg-slate-50 hover:bg-blue-50 hover:border-blue-300 text-left transition text-xs font-semibold text-slate-800"
                    >
                      {p.title}
                    </button>
                  ))}
                </div>
              </div>

              {/* Direction Switcher */}
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, type: 'outbound' })}
                  className={`py-2 text-xs font-bold rounded-xl border transition ${
                    formData.type === 'outbound'
                      ? 'bg-blue-50 border-blue-500 text-blue-700'
                      : 'bg-slate-50 border-slate-200 text-slate-600'
                  }`}
                >
                  Rota de Saída (Outbound)
                </button>
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, type: 'inbound' })}
                  className={`py-2 text-xs font-bold rounded-xl border transition ${
                    formData.type === 'inbound'
                      ? 'bg-blue-50 border-blue-500 text-blue-700'
                      : 'bg-slate-50 border-slate-200 text-slate-600'
                  }`}
                >
                  Rota de Entrada (Inbound/DID)
                </button>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Nome da Rota *
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full text-xs bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  placeholder="Ex: Saída Celular SP (DDD 11)"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    Padrão de Discagem (Pattern) *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.pattern}
                    onChange={(e) => setFormData({ ...formData, pattern: e.target.value })}
                    className="w-full text-xs font-mono bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    placeholder="Ex: _9XXXXXXXX ou 08007702020"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    Prioridade no Dialplan
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={formData.priority}
                    onChange={(e) =>
                      setFormData({ ...formData, priority: parseInt(e.target.value) || 1 })
                    }
                    className="w-full text-xs font-mono bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-800"
                  />
                </div>
              </div>

              {formData.type === 'outbound' ? (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-slate-700 block mb-1">
                      Tronco SIP de Saída
                    </label>
                    <select
                      value={formData.trunkId}
                      onChange={(e) => setFormData({ ...formData, trunkId: e.target.value })}
                      className="w-full text-xs bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-800"
                    >
                      {trunks.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.name} ({t.providerName})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-700 block mb-1">
                      Remover Prefixo (Strip)
                    </label>
                    <input
                      type="text"
                      value={formData.prefixRemove}
                      onChange={(e) =>
                        setFormData({ ...formData, prefixRemove: e.target.value })
                      }
                      className="w-full text-xs font-mono bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-800"
                      placeholder="Ex: 0 (para remover dígito da operadora)"
                    />
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-slate-700 block mb-1">
                      Tipo de Destino
                    </label>
                    <select
                      value={formData.destinationType}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          destinationType: e.target.value as any,
                        })
                      }
                      className="w-full text-xs bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-800"
                    >
                      <option value="ai_agent">Agente Gemini (MaIA)</option>
                      <option value="ivr">URA / IVR</option>
                      <option value="queue">Fila de Atendimento (ACD)</option>
                      <option value="extension">Ramal PJSIP</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-700 block mb-1">
                      Identificador / Alvo
                    </label>
                    <input
                      type="text"
                      value={formData.destinationId}
                      onChange={(e) =>
                        setFormData({ ...formData, destinationId: e.target.value })
                      }
                      className="w-full text-xs font-mono bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-800"
                      placeholder="Ex: agent-maia-247 ou 4101"
                    />
                  </div>
                </div>
              )}

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
                  <GitFork className="w-3.5 h-3.5" />
                  {isSubmitting ? 'Salvando...' : 'Salvar Rota'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

