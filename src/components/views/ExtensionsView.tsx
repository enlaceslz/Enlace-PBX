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
  Search,
  Copy,
  Check,
  Key,
  Smartphone,
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
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedExtForCreds, setSelectedExtForCreds] = useState<Extension | null>(null);
  const [editingExt, setEditingExt] = useState<Extension | null>(null);
  const [copiedCreds, setCopiedCreds] = useState(false);
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

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingExt) return;
    setIsSubmitting(true);
    try {
      await fetch(`/api/v1/extensions/${editingExt.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editingExt.name,
          callerId: editingExt.callerId,
          recording: editingExt.recording,
          allowAiTransfer: editingExt.allowAiTransfer,
          voicemail: editingExt.voicemail,
          context: editingExt.context,
        }),
      });
      setEditingExt(null);
      onRefresh();
    } catch (err) {
      console.error('Error updating extension:', err);
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

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCreds(true);
    setTimeout(() => setCopiedCreds(false), 2000);
  };

  const filteredExtensions = extensions.filter(
    (e) =>
      e.number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      e.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (e.callerId && e.callerId.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="max-w-[1400px] mx-auto space-y-8 pb-12">
      {/* Premium Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-6">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
            <Users className="w-8 h-8 text-blue-600 fill-blue-600" />
            Central de Ramais
          </h1>
          <p className="text-sm font-medium text-slate-500 mt-1">
            Gestão PJSIP para Softphones, Telefones IP de Mesa e Endpoints WebRTC.
          </p>
        </div>
        
        <div className="flex items-center gap-3">
            <span className="px-3 py-1.5 bg-slate-900 text-white border border-slate-700 rounded-lg text-xs font-black uppercase tracking-wider flex items-center gap-2 shadow-sm">
              res_pjsip
            </span>
            <button
              onClick={() => setIsModalOpen(true)}
              className="px-5 py-2.5 bg-blue-600 text-white hover:bg-blue-700 font-bold rounded-xl text-sm transition-all flex items-center gap-2 shadow-md shadow-blue-600/20"
            >
              <Plus className="w-4 h-4" /> Provisionar Ramal
            </button>
        </div>
      </div>

      {/* Filter / Search Bar */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-3.5 flex items-center gap-3">
        <Search className="w-4 h-4 text-slate-400" />
        <input
          type="text"
          placeholder="Buscar por número, nome ou Caller ID do ramal..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="bg-transparent text-xs text-slate-700 placeholder-slate-400 w-full focus:outline-none"
        />
        {searchTerm && (
          <button
            onClick={() => setSearchTerm('')}
            className="text-slate-400 hover:text-slate-600 text-xs px-2 py-0.5 rounded"
          >
            Limpar
          </button>
        )}
      </div>

      {/* Extensions Table Card */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/50 text-slate-500 font-mono text-[11px] uppercase">
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
              {filteredExtensions.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-slate-500 text-xs">
                    Nenhum ramal encontrado com o filtro aplicado.
                  </td>
                </tr>
              ) : (
                filteredExtensions.map((ext) => (
                  <tr key={ext.id} className="hover:bg-slate-50 transition">
                    <td className="py-3.5 px-4 font-mono font-bold text-slate-900 text-sm">
                      {ext.number}
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-slate-700">{ext.name}</div>
                      <div className="text-[10px] text-slate-500 font-mono">
                        Contexto: {ext.context}
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-slate-700 font-mono text-[11px]">
                      {ext.callerId}
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="flex flex-wrap gap-1">
                        {ext.codecs.map((codec) => (
                          <span
                            key={codec}
                            className="px-1.5 py-0.5 rounded bg-slate-100 text-[10px] font-mono text-slate-700 border border-slate-200"
                          >
                            {codec}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      {ext.webrtc ? (
                        <span className="text-blue-700 text-[10px] font-semibold bg-blue-50 border border-blue-200 px-2 py-0.5 rounded">
                          Sim (WSS)
                        </span>
                      ) : (
                        <span className="text-slate-500 text-[10px]">SIP Puro</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 capitalize text-slate-700">
                      <span className="text-[10px] px-2 py-0.5 rounded bg-slate-100 border border-slate-200">
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
                              ? 'bg-emerald-500'
                              : ext.status === 'busy'
                              ? 'bg-amber-500'
                              : 'bg-slate-400'
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
                        <span className="text-slate-500 text-[10px]">Bloqueado</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => setSelectedExtForCreds(ext)}
                          className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"
                          title="Ver Credenciais e PJSIP .conf"
                        >
                          <Key className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setEditingExt(ext)}
                          className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"
                          title="Editar Ramal"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => onOpenWebphone(ext.number)}
                          className="p-1.5 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition"
                          title="Discar para este ramal"
                        >
                          <Phone className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(ext.id, ext.number)}
                          className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                          title="Remover ramal"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
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
                <h3 className="text-base font-bold text-slate-900">Criar Novo Ramal PJSIP</h3>
                <p className="text-xs text-slate-500">Asterisk 20 Realtime Endpoint</p>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 text-slate-500 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">
                    Número do Ramal *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: 4104"
                    value={formData.number}
                    onChange={(e) => setFormData({ ...formData, number: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 font-mono focus:border-sky-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">
                    Nome do Usuário/Setor *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Amanda Lima (Vendas)"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 focus:border-sky-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">
                    Senha SIP (Secret)
                  </label>
                  <input
                    type="password"
                    placeholder="Gerada automaticamente se vazia"
                    value={formData.sipSecret}
                    onChange={(e) => setFormData({ ...formData, sipSecret: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 font-mono focus:border-sky-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">
                    Contexto do Dialplan
                  </label>
                  <input
                    type="text"
                    value={formData.context}
                    onChange={(e) => setFormData({ ...formData, context: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 font-mono focus:border-sky-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  Codecs de Áudio Suportados (Ordem de preferência)
                </label>
                <input
                  type="text"
                  value={formData.codecs}
                  onChange={(e) => setFormData({ ...formData, codecs: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 font-mono focus:border-sky-500 focus:outline-none"
                />
                <span className="text-[10px] text-slate-500">Opções: opus, pcma, pcmu, g722</span>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-2">
                <label className="flex items-center gap-2 cursor-pointer text-slate-700">
                  <input
                    type="checkbox"
                    checked={formData.webrtc}
                    onChange={(e) => setFormData({ ...formData, webrtc: e.target.checked })}
                    className="rounded bg-slate-50 border-slate-200 text-sky-500 focus:ring-sky-500"
                  />
                  <span>Habilitar WebRTC (Navegador)</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer text-slate-700">
                  <input
                    type="checkbox"
                    checked={formData.allowAiTransfer}
                    onChange={(e) => setFormData({ ...formData, allowAiTransfer: e.target.checked })}
                    className="rounded bg-slate-50 border-slate-200 text-sky-500 focus:ring-sky-500"
                  />
                  <span>Permitir Transbordo do Agente IA</span>
                </label>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl transition"
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

      {/* Modal: View SIP Credentials & PJSIP .conf snippet */}
      {selectedExtForCreds && (
        <div className="fixed inset-0 z-50 bg-slate-50/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-xl overflow-hidden shadow-2xl">
            <div className="px-6 py-4 bg-slate-50/90 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Key className="w-4 h-4 text-blue-600" />
                <h3 className="text-base font-bold text-slate-900">
                  Credenciais SIP & PJSIP — Ramal {selectedExtForCreds.number}
                </h3>
              </div>
              <button
                onClick={() => setSelectedExtForCreds(null)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              {/* Quick credentials grid */}
              <div className="grid grid-cols-2 gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200 font-mono text-[11px]">
                <div>
                  <span className="text-slate-500 block text-[10px] uppercase">Servidor / Host SIP:</span>
                  <span className="text-slate-900 font-bold">pbx.enlace.local (Porta 5060/5061)</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px] uppercase">Usuário / Ramal:</span>
                  <span className="text-blue-700 font-bold">{selectedExtForCreds.number}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px] uppercase">Senha SIP (Secret):</span>
                  <span className="text-slate-900 font-bold bg-white px-2 py-0.5 rounded border border-slate-200 select-all">
                    {selectedExtForCreds.sipSecret}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px] uppercase">Caller ID Transmitido:</span>
                  <span className="text-slate-700">{selectedExtForCreds.callerId}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px] uppercase">Transporte:</span>
                  <span className="text-slate-700">UDP, TCP, TLS (WSS para WebRTC)</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px] uppercase">Codecs Habilitados:</span>
                  <span className="text-slate-700">{selectedExtForCreds.codecs.join(', ')}</span>
                </div>
              </div>

              {/* Compatible hardware note */}
              <div className="flex items-center gap-2 p-3 bg-blue-50/50 rounded-xl border border-blue-100 text-slate-600 text-[11px]">
                <Smartphone className="w-4 h-4 text-blue-600 flex-shrink-0" />
                <span>
                  Compatível com <strong>Grandstream, Yealink, Intelbras TIP, Fanvil, MicroSIP, Zoiper</strong> e endpoints WebRTC.
                </span>
              </div>

              {/* Asterisk pjsip.conf snippet */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[10px] font-mono text-slate-500 uppercase font-bold">
                    Stanza Asterisk 20 (/etc/asterisk/pjsip.conf):
                  </span>
                  <button
                    onClick={() =>
                      handleCopy(`; Configuração PJSIP para Ramal ${selectedExtForCreds.number}
[${selectedExtForCreds.number}]
type=endpoint
context=${selectedExtForCreds.context}
disallow=all
allow=${selectedExtForCreds.codecs.join(',')}
auth=${selectedExtForCreds.number}-auth
aors=${selectedExtForCreds.number}
direct_media=no
rtp_symmetric=yes
force_rport=yes
rewrite_contact=yes
${selectedExtForCreds.webrtc ? `webrtc=yes\nmedia_encryption=dtls\ndtls_verify=fingerprint\ndtls_setup=actpass\nuse_avpf=yes` : ''}

[${selectedExtForCreds.number}-auth]
type=auth
auth_type=userpass
username=${selectedExtForCreds.number}
password=${selectedExtForCreds.sipSecret}

[${selectedExtForCreds.number}]
type=aor
max_contacts=5
remove_existing=yes
qualify_frequency=30`)
                    }
                    className="text-[11px] text-blue-600 hover:text-blue-700 font-semibold flex items-center gap-1"
                  >
                    {copiedCreds ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                    {copiedCreds ? 'Copiado!' : 'Copiar Stanza PJSIP'}
                  </button>
                </div>
                <pre className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-[11px] font-mono text-slate-700 overflow-x-auto max-h-40 leading-relaxed">
{`; Configuração PJSIP para Ramal ${selectedExtForCreds.number}
[${selectedExtForCreds.number}]
type=endpoint
context=${selectedExtForCreds.context}
disallow=all
allow=${selectedExtForCreds.codecs.join(',')}
auth=${selectedExtForCreds.number}-auth
aors=${selectedExtForCreds.number}
direct_media=no
rtp_symmetric=yes
force_rport=yes
rewrite_contact=yes
${selectedExtForCreds.webrtc ? `webrtc=yes\nmedia_encryption=dtls\ndtls_verify=fingerprint\ndtls_setup=actpass\nuse_avpf=yes\n` : ''}
[${selectedExtForCreds.number}-auth]
type=auth
auth_type=userpass
username=${selectedExtForCreds.number}
password=${selectedExtForCreds.sipSecret}

[${selectedExtForCreds.number}]
type=aor
max_contacts=5
remove_existing=yes
qualify_frequency=30`}
                </pre>
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  onClick={() => setSelectedExtForCreds(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-semibold transition"
                >
                  Fechar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Edit Extension */}
      {editingExt && (
        <div className="fixed inset-0 z-50 bg-slate-50/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl">
            <div className="px-6 py-4 bg-slate-50/90 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Editar Ramal PJSIP {editingExt.number}
                </h3>
                <p className="text-xs text-slate-500">Atualizar parâmetros operacionais do ramal</p>
              </div>
              <button
                onClick={() => setEditingExt(null)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdate} className="p-6 space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">
                    Número do Ramal
                  </label>
                  <input
                    type="text"
                    disabled
                    value={editingExt.number}
                    className="w-full bg-slate-100 border border-slate-200 rounded-xl px-3 py-2 text-slate-500 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">
                    Nome / Identificação
                  </label>
                  <input
                    type="text"
                    required
                    value={editingExt.name}
                    onChange={(e) => setEditingExt({ ...editingExt, name: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 focus:border-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  Caller ID de Apresentação
                </label>
                <input
                  type="text"
                  value={editingExt.callerId}
                  onChange={(e) => setEditingExt({ ...editingExt, callerId: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 font-mono focus:border-blue-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">
                    Política de Gravação
                  </label>
                  <select
                    value={editingExt.recording}
                    onChange={(e) =>
                      setEditingExt({ ...editingExt, recording: e.target.value as any })
                    }
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 focus:border-blue-500 focus:outline-none"
                  >
                    <option value="always">Sempre Gravar (100%)</option>
                    <option value="on_demand">Gravação sob Demanda</option>
                    <option value="never">Não Gravar</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">
                    Contexto do Dialplan
                  </label>
                  <input
                    type="text"
                    value={editingExt.context}
                    onChange={(e) => setEditingExt({ ...editingExt, context: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 font-mono focus:border-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-2">
                <label className="flex items-center gap-2 cursor-pointer text-slate-700">
                  <input
                    type="checkbox"
                    checked={editingExt.allowAiTransfer}
                    onChange={(e) =>
                      setEditingExt({ ...editingExt, allowAiTransfer: e.target.checked })
                    }
                    className="rounded bg-slate-50 border-slate-200 text-blue-600 focus:ring-blue-500"
                  />
                  <span>Permitir Transbordo do Agente IA</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer text-slate-700">
                  <input
                    type="checkbox"
                    checked={editingExt.voicemail}
                    onChange={(e) => setEditingExt({ ...editingExt, voicemail: e.target.checked })}
                    className="rounded bg-slate-50 border-slate-200 text-blue-600 focus:ring-blue-500"
                  />
                  <span>Caixa Postal / Voicemail</span>
                </label>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setEditingExt(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition disabled:opacity-50"
                >
                  {isSubmitting ? 'Salvando...' : 'Salvar Alterações'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
