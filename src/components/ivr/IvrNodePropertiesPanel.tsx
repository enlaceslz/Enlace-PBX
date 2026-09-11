import React, { useState } from 'react';
import {
  X,
  Volume2,
  Phone,
  Bot,
  Users,
  Clock,
  PhoneOff,
  Layers,
  Plus,
  Trash2,
  Play,
  Square,
  Sparkles,
  Save,
} from 'lucide-react';
import { IvrFlowNode } from '../../types/pbx';
import { speakText, stopSpeaking } from '../../utils/dtmfAudio';

interface IvrNodePropertiesPanelProps {
  node: IvrFlowNode | null;
  onUpdateNode: (updatedNode: IvrFlowNode) => void;
  onDeleteNode: (nodeId: string) => void;
  onClose: () => void;
  availableAiAgents: Array<{ id: string; name: string; model?: string }>;
  availableQueues: Array<{ id: string; name: string; number?: string }>;
  availableExtensions: Array<{ id: string; number: string; name: string }>;
}

export const IvrNodePropertiesPanel: React.FC<IvrNodePropertiesPanelProps> = ({
  node,
  onUpdateNode,
  onDeleteNode,
  onClose,
  availableAiAgents,
  availableQueues,
  availableExtensions,
}) => {
  if (!node) return null;

  const [isPlayingAudio, setIsPlayingAudio] = useState(false);

  const handleTitleChange = (newTitle: string) => {
    onUpdateNode({ ...node, title: newTitle });
  };

  const handleDataChange = (field: string, value: unknown) => {
    onUpdateNode({
      ...node,
      data: {
        ...node.data,
        [field]: value,
      },
    });
  };

  const handlePlayAudio = () => {
    if (isPlayingAudio) {
      stopSpeaking();
      setIsPlayingAudio(false);
      return;
    }

    const textToSpeak = node.data.audioText || node.title;
    setIsPlayingAudio(true);
    speakText(textToSpeak, () => {
      setIsPlayingAudio(false);
    });
  };

  // Add DTMF digit
  const handleAddDigit = () => {
    const currentDigits = node.data.digits || [];
    const nextDigit = String(currentDigits.length + 1);
    const updated = [...currentDigits, { digit: nextDigit, label: `Opção ${nextDigit}` }];
    handleDataChange('digits', updated);
  };

  // Remove DTMF digit
  const handleRemoveDigit = (idx: number) => {
    const currentDigits = node.data.digits || [];
    const updated = currentDigits.filter((_, i) => i !== idx);
    handleDataChange('digits', updated);
  };

  // Update DTMF digit
  const handleUpdateDigit = (idx: number, field: 'digit' | 'label', val: string) => {
    const currentDigits = [...(node.data.digits || [])];
    currentDigits[idx] = { ...currentDigits[idx], [field]: val };
    handleDataChange('digits', currentDigits);
  };

  return (
    <div className="w-80 sm:w-96 bg-white border-l border-slate-200 h-full flex flex-col shadow-xl z-20 overflow-hidden text-slate-800 animate-in slide-in-from-right duration-200">
      {/* Panel Header */}
      <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
        <div className="flex items-center gap-2.5">
          <div
            className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold text-sm ${
              node.type === 'start'
                ? 'bg-emerald-100 text-emerald-700'
                : node.type === 'audio'
                ? 'bg-blue-100 text-blue-700'
                : node.type === 'dtmf'
                ? 'bg-amber-100 text-amber-700'
                : node.type === 'ai_agent'
                ? 'bg-purple-100 text-purple-700'
                : node.type === 'queue'
                ? 'bg-indigo-100 text-indigo-700'
                : node.type === 'extension'
                ? 'bg-teal-100 text-teal-700'
                : node.type === 'time_condition'
                ? 'bg-orange-100 text-orange-700'
                : 'bg-rose-100 text-rose-700'
            }`}
          >
            {node.type === 'audio' && <Volume2 className="w-4 h-4" />}
            {node.type === 'dtmf' && <span className="font-mono text-xs font-black">#123</span>}
            {node.type === 'ai_agent' && <Bot className="w-4 h-4" />}
            {node.type === 'queue' && <Users className="w-4 h-4" />}
            {node.type === 'extension' && <Phone className="w-4 h-4" />}
            {node.type === 'time_condition' && <Clock className="w-4 h-4" />}
            {node.type === 'hangup' && <PhoneOff className="w-4 h-4" />}
            {node.type === 'start' && <Play className="w-4 h-4" />}
          </div>
          <div>
            <h3 className="font-bold text-sm text-slate-900 leading-none">{node.title}</h3>
            <span className="text-[10px] text-slate-500 uppercase tracking-wider font-mono">
              Bloco {node.type.toUpperCase()}
            </span>
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg transition hover:bg-slate-200"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Panel Body */}
      <div className="flex-1 p-4 overflow-y-auto space-y-4 text-xs">
        {/* Title input */}
        <div>
          <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
            Rótulo / Nome do Bloco
          </label>
          <input
            type="text"
            value={node.title}
            onChange={(e) => handleTitleChange(e.target.value)}
            className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 font-medium"
          />
        </div>

        {/* 1. AUDIO NODE SETTINGS */}
        {node.type === 'audio' && (
          <div className="space-y-3 pt-2 border-t border-slate-100">
            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                Origem do Áudio
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => handleDataChange('audioSource', 'tts')}
                  className={`py-1.5 px-3 rounded-lg text-xs font-semibold border transition ${
                    (node.data.audioSource || 'tts') === 'tts'
                      ? 'bg-blue-50 border-blue-300 text-blue-700'
                      : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  Texto para Fala (TTS)
                </button>
                <button
                  type="button"
                  onClick={() => handleDataChange('audioSource', 'file')}
                  className={`py-1.5 px-3 rounded-lg text-xs font-semibold border transition ${
                    node.data.audioSource === 'file'
                      ? 'bg-blue-50 border-blue-300 text-blue-700'
                      : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  Arquivo WAV / Gravação
                </button>
              </div>
            </div>

            {node.data.audioSource === 'file' ? (
              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Caminho do Arquivo (Asterisk WAV 8k/16k)
                </label>
                <input
                  type="text"
                  value={node.data.audioFile || 'custom/ura-mensagem-principal.wav'}
                  onChange={(e) => handleDataChange('audioFile', e.target.value)}
                  className="w-full font-mono bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900"
                  placeholder="custom/meu-audio.wav"
                />
              </div>
            ) : (
              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Texto da Mensagem de Voz (Síntese)
                </label>
                <textarea
                  rows={4}
                  value={node.data.audioText || ''}
                  onChange={(e) => handleDataChange('audioText', e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl p-3 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 leading-relaxed"
                  placeholder="Digite a mensagem que será falada para o cliente..."
                />
              </div>
            )}

            <div className="flex items-center justify-between">
              <label className="text-xs font-medium text-slate-700 flex items-center gap-1.5">
                <input
                  type="checkbox"
                  checked={node.data.allowInterrupt ?? true}
                  onChange={(e) => handleDataChange('allowInterrupt', e.target.checked)}
                  className="rounded text-blue-600 focus:ring-0"
                />
                Permitir interrupção por tecla (Barge-in)
              </label>
            </div>

            {/* Listen button */}
            <button
              type="button"
              onClick={handlePlayAudio}
              className={`w-full py-2 px-3 rounded-xl font-bold flex items-center justify-center gap-2 text-xs transition border ${
                isPlayingAudio
                  ? 'bg-rose-50 text-rose-700 border-rose-200'
                  : 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100'
              }`}
            >
              {isPlayingAudio ? (
                <>
                  <Square className="w-3.5 h-3.5" /> Parar Reprodução
                </>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5" /> Ouvir Prévia do Áudio
                </>
              )}
            </button>
          </div>
        )}

        {/* 2. DTMF NODE SETTINGS */}
        {node.type === 'dtmf' && (
          <div className="space-y-4 pt-2 border-t border-slate-100">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                Teclas do Menu DTMF
              </label>
              <button
                type="button"
                onClick={handleAddDigit}
                className="text-xs text-blue-600 hover:text-blue-800 font-semibold flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" /> Adicionar Tecla
              </button>
            </div>

            <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
              {(node.data.digits || []).map((digitObj, idx) => (
                <div
                  key={idx}
                  className="flex items-center gap-2 p-2 bg-slate-50 rounded-xl border border-slate-200"
                >
                  <input
                    type="text"
                    maxLength={2}
                    value={digitObj.digit}
                    onChange={(e) => handleUpdateDigit(idx, 'digit', e.target.value)}
                    className="w-10 text-center font-bold font-mono bg-white border border-slate-300 rounded-lg py-1 text-slate-900"
                    placeholder="1"
                  />
                  <input
                    type="text"
                    value={digitObj.label}
                    onChange={(e) => handleUpdateDigit(idx, 'label', e.target.value)}
                    className="flex-1 bg-white border border-slate-300 rounded-lg px-2 py-1 text-slate-900"
                    placeholder="Descrição da opção"
                  />
                  <button
                    type="button"
                    onClick={() => handleRemoveDigit(idx)}
                    className="p-1 text-slate-400 hover:text-rose-600 rounded transition"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <div>
                <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">
                  Timeout (Segundos)
                </label>
                <input
                  type="number"
                  min="3"
                  max="30"
                  value={node.data.timeoutSeconds || 8}
                  onChange={(e) => handleDataChange('timeoutSeconds', parseInt(e.target.value) || 8)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-2.5 py-1.5 text-slate-900 font-mono"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">
                  Tentativas Máximas
                </label>
                <input
                  type="number"
                  min="1"
                  max="5"
                  value={node.data.invalidRetries || 3}
                  onChange={(e) => handleDataChange('invalidRetries', parseInt(e.target.value) || 3)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-2.5 py-1.5 text-slate-900 font-mono"
                />
              </div>
            </div>

            <label className="text-xs font-medium text-slate-700 flex items-center gap-1.5">
              <input
                type="checkbox"
                checked={node.data.repeatAudioOnInvalid ?? true}
                onChange={(e) => handleDataChange('repeatAudioOnInvalid', e.target.checked)}
                className="rounded text-blue-600 focus:ring-0"
              />
              Repetir mensagem em caso de opção incorreta
            </label>
          </div>
        )}

        {/* 3. AI AGENT NODE SETTINGS */}
        {node.type === 'ai_agent' && (
          <div className="space-y-3 pt-2 border-t border-slate-100">
            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                Agente de Inteligência Artificial
              </label>
              <select
                value={node.data.aiAgentId || availableAiAgents[0]?.id || ''}
                onChange={(e) => {
                  const agent = availableAiAgents.find((a) => a.id === e.target.value);
                  onUpdateNode({
                    ...node,
                    data: {
                      ...node.data,
                      aiAgentId: e.target.value,
                      aiAgentName: agent?.name || node.title,
                    },
                  });
                }}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900 font-medium"
              >
                {availableAiAgents.map((ag) => (
                  <option key={ag.id} value={ag.id}>
                    {ag.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                Contexto / Instrução Inicial da Ligação
              </label>
              <textarea
                rows={3}
                value={node.data.aiPromptContext || ''}
                onChange={(e) => handleDataChange('aiPromptContext', e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-slate-900 leading-relaxed"
                placeholder="Ex: Cliente transferido da URA Principal após selecionar opção 9 de suporte..."
              />
            </div>

            <div className="p-3 rounded-xl bg-purple-50 border border-purple-200 text-purple-900 text-xs flex items-start gap-2">
              <Bot className="w-4 h-4 text-purple-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold">Integração Stasis / Gemini Live:</span>
                <p className="text-[11px] text-purple-700 mt-0.5">
                  Conexão de áudio bidirecional em tempo real (AudioSocket 16kHz PCM) com a MaIA.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* 4. QUEUE NODE SETTINGS */}
        {node.type === 'queue' && (
          <div className="space-y-3 pt-2 border-t border-slate-100">
            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                Fila de Atendimento (ACD)
              </label>
              <select
                value={node.data.queueId || availableQueues[0]?.id || ''}
                onChange={(e) => {
                  const q = availableQueues.find((item) => item.id === e.target.value);
                  onUpdateNode({
                    ...node,
                    data: {
                      ...node.data,
                      queueId: e.target.value,
                      queueName: q?.name || node.title,
                    },
                  });
                }}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900 font-medium"
              >
                {availableQueues.map((q) => (
                  <option key={q.id} value={q.id}>
                    {q.name} ({q.number || q.id})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                Estratégia de Distribuição
              </label>
              <select
                value={node.data.queueStrategy || 'leastrecent'}
                onChange={(e) => handleDataChange('queueStrategy', e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900 font-medium"
              >
                <option value="leastrecent">Operador mais ocioso (leastrecent)</option>
                <option value="roundrobin">Distribuição Circular (roundrobin)</option>
                <option value="random">Aleatório (random)</option>
                <option value="ringall">Tocar todos simultaneamente (ringall)</option>
              </select>
            </div>
          </div>
        )}

        {/* 5. EXTENSION NODE SETTINGS */}
        {node.type === 'extension' && (
          <div className="space-y-3 pt-2 border-t border-slate-100">
            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                Ramal de Destino
              </label>
              <select
                value={node.data.extensionNumber || availableExtensions[0]?.number || ''}
                onChange={(e) => {
                  const ext = availableExtensions.find((item) => item.number === e.target.value);
                  onUpdateNode({
                    ...node,
                    data: {
                      ...node.data,
                      extensionNumber: e.target.value,
                      extensionName: ext?.name || node.title,
                    },
                  });
                }}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900 font-medium"
              >
                {availableExtensions.map((ext) => (
                  <option key={ext.id} value={ext.number}>
                    {ext.number} — {ext.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}

        {/* 6. TIME CONDITION NODE SETTINGS */}
        {node.type === 'time_condition' && (
          <div className="space-y-3 pt-2 border-t border-slate-100">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">
                  Início (Abertura)
                </label>
                <input
                  type="time"
                  value={node.data.timeCondition?.openTime || '08:00'}
                  onChange={(e) =>
                    handleDataChange('timeCondition', {
                      ...node.data.timeCondition,
                      openTime: e.target.value,
                    })
                  }
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-1.5 text-slate-900 font-mono"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">
                  Término (Fechamento)
                </label>
                <input
                  type="time"
                  value={node.data.timeCondition?.closeTime || '18:00'}
                  onChange={(e) =>
                    handleDataChange('timeCondition', {
                      ...node.data.timeCondition,
                      closeTime: e.target.value,
                    })
                  }
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-1.5 text-slate-900 font-mono"
                />
              </div>
            </div>

            <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-600 text-[11px]">
              Porta de saída <strong className="text-emerald-700">Aberto</strong> ativa no expediente, e{' '}
              <strong className="text-rose-700">Fechado</strong> fora do horário comercial.
            </div>
          </div>
        )}

        {/* 7. HANGUP NODE SETTINGS */}
        {node.type === 'hangup' && (
          <div className="space-y-3 pt-2 border-t border-slate-100">
            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                Causa do Desligamento (SIP Cause)
              </label>
              <select
                value={node.data.hangupCause || 'normal'}
                onChange={(e) => handleDataChange('hangupCause', e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900 font-medium"
              >
                <option value="normal">Normal (16 - Normal Clearing)</option>
                <option value="busy">Ocupado (17 - User Busy)</option>
                <option value="rejected">Rejeitado (21 - Call Rejected)</option>
                <option value="timeout">Timeout de Inatividade</option>
              </select>
            </div>
          </div>
        )}
      </div>

      {/* Panel Footer */}
      <div className="p-3 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
        {node.type !== 'start' ? (
          <button
            type="button"
            onClick={() => onDeleteNode(node.id)}
            className="px-3 py-1.5 text-rose-600 hover:bg-rose-50 rounded-lg font-semibold text-xs flex items-center gap-1 transition"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Excluir Bloco
          </button>
        ) : (
          <span className="text-[11px] text-slate-400 font-medium">Bloco inicial fixo</span>
        )}

        <button
          type="button"
          onClick={onClose}
          className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold text-xs shadow-sm transition"
        >
          Concluir
        </button>
      </div>
    </div>
  );
};
