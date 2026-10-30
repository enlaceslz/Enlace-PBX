import { Fail2banPanel } from './Fail2banPanel';
import React, { useState, useEffect, useRef } from 'react';
import {
  ShieldCheck,
  ShieldAlert,
  Shield,
  Wifi,
  Lock,
  Globe,
  Radio,
  Server,
  Plus,
  Trash2,
  Download,
  Copy,
  Check,
  QrCode,
  RefreshCw,
  AlertTriangle,
  Zap,
  Activity,
  ArrowUpRight,
  ArrowDownLeft,
  Search,
  CheckCircle2,
  X,
  Sliders,
  ExternalLink,
  Laptop,
  Smartphone,
  Network,
  Power,
  RotateCcw,
} from 'lucide-react';
import QRCode from 'qrcode';
import {
  WireGuardConfig,
  WireGuardPeer,
  ZeroTierConfig,
} from '../../types/pbx';
import { getAuthHeaders } from '../../utils/api';
import { VpnMonitoringDashboard } from './VpnMonitoringDashboard';

export const NetworkSecurityView: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'wireguard' | 'zerotier' | 'fail2ban_monitor' | 'fail2ban_rules'>('dashboard');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actionMsg, setActionMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // States
  const [wireguard, setWireguard] = useState<WireGuardConfig | null>(null);
  const [zerotier, setZerotier] = useState<ZeroTierConfig | null>(null);
  const [fail2ban, setFail2ban] = useState<any>(null);

  // Modals & Sub-actions
  const [isPeerModalOpen, setIsPeerModalOpen] = useState(false);
  const [isQrModalOpen, setIsQrModalOpen] = useState(false);
  const [selectedPeerConfig, setSelectedPeerConfig] = useState<{ peer: WireGuardPeer; config: string; filename: string } | null>(null);
  const [isJoinZtModalOpen, setIsJoinZtModalOpen] = useState(false);
  const [copiedText, setCopiedText] = useState(false);
  const qrCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // Forms
  const [newPeerForm, setNewPeerForm] = useState({
    name: '',
    allowedIps: '',
    endpoint: '',
    persistentKeepalive: 25,
    assignedExtension: '',
    location: '',
  });

  const [newZtForm, setNewZtForm] = useState({
    networkId: '',
    name: '',
  });

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setActionMsg({ text, type });
    setTimeout(() => setActionMsg(null), 4000);
  };

  const loadData = async (isInitial = false) => {
    if (isInitial) setLoading(true);
    else setRefreshing(true);

    try {
      const authHeaders = getAuthHeaders();
      const [wgRes, ztRes, f2bRes] = await Promise.all([
        fetch('/api/v1/network/wireguard', { headers: authHeaders }).then((r) => (r.ok ? r.json() : null)),
        fetch('/api/v1/network/zerotier', { headers: authHeaders }).then((r) => (r.ok ? r.json() : null)),
        fetch('/api/v1/security/fail2ban', { headers: authHeaders }).then((r) => ([200, 503].includes(r.status) ? r.json() : null)),
      ]);

      if (wgRes && !wgRes.error) setWireguard(wgRes);
      if (ztRes && !ztRes.error) setZerotier(ztRes);
      setFail2ban(f2bRes);
    } catch (e) {
      setFail2ban(null);
      console.error('Erro ao carregar dados de rede e segurança:', e);
      showToast('Falha ao comunicar com os serviços de rede.', 'error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData(true);
  }, []);

  // Generate QR Code when QR modal is opened
  useEffect(() => {
    if (isQrModalOpen && selectedPeerConfig && qrCanvasRef.current) {
      QRCode.toCanvas(
        qrCanvasRef.current,
        selectedPeerConfig.config,
        {
          width: 260,
          margin: 1.5,
          color: {
            dark: '#0f172a',
            light: '#ffffff',
          },
        },
        (error) => {
          if (error) console.error('Erro gerando QR Code:', error);
        }
      );
    }
  }, [isQrModalOpen, selectedPeerConfig]);

  // WireGuard Handlers
  const handleToggleWg = async () => {
    try {
      const res = await fetch('/api/v1/network/wireguard/toggle', {
        method: 'POST',
        headers: getAuthHeaders(),
      });
      const data = await res.json();
      if (data.success) {
        showToast(`Interface WireGuard ${data.status === 'active' ? 'ativada' : 'desativada'}.`);
        loadData();
      }
    } catch {
      showToast('Erro ao alternar status do WireGuard.', 'error');
    }
  };

  const handleCreatePeer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPeerForm.name) return;

    try {
      const res = await fetch('/api/v1/network/wireguard/peers', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(newPeerForm),
      });
      const data = await res.json();
      if (data.success) {
        showToast(`Peer "${newPeerForm.name}" criado com sucesso!`);
        setIsPeerModalOpen(false);
        setNewPeerForm({
          name: '',
          allowedIps: '',
          endpoint: '',
          persistentKeepalive: 25,
          assignedExtension: '',
          location: '',
        });
        loadData();
      } else {
        showToast(data.error || 'Erro ao criar peer.', 'error');
      }
    } catch {
      showToast('Falha na requisição.', 'error');
    }
  };

  const handleTogglePeer = async (peerId: string) => {
    try {
      const res = await fetch(`/api/v1/network/wireguard/peers/${peerId}/toggle`, {
        method: 'POST',
        headers: getAuthHeaders(),
      });
      const data = await res.json();
      if (data.success) {
        showToast(`Peer ${data.peer?.enabled ? 'habilitado' : 'desabilitado'}.`);
        loadData();
      }
    } catch {
      showToast('Erro ao alternar peer.', 'error');
    }
  };

  const handleDeletePeer = async (peerId: string, peerName: string) => {
    if (!confirm(`Deseja realmente remover o peer "${peerName}"?`)) return;
    try {
      const res = await fetch(`/api/v1/network/wireguard/peers/${peerId}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });
      const data = await res.json();
      if (data.success) {
        showToast(`Peer "${peerName}" removido.`);
        loadData();
      }
    } catch {
      showToast('Erro ao remover peer.', 'error');
    }
  };

  const handleOpenClientConfig = async (peer: WireGuardPeer) => {
    try {
      const res = await fetch(`/api/v1/network/wireguard/peers/${peer.id}/client-config`, {
        headers: getAuthHeaders(),
      });
      const data = await res.json();
      if (data.success) {
        setSelectedPeerConfig({
          peer,
          config: data.config,
          filename: data.filename,
        });
        setIsQrModalOpen(true);
      }
    } catch {
      showToast('Erro ao obter configuração do cliente.', 'error');
    }
  };

  const handleDownloadConf = (configText: string, filename: string) => {
    const blob = new Blob([configText], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showToast(`Download de "${filename}" iniciado!`);
  };

  const handleCopyText = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(true);
    setTimeout(() => setCopiedText(false), 2500);
    showToast('Configuração copiada para a área de transferência!');
  };

  // ZeroTier Handlers
  const handleToggleZt = async () => {
    try {
      const res = await fetch('/api/v1/network/zerotier/toggle', {
        method: 'POST',
        headers: getAuthHeaders(),
      });
      const data = await res.json();
      if (data.success) {
        showToast(`ZeroTier One ${data.status === 'online' ? 'conectado' : 'desconectado'}.`);
        loadData();
      }
    } catch {
      showToast('Erro ao alternar ZeroTier.', 'error');
    }
  };

  const handleJoinZt = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newZtForm.networkId) return;

    try {
      const res = await fetch('/api/v1/network/zerotier/join', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(newZtForm),
      });
      const data = await res.json();
      if (data.success) {
        showToast(`Conectado à rede ZeroTier "${newZtForm.networkId}"!`);
        setIsJoinZtModalOpen(false);
        setNewZtForm({ networkId: '', name: '' });
        loadData();
      } else {
        showToast(data.error || 'Erro ao conectar à rede.', 'error');
      }
    } catch {
      showToast('Falha na comunicação.', 'error');
    }
  };

  const handleLeaveZt = async (networkId: string) => {
    if (!confirm(`Deseja desconectar o servidor da rede ZeroTier ${networkId}?`)) return;
    try {
      const res = await fetch('/api/v1/network/zerotier/leave', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ networkId }),
      });
      const data = await res.json();
      if (data.success) {
        showToast('Desconectado da rede ZeroTier com sucesso.');
        loadData();
      }
    } catch {
      showToast('Erro ao sair da rede.', 'error');
    }
  };

  const formatBytes = (bytes: number) => {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  if (loading) {
    return (
      <div className="flex-1 p-6 md:p-8 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <RefreshCw className="w-8 h-8 text-blue-600 animate-spin" />
          <p className="text-sm font-semibold text-slate-600">Carregando conectividade e segurança de rede...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 p-4 md:p-8 max-w-7xl mx-auto w-full space-y-6">
      {/* Toast Notification */}
      {actionMsg && (
        <div
          className={`fixed bottom-5 right-5 z-50 px-4 py-3 rounded-xl shadow-lg border flex items-center gap-3 transition-all animate-in fade-in slide-in-from-bottom-5 ${
            actionMsg.type === 'error'
              ? 'bg-rose-50 border-rose-200 text-rose-800'
              : 'bg-emerald-50 border-emerald-200 text-emerald-800'
          }`}
        >
          {actionMsg.type === 'error' ? <AlertTriangle className="w-5 h-5 text-rose-600" /> : <CheckCircle2 className="w-5 h-5 text-emerald-600" />}
          <span className="text-sm font-semibold">{actionMsg.text}</span>
        </div>
      )}

      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-blue-600 text-white shadow-md shadow-blue-500/20">
              <Network className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
                Conectividade de Rede &amp; Segurança
                <span className="text-xs px-2.5 py-0.5 rounded-full font-bold bg-blue-100 text-blue-800 border border-blue-200">
                  Asterisk 20 Hardened
                </span>
              </h1>
              <p className="text-sm text-slate-500 font-medium">
                Túneis VPN ponto-a-ponto com WireGuard, malha SD-WAN ZeroTier e prevenção ativa de invasões SIP com Fail2ban.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => loadData()}
            disabled={refreshing}
            className="p-2 rounded-xl bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition shadow-sm"
            title="Atualizar dados"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin text-blue-600' : ''}`} />
          </button>
        </div>
      </div>

      {/* Overview Stat Widgets */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* WireGuard Widget */}
        <div className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5 text-blue-600" /> WireGuard VPN
            </span>
            <span
              className={`px-2 py-0.5 rounded-full text-[11px] font-bold border flex items-center gap-1 ${
                wireguard?.status === 'active'
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  : 'bg-slate-100 text-slate-600 border-slate-200'
              }`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${wireguard?.status === 'active' ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`} />
              {wireguard?.status === 'active' ? 'Ativo (wg0)' : 'Inativo'}
            </span>
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-extrabold text-slate-900">
              {wireguard?.activePeersCount || 0}
              <span className="text-xs font-normal text-slate-500 ml-1">/ {wireguard?.peersCount || 0} peers ativos</span>
            </span>
            <span className="text-xs font-mono font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md">
              Porta {wireguard?.listenPort}
            </span>
          </div>
          <p className="text-[11px] text-slate-500 mt-2 truncate">Sub-rede: {wireguard?.address} (Criptografia ChaCha20)</p>
        </div>

        {/* ZeroTier Widget */}
        <div className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
              <Globe className="w-3.5 h-3.5 text-orange-600" /> ZeroTier SD-WAN
            </span>
            <span
              className={`px-2 py-0.5 rounded-full text-[11px] font-bold border flex items-center gap-1 ${
                zerotier?.status === 'online'
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  : 'bg-amber-50 text-amber-700 border-amber-200'
              }`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${zerotier?.status === 'online' ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
              {zerotier?.status === 'online' ? 'Online' : 'Conectando'}
            </span>
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-extrabold text-slate-900">
              {zerotier?.networks?.length || 0}
              <span className="text-xs font-normal text-slate-500 ml-1">redes mesh</span>
            </span>
            <span className="text-xs font-mono font-semibold text-orange-600 bg-orange-50 px-2 py-0.5 rounded-md">
              Node: {zerotier?.nodeId}
            </span>
          </div>
          <p className="text-[11px] text-slate-500 mt-2 truncate">Versão: v{zerotier?.version} • P2P Latência Média: 18ms</p>
        </div>

        {/* Fail2ban Widget */}
        <div className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
              <ShieldAlert className="w-3.5 h-3.5 text-rose-600" /> Fail2ban Daemon
            </span>
            <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-slate-50 text-slate-700 border border-slate-200 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
              {fail2ban?.available ? 'Consultado' : 'Indisponível'}
            </span>
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-extrabold text-rose-600">
              {fail2ban?.currentBanEntries ?? '—'}
              <span className="text-xs font-normal text-slate-500 ml-1">banimentos por jail</span>
            </span>
            <span className="text-xs font-mono font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md">
              {fail2ban?.totalJails ?? '—'} jails consultadas
            </span>
          </div>
          <p className="text-[11px] text-slate-500 mt-2 truncate">Consulta ao serviço do host; regras e eficácia do firewall exigem verificação operacional.</p>
        </div>

        {/* Tráfego Seguro Widget */}
        <div className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
              <Activity className="w-3.5 h-3.5 text-indigo-600" /> Tráfego Seguro VPN
            </span>
            <span className="text-[10px] font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-200">
              Criptografado
            </span>
          </div>
          <div className="space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-500 flex items-center gap-1">
                <ArrowDownLeft className="w-3.5 h-3.5 text-emerald-600" /> RX (Download):
              </span>
              <span className="font-mono font-bold text-slate-800">{formatBytes(wireguard?.bytesRx || 0)}</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-500 flex items-center gap-1">
                <ArrowUpRight className="w-3.5 h-3.5 text-blue-600" /> TX (Upload):
              </span>
              <span className="font-mono font-bold text-slate-800">{formatBytes(wireguard?.bytesTx || 0)}</span>
            </div>
          </div>
          <p className="text-[11px] text-slate-400 mt-2 truncate">Proteção contra escuta e sequestro de áudio RTP</p>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex items-center gap-2 border-b border-slate-200 overflow-x-auto custom-scrollbar pb-1">
        <button
          onClick={() => setActiveTab('dashboard')}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-bold rounded-xl transition whitespace-nowrap ${
            activeTab === 'dashboard'
              ? 'bg-blue-700 text-white shadow-sm'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Activity className="w-4 h-4" />
          <span>Dashboard &amp; Telemetria VPN</span>
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse ml-0.5" />
        </button>

        <button
          onClick={() => setActiveTab('wireguard')}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-bold rounded-xl transition whitespace-nowrap ${
            activeTab === 'wireguard'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Shield className="w-4 h-4" />
          <span>WireGuard VPN (Túneis &amp; Ramais)</span>
          <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${activeTab === 'wireguard' ? 'bg-blue-700 text-white' : 'bg-slate-200 text-slate-700'}`}>
            {wireguard?.peers?.length || 0}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('zerotier')}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-bold rounded-xl transition whitespace-nowrap ${
            activeTab === 'zerotier'
              ? 'bg-orange-600 text-white shadow-sm'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Globe className="w-4 h-4" />
          <span>ZeroTier One (SD-WAN Mesh)</span>
          <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${activeTab === 'zerotier' ? 'bg-orange-700 text-white' : 'bg-slate-200 text-slate-700'}`}>
            {zerotier?.networks?.length || 0}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('fail2ban_monitor')}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-bold rounded-xl transition whitespace-nowrap ${
            activeTab === 'fail2ban_monitor'
              ? 'bg-rose-600 text-white shadow-sm'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <ShieldAlert className="w-4 h-4" />
          <span>Fail2ban: Monitoramento de Bloqueios</span>
          <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${activeTab === 'fail2ban_monitor' ? 'bg-rose-700 text-white' : 'bg-rose-100 text-rose-700'}`}>
            {fail2ban?.currentBanEntries ?? '—'}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('fail2ban_rules')}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-bold rounded-xl transition whitespace-nowrap ${
            activeTab === 'fail2ban_rules'
              ? 'bg-slate-800 text-white shadow-sm'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Sliders className="w-4 h-4" />
          <span>Regras de Proteção &amp; Whitelist</span>
        </button>
      </div>

      {/* TAB 0: DASHBOARD & TELEMETRIA VPN */}
      {activeTab === 'dashboard' && (
        <VpnMonitoringDashboard onNavigateToTab={(tab) => setActiveTab(tab)} />
      )}

      {/* TAB 1: WIREGUARD VPN */}
      {activeTab === 'wireguard' && (
        <div className="space-y-6">
          {/* Server Config & Quick Info Card */}
          <div className="p-5 rounded-2xl bg-white border border-slate-200/90 shadow-sm">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-bold text-slate-900">Servidor WireGuard PBX (Interface {wireguard?.interfaceName})</h2>
                  <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200">
                    Kernel WireGuard v1.0
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  Permite conectar ramais PJSIP em smartphones, computadores e gateways de filiais através de um túnel seguro direto sem NAT traversal.
                </p>
              </div>

              <div className="flex items-center gap-2.5">
                <button
                  onClick={handleToggleWg}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold border transition flex items-center gap-1.5 ${
                    wireguard?.status === 'active'
                      ? 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100'
                      : 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                  }`}
                >
                  <Power className="w-3.5 h-3.5" />
                  <span>{wireguard?.status === 'active' ? 'Pausar Interface wg0' : 'Iniciar wg0'}</span>
                </button>

                <button
                  onClick={() => setIsPeerModalOpen(true)}
                  className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-sm active:scale-95"
                >
                  <Plus className="w-4 h-4" />
                  <span>Novo Peer / Ramal VPN</span>
                </button>
              </div>
            </div>

            {/* Server Technical Details Grid */}
            <div className="mt-4 pt-4 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/80">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Chave Pública do PBX</span>
                <p className="font-mono text-xs font-semibold text-slate-700 truncate mt-0.5" title={wireguard?.publicKey}>
                  {wireguard?.publicKey}
                </p>
              </div>

              <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/80">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Endereço Virtual do PBX</span>
                <p className="font-mono text-xs font-semibold text-slate-700 mt-0.5">{wireguard?.address}</p>
              </div>

              <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/80">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Porta UDP de Escuta</span>
                <p className="font-mono text-xs font-semibold text-blue-600 mt-0.5">{wireguard?.listenPort} / UDP</p>
              </div>

              <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/80">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Servidores DNS do Túnel</span>
                <p className="font-mono text-xs font-semibold text-slate-700 mt-0.5">{wireguard?.dns}</p>
              </div>
            </div>
          </div>

          {/* WireGuard Peers List */}
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Peers Conectados &amp; Ramais Remotos</h3>
                <p className="text-xs text-slate-500">Dispositivos com acesso direto à sub-rede SIP e Dialplan Asterisk.</p>
              </div>
              <span className="text-xs font-semibold text-slate-500">
                Total: <strong className="text-slate-800">{wireguard?.peers?.length || 0}</strong> peers
              </span>
            </div>

            <div className="divide-y divide-slate-100">
              {(wireguard?.peers || []).map((peer) => (
                <div key={peer.id} className="p-4 hover:bg-slate-50/70 transition flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  <div className="flex items-start gap-3 min-w-0">
                    <div
                      className={`p-2.5 rounded-xl mt-0.5 flex-shrink-0 ${
                        peer.status === 'connected'
                          ? 'bg-emerald-50 text-emerald-600 border border-emerald-200'
                          : peer.status === 'idle'
                          ? 'bg-amber-50 text-amber-600 border border-amber-200'
                          : 'bg-slate-100 text-slate-400 border border-slate-200'
                      }`}
                    >
                      {peer.assignedExtension ? <Smartphone className="w-4 h-4" /> : <Laptop className="w-4 h-4" />}
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-bold text-slate-900 truncate">{peer.name}</span>
                        {peer.assignedExtension && (
                          <span className="text-[11px] font-mono font-bold bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full border border-blue-200">
                            Ramal {peer.assignedExtension}
                          </span>
                        )}
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 ${
                            peer.status === 'connected'
                              ? 'bg-emerald-100 text-emerald-800'
                              : peer.status === 'idle'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              peer.status === 'connected' ? 'bg-emerald-500 animate-pulse' : peer.status === 'idle' ? 'bg-amber-500' : 'bg-slate-400'
                            }`}
                          />
                          {peer.status === 'connected' ? 'Conectado' : peer.status === 'idle' ? 'Em Espera' : 'Offline'}
                        </span>
                      </div>

                      <div className="flex items-center gap-4 mt-1.5 text-xs text-slate-500 flex-wrap">
                        <span className="font-mono bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded">
                          IP: <strong>{peer.allowedIps}</strong>
                        </span>
                        {peer.endpoint && <span>Endpoint: <strong className="text-slate-700">{peer.endpoint}</strong></span>}
                        {peer.location && <span>Local: {peer.location}</span>}
                        <span>Último Handshake: <strong className="text-slate-700">{peer.latestHandshake}</strong></span>
                      </div>
                    </div>
                  </div>

                  {/* Transfer Stats & Action Buttons */}
                  <div className="flex items-center justify-between lg:justify-end gap-3 pt-2 lg:pt-0 border-t lg:border-t-0 border-slate-100">
                    <div className="text-right text-xs">
                      <div className="text-[11px] text-slate-400">Tráfego Transferido</div>
                      <div className="font-mono font-semibold text-slate-700">
                        ↓ {formatBytes(peer.transferRx)} • ↑ {formatBytes(peer.transferTx)}
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => handleOpenClientConfig(peer)}
                        className="px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-blue-50 hover:text-blue-700 text-slate-700 text-xs font-bold transition flex items-center gap-1 border border-slate-200"
                        title="Ver Configuração (.conf) e QR Code para Smartphone"
                      >
                        <QrCode className="w-3.5 h-3.5" />
                        <span>Config &amp; QR</span>
                      </button>

                      <button
                        onClick={() => handleTogglePeer(peer.id)}
                        className={`p-1.5 rounded-xl border transition ${
                          peer.enabled
                            ? 'bg-slate-50 text-slate-600 hover:bg-slate-100 border-slate-200'
                            : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        }`}
                        title={peer.enabled ? 'Desabilitar peer' : 'Habilitar peer'}
                      >
                        <Power className="w-3.5 h-3.5" />
                      </button>

                      <button
                        onClick={() => handleDeletePeer(peer.id, peer.name)}
                        className="p-1.5 rounded-xl bg-slate-50 text-slate-400 hover:text-rose-600 hover:bg-rose-50 border border-slate-200 transition"
                        title="Excluir peer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: ZEROTIER ONE (SD-WAN MESH) */}
      {activeTab === 'zerotier' && (
        <div className="space-y-6">
          {/* ZeroTier Daemon Header */}
          <div className="p-5 rounded-2xl bg-white border border-slate-200/90 shadow-sm">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-bold text-slate-900">ZeroTier One - Rede Mesh SD-WAN</h2>
                  <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-orange-50 text-orange-700 border border-orange-200">
                    Criptografia P2P Salsa20
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  Interconecta o Asterisk diretamente a matrizes, filiais e provedores em uma rede global privada (Layer 2 Ethernet sobre UDP 9993).
                </p>
              </div>

              <div className="flex items-center gap-2.5">
                <button
                  onClick={handleToggleZt}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold border transition flex items-center gap-1.5 ${
                    zerotier?.status === 'online'
                      ? 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100'
                      : 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                  }`}
                >
                  <Power className="w-3.5 h-3.5" />
                  <span>{zerotier?.status === 'online' ? 'Desconectar ZeroTier' : 'Iniciar ZeroTier'}</span>
                </button>

                <button
                  onClick={() => setIsJoinZtModalOpen(true)}
                  className="px-3.5 py-2 rounded-xl bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-sm active:scale-95"
                >
                  <Plus className="w-4 h-4" />
                  <span>Conectar a uma Rede (Join)</span>
                </button>
              </div>
            </div>

            {/* ZeroTier Daemon Info */}
            <div className="mt-4 pt-4 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/80">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">ZeroTier Node ID (10 hex)</span>
                <p className="font-mono text-sm font-bold text-orange-600 mt-0.5">{zerotier?.nodeId}</p>
              </div>

              <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/80">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Versão do Cliente</span>
                <p className="font-mono text-xs font-semibold text-slate-700 mt-0.5">v{zerotier?.version} (Linux amd64)</p>
              </div>

              <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/80">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Porta UDP Primária</span>
                <p className="font-mono text-xs font-semibold text-slate-700 mt-0.5">9993 / UDP (P2P NAT Hole-Punching)</p>
              </div>
            </div>
          </div>

          {/* Joined Networks Cards */}
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-slate-900">Redes ZeroTier Conectadas</h3>

            {(!zerotier?.networks || (zerotier?.networks?.length || 0) === 0) ? (
              <div className="p-8 text-center bg-white rounded-2xl border border-slate-200 text-slate-500">
                Nenhuma rede conectada. Clique em "Conectar a uma Rede (Join)" para associar este PBX a uma malha.
              </div>
            ) : (
              (zerotier?.networks || []).map((net) => (
                <div key={net.id} className="p-5 bg-white rounded-2xl border border-slate-200/90 shadow-sm space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 rounded-xl bg-orange-50 text-orange-600 border border-orange-200">
                        <Globe className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-base font-bold text-slate-900">{net.name}</span>
                          <span className="px-2 py-0.5 rounded-full text-xs font-mono font-bold bg-emerald-100 text-emerald-800">
                            Status: {net.status}
                          </span>
                          <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-slate-100 text-slate-600">
                            {net.type}
                          </span>
                        </div>
                        <p className="font-mono text-xs text-slate-500 mt-0.5">Network ID: <strong>{net.id}</strong></p>
                      </div>
                    </div>

                    <button
                      onClick={() => handleLeaveZt(net.id)}
                      className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-rose-50 hover:text-rose-700 text-slate-700 text-xs font-bold transition border border-slate-200 flex items-center gap-1 self-start sm:self-auto"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Desconectar (Leave)</span>
                    </button>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 border-t border-slate-100 text-xs">
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">IP Atribuído</span>
                      <span className="font-mono font-bold text-slate-800">{net.assignedIp}</span>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Endereço MAC</span>
                      <span className="font-mono text-slate-600">{net.mac}</span>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">MTU da Interface</span>
                      <span className="font-mono text-slate-600">{net.mtu} bytes</span>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Rotas Propagadas</span>
                      <span className="font-mono text-blue-600">{net.routes.join(', ')}</span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* ZeroTier Mesh Peers Table */}
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-900">Peers Detectados na Malha P2P</h3>
              <p className="text-xs text-slate-500">Nós conectados diretamente ao daemon com latência e rota de transporte.</p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-3">Node ID</th>
                    <th className="px-4 py-3">Papel (Role)</th>
                    <th className="px-4 py-3">Tipo de Conexão</th>
                    <th className="px-4 py-3">Latência P2P</th>
                    <th className="px-4 py-3">Endereço Físico</th>
                    <th className="px-4 py-3">Versão</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {(zerotier?.peers || []).map((peer) => (
                    <tr key={peer.nodeId} className="hover:bg-slate-50/70">
                      <td className="px-4 py-3 font-mono font-bold text-slate-900">{peer.nodeId}</td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 text-slate-700">
                          {peer.role}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          {peer.linkType} (Direto)
                        </span>
                      </td>
                      <td className="px-4 py-3 font-mono font-semibold text-emerald-600">{peer.latencyMs} ms</td>
                      <td className="px-4 py-3 font-mono text-slate-600">{peer.physicalAddress}</td>
                      <td className="px-4 py-3 text-slate-500">{peer.version}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {(activeTab === 'fail2ban_monitor' || activeTab === 'fail2ban_rules') && (
        <Fail2banPanel snapshot={fail2ban} refresh={loadData} />
      )}

      {/* MODAL: NOVO PEER WIREGUARD */}
      {isPeerModalOpen && (
        <div className="fixed inset-0 z-50 bg-[#0f172a]/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Shield className="w-5 h-5 text-blue-600" />
                Cadastrar Novo Peer WireGuard
              </h3>
              <button
                onClick={() => setIsPeerModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreatePeer} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Nome do Dispositivo / Usuário *</label>
                <input
                  type="text"
                  required
                  value={newPeerForm.name}
                  onChange={(e) => setNewPeerForm({ ...newPeerForm, name: e.target.value })}
                  placeholder="Ex: Ramal 4105 - Home Office João"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">IP Virtual Permitido</label>
                  <input
                    type="text"
                    value={newPeerForm.allowedIps}
                    onChange={(e) => setNewPeerForm({ ...newPeerForm, allowedIps: e.target.value })}
                    placeholder="Ex: 10.10.0.6/32"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                  <span className="text-[10px] text-slate-400">Vazio = auto-atribuir</span>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Ramal PJSIP Vinculado</label>
                  <input
                    type="text"
                    value={newPeerForm.assignedExtension}
                    onChange={(e) => setNewPeerForm({ ...newPeerForm, assignedExtension: e.target.value })}
                    placeholder="Ex: 4105"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Localização / Descrição</label>
                <input
                  type="text"
                  value={newPeerForm.location}
                  onChange={(e) => setNewPeerForm({ ...newPeerForm, location: e.target.value })}
                  placeholder="Ex: Filial Caxias / MA ou Smartphone 5G"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Keepalive Interval (segundos)</label>
                <input
                  type="number"
                  min={5}
                  max={60}
                  value={newPeerForm.persistentKeepalive}
                  onChange={(e) => setNewPeerForm({ ...newPeerForm, persistentKeepalive: Number(e.target.value) })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
                <span className="text-[10px] text-slate-400">Recomendado 25s para manter portas NAT abertas</span>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsPeerModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-sm"
                >
                  Gerar Peer &amp; Chaves
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: CONFIGURAÇÃO DO CLIENTE & QR CODE */}
      {isQrModalOpen && selectedPeerConfig && (
        <div className="fixed inset-0 z-50 bg-[#0f172a]/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-base font-bold text-slate-900">Configuração WireGuard do Peer</h3>
                <p className="text-xs text-slate-500 font-medium">{selectedPeerConfig.peer.name}</p>
              </div>
              <button
                onClick={() => setIsQrModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* QR Code Preview for Smartphone */}
            <div className="flex flex-col items-center justify-center p-4 bg-slate-50 rounded-2xl border border-slate-200/80">
              <canvas ref={qrCanvasRef} className="rounded-xl shadow-sm border border-white bg-white p-1" />
              <p className="text-[11px] font-semibold text-slate-600 mt-2 flex items-center gap-1.5">
                <Smartphone className="w-3.5 h-3.5 text-blue-600" />
                Escaneie com o app WireGuard oficial (iOS / Android) para conectar o ramal instantaneamente.
              </p>
            </div>

            {/* Raw Config Textarea */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                  Arquivo de Configuração ({selectedPeerConfig.filename})
                </label>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleCopyText(selectedPeerConfig.config)}
                    className="text-[11px] font-bold text-blue-600 hover:underline flex items-center gap-1"
                  >
                    {copiedText ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                    <span>{copiedText ? 'Copiado!' : 'Copiar'}</span>
                  </button>
                </div>
              </div>
              <pre className="p-3 bg-slate-900 text-slate-100 font-mono text-[11px] rounded-xl overflow-x-auto max-h-36 custom-scrollbar">
                {selectedPeerConfig.config}
              </pre>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsQrModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100"
              >
                Fechar
              </button>
              <button
                type="button"
                onClick={() => handleDownloadConf(selectedPeerConfig.config, selectedPeerConfig.filename)}
                className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Baixar Arquivo .conf</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: CONECTAR A UMA REDE ZEROTIER */}
      {isJoinZtModalOpen && (
        <div className="fixed inset-0 z-50 bg-[#0f172a]/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Globe className="w-5 h-5 text-orange-600" />
                Conectar a uma Rede ZeroTier (Join)
              </h3>
              <button
                onClick={() => setIsJoinZtModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleJoinZt} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Network ID (16 dígitos hexadecimais) *</label>
                <input
                  type="text"
                  required
                  value={newZtForm.networkId}
                  onChange={(e) => setNewZtForm({ ...newZtForm, networkId: e.target.value.trim() })}
                  placeholder="Ex: 8056c2e21c000001"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold focus:outline-none focus:ring-2 focus:ring-orange-500/20"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Nome de Identificação (Opcional)</label>
                <input
                  type="text"
                  value={newZtForm.name}
                  onChange={(e) => setNewZtForm({ ...newZtForm, name: e.target.value })}
                  placeholder="Ex: Enlace Matriz e Filiais"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-orange-500/20"
                />
              </div>

              <div className="p-3 bg-orange-50 rounded-xl border border-orange-200 text-[11px] text-orange-900">
                Após clicar em conectar, certifique-se de autorizar este PBX (Node ID: <strong className="font-mono">{zerotier?.nodeId}</strong>) no painel administrativo my.zerotier.com se a rede for privada.
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsJoinZtModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold shadow-sm"
                >
                  Conectar à Rede
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
