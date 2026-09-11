import React, { useState, useEffect } from 'react';
import {
  Server,
  FileCode,
  Download,
  Copy,
  Check,
  Terminal,
  Activity,
  Cpu,
  Layers,
  ShieldCheck,
  Radio,
  RefreshCw,
  PhoneOff,
  Forward,
  Eye,
  X,
  ScrollText,
  Play
} from 'lucide-react';
import { AsteriskChannel } from '../../types/pbx';
import { SystemLogsView } from './SystemLogsView';

interface AsteriskCoreViewProps {
  channels: AsteriskChannel[];
  onRefreshChannels: () => void;
  initialTab?: 'monitor' | 'cli' | 'configs' | 'installer' | 'syslog' | 'sip_trace';
}

export const AsteriskCoreView: React.FC<AsteriskCoreViewProps> = ({
  channels,
  onRefreshChannels,
  initialTab = 'monitor',
}) => {
  const [activeTab, setActiveTab] = useState<'monitor' | 'cli' | 'configs' | 'installer' | 'syslog' | 'sip_trace'>(initialTab);

  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);
  const [activeConfigFile, setActiveConfigFile] = useState<'pjsip' | 'extensions' | 'queues' | 'rtp' | 'audiosocket' | 'ari'>('pjsip');
  const [configContent, setConfigContent] = useState<string>('');
  const [installerScript, setInstallerScript] = useState<string>('');
  const [copied, setCopied] = useState(false);
  const [loadingConfig, setLoadingConfig] = useState(false);
  const [reloadingCore, setReloadingCore] = useState(false);
  const [reloadSuccessMsg, setReloadSuccessMsg] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [transferModalChan, setTransferModalChan] = useState<AsteriskChannel | null>(null);
  const [transferTarget, setTransferTarget] = useState('4102');

  const showActionMsg = (text: string, type: 'success' | 'error' = 'success') => {
    setActionMessage({ text, type });
    setTimeout(() => setActionMessage(null), 3500);
  };

  const handleHangupChannel = async (chanId: string) => {
    setActionLoading(`hangup-${chanId}`);
    try {
      const res = await fetch(`/api/v1/asterisk/channels/${chanId}/hangup`, { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        showActionMsg(`Canal ${chanId} desconectado pelo ARI.`);
        onRefreshChannels();
      } else {
        showActionMsg('Não foi possível derrubar o canal.', 'error');
      }
    } catch {
      showActionMsg('Erro de comunicação com o Asterisk.', 'error');
    } finally {
      setActionLoading(null);
    }
  };

  const handleExecuteTransfer = async () => {
    if (!transferModalChan || !transferTarget.trim()) return;
    const chanId = transferModalChan.id;
    setActionLoading(`transfer-${chanId}`);
    try {
      const res = await fetch(`/api/v1/asterisk/channels/${chanId}/transfer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ destination: transferTarget.trim() }),
      });
      const data = await res.json();
      if (data.success) {
        showActionMsg(`Canal transferido com sucesso para ${transferTarget.trim()}.`);
        setTransferModalChan(null);
        onRefreshChannels();
      } else {
        showActionMsg(data.error || 'Erro ao transferir canal.', 'error');
      }
    } catch {
      showActionMsg('Erro ao transferir canal via ARI.', 'error');
    } finally {
      setActionLoading(null);
    }
  };

  const handleSpyChannel = async (chanId: string) => {
    setActionLoading(`spy-${chanId}`);
    try {
      const res = await fetch(`/api/v1/asterisk/channels/${chanId}/spy`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ supervisorExt: '4101' }),
      });
      const data = await res.json();
      if (data.success) {
        showActionMsg(`ChanSpy iniciado no ramal supervisor 4101 ouvindo canal ${chanId}.`);
        onRefreshChannels();
      }
    } catch {
      showActionMsg('Erro ao iniciar ChanSpy.', 'error');
    } finally {
      setActionLoading(null);
    }
  };

  // Asterisk CLI Terminal state
  const [cliHistory, setCliHistory] = useState<Array<{ cmd: string; output: string }>>([
    {
      cmd: 'core show version',
      output: 'Asterisk 20.17.0 LTS built by root @ enlace-core-node-01 on a x86_64 running Linux',
    },
    {
      cmd: 'core show uptime',
      output: 'System uptime: 4 days, 18 hours, 32 minutes, 14 seconds\nLast reload: 1 day, 6 hours, 10 minutes, 2 segundos',
    },
  ]);
  const [cliInput, setCliInput] = useState('');
  const [cliLoading, setCliLoading] = useState(false);

  const handleExecuteCli = async (commandToRun?: string) => {
    const cmd = (commandToRun !== undefined ? commandToRun : cliInput).trim();
    if (!cmd || cliLoading) return;
    setCliLoading(true);
    try {
      const res = await fetch('/api/v1/asterisk/cli', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ command: cmd }),
      });
      const data = await res.json();
      setCliHistory((prev) => [...prev, { cmd, output: data.output }]);
      if (commandToRun === undefined) setCliInput('');
    } catch (e) {
      setCliHistory((prev) => [...prev, { cmd, output: 'Erro de conexão com o socket CLI do Asterisk.' }]);
    } finally {
      setCliLoading(false);
    }
  };

  const handleReloadAsterisk = async () => {
    setReloadingCore(true);
    setReloadSuccessMsg(null);
    try {
      const res = await fetch('/api/v1/asterisk/reload', { method: 'POST' });
      const data = await res.json();
      setReloadSuccessMsg('Módulos PJSIP, Dialplan e AudioSocket recarregados com sucesso!');
      setTimeout(() => setReloadSuccessMsg(null), 4000);
      onRefreshChannels();
    } catch (e) {
      console.error('Reload error:', e);
    } finally {
      setReloadingCore(false);
    }
  };

  useEffect(() => {
    fetchConfig(activeConfigFile);
    fetchInstallerScript();
  }, [activeConfigFile]);

  const fetchConfig = async (file: 'pjsip' | 'extensions' | 'queues' | 'rtp' | 'audiosocket' | 'ari') => {
    setLoadingConfig(true);
    try {
      const res = await fetch(`/api/v1/asterisk/configs/${file}`);
      const text = await res.text();
      setConfigContent(text);
    } catch (e) {
      console.error('Fetch config error:', e);
    } finally {
      setLoadingConfig(false);
    }
  };

  const fetchInstallerScript = async () => {
    try {
      const res = await fetch('/api/v1/asterisk/install-script');
      const text = await res.text();
      setInstallerScript(text);
    } catch (e) {
      console.error('Fetch installer script error:', e);
    }
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadFile = (content: string, filename: string) => {
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="max-w-[1400px] mx-auto space-y-8 pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
              <Server className="w-8 h-8 text-blue-600 fill-blue-600" />
              Asterisk Core 20 LTS
            </h1>
            <span className="px-2.5 py-1 bg-slate-900 text-white border border-slate-700 rounded-lg text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 ml-2">
              <Radio className="w-3 h-3 text-emerald-400 animate-pulse" /> Motor SIP Ativo
            </span>
          </div>
          <p className="text-sm font-medium text-slate-500 mt-1">
            Gestão avançada do kernel, Asterisk REST Interface (ARI) e provisionamento via PJSIP.
          </p>
        </div>

        {/* Tab Controls */}
        <div className="flex bg-slate-100 p-1.5 rounded-xl border border-slate-200 shadow-sm self-start">
          <button
            onClick={() => setActiveTab('monitor')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 ${
              activeTab === 'monitor'
                ? 'bg-blue-600 text-white shadow'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <Activity className="w-3.5 h-3.5" />
            Monitor ARI & Canais
          </button>
          <button
            onClick={() => setActiveTab('cli')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 ${
              activeTab === 'cli'
                ? 'bg-blue-600 text-white shadow'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <Terminal className="w-3.5 h-3.5" />
            Console Asterisk CLI
          </button>
          <button
            onClick={() => setActiveTab('configs')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 ${
              activeTab === 'configs'
                ? 'bg-blue-600 text-white shadow'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <FileCode className="w-3.5 h-3.5" />
            Arquivos .conf
          </button>
          <button
            onClick={() => setActiveTab('installer')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 ${
              activeTab === 'installer'
                ? 'bg-blue-600 text-white shadow'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <Download className="w-3.5 h-3.5" />
            Instalador Linux Oficial
          </button>
          <button
            onClick={() => setActiveTab('syslog')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 ${
              activeTab === 'syslog'
                ? 'bg-blue-600 text-white shadow'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <ScrollText className="w-3.5 h-3.5" />
            Logs Syslog
          </button>
          <button
            onClick={() => setActiveTab('sip_trace')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 ${
              activeTab === 'sip_trace'
                ? 'bg-blue-600 text-white shadow'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <Radio className="w-3.5 h-3.5" />
            SIP Trace / PCAP
          </button>
        </div>
      </div>

      {/* 1. MONITOR TAB */}
      {activeTab === 'monitor' && (
        <div className="space-y-6">
          {/* Status Indicators */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
              <span className="text-[10px] text-slate-500 font-mono uppercase block">VERSÃO DO NÚCLEO</span>
              <div className="text-lg font-bold text-slate-900 font-mono mt-1">Asterisk 20.17.0 LTS</div>
              <p className="text-[10px] text-blue-600 mt-1 flex items-center gap-1">
                <ShieldCheck className="w-3 h-3" /> LTS com suporte estendido
              </p>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
              <span className="text-[10px] text-slate-500 font-mono uppercase block">PORTA ARI & HTTP</span>
              <div className="text-lg font-bold text-teal-600 font-mono mt-1">8088 /ws</div>
              <p className="text-[10px] text-slate-500 mt-1">Stasis app: "enlace_ai_bridge"</p>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
              <span className="text-[10px] text-slate-500 font-mono uppercase block">DRIVER DE CANAL</span>
              <div className="text-lg font-bold text-slate-900 font-mono mt-1">res_pjsip</div>
              <p className="text-[10px] text-slate-500 mt-1">PJSIP 2.13 com SRTP e WSS</p>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
              <span className="text-[10px] text-slate-500 font-mono uppercase block">STREAMING DE ÁUDIO</span>
              <div className="text-lg font-bold text-purple-600 font-mono mt-1">app_audiosocket</div>
              <p className="text-[10px] text-slate-500 mt-1">24kHz PCM linear bidirecional</p>
            </div>
          </div>

          {/* Realtime Channels Table */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                  <Terminal className="w-4 h-4 text-blue-600" />
                  Canais e Bridges Ativos via ARI (Stasis)
                </h3>
                <p className="text-xs text-slate-500">
                  Inspeção em tempo real das chamadas em processamento no Asterisk
                </p>
              </div>
              <button
                onClick={onRefreshChannels}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs rounded-xl flex items-center gap-1.5 transition"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Atualizar Canais
              </button>
            </div>

            {actionMessage && (
              <div
                className={`p-3 rounded-xl text-xs flex items-center justify-between font-medium border ${
                  actionMessage.type === 'success'
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                    : 'bg-rose-50 text-rose-800 border-rose-200'
                }`}
              >
                <span>{actionMessage.text}</span>
                <button onClick={() => setActionMessage(null)} className="hover:opacity-75">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {channels.length === 0 ? (
              <div className="py-12 text-center text-slate-500 text-xs">
                Nenhum canal ativo neste momento. Use o Webphone para originar uma chamada e inspecionar os canais do Asterisk.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-500 font-mono text-[11px] uppercase">
                      <th className="py-2.5 px-3">ID do Canal</th>
                      <th className="py-2.5 px-3">Nome do Canal</th>
                      <th className="py-2.5 px-3">Origem</th>
                      <th className="py-2.5 px-3">Destino</th>
                      <th className="py-2.5 px-3">Aplicação</th>
                      <th className="py-2.5 px-3">Duração</th>
                      <th className="py-2.5 px-3">Ponte IA</th>
                      <th className="py-2.5 px-3 text-right">Ações de Operador</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-mono">
                    {channels.map((chan) => (
                      <tr key={chan.id} className="hover:bg-slate-50">
                        <td className="py-3 px-3 text-slate-500">{chan.id}</td>
                        <td className="py-3 px-3 text-slate-700 font-bold">{chan.name}</td>
                        <td className="py-3 px-3 text-blue-600 font-semibold">{chan.callerNumber}</td>
                        <td className="py-3 px-3 text-slate-700">{chan.connectedLine}</td>
                        <td className="py-3 px-3 text-slate-500">{chan.application}</td>
                        <td className="py-3 px-3 text-slate-700">{chan.durationSeconds}s</td>
                        <td className="py-3 px-3">
                          {chan.aiBridgeActive ? (
                            <span className="text-cyan-700 font-bold bg-cyan-50 px-2 py-0.5 rounded border border-cyan-200 text-[10px] shadow-sm">
                              Stasis / Gemini
                            </span>
                          ) : (
                            <span className="text-slate-500 text-[10px]">Dial padrão</span>
                          )}
                        </td>
                        <td className="py-3 px-3 text-right">
                          <div className="flex items-center justify-end gap-1.5 font-sans">
                            {/* ChanSpy Button */}
                            <button
                              title="Espionar chamada no ramal supervisor (ChanSpy)"
                              onClick={() => handleSpyChannel(chan.id)}
                              disabled={actionLoading === `spy-${chan.id}`}
                              className="p-1.5 rounded-lg bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 text-[11px] transition flex items-center gap-1 disabled:opacity-50"
                            >
                              <Eye className="w-3 h-3" />
                              <span className="hidden sm:inline">Espionar</span>
                            </button>

                            {/* Transfer Button */}
                            <button
                              title="Transferir canal para ramal ou fila"
                              onClick={() => setTransferModalChan(chan)}
                              disabled={actionLoading === `transfer-${chan.id}`}
                              className="p-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 text-[11px] transition flex items-center gap-1 disabled:opacity-50"
                            >
                              <Forward className="w-3 h-3" />
                              <span className="hidden sm:inline">Transferir</span>
                            </button>

                            {/* Hangup Button */}
                            <button
                              title="Derrubar canal imediatamente (Channel Hangup)"
                              onClick={() => handleHangupChannel(chan.id)}
                              disabled={actionLoading === `hangup-${chan.id}`}
                              className="p-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-[11px] transition flex items-center gap-1 disabled:opacity-50"
                            >
                              <PhoneOff className="w-3 h-3" />
                              <span className="hidden sm:inline">Derrubar</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Transfer Channel Modal */}
          {transferModalChan && (
            <div className="fixed inset-0 bg-[#0f172a]/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
              <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl p-5 w-full max-w-md space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-2">
                    <Forward className="w-5 h-5 text-blue-600" />
                    <h4 className="font-bold text-slate-900 text-sm">Transferir Canal Ativo (ARI)</h4>
                  </div>
                  <button
                    onClick={() => setTransferModalChan(null)}
                    className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="text-xs text-slate-600 space-y-2">
                  <p>
                    Transferir a chamada ativa de <span className="font-bold text-slate-900">{transferModalChan.callerNumber}</span> ({transferModalChan.name}):
                  </p>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 uppercase mb-1">
                      Destino da Transferência (Ramal, Fila ou IA)
                    </label>
                    <input
                      type="text"
                      value={transferTarget}
                      onChange={(e) => setTransferTarget(e.target.value)}
                      placeholder="Ex: 4102, 7001, 9001"
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm font-mono focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                  </div>

                  <div className="flex flex-wrap gap-1.5 pt-1">
                    <span className="text-[10px] text-slate-400">Atalhos:</span>
                    <button
                      type="button"
                      onClick={() => setTransferTarget('4102')}
                      className="text-[10px] px-2 py-0.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md font-mono"
                    >
                      4102 (Suporte)
                    </button>
                    <button
                      type="button"
                      onClick={() => setTransferTarget('4103')}
                      className="text-[10px] px-2 py-0.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md font-mono"
                    >
                      4103 (Comercial)
                    </button>
                    <button
                      type="button"
                      onClick={() => setTransferTarget('7001')}
                      className="text-[10px] px-2 py-0.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md font-mono"
                    >
                      7001 (Fila N1)
                    </button>
                    <button
                      type="button"
                      onClick={() => setTransferTarget('9001')}
                      className="text-[10px] px-2 py-0.5 bg-cyan-100 hover:bg-cyan-200 text-cyan-800 rounded-md font-mono"
                    >
                      9001 (MaIA IA)
                    </button>
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setTransferModalChan(null)}
                    className="px-3.5 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={handleExecuteTransfer}
                    disabled={actionLoading !== null}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl shadow-md transition disabled:opacity-50"
                  >
                    {actionLoading ? 'Transferindo...' : 'Confirmar Transferência'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 2. CLI TAB (Interactive Asterisk -rvvv Console) */}
      {activeTab === 'cli' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-3">
            <div>
              <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                <Terminal className="w-4 h-4 text-blue-600" />
                Console de Comandos Asterisk CLI (asterisk -rvvv)
              </h3>
              <p className="text-xs text-slate-500">
                Execute comandos do núcleo do Asterisk 20 em tempo real (inspeção de canais, endpoints PJSIP, filas e reload).
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setCliHistory([])}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs rounded-xl transition font-medium"
              >
                Limpar Terminal
              </button>
            </div>
          </div>

          {/* Quick command shortcut chips */}
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[11px] font-bold text-slate-500 mr-1">Comandos rápidos:</span>
            {[
              'core show channels',
              'pjsip show endpoints',
              'pjsip show registrations',
              'queue show',
              'dialplan show',
              'stasis show app',
              'audiosocket show',
              'core show uptime',
              'core reload',
              'help',
            ].map((cmd) => (
              <button
                key={cmd}
                onClick={() => handleExecuteCli(cmd)}
                disabled={cliLoading}
                className="px-2.5 py-1 bg-slate-100 hover:bg-blue-50 hover:text-blue-700 hover:border-blue-200 border border-slate-200 text-slate-700 font-mono text-[11px] rounded-lg transition disabled:opacity-50"
              >
                {cmd}
              </button>
            ))}
          </div>

          {/* Terminal output window */}
          <div className="bg-slate-900 text-slate-100 rounded-xl p-4 font-mono text-xs overflow-x-auto max-h-[460px] min-h-[300px] flex flex-col justify-between border border-slate-800 shadow-inner">
            <div className="space-y-4 overflow-y-auto pr-1">
              <div className="text-slate-400 text-[11px] border-b border-slate-800 pb-2">
                Asterisk 20.17.0 LTS, Copyright (C) 1999 - 2026, Digium, Inc. and others.<br />
                Enlace-PBX Connected to Asterisk 20.17.0 currently running on enlace-core-node-01 (pid = 412)
              </div>

              {cliHistory.map((item, idx) => (
                <div key={idx} className="space-y-1">
                  <div className="flex items-center gap-2 text-cyan-400 font-bold text-[11px]">
                    <span className="text-slate-500 select-none">enlace-pbx*CLI&gt;</span>
                    <span>{item.cmd}</span>
                  </div>
                  <pre className="text-slate-300 text-[11px] whitespace-pre-wrap pl-4 border-l-2 border-slate-800 leading-relaxed font-mono">
                    {item.output}
                  </pre>
                </div>
              ))}

              {cliLoading && (
                <div className="text-amber-400 text-xs flex items-center gap-2 animate-pulse">
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Executando comando no núcleo Asterisk...</span>
                </div>
              )}
            </div>

            {/* CLI Input Form */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleExecuteCli();
              }}
              className="mt-4 pt-3 border-t border-slate-800 flex items-center gap-2"
            >
              <span className="text-cyan-400 font-bold text-xs select-none">enlace-pbx*CLI&gt;</span>
              <input
                type="text"
                value={cliInput}
                onChange={(e) => setCliInput(e.target.value)}
                placeholder="Digite um comando (ex: core show channels, pjsip show endpoints, help)..."
                className="flex-1 bg-transparent border-none text-white font-mono text-xs focus:outline-none placeholder-slate-500"
                autoFocus
              />
              <button
                type="submit"
                disabled={cliLoading || !cliInput.trim()}
                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-sans font-bold text-xs rounded-lg transition"
              >
                Executar
              </button>
            </form>
          </div>
        </div>
      )}

      {/* 3. CONFIGS TAB */}
      {activeTab === 'configs' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-4">
          <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-3 border-b border-slate-200 pb-3">
            <div className="flex flex-wrap items-center gap-1.5">
              <button
                onClick={() => setActiveConfigFile('pjsip')}
                className={`px-3 py-1.5 rounded-lg text-xs font-mono font-semibold transition ${
                  activeConfigFile === 'pjsip'
                    ? 'bg-blue-600 text-white font-bold shadow-sm'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                pjsip.conf
              </button>
              <button
                onClick={() => setActiveConfigFile('extensions')}
                className={`px-3 py-1.5 rounded-lg text-xs font-mono font-semibold transition ${
                  activeConfigFile === 'extensions'
                    ? 'bg-blue-600 text-white font-bold shadow-sm'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                extensions.conf
              </button>
              <button
                onClick={() => setActiveConfigFile('queues')}
                className={`px-3 py-1.5 rounded-lg text-xs font-mono font-semibold transition ${
                  activeConfigFile === 'queues'
                    ? 'bg-blue-600 text-white font-bold shadow-sm'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                queues.conf
              </button>
              <button
                onClick={() => setActiveConfigFile('rtp')}
                className={`px-3 py-1.5 rounded-lg text-xs font-mono font-semibold transition ${
                  activeConfigFile === 'rtp'
                    ? 'bg-blue-600 text-white font-bold shadow-sm'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                rtp.conf
              </button>
              <button
                onClick={() => setActiveConfigFile('audiosocket')}
                className={`px-3 py-1.5 rounded-lg text-xs font-mono font-semibold transition ${
                  activeConfigFile === 'audiosocket'
                    ? 'bg-blue-600 text-white font-bold shadow-sm'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                audiosocket.conf
              </button>
              <button
                onClick={() => setActiveConfigFile('ari')}
                className={`px-3 py-1.5 rounded-lg text-xs font-mono font-semibold transition ${
                  activeConfigFile === 'ari'
                    ? 'bg-blue-600 text-white font-bold shadow-sm'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                ari.conf
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={handleReloadAsterisk}
                disabled={reloadingCore}
                className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs rounded-xl flex items-center gap-1.5 transition font-bold shadow-sm disabled:opacity-50"
                title="Recarrega todos os módulos do Asterisk (core reload)"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${reloadingCore ? 'animate-spin' : ''}`} />
                {reloadingCore ? 'Recarregando...' : 'Aplicar no Asterisk (core reload)'}
              </button>

              <button
                onClick={() => handleCopy(configContent)}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs rounded-xl flex items-center gap-1.5 transition font-medium border border-slate-200"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                {copied ? 'Copiado!' : 'Copiar'}
              </button>

              <button
                onClick={() => handleDownloadFile(configContent, `${activeConfigFile}.conf`)}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs rounded-xl flex items-center gap-1.5 transition font-medium border border-slate-200"
              >
                <Download className="w-3.5 h-3.5" />
                Baixar .conf
              </button>
            </div>
          </div>

          {reloadSuccessMsg && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-center gap-2 animate-in fade-in">
              <Check className="w-4 h-4 text-emerald-600 flex-shrink-0" />
              <span>{reloadSuccessMsg}</span>
            </div>
          )}

          <div className="flex items-center justify-between text-slate-500 font-mono text-[11px] px-1">
            <span>Caminho no servidor: /etc/asterisk/{activeConfigFile}.conf</span>
            <span>Modo: Somente Leitura (Gerado via Banco Centralizado)</span>
          </div>

          <pre className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs font-mono text-slate-700 overflow-x-auto max-h-[500px] leading-relaxed">
            {loadingConfig ? 'Gerando arquivo de configuração a partir do banco...' : configContent}
          </pre>
        </div>
      )}

      {/* 3. INSTALLER TAB */}
      {activeTab === 'installer' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-3">
            <div>
              <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                <Terminal className="w-4 h-4 text-blue-600" />
                Script Oficial de Instalação Asterisk 20 LTS (Ubuntu / Debian)
              </h3>
              <p className="text-xs text-slate-500">
                Compilação pura do Asterisk 20, AudioSocket, Opus codec e integração nativa com o Enlace-PBX
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => handleCopy(installerScript)}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs rounded-xl flex items-center gap-1.5 transition font-medium"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-blue-600" /> : <Copy className="w-3.5 h-3.5" />}
                {copied ? 'Copiado!' : 'Copiar Script'}
              </button>
              <button
                onClick={() => handleDownloadFile(installerScript, 'install-enlace-pbx.sh')}
                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 transition"
              >
                <Download className="w-3.5 h-3.5" />
                Baixar install-enlace-pbx.sh
              </button>
            </div>
          </div>

          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs">
            <span className="text-slate-500 font-mono block mb-2 font-bold">
              Como executar em um servidor Linux puro (Ubuntu 22.04/24.04 ou Debian 12):
            </span>
            <div className="bg-white p-3 rounded-lg border border-slate-200 font-mono text-blue-600 select-all">
              curl -fsSL https://app.enlacepbx.com.br/install.sh | sudo bash
            </div>
          </div>

          <pre className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs font-mono text-slate-700 overflow-x-auto max-h-[440px] leading-relaxed">
            {installerScript}
          </pre>
        </div>
      )}

      {/* 5. SYSLOG TAB */}
      {activeTab === 'syslog' && (
        <SystemLogsView initialService="asterisk" />
      )}

      {/* 6. SIP TRACE TAB */}
      {activeTab === 'sip_trace' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
            <div>
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Radio className="w-5 h-5 text-indigo-500" />
                sngrep / SIP Trace PCAP
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                Visualização em tempo real do fluxo de sinalização SIP (INVITE, BYE, CANCEL, ACK, OPTIONS).
              </p>
            </div>
            <div className="flex gap-2">
              <button className="px-3 py-1.5 bg-indigo-50 text-indigo-600 rounded-lg text-xs font-bold border border-indigo-200 hover:bg-indigo-100 transition flex items-center gap-2">
                <Download className="w-4 h-4" />
                Exportar PCAP
              </button>
              <button className="px-3 py-1.5 bg-slate-900 text-white rounded-lg text-xs font-bold hover:bg-slate-800 transition flex items-center gap-2">
                <Play className="w-4 h-4 text-emerald-400" />
                Capturar Auto
              </button>
            </div>
          </div>

          <div className="bg-slate-900 rounded-2xl border border-slate-800 shadow-2xl overflow-hidden flex flex-col font-mono text-xs text-slate-300">
            {/* Toolbar */}
            <div className="bg-slate-950 p-2 border-b border-slate-800 flex items-center gap-4 text-[10px]">
              <div className="flex items-center gap-2 px-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                Capturing on interface eth0 (UDP port 5060)
              </div>
              <div className="h-4 w-px bg-slate-800"></div>
              <div className="flex items-center gap-3 opacity-60">
                <span>Filter: sip</span>
                <span>Limit: 1000 packets</span>
              </div>
            </div>

            {/* List */}
            <div className="overflow-x-auto border-b border-slate-800 h-64">
              <table className="w-full text-left whitespace-nowrap">
                <thead className="bg-[#0b1120] text-slate-500 sticky top-0 border-b border-slate-800">
                  <tr>
                    <th className="py-1.5 px-3 font-normal">No.</th>
                    <th className="py-1.5 px-3 font-normal">Time</th>
                    <th className="py-1.5 px-3 font-normal">Source</th>
                    <th className="py-1.5 px-3 font-normal">Destination</th>
                    <th className="py-1.5 px-3 font-normal">Protocol</th>
                    <th className="py-1.5 px-3 font-normal">Info</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/50">
                  <tr className="hover:bg-indigo-900/30 cursor-pointer bg-slate-800/20">
                    <td className="py-1 px-3 text-slate-500">1</td>
                    <td className="py-1 px-3 text-slate-400">14:23:45.102</td>
                    <td className="py-1 px-3">192.168.1.100:5060</td>
                    <td className="py-1 px-3">10.0.0.5:5060</td>
                    <td className="py-1 px-3 text-indigo-400">SIP</td>
                    <td className="py-1 px-3 font-bold text-slate-200">Request: INVITE sip:9001@10.0.0.5:5060</td>
                  </tr>
                  <tr className="hover:bg-indigo-900/30 cursor-pointer">
                    <td className="py-1 px-3 text-slate-500">2</td>
                    <td className="py-1 px-3 text-slate-400">14:23:45.105</td>
                    <td className="py-1 px-3">10.0.0.5:5060</td>
                    <td className="py-1 px-3">192.168.1.100:5060</td>
                    <td className="py-1 px-3 text-indigo-400">SIP</td>
                    <td className="py-1 px-3 text-slate-300">Status: 100 Trying</td>
                  </tr>
                  <tr className="hover:bg-indigo-900/30 cursor-pointer">
                    <td className="py-1 px-3 text-slate-500">3</td>
                    <td className="py-1 px-3 text-slate-400">14:23:45.210</td>
                    <td className="py-1 px-3">10.0.0.5:5060</td>
                    <td className="py-1 px-3">192.168.1.100:5060</td>
                    <td className="py-1 px-3 text-indigo-400">SIP</td>
                    <td className="py-1 px-3 text-amber-300">Status: 180 Ringing</td>
                  </tr>
                  <tr className="hover:bg-indigo-900/30 cursor-pointer">
                    <td className="py-1 px-3 text-slate-500">4</td>
                    <td className="py-1 px-3 text-slate-400">14:23:48.005</td>
                    <td className="py-1 px-3">10.0.0.5:5060</td>
                    <td className="py-1 px-3">192.168.1.100:5060</td>
                    <td className="py-1 px-3 text-indigo-400">SIP</td>
                    <td className="py-1 px-3 text-emerald-400 font-bold">Status: 200 OK (INVITE)</td>
                  </tr>
                  <tr className="hover:bg-indigo-900/30 cursor-pointer">
                    <td className="py-1 px-3 text-slate-500">5</td>
                    <td className="py-1 px-3 text-slate-400">14:23:48.012</td>
                    <td className="py-1 px-3">192.168.1.100:5060</td>
                    <td className="py-1 px-3">10.0.0.5:5060</td>
                    <td className="py-1 px-3 text-indigo-400">SIP</td>
                    <td className="py-1 px-3 text-slate-200">Request: ACK sip:9001@10.0.0.5:5060</td>
                  </tr>
                  <tr className="hover:bg-indigo-900/30 cursor-pointer">
                    <td className="py-1 px-3 text-slate-500">6</td>
                    <td className="py-1 px-3 text-slate-400">14:25:12.800</td>
                    <td className="py-1 px-3">192.168.1.100:5060</td>
                    <td className="py-1 px-3">10.0.0.5:5060</td>
                    <td className="py-1 px-3 text-indigo-400">SIP</td>
                    <td className="py-1 px-3 text-rose-400 font-bold">Request: BYE sip:9001@10.0.0.5:5060</td>
                  </tr>
                  <tr className="hover:bg-indigo-900/30 cursor-pointer">
                    <td className="py-1 px-3 text-slate-500">7</td>
                    <td className="py-1 px-3 text-slate-400">14:25:12.805</td>
                    <td className="py-1 px-3">10.0.0.5:5060</td>
                    <td className="py-1 px-3">192.168.1.100:5060</td>
                    <td className="py-1 px-3 text-indigo-400">SIP</td>
                    <td className="py-1 px-3 text-slate-300">Status: 200 OK (BYE)</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Sequence Diagram Details */}
            <div className="flex h-72">
              <div className="w-1/2 border-r border-slate-800 p-4 bg-[#0a0f18] overflow-y-auto">
                <h3 className="text-[10px] uppercase font-bold text-slate-500 tracking-wider mb-4 border-b border-slate-800 pb-2">
                  Detalhes do Pacote SIP (Frame 1)
                </h3>
                <pre className="text-emerald-400 font-mono text-[11px] leading-relaxed">
{`INVITE sip:9001@10.0.0.5:5060 SIP/2.0
Via: SIP/2.0/UDP 192.168.1.100:5060;branch=z9hG4bK-524287-1---101
Max-Forwards: 70
Contact: <sip:11987654321@192.168.1.100:5060>
To: <sip:9001@10.0.0.5:5060>
From: "Cliente"<sip:11987654321@10.0.0.5:5060>;tag=6a3d
Call-ID: c542b89a31191a24
CSeq: 1 INVITE
Allow: INVITE, ACK, CANCEL, OPTIONS, BYE, REFER, NOTIFY
Supported: replaces, timer
Content-Type: application/sdp
Content-Length: 264

v=0
o=- 3855663673 3855663673 IN IP4 192.168.1.100
s=pjmedia
c=IN IP4 192.168.1.100
t=0 0
m=audio 4000 RTP/AVP 111 8 0 101
a=rtpmap:111 opus/48000/2
a=rtpmap:8 PCMA/8000
a=rtpmap:0 PCMU/8000
a=rtpmap:101 telephone-event/8000
a=sendrecv`}
                </pre>
              </div>
              <div className="w-1/2 p-4 bg-slate-900/50 overflow-y-auto relative">
                 <h3 className="text-[10px] uppercase font-bold text-slate-500 tracking-wider mb-4 border-b border-slate-800 pb-2">
                  Diagrama de Fluxo (Call Flow)
                </h3>
                <div className="absolute top-12 bottom-4 left-1/2 w-px bg-slate-800 -ml-px z-0"></div>
                <div className="relative z-10 space-y-4 text-[11px]">
                  
                  {/* Agents Headers */}
                  <div className="flex justify-between font-bold text-slate-400 mb-6">
                    <span>192.168.1.100<br/><span className="text-[9px] font-normal text-slate-500">UAC (Cliente)</span></span>
                    <span className="text-right">10.0.0.5<br/><span className="text-[9px] font-normal text-slate-500">UAS (Asterisk)</span></span>
                  </div>

                  <div className="relative flex justify-center items-center group">
                    <div className="w-full flex items-center">
                      <div className="w-1/2 flex items-center relative">
                        <div className="absolute right-0 h-px bg-emerald-500 w-full group-hover:bg-emerald-400 transition-colors shadow-[0_0_8px_rgba(16,185,129,0.5)]"></div>
                        <div className="absolute right-0 w-2 h-2 border-t border-r border-emerald-500 transform rotate-45 -mr-1"></div>
                      </div>
                      <div className="absolute -top-3 bg-slate-900 px-2 text-emerald-400 font-bold whitespace-nowrap">
                        INVITE
                      </div>
                    </div>
                  </div>

                  <div className="relative flex justify-center items-center group">
                    <div className="w-full flex items-center">
                      <div className="w-1/2 ml-auto flex items-center justify-end relative">
                        <div className="absolute left-0 h-px bg-slate-600 w-full border-dashed border-b border-slate-600"></div>
                        <div className="absolute left-0 w-2 h-2 border-b border-l border-slate-600 transform rotate-45 -ml-1"></div>
                      </div>
                      <div className="absolute -top-3 bg-slate-900 px-2 text-slate-400 whitespace-nowrap">
                        100 Trying
                      </div>
                    </div>
                  </div>

                  <div className="relative flex justify-center items-center group">
                    <div className="w-full flex items-center">
                      <div className="w-1/2 ml-auto flex items-center justify-end relative">
                        <div className="absolute left-0 h-px bg-amber-500 w-full group-hover:bg-amber-400 transition-colors shadow-[0_0_5px_rgba(245,158,11,0.3)]"></div>
                        <div className="absolute left-0 w-2 h-2 border-b border-l border-amber-500 transform rotate-45 -ml-1"></div>
                      </div>
                      <div className="absolute -top-3 bg-slate-900 px-2 text-amber-400 whitespace-nowrap">
                        180 Ringing
                      </div>
                    </div>
                  </div>

                   <div className="relative flex justify-center items-center group mt-6">
                    <div className="w-full flex items-center">
                      <div className="w-1/2 ml-auto flex items-center justify-end relative">
                        <div className="absolute left-0 h-px bg-emerald-500 w-full group-hover:bg-emerald-400 transition-colors shadow-[0_0_8px_rgba(16,185,129,0.5)]"></div>
                        <div className="absolute left-0 w-2 h-2 border-b border-l border-emerald-500 transform rotate-45 -ml-1"></div>
                      </div>
                      <div className="absolute -top-3 bg-slate-900 px-2 text-emerald-400 font-bold whitespace-nowrap">
                        200 OK
                      </div>
                    </div>
                  </div>

                  <div className="relative flex justify-center items-center group">
                    <div className="w-full flex items-center">
                      <div className="w-1/2 flex items-center relative">
                        <div className="absolute right-0 h-px bg-slate-500 w-full"></div>
                        <div className="absolute right-0 w-2 h-2 border-t border-r border-slate-500 transform rotate-45 -mr-1"></div>
                      </div>
                      <div className="absolute -top-3 bg-slate-900 px-2 text-slate-300 whitespace-nowrap">
                        ACK
                      </div>
                    </div>
                  </div>

                  <div className="py-4 flex flex-col items-center justify-center opacity-60">
                    <div className="w-px h-6 bg-slate-700 mb-1"></div>
                    <span className="bg-slate-800 text-[9px] px-2 py-0.5 rounded text-slate-400">Audio Stream (RTP) - 87s</span>
                    <div className="w-px h-6 bg-slate-700 mt-1"></div>
                  </div>

                  <div className="relative flex justify-center items-center group">
                    <div className="w-full flex items-center">
                      <div className="w-1/2 flex items-center relative">
                        <div className="absolute right-0 h-px bg-rose-500 w-full group-hover:bg-rose-400 shadow-[0_0_8px_rgba(244,63,94,0.5)]"></div>
                        <div className="absolute right-0 w-2 h-2 border-t border-r border-rose-500 transform rotate-45 -mr-1"></div>
                      </div>
                      <div className="absolute -top-3 bg-slate-900 px-2 text-rose-400 font-bold whitespace-nowrap">
                        BYE
                      </div>
                    </div>
                  </div>

                   <div className="relative flex justify-center items-center group pb-4">
                    <div className="w-full flex items-center">
                      <div className="w-1/2 ml-auto flex items-center justify-end relative">
                        <div className="absolute left-0 h-px bg-slate-500 w-full"></div>
                        <div className="absolute left-0 w-2 h-2 border-b border-l border-slate-500 transform rotate-45 -ml-1"></div>
                      </div>
                      <div className="absolute -top-3 bg-slate-900 px-2 text-slate-300 whitespace-nowrap">
                        200 OK
                      </div>
                    </div>
                  </div>

                </div>
              </div>
            </div>

          </div>
        </div>
      )}
    </div>
  );
};
