import React, { useState } from 'react';
import {
  PhoneCall,
  Volume2,
  Bot,
  Layers,
  Split,
  Phone,
  Clock,
  ArrowRight,
  Plus,
  Trash2,
  X,
  Play,
  FileCode,
  Sparkles,
} from 'lucide-react';
import { Ivr, IvrOption } from '../../types/pbx';
import { IvrFlowEditor } from '../ivr/IvrFlowEditor';

interface IvrViewProps {
  ivrs: Ivr[];
  onOpenWebphone: (number: string) => void;
  onRefresh?: () => void;
}

export const IvrView: React.FC<IvrViewProps> = ({ ivrs, onOpenWebphone, onRefresh }) => {
  const [viewMode, setViewMode] = useState<'flow_editor' | 'list'>('flow_editor');
  const [selectedIvrForEditor, setSelectedIvrForEditor] = useState<Ivr | null>(ivrs[0] || null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Sync selected IVR if list changes
  React.useEffect(() => {
    if (ivrs.length > 0 && !selectedIvrForEditor) {
      setSelectedIvrForEditor(ivrs[0]);
    } else if (selectedIvrForEditor) {
      const match = ivrs.find((i) => i.id === selectedIvrForEditor.id);
      if (match) setSelectedIvrForEditor(match);
    }
  }, [ivrs]);

  const [formData, setFormData] = useState<{
    name: string;
    number: string;
    audioPrompt: string;
    timeoutSeconds: number;
    invalidRetries: number;
    options: IvrOption[];
  }>({
    name: '',
    number: '6002',
    audioPrompt: 'Olá! Você ligou para a Enlace Telecom. Para Comercial digite 1. Para Suporte digite 2. Ou 9 para falar com a MaIA.',
    timeoutSeconds: 8,
    invalidRetries: 3,
    options: [
      { digit: '1', label: 'Falar com Atendente IA (MaIA)', destinationType: 'ai_agent', destinationTarget: 'agent-maia-247' },
      { digit: '2', label: 'Suporte Técnico N1', destinationType: 'queue', destinationTarget: '5001' },
      { digit: '3', label: 'Financeiro e 2ª Via', destinationType: 'extension', destinationTarget: '4102' },
      { digit: '9', label: 'Encerrar Ligação', destinationType: 'hangup', destinationTarget: 'hangup' },
    ],
  });

  const handleAddOption = () => {
    const nextDigit = String(formData.options.length + 1);
    setFormData({
      ...formData,
      options: [
        ...formData.options,
        { digit: nextDigit, label: 'Nova Opção', destinationType: 'extension', destinationTarget: '4101' },
      ],
    });
  };

  const handleRemoveOption = (index: number) => {
    setFormData({
      ...formData,
      options: formData.options.filter((_, i) => i !== index),
    });
  };

  const handleUpdateOption = (index: number, field: keyof IvrOption, val: string) => {
    const updated = [...formData.options];
    updated[index] = { ...updated[index], [field]: val };
    setFormData({ ...formData, options: updated });
  };

  const handleCreateIvr = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.number) return;
    setIsSubmitting(true);
    try {
      const res = await fetch('/api/v1/ivr', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      const created = await res.json();
      setIsModalOpen(false);
      if (onRefresh) onRefresh();
      if (created) {
        setSelectedIvrForEditor(created);
        setViewMode('flow_editor');
      }
    } catch (err) {
      console.error('Erro ao cadastrar URA:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSaveIvr = async (updatedIvr: Ivr) => {
    try {
      const res = await fetch(`/api/v1/ivr/${updatedIvr.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedIvr),
      });
      if (res.ok) {
        const saved = await res.json();
        setSelectedIvrForEditor(saved);
        if (onRefresh) onRefresh();
      }
    } catch (err) {
      console.error('Falha ao atualizar URA:', err);
      throw err;
    }
  };

  const handleDeleteIvr = async (id: string, name: string) => {
    if (!confirm(`Deseja realmente excluir a URA "${name}"?`)) return;
    try {
      await fetch(`/api/v1/ivr/${id}`, { method: 'DELETE' });
      if (onRefresh) onRefresh();
    } catch (err) {
      console.error('Erro ao excluir URA:', err);
    }
  };

  const activeIvr = selectedIvrForEditor || ivrs[0];

  return (
    <div className="space-y-4">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-xl font-black text-slate-900 tracking-tight">
              URAs de Atendimento (IVR)
            </h1>
            <span className="text-[10px] bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 rounded-full font-mono">
              Asterisk Menus • DTMF Interativo & IA
            </span>
          </div>
          <p className="text-xs text-slate-500">
            Editor visual de fluxo telefônico com drag-and-drop de áudio, DTMF e encaminhamento para Agentes de IA e Filas.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start">
          {/* Mode Switcher */}
          <div className="bg-slate-100 p-1 rounded-xl border border-slate-200 flex items-center gap-1">
            <button
              onClick={() => setViewMode('flow_editor')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition ${
                viewMode === 'flow_editor'
                  ? 'bg-white text-blue-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              Editor de Fluxo Visual
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition ${
                viewMode === 'list'
                  ? 'bg-white text-blue-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Split className="w-3.5 h-3.5" />
              Lista de URAs ({ivrs.length})
            </button>
          </div>

          <button
            onClick={() => onOpenWebphone(activeIvr?.number || '6001')}
            className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs flex items-center gap-1.5 transition"
          >
            <Phone className="w-3.5 h-3.5 text-blue-600" />
            Ligar ({activeIvr?.number || '6001'})
          </button>

          <button
            onClick={() => setIsModalOpen(true)}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-sm transition"
          >
            <Plus className="w-3.5 h-3.5" />
            Nova URA
          </button>
        </div>
      </div>

      {/* 1. VISUAL FLOW EDITOR MODE */}
      {viewMode === 'flow_editor' && (
        <div>
          {activeIvr ? (
            <div className="space-y-2">
              {/* If multiple IVRs, allow fast switching bar */}
              {ivrs.length > 1 && (
                <div className="flex items-center gap-2 bg-white px-3 py-2 rounded-xl border border-slate-200 text-xs overflow-x-auto">
                  <span className="font-semibold text-slate-500 uppercase tracking-wider text-[10px] shrink-0">
                    URAs Disponíveis:
                  </span>
                  {ivrs.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => setSelectedIvrForEditor(item)}
                      className={`px-2.5 py-1 rounded-lg font-medium transition flex items-center gap-1.5 shrink-0 ${
                        item.id === activeIvr.id
                          ? 'bg-blue-50 text-blue-700 border border-blue-200 font-bold'
                          : 'text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      <span className="font-mono">{item.number}</span>
                      <span>— {item.name}</span>
                    </button>
                  ))}
                </div>
              )}

              <IvrFlowEditor
                key={activeIvr.id}
                initialIvr={activeIvr}
                allIvrs={ivrs}
                onSelectIvr={(ivr) => setSelectedIvrForEditor(ivr)}
                onBackToList={() => setViewMode('list')}
                onSaveIvr={handleSaveIvr}
              />
            </div>
          ) : (
            <div className="p-12 text-center bg-white rounded-2xl border border-slate-200 text-slate-500 text-xs">
              Nenhuma URA configurada para abrir no editor. Clique em "Nova URA".
            </div>
          )}
        </div>
      )}

      {/* 2. CLASSIC LIST VIEW MODE */}
      {viewMode === 'list' && (
        <div className="space-y-5">
          {ivrs.length === 0 ? (
            <div className="p-8 text-center bg-white rounded-2xl border border-slate-200 text-slate-500 text-xs">
              Nenhuma URA configurada. Clique em "Nova URA" para criar um menu telefônico.
            </div>
          ) : (
            ivrs.map((ivr) => (
              <div
                key={ivr.id}
                className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-5"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-200">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600 font-bold font-mono text-sm">
                      {ivr.number}
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-900 text-base">{ivr.name}</h3>
                      <div className="flex items-center gap-3 text-xs text-slate-500 mt-0.5">
                        <span className="flex items-center gap-1">
                          <Volume2 className="w-3.5 h-3.5 text-slate-400" />
                          Áudio: <code className="text-slate-700 font-mono">{ivr.audioPrompt}</code>
                        </span>
                        <span>•</span>
                        <span>Timeout: {ivr.timeoutSeconds}s</span>
                        <span>•</span>
                        <span>Tentativas: {ivr.invalidRetries}x</span>
                        {ivr.flow?.nodes && (
                          <>
                            <span>•</span>
                            <span className="text-blue-600 font-medium">
                              Fluxo Visual ({ivr.flow.nodes.length} nós)
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-start">
                    <button
                      onClick={() => {
                        setSelectedIvrForEditor(ivr);
                        setViewMode('flow_editor');
                      }}
                      className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition"
                    >
                      <Layers className="w-3.5 h-3.5" />
                      Abrir Editor de Fluxo
                    </button>

                    <button
                      onClick={() => onOpenWebphone(ivr.number)}
                      className="px-2.5 py-1.5 rounded-xl bg-slate-100 text-slate-700 hover:bg-slate-200 text-xs font-semibold flex items-center gap-1 transition"
                    >
                      <Phone className="w-3 h-3 text-blue-600" /> Testar
                    </button>

                    <button
                      onClick={() => handleDeleteIvr(ivr.id, ivr.name)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                      title="Excluir URA"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Menu Options Flow */}
                <div>
                  <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
                    Mapeamento das Teclas Numéricas (DTMF):
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {ivr.options.map((opt) => (
                      <div
                        key={opt.digit}
                        className={`p-3 rounded-xl border flex items-center justify-between transition ${
                          opt.destinationType === 'ai_agent'
                            ? 'bg-purple-50/80 border-purple-200 shadow-xs'
                            : opt.destinationType === 'queue'
                            ? 'bg-indigo-50/80 border-indigo-200 shadow-xs'
                            : 'bg-slate-50/60 border-slate-200 shadow-xs'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center font-mono font-black text-slate-900 text-sm border border-slate-200 shadow-xs">
                            {opt.digit}
                          </div>
                          <div>
                            <div className="font-semibold text-slate-800 text-xs">{opt.label}</div>
                            <div className="text-[10px] text-slate-500 capitalize">
                              Destino: {opt.destinationType.replace('_', ' ')}
                            </div>
                          </div>
                        </div>

                        <div>
                          {opt.destinationType === 'ai_agent' ? (
                            <span className="text-[10px] bg-purple-100 text-purple-800 border border-purple-300 px-2 py-0.5 rounded font-semibold flex items-center gap-1">
                              <Bot className="w-3 h-3 text-purple-600" /> MaIA (Gemini)
                            </span>
                          ) : (
                            <span className="text-[11px] font-mono text-slate-700 bg-white border border-slate-200 px-2 py-0.5 rounded shadow-xs">
                              {opt.destinationTarget}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* CREATE IVR MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-xl w-full max-h-[90vh] flex flex-col my-auto">
            <div className="p-5 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600">
                  <Volume2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-slate-900">
                    Cadastrar Novo Menu URA (IVR)
                  </h3>
                  <p className="text-xs text-slate-500">
                    Cria a URA com editor visual de fluxo interativo habilitado
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

            <form onSubmit={handleCreateIvr} className="p-5 space-y-4 overflow-y-auto">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    Nome da URA *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full text-xs bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    placeholder="Ex: URA Atendimento Filial"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    Número / Extensão de Discagem *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.number}
                    onChange={(e) => setFormData({ ...formData, number: e.target.value })}
                    className="w-full text-xs font-mono bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    placeholder="Ex: 6003"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Mensagem Inicial de Boas-Vindas (Prompt de Áudio ou TTS)
                </label>
                <textarea
                  rows={3}
                  value={formData.audioPrompt}
                  onChange={(e) => setFormData({ ...formData, audioPrompt: e.target.value })}
                  className="w-full text-xs bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 leading-relaxed"
                  placeholder="Olá! Obrigado por ligar para nossa central..."
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    Tempo Limite (Timeout)
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min="3"
                      max="30"
                      value={formData.timeoutSeconds}
                      onChange={(e) =>
                        setFormData({ ...formData, timeoutSeconds: parseInt(e.target.value) || 5 })
                      }
                      className="w-full text-xs font-mono bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-800"
                    />
                    <span className="text-xs text-slate-500 font-mono">seg</span>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    Tentativas Inválidas
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="5"
                    value={formData.invalidRetries}
                    onChange={(e) =>
                      setFormData({ ...formData, invalidRetries: parseInt(e.target.value) || 3 })
                    }
                    className="w-full text-xs font-mono bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-800"
                  />
                </div>
              </div>

              {/* Options Mapping */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-slate-700 block">
                    Opções Iniciais DTMF ({formData.options.length}):
                  </label>
                  <button
                    type="button"
                    onClick={handleAddOption}
                    className="text-xs text-blue-600 hover:text-blue-700 font-semibold flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" /> Adicionar Tecla
                  </button>
                </div>

                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {formData.options.map((opt, idx) => (
                    <div
                      key={idx}
                      className="p-2 rounded-xl border border-slate-200 bg-slate-50 flex items-center gap-2 text-xs"
                    >
                      <input
                        type="text"
                        maxLength={2}
                        value={opt.digit}
                        onChange={(e) => handleUpdateOption(idx, 'digit', e.target.value)}
                        className="w-9 text-center font-bold font-mono bg-white border border-slate-300 rounded-lg py-1 text-slate-900"
                      />

                      <input
                        type="text"
                        value={opt.label}
                        onChange={(e) => handleUpdateOption(idx, 'label', e.target.value)}
                        className="flex-1 bg-white border border-slate-300 rounded-lg px-2 py-1 text-slate-800"
                        placeholder="Rótulo"
                      />

                      <select
                        value={opt.destinationType}
                        onChange={(e) => handleUpdateOption(idx, 'destinationType', e.target.value)}
                        className="bg-white border border-slate-300 rounded-lg px-2 py-1 text-slate-800 text-[11px]"
                      >
                        <option value="ai_agent">Agente IA (MaIA)</option>
                        <option value="queue">Fila ACD</option>
                        <option value="extension">Ramal</option>
                        <option value="hangup">Desligar</option>
                      </select>

                      <input
                        type="text"
                        value={opt.destinationTarget}
                        onChange={(e) => handleUpdateOption(idx, 'destinationTarget', e.target.value)}
                        className="w-20 font-mono bg-white border border-slate-300 rounded-lg px-2 py-1 text-slate-800 text-[11px]"
                      />

                      <button
                        type="button"
                        onClick={() => handleRemoveOption(idx)}
                        className="p-1 text-slate-400 hover:text-rose-600 rounded transition"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
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
                  {isSubmitting ? 'Criando...' : 'Criar e Abrir Fluxo Visual'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};


