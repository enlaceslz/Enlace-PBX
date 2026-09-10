import React, { useState } from 'react';
import {
  Users,
  Plus,
  Phone,
  CheckCircle2,
  XCircle,
  Clock,
  Shield,
  Radio,
  FileCode,
  Trash2,
  Edit2,
  X,
} from 'lucide-react';
import { Extension } from '../../types/pbx';

interface ExtensionsViewProps {
  extensions: Extension[];
  onRefresh: () => void;
  onOpenWebphone: (number: string) => void;
}

export const ExtensionsView: React.FC<ExtensionsViewProps> = ({
  extensions,
  onRefresh,
  onOpenWebphone,
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    number: '',
    name: '',
    callerId: '',
    sipSecret: '',
    context: 'from-internal',
    codecs: 'opus, pcma, pcmu, g722',
    nat: true,
    webrtc: true,
    recording: 'always' as const,
    voicemail: true,
    allowAiTransfer: true,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.number || !formData.name) return;

    setIsSubmitting(true);
    try {
      await fetch('/api/v1/extensions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          number: formData.number,
          name: formData.name,
          callerId: formData.callerId || `"${formData.name}" <${formData.number}>`,
          sipSecret: formData.sipSecret || `Enlace@${formData.number}#Sec`,
          context: formData.context,
          codecs: formData.codecs.split(',').map((c) => c.trim()),
          nat: formData.nat,
          webrtc: formData.webrtc,
          recording: formData.recording,
          voicemail: formData.voicemail,
          allowAiTransfer: formData.allowAiTransfer,
        }),
      });
      setIsModalOpen(false);
      setFormData({
        number: '',
        name: '',
        callerId: '',
        sipSecret: '',
        context: 'from-internal',
        codecs: 'opus, pcma, pcmu, g722',
        nat: true,
        webrtc: true,
        recording: 'always',
        voicemail: true,
        allowAiTransfer: true,
      });
      onRefresh();
    } catch (err) {
      console.error('Error creating extension:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string, number: string) => {
    if (!confirm(`Deseja realmente remover o ramal ${number}?`)) return;
    try {
      await fetch(`/api/v1/extensions/${id}`, { method: 'DELETE' });
      onRefresh();
    } catch (err) {
      console.error('Delete error:', err);
    }
  };

  return (
    <div className="space-y-6">
      {/* View Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-xl font-black text-slate-800 tracking-tight">
              Ramais SIP (PJSIP Realtime)
            </h1>
            <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-mono">
              res_pjsip • Asterisk 20
            </span>
          </div>
          <p className="text-xs text-slate-400">
            Gerenciamento de ramais IP, telefones físicos, softphones e endpoints WebRTC no padrão brasileiro.
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs flex items-center gap-2 shadow-lg shadow-blue-600/20 transition active:scale-95"
        >
          <Plus className="w-4 h-4" />
          Novo Ramal PJSIP
        </button>
      </div>

      {/* Extensions Table Card */}
      <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/50 text-slate-400 font-mono text-[11px] uppercase">
                <th className="py-3 px-4">Ramal</th>
                <th className="py-3 px-4">Nome / Usuário</th>
                <th className="py-3 px-4">Caller ID</th>
                <th className="py-3 px-4">Codecs</th>
                <th className="py-3 px-4">WebRTC</th>
                <th className="py-3 px-4">Gravação</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Transbordo IA</th>
                <th className="py-3 px-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-sans">
              {extensions.map((ext) => (
                <tr key={ext.id} className="hover:bg-slate-50 transition">
                  <td className="py-3.5 px-4 font-mono font-bold text-slate-800 text-sm">
                    {ext.number}
                  </td>
                  <td className="py-3.5 px-4">
                    <div className="font-semibold text-slate-700">{ext.name}</div>
                    <div className="text-[10px] text-slate-400 font-mono">
                      Contexto: {ext.context}
                    </div>
                  </td>
                  <td className="py-3.5 px-4 text-slate-600 font-mono text-[11px]">
                    {ext.callerId}
                  </td>
                  <td className="py-3.5 px-4">
                    <div className="flex flex-wrap gap-1">
                      {ext.codecs.map((codec) => (
                        <span
                          key={codec}
                          className="px-1.5 py-0.2 rounded bg-slate-100 text-[10px] font-mono text-slate-600"
                        >
                          {codec}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="py-3.5 px-4">
                    {ext.webrtc ? (
                      <span className="text-blue-600 text-[10px] font-semibold bg-sky-950/60 border border-sky-800/60 px-2 py-0.5 rounded">
                        Sim (WSS)
                      </span>
                    ) : (
                      <span className="text-slate-400 text-[10px]">SIP Puro</span>
                    )}
                  </td>
                  <td className="py-3.5 px-4 capitalize text-slate-600">
                    <span className="text-[10px] px-2 py-0.5 rounded bg-slate-100">
                      {ext.recording === 'always'
                        ? 'Sempre (100%)'
                        : ext.recording === 'on_demand'
                        ? 'Sob Demanda'
                        : 'Nunca'}
                    </span>
                  </td>
                  <td className="py-3.5 px-4">
                    <div className="flex items-center gap-1.5">
                      <span
                        className={`w-2 h-2 rounded-full ${
                          ext.status === 'online'
                            ? 'bg-sky-400'
                            : ext.status === 'busy'
                            ? 'bg-amber-400'
                            : 'bg-slate-600'
                        }`}
                      />
                      <span className="capitalize text-slate-700 text-[11px] font-medium">
                        {ext.status === 'online'
                          ? 'Online'
                          : ext.status === 'busy'
                          ? 'Ocupado'
                          : 'Offline'}
                      </span>
                    </div>
                  </td>
                  <td className="py-3.5 px-4">
                    {ext.allowAiTransfer ? (
                      <span className="text-teal-600 text-[10px] font-semibold flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" /> Habilitado
                      </span>
                    ) : (
                      <span className="text-slate-400 text-[10px]">Bloqueado</span>
                    )}
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => onOpenWebphone(ext.number)}
                        className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-slate-100 rounded-lg transition"
                        title="Discar para este ramal"
                      >
                        <Phone className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDelete(ext.id, ext.number)}
                        className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-100 rounded-lg transition"
                        title="Remover ramal"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: New Extension */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-50/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl">
            <div className="px-6 py-4 bg-slate-50/90 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-800">Criar Novo Ramal PJSIP</h3>
                <p className="text-xs text-slate-400">Asterisk 20 Realtime Endpoint</p>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-600 font-semibold mb-1">
                    Número do Ramal *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: 4104"
                    value={formData.number}
                    onChange={(e) => setFormData({ ...formData, number: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-800 font-mono focus:border-sky-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 font-semibold mb-1">
                    Nome do Usuário/Setor *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Amanda Lima (Vendas)"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-800 focus:border-sky-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-600 font-semibold mb-1">
                    Senha SIP (Secret)
                  </label>
                  <input
                    type="password"
                    placeholder="Gerada automaticamente se vazia"
                    value={formData.sipSecret}
                    onChange={(e) => setFormData({ ...formData, sipSecret: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-800 font-mono focus:border-sky-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 font-semibold mb-1">
                    Contexto do Dialplan
                  </label>
                  <input
                    type="text"
                    value={formData.context}
                    onChange={(e) => setFormData({ ...formData, context: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-800 font-mono focus:border-sky-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-600 font-semibold mb-1">
                  Codecs de Áudio Suportados (Ordem de preferência)
                </label>
                <input
                  type="text"
                  value={formData.codecs}
                  onChange={(e) => setFormData({ ...formData, codecs: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-800 font-mono focus:border-sky-500 focus:outline-none"
                />
                <span className="text-[10px] text-slate-400">Opções: opus, pcma, pcmu, g722</span>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-2">
                <label className="flex items-center gap-2 cursor-pointer text-slate-600">
                  <input
                    type="checkbox"
                    checked={formData.webrtc}
                    onChange={(e) => setFormData({ ...formData, webrtc: e.target.checked })}
                    className="rounded bg-slate-50 border-slate-300 text-sky-500 focus:ring-sky-500"
                  />
                  <span>Habilitar WebRTC (Navegador)</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer text-slate-600">
                  <input
                    type="checkbox"
                    checked={formData.allowAiTransfer}
                    onChange={(e) => setFormData({ ...formData, allowAiTransfer: e.target.checked })}
                    className="rounded bg-slate-50 border-slate-300 text-sky-500 focus:ring-sky-500"
                  />
                  <span>Permitir Transbordo do Agente IA</span>
                </label>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 font-semibold rounded-xl transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition disabled:opacity-50"
                >
                  {isSubmitting ? 'Salvando...' : 'Cadastrar Ramal PJSIP'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
