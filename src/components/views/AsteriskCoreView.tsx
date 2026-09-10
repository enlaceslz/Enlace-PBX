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
} from 'lucide-react';
import { AsteriskChannel } from '../../types/pbx';

interface AsteriskCoreViewProps {
  channels: AsteriskChannel[];
  onRefreshChannels: () => void;
  initialTab?: 'monitor' | 'configs' | 'installer';
}

export const AsteriskCoreView: React.FC<AsteriskCoreViewProps> = ({
  channels,
  onRefreshChannels,
  initialTab = 'monitor',
}) => {
  const [activeTab, setActiveTab] = useState<'monitor' | 'configs' | 'installer'>(initialTab);
  const [activeConfigFile, setActiveConfigFile] = useState<'pjsip' | 'extensions' | 'ari'>('pjsip');
  const [configContent, setConfigContent] = useState<string>('');
  const [installerScript, setInstallerScript] = useState<string>('');
  const [copied, setCopied] = useState(false);
  const [loadingConfig, setLoadingConfig] = useState(false);

  useEffect(() => {
    fetchConfig(activeConfigFile);
    fetchInstallerScript();
  }, [activeConfigFile]);

  const fetchConfig = async (file: 'pjsip' | 'extensions' | 'ari') => {
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
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-xl font-black text-slate-100 tracking-tight">
              Asterisk 20 LTS & Infraestrutura de Telefonia
            </h1>
            <span className="text-[10px] bg-emerald-950 text-emerald-300 border border-emerald-800/80 px-2 py-0.5 rounded-full font-mono">
              Pure Open Source Core
            </span>
          </div>
          <p className="text-xs text-slate-400">
            Conexão com ARI (Asterisk REST Interface), geração de arquivos de configuração e script automatizado para Ubuntu/Debian.
          </p>
        </div>

        {/* Tab Controls */}
        <div className="flex bg-slate-900 p-1 rounded-xl border border-slate-800 self-start">
          <button
            onClick={() => setActiveTab('monitor')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 ${
              activeTab === 'monitor'
                ? 'bg-emerald-500 text-slate-950 shadow'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Activity className="w-3.5 h-3.5" />
            Monitor ARI & Canais
          </button>
          <button
            onClick={() => setActiveTab('configs')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 ${
              activeTab === 'configs'
                ? 'bg-emerald-500 text-slate-950 shadow'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <FileCode className="w-3.5 h-3.5" />
            Arquivos .conf
          </button>
          <button
            onClick={() => setActiveTab('installer')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 ${
              activeTab === 'installer'
                ? 'bg-emerald-500 text-slate-950 shadow'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Download className="w-3.5 h-3.5" />
            Instalador Linux Oficial
          </button>
        </div>
      </div>

      {/* 1. MONITOR TAB */}
      {activeTab === 'monitor' && (
        <div className="space-y-6">
          {/* Status Indicators */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-slate-900/80 p-4 rounded-2xl border border-slate-800/80">
              <span className="text-[10px] text-slate-500 font-mono uppercase block">VERSÃO DO NÚCLEO</span>
              <div className="text-lg font-bold text-slate-100 font-mono mt-1">Asterisk 20.17.0 LTS</div>
              <p className="text-[10px] text-emerald-400 mt-1 flex items-center gap-1">
                <ShieldCheck className="w-3 h-3" /> LTS com suporte estendido
              </p>
            </div>

            <div className="bg-slate-900/80 p-4 rounded-2xl border border-slate-800/80">
              <span className="text-[10px] text-slate-500 font-mono uppercase block">PORTA ARI & HTTP</span>
              <div className="text-lg font-bold text-cyan-400 font-mono mt-1">8088 /ws</div>
              <p className="text-[10px] text-slate-400 mt-1">Stasis app: "enlace_ai_bridge"</p>
            </div>

            <div className="bg-slate-900/80 p-4 rounded-2xl border border-slate-800/80">
              <span className="text-[10px] text-slate-500 font-mono uppercase block">DRIVER DE CANAL</span>
              <div className="text-lg font-bold text-slate-100 font-mono mt-1">res_pjsip</div>
              <p className="text-[10px] text-slate-400 mt-1">PJSIP 2.13 com SRTP e WSS</p>
            </div>

            <div className="bg-slate-900/80 p-4 rounded-2xl border border-slate-800/80">
              <span className="text-[10px] text-slate-500 font-mono uppercase block">STREAMING DE ÁUDIO</span>
              <div className="text-lg font-bold text-purple-400 font-mono mt-1">app_audiosocket</div>
              <p className="text-[10px] text-slate-400 mt-1">24kHz PCM linear bidirecional</p>
            </div>
          </div>

          {/* Realtime Channels Table */}
          <div className="bg-slate-900/80 rounded-2xl border border-slate-800/80 p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-sm text-slate-100 flex items-center gap-2">
                  <Terminal className="w-4 h-4 text-emerald-400" />
                  Canais e Bridges Ativos via ARI (Stasis)
                </h3>
                <p className="text-xs text-slate-400">
                  Inspeção em tempo real das chamadas em processamento no Asterisk
                </p>
              </div>
              <button
                onClick={onRefreshChannels}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs rounded-xl flex items-center gap-1.5 transition"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Atualizar Canais
              </button>
            </div>

            {channels.length === 0 ? (
              <div className="py-12 text-center text-slate-500 text-xs">
                Nenhum canal ativo neste momento. Use o Webphone para originar uma chamada e inspecionar os canais do Asterisk.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-800 text-slate-400 font-mono text-[11px] uppercase">
                      <th className="py-2.5 px-3">ID do Canal</th>
                      <th className="py-2.5 px-3">Nome do Canal</th>
                      <th className="py-2.5 px-3">Origem</th>
                      <th className="py-2.5 px-3">Destino</th>
                      <th className="py-2.5 px-3">Aplicação</th>
                      <th className="py-2.5 px-3">Duração</th>
                      <th className="py-2.5 px-3">Ponte IA</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800 font-mono">
                    {channels.map((chan) => (
                      <tr key={chan.id} className="hover:bg-slate-800/40">
                        <td className="py-3 px-3 text-slate-400">{chan.id}</td>
                        <td className="py-3 px-3 text-slate-200 font-bold">{chan.name}</td>
                        <td className="py-3 px-3 text-emerald-400">{chan.callerNumber}</td>
                        <td className="py-3 px-3 text-slate-300">{chan.connectedLine}</td>
                        <td className="py-3 px-3 text-slate-400">{chan.application}</td>
                        <td className="py-3 px-3 text-slate-300">{chan.durationSeconds}s</td>
                        <td className="py-3 px-3">
                          {chan.aiBridgeActive ? (
                            <span className="text-cyan-400 font-bold bg-cyan-950 px-2 py-0.5 rounded border border-cyan-800 text-[10px]">
                              Stasis / Gemini
                            </span>
                          ) : (
                            <span className="text-slate-500 text-[10px]">Dial padrão</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 2. CONFIGS TAB */}
      {activeTab === 'configs' && (
        <div className="bg-slate-900/80 rounded-2xl border border-slate-800/80 p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setActiveConfigFile('pjsip')}
                className={`px-3 py-1.5 rounded-lg text-xs font-mono font-semibold transition ${
                  activeConfigFile === 'pjsip'
                    ? 'bg-emerald-500 text-slate-950 font-bold'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
              >
                /etc/asterisk/pjsip.conf
              </button>
              <button
                onClick={() => setActiveConfigFile('extensions')}
                className={`px-3 py-1.5 rounded-lg text-xs font-mono font-semibold transition ${
                  activeConfigFile === 'extensions'
                    ? 'bg-emerald-500 text-slate-950 font-bold'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
              >
                /etc/asterisk/extensions.conf
              </button>
              <button
                onClick={() => setActiveConfigFile('ari')}
                className={`px-3 py-1.5 rounded-lg text-xs font-mono font-semibold transition ${
                  activeConfigFile === 'ari'
                    ? 'bg-emerald-500 text-slate-950 font-bold'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
              >
                /etc/asterisk/ari.conf
              </button>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => handleCopy(configContent)}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs rounded-xl flex items-center gap-1.5 transition font-medium"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                {copied ? 'Copiado!' : 'Copiar'}
              </button>
              <button
                onClick={() => handleDownloadFile(configContent, `${activeConfigFile}.conf`)}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs rounded-xl flex items-center gap-1.5 transition font-medium"
              >
                <Download className="w-3.5 h-3.5" />
                Baixar .conf
              </button>
            </div>
          </div>

          <pre className="bg-slate-950 p-4 rounded-xl border border-slate-800 text-xs font-mono text-emerald-400 overflow-x-auto max-h-[500px] leading-relaxed">
            {loadingConfig ? 'Gerando arquivo de configuração a partir do banco...' : configContent}
          </pre>
        </div>
      )}

      {/* 3. INSTALLER TAB */}
      {activeTab === 'installer' && (
        <div className="bg-slate-900/80 rounded-2xl border border-slate-800/80 p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
            <div>
              <h3 className="font-bold text-sm text-slate-100 flex items-center gap-2">
                <Terminal className="w-4 h-4 text-emerald-400" />
                Script Oficial de Instalação Asterisk 20 LTS (Ubuntu / Debian)
              </h3>
              <p className="text-xs text-slate-400">
                Compilação pura do Asterisk 20, AudioSocket, Opus codec e integração nativa com o Enlace-PBX
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => handleCopy(installerScript)}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs rounded-xl flex items-center gap-1.5 transition font-medium"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                {copied ? 'Copiado!' : 'Copiar Script'}
              </button>
              <button
                onClick={() => handleDownloadFile(installerScript, 'install-enlace-pbx.sh')}
                className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs rounded-xl flex items-center gap-1.5 transition"
              >
                <Download className="w-3.5 h-3.5" />
                Baixar install-enlace-pbx.sh
              </button>
            </div>
          </div>

          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 text-xs">
            <span className="text-slate-400 font-mono block mb-2 font-bold">
              Como executar em um servidor Linux puro (Ubuntu 22.04/24.04 ou Debian 12):
            </span>
            <div className="bg-slate-900 p-3 rounded-lg border border-slate-700/60 font-mono text-emerald-400 select-all">
              curl -fsSL https://app.enlacepbx.com.br/install.sh | sudo bash
            </div>
          </div>

          <pre className="bg-slate-950 p-4 rounded-xl border border-slate-800 text-xs font-mono text-slate-300 overflow-x-auto max-h-[440px] leading-relaxed">
            {installerScript}
          </pre>
        </div>
      )}
    </div>
  );
};
