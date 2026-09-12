import React, { useState } from 'react';
import {
  Radio,
  Plus,
  CheckCircle2,
  AlertCircle,
  Shield,
  Server,
  Trash2,
  X,
  Layers,
} from 'lucide-react';
import { Trunk } from '../../types/pbx';

interface TrunksViewProps {
  trunks: Trunk[];
  onRefresh: () => void;
}

export const TrunksView: React.FC<TrunksViewProps> = ({ trunks, onRefresh }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    providerName: 'Vivo Empresas',
    host: 'sip.vivo.com.br',
    port: 5060,
    username: '',
    transport: 'TLS' as 'UDP' | 'TCP' | 'TLS',
    callerId: '',
    codecs: 'pcma, pcmu, g722',
    channelsMax: 30,
    register: true,
  });

  const brazilianPresets = [
    { label: 'Vivo Fibra SIP (Telefônica)', provider: 'Telefônica Brasil (Vivo)', host: 'sip.vivo.com.br', transport: 'TLS' as const },
    { label: 'Claro Embratel SIP / 0800', provider: 'Claro Brasil', host: 'sip0800.embratel.net.br', transport: 'UDP' as const },
    { label: 'Algar Telecom Corporativo', provider: 'Algar Telecom', host: 'sip.algartelecom.com.br', transport: 'TCP' as const },
    { label: 'TIM Brasil Empresas', provider: 'TIM Brasil', host: 'sip.tim.com.br', transport: 'TLS' as const },
    { label: 'Datora VoIP / IPPBX', provider: 'Datora Telecom', host: 'sip.datora.net', transport: 'UDP' as const },
  ];

  const handleApplyPreset = (preset: typeof brazilianPresets[0]) => {
    setFormData({
      ...formData,
      name: preset.label,
      providerName: preset.provider,
      host: preset.host,
      transport: preset.transport,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!formData.name || !formData.host) {
      setFormError('Nome do tronco e Host SIP são obrigatórios.');
      return;
    }

    try {
      const res = await fetch('/api/v1/trunks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          codecs: formData.codecs.split(',').map((c) => c.trim()),
          context: 'from-trunk',
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setFormError(data.error || 'Erro ao registrar tronco SIP.');
        return;
      }

      setIsModalOpen(false);
      onRefresh();
    } catch (err) {
      console.error('Error adding trunk:', err);
      setFormError('Falha na comunicação com o servidor.');
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Deseja realmente remover o tronco ${name}?`)) return;
    try {
      await fetch(`/api/v1/trunks/${id}`, { method: 'DELETE' });
      onRefresh();
    } catch (err) {
      console.error('Delete error:', err);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-xl font-black text-slate-900 tracking-tight">
              Troncos SIP (Operadoras Brasileiras)
            </h1>
            <span className="text-[10px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded-full font-mono">
              PJSIP Trunking
            </span>
          </div>
          <p className="text-xs text-slate-500">
            Conexão com provedores VoIP, entroncamento E1 digital e números 0800 com suporte a UDP, TCP e TLS.
          </p>
        </div>

        <button
          onClick={() => { setFormError(null); setIsModalOpen(true); }}
          className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs flex items-center gap-2 shadow-lg shadow-blue-600/20 transition active:scale-95"
        >
          <Plus className="w-4 h-4" />
          Conectar Novo Tronco SIP
        </button>
      </div>

      {/* Trunks Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {trunks.map((trunk) => (
          <div
            key={trunk.id}
            className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 flex flex-col justify-between group"
          >
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase bg-slate-100 text-slate-700">
                  {trunk.transport}
                </span>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1.5 text-xs">
                    <span
                      className={`w-2 h-2 rounded-full ${
                        trunk.status === 'registered' ? 'bg-blue-400' : 'bg-rose-500'
                      }`}
                    />
                    <span
                      className={`font-semibold ${
                        trunk.status === 'registered' ? 'text-blue-600' : 'text-rose-400'
                      }`}
                    >
                      {trunk.status === 'registered' ? 'Registrado' : 'Desconectado'}
                    </span>
                  </div>
                  <button
                    onClick={() => handleDelete(trunk.id, trunk.name)}
                    className="text-slate-500 hover:text-rose-400 opacity-0 group-hover:opacity-100 transition p-1 rounded-lg hover:bg-slate-100"
                    title="Remover Tronco"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <h3 className="font-bold text-slate-900 text-base">{trunk.name}</h3>
              <p className="text-xs text-slate-500 mt-0.5">{trunk.providerName}</p>

              <div className="mt-4 space-y-2 text-xs font-mono">
                <div className="flex items-center justify-between text-slate-500 py-1 border-b border-slate-200">
                  <span>Host / Servidor:</span>
                  <span className="text-slate-700">{trunk.host}:{trunk.port}</span>
                </div>
                <div className="flex items-center justify-between text-slate-500 py-1 border-b border-slate-200">
                  <span>Caller ID:</span>
                  <span className="text-slate-700">{trunk.callerId}</span>
                </div>
                <div className="flex items-center justify-between text-slate-500 py-1 border-b border-slate-200">
                  <span>Canais Simultâneos:</span>
                  <span className="text-blue-600 font-bold">
                    {trunk.channelsInUse} / {trunk.channelsMax} em uso
                  </span>
                </div>
                <div className="flex items-center justify-between text-slate-500 py-1">
                  <span>Codecs:</span>
                  <span className="text-slate-700">{trunk.codecs.join(', ')}</span>
                </div>
              </div>
            </div>

            <div className="mt-5 pt-3 border-t border-slate-200 flex items-center justify-between text-[11px] text-slate-500">
              <span>Contexto: {trunk.context}</span>
              <span className="text-slate-500">Qualify: 60s</span>
            </div>
          </div>
        ))}
      </div>

      {/* Modal: New Trunk */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-50/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl">
            <div className="px-6 py-4 bg-slate-50/90 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900">Adicionar Tronco SIP</h3>
                <p className="text-xs text-slate-500">Configuração de operadora brasileira para Asterisk 20</p>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="p-1 text-slate-500 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
              {formError && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                  <span>{formError}</span>
                </div>
              )}
              {/* Presets */}
              <div>
                <label className="block text-slate-500 font-semibold mb-1.5 uppercase text-[10px] tracking-wider">
                  Presets Rápidos de Operadoras Nacionais:
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {brazilianPresets.map((p, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleApplyPreset(p)}
                      className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-[11px] transition"
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Nome do Tronco *</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Ex: Vivo Fibra SIP Principal"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 focus:border-sky-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <label className="block text-slate-700 font-semibold mb-1">Host / SIP Proxy *</label>
                  <input
                    type="text"
                    required
                    value={formData.host}
                    onChange={(e) => setFormData({ ...formData, host: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 font-mono focus:border-sky-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Porta</label>
                  <input
                    type="number"
                    value={formData.port}
                    onChange={(e) => setFormData({ ...formData, port: Number(e.target.value) })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 font-mono focus:border-sky-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Usuário / Conta SIP</label>
                  <input
                    type="text"
                    value={formData.username}
                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                    placeholder="Ex: 1130900100"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 font-mono focus:border-sky-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Caller ID de Saída</label>
                  <input
                    type="text"
                    value={formData.callerId}
                    onChange={(e) => setFormData({ ...formData, callerId: e.target.value })}
                    placeholder="Ex: 1130900100"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 font-mono focus:border-sky-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Protocolo Transporte</label>
                  <select
                    value={formData.transport}
                    onChange={(e) => setFormData({ ...formData, transport: e.target.value as any })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 focus:border-sky-500 focus:outline-none"
                  >
                    <option value="UDP">UDP (Padrão)</option>
                    <option value="TCP">TCP</option>
                    <option value="TLS">TLS (Criptografado)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Canais Simultâneos</label>
                  <input
                    type="number"
                    value={formData.channelsMax}
                    onChange={(e) => setFormData({ ...formData, channelsMax: Number(e.target.value) })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 font-mono focus:border-sky-500 focus:outline-none"
                  />
                </div>
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
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition"
                >
                  Salvar Tronco
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
