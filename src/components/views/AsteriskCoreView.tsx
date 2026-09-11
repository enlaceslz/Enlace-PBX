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
} from 'lucide-react';
import { AsteriskChannel } from '../../types/pbx';
import { SystemLogsView } from './SystemLogsView';

interface AsteriskCoreViewProps {
  channels: AsteriskChannel[];
  onRefreshChannels: () => void;
  initialTab?: 'monitor' | 'cli' | 'configs' | 'installer' | 'syslog';
}

export const AsteriskCoreView: React.FC<AsteriskCoreViewProps> = ({
  channels,
  onRefreshChannels,
  initialTab = 'monitor',
}) => {
  const [activeTab, setActiveTab] = useState<'monitor' | 'cli' | 'configs' | 'installer' | 'syslog'>(initialTab);

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
            Logs Syslog (Tempo Real)
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
    </div>
  );
};
