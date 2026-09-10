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
    try {
      await fetch('/api/v1/trunks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          codecs: formData.codecs.split(',').map((c) => c.trim()),
          context: 'from-trunk',
        }),
      });
      setIsModalOpen(false);
      onRefresh();
    } catch (err) {
      console.error('Error adding trunk:', err);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-xl font-black text-slate-100 tracking-tight">
              Troncos SIP (Operadoras Brasileiras)
            </h1>
            <span className="text-[10px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded-full font-mono">
              PJSIP Trunking
            </span>
          </div>
          <p className="text-xs text-slate-400">
            Conexão com provedores VoIP, entroncamento E1 digital e números 0800 com suporte a UDP, TCP e TLS.
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="px-4 py-2.5 bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold rounded-xl text-xs flex items-center gap-2 shadow-lg shadow-sky-950/40 transition active:scale-95"
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
            className="bg-slate-900/80 rounded-2xl border border-slate-800/80 p-5 flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase bg-slate-800 text-slate-300">
                  {trunk.transport}
                </span>
                <div className="flex items-center gap-1.5 text-xs">
                  <span
                    className={`w-2 h-2 rounded-full ${
                      trunk.status === 'registered' ? 'bg-sky-400' : 'bg-rose-500'
                    }`}
                  />
                  <span
                    className={`font-semibold ${
                      trunk.status === 'registered' ? 'text-sky-400' : 'text-rose-400'
                    }`}
                  >
                    {trunk.status === 'registered' ? 'Registrado' : 'Desconectado'}
                  </span>
                </div>
              </div>

              <h3 className="font-bold text-slate-100 text-base">{trunk.name}</h3>
              <p className="text-xs text-slate-400 mt-0.5">{trunk.providerName}</p>

              <div className="mt-4 space-y-2 text-xs font-mono">
                <div className="flex items-center justify-between text-slate-400 py-1 border-b border-slate-800/60">
                  <span>Host / Servidor:</span>
                  <span className="text-slate-200">{trunk.host}:{trunk.port}</span>
                </div>
                <div className="flex items-center justify-between text-slate-400 py-1 border-b border-slate-800/60">
                  <span>Caller ID:</span>
                  <span className="text-slate-200">{trunk.callerId}</span>
                </div>
                <div className="flex items-center justify-between text-slate-400 py-1 border-b border-slate-800/60">
                  <span>Canais Simultâneos:</span>
                  <span className="text-sky-400 font-bold">
                    {trunk.channelsInUse} / {trunk.channelsMax} em uso
                  </span>
                </div>
                <div className="flex items-center justify-between text-slate-400 py-1">
                  <span>Codecs:</span>
                  <span className="text-slate-300">{trunk.codecs.join(', ')}</span>
                </div>
              </div>
            </div>

            <div className="mt-5 pt-3 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-500">
              <span>Contexto: {trunk.context}</span>
              <span className="text-slate-400">Qualify: 60s</span>
            </div>
          </div>
        ))}
      </div>

      {/* Modal: New Trunk */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl">
            <div className="px-6 py-4 bg-slate-950/90 border-b border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-100">Adicionar Tronco SIP</h3>
                <p className="text-xs text-slate-400">Configuração de operadora brasileira para Asterisk 20</p>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="p-1 text-slate-400 hover:text-slate-200">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
              {/* Presets */}
              <div>
                <label className="block text-slate-400 font-semibold mb-1.5 uppercase text-[10px] tracking-wider">
                  Presets Rápidos de Operadoras Nacionais:
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {brazilianPresets.map((p, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleApplyPreset(p)}
                      className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-[11px] transition"
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Nome do Tronco *</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Ex: Vivo Fibra SIP Principal"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-slate-100 focus:border-sky-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <label className="block text-slate-300 font-semibold mb-1">Host / SIP Proxy *</label>
                  <input
                    type="text"
                    required
                    value={formData.host}
                    onChange={(e) => setFormData({ ...formData, host: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-slate-100 font-mono focus:border-sky-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Porta</label>
                  <input
                    type="number"
                    value={formData.port}
                    onChange={(e) => setFormData({ ...formData, port: Number(e.target.value) })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-slate-100 font-mono focus:border-sky-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Usuário / Conta SIP</label>
                  <input
                    type="text"
                    value={formData.username}
                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                    placeholder="Ex: 1130900100"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-slate-100 font-mono focus:border-sky-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Caller ID de Saída</label>
                  <input
                    type="text"
                    value={formData.callerId}
                    onChange={(e) => setFormData({ ...formData, callerId: e.target.value })}
                    placeholder="Ex: 1130900100"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-slate-100 font-mono focus:border-sky-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Protocolo Transporte</label>
                  <select
                    value={formData.transport}
                    onChange={(e) => setFormData({ ...formData, transport: e.target.value as any })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-slate-100 focus:border-sky-500 focus:outline-none"
                  >
                    <option value="UDP">UDP (Padrão)</option>
                    <option value="TCP">TCP</option>
                    <option value="TLS">TLS (Criptografado)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Canais Simultâneos</label>
                  <input
                    type="number"
                    value={formData.channelsMax}
                    onChange={(e) => setFormData({ ...formData, channelsMax: Number(e.target.value) })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-slate-100 font-mono focus:border-sky-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold rounded-xl transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold rounded-xl transition"
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
