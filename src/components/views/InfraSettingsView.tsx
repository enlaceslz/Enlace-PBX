import React, { useState, useEffect } from 'react';
import {
  Server,
  Globe,
  Lock,
  ShieldCheck,
  ShieldAlert,
  Smartphone,
  Phone,
  MessageSquare,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Save,
  Radio,
  Network,
  Cpu,
  ArrowRight,
  ExternalLink,
  Copy,
  Check,
  Key,
  Bell,
  Download,
  Info,
  Sliders,
  Sparkles,
  Zap,
  Flame,
  FileCode
} from 'lucide-react';
import { InfraConfig } from '../../types/pbx';
import { PWAInstallButton } from '../PWAInstallButton';

interface InfraSettingsViewProps {
  onOpenWebphone?: () => void;
  onNavigate?: (view: any) => void;
}

export const InfraSettingsView: React.FC<InfraSettingsViewProps> = ({ onOpenWebphone, onNavigate }) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'network' | 'ssl' | 'services'>('overview');
  const [config, setConfig] = useState<InfraConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [actionMsg, setActionMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Validation States
  const [validatingSsl, setValidatingSsl] = useState(false);
  const [sslResult, setSslResult] = useState<any>(null);

  const [validatingWebphone, setValidatingWebphone] = useState(false);
  const [webphoneResult, setWebphoneResult] = useState<any>(null);

  const [validatingPwa, setValidatingPwa] = useState(false);
  const [pwaResult, setPwaResult] = useState<any>(null);

  const [validatingWhatsapp, setValidatingWhatsapp] = useState(false);
  const [whatsappResult, setWhatsappResult] = useState<any>(null);

  const [generatingVapid, setGeneratingVapid] = useState(false);
  const [detectingIp, setDetectingIp] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Form edit state
  const [form, setForm] = useState({
    hostname: '',
    domain: '',
    publicIp: '',
    lanIp: '',
    lanSubnet: '',
    lanGateway: '',
    lanInterface: '',
    natMode: 'force_rport' as InfraConfig['natMode'],
    stunServer: '',
    adminEmail: '',
    verifyToken: '',
    sipUdp: 5060,
    sipTls: 5061,
    webrtcWss: 8089,
    http: 80,
    https: 443,
    rtpRange: '10000-20000',
  });

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setActionMsg({ text, type });
    setTimeout(() => setActionMsg(null), 4500);
  };

  const copyToClipboard = (text: string, keyName: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(keyName);
    setTimeout(() => setCopiedKey(null), 2000);
    showToast(`Copiado para a área de transferência: ${text}`, 'success');
  };

  const fetchConfig = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/v1/infra/config');
      const data: InfraConfig = await res.json();
      setConfig(data);
      setForm({
        hostname: data.hostname || '',
        domain: data.domain || '',
        publicIp: data.publicIp || '',
        lanIp: data.lanIp || '',
        lanSubnet: data.lanSubnet || '',
        lanGateway: data.lanGateway || '',
        lanInterface: data.lanInterface || '',
        natMode: data.natMode || 'force_rport',
        stunServer: data.stunServer || '',
        adminEmail: data.sslCertificate?.adminEmail || '',
        verifyToken: data.validationWhatsapp?.verifyToken || '',
        sipUdp: data.ports?.sipUdp || 5060,
        sipTls: data.ports?.sipTls || 5061,
        webrtcWss: data.ports?.webrtcWss || 8089,
        http: data.ports?.http || 80,
        https: data.ports?.https || 443,
        rtpRange: data.ports?.rtpRange || '10000-20000',
      });
    } catch (e) {
      console.error(e);
      showToast('Erro ao carregar configurações de infraestrutura', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConfig();
  }, []);

  const handleSaveNetwork = async () => {
    try {
      setSaving(true);
      const payload = {
        hostname: form.hostname,
        domain: form.domain,
        publicIp: form.publicIp,
        lanIp: form.lanIp,
        lanSubnet: form.lanSubnet,
        lanGateway: form.lanGateway,
        lanInterface: form.lanInterface,
        natMode: form.natMode,
        stunServer: form.stunServer,
        ports: {
          sipUdp: Number(form.sipUdp),
          sipTls: Number(form.sipTls),
          webrtcWss: Number(form.webrtcWss),
          http: Number(form.http),
          https: Number(form.https),
          rtpRange: form.rtpRange,
        },
        sslCertificate: {
          ...config?.sslCertificate,
          adminEmail: form.adminEmail,
        },
        validationWhatsapp: {
          ...config?.validationWhatsapp,
          verifyToken: form.verifyToken,
        },
      };

      const res = await fetch('/api/v1/infra/config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (data.success) {
        setConfig(data.config);
        showToast('Configurações de infraestrutura salvas e sincronizadas com o Asterisk PJSIP!', 'success');
      } else {
        showToast(data.error || 'Erro ao salvar configurações', 'error');
      }
    } catch (e) {
      console.error(e);
      showToast('Falha na comunicação com o servidor', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleAutoDetectIp = async () => {
    try {
      setDetectingIp(true);
      const res = await fetch('/api/v1/infra/auto-detect-ip', { method: 'POST' });
      const data = await res.json();
      if (data.success && data.detectedIp) {
        setForm(prev => ({ ...prev, publicIp: data.detectedIp }));
        showToast(`IP Público detectado com sucesso: ${data.detectedIp} via ${data.method}`, 'success');
      }
    } catch (e) {
      console.error(e);
      showToast('Erro ao detectar IP público', 'error');
    } finally {
      setDetectingIp(false);
    }
  };

  const handleValidateSsl = async () => {
    try {
      setValidatingSsl(true);
      const res = await fetch('/api/v1/infra/validate-ssl', { method: 'POST' });
      const data = await res.json();
      setSslResult(data);
      if (config) {
        setConfig(prev => prev ? {
          ...prev,
          sslCertificate: {
            ...prev.sslCertificate,
            status: data.status,
            daysRemaining: data.daysRemaining,
          }
        } : null);
      }
      showToast(data.message, data.status === 'valid' ? 'success' : 'error');
    } catch (e) {
      console.error(e);
      showToast('Erro ao validar certificado SSL', 'error');
    } finally {
      setValidatingSsl(false);
    }
  };

  const handleValidateWebphone = async () => {
    try {
      setValidatingWebphone(true);
      const res = await fetch('/api/v1/infra/validate-webphone', { method: 'POST' });
      const data = await res.json();
      setWebphoneResult(data);
      if (config) {
        setConfig(prev => prev ? { ...prev, validationWebphone: data.validation } : null);
      }
      showToast('Diagnóstico do Webphone concluído com sucesso!', 'success');
    } catch (e) {
      console.error(e);
      showToast('Erro ao validar Webphone', 'error');
    } finally {
      setValidatingWebphone(false);
    }
  };

  const handleValidatePwa = async () => {
    try {
      setValidatingPwa(true);
      const res = await fetch('/api/v1/infra/validate-pwa', { method: 'POST' });
      const data = await res.json();
      setPwaResult(data);
      if (config) {
        setConfig(prev => prev ? { ...prev, validationPwa: data.validation } : null);
      }
      showToast('Diagnóstico do PWA concluído com sucesso!', 'success');
    } catch (e) {
      console.error(e);
      showToast('Erro ao validar PWA', 'error');
    } finally {
      setValidatingPwa(false);
    }
  };

  const handleGenerateVapid = async () => {
    try {
      setGeneratingVapid(true);
      const res = await fetch('/api/v1/infra/vapid/generate', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        showToast('Novo par de chaves VAPID gerado com sucesso!', 'success');
        fetchConfig();
      }
    } catch (e) {
      console.error(e);
      showToast('Erro ao gerar chaves VAPID', 'error');
    } finally {
      setGeneratingVapid(false);
    }
  };

  const handleSendTestPush = async () => {
    try {
      // Test browser notification directly if allowed
      if ('Notification' in window) {
        if (Notification.permission === 'default') {
          const perm = await Notification.requestPermission();
          if (perm !== 'granted') {
            showToast('Permissão de notificação negada pelo navegador', 'error');
            return;
          }
        }
        if (Notification.permission === 'granted') {
          new Notification('Enlace-PBX: Chamada Recebida (Ramal 4101)', {
            body: 'Chamada de Suporte NOC (11 98765-4321) tocando agora...',
            icon: '/logo-icon.png',
            tag: 'incoming-call-test',
          });
        }
      }

      // Also trigger backend push event
      const res = await fetch('/api/v1/infra/send-test-push', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        showToast('Notificação Push de teste disparada! Verifique a bandeja do sistema.', 'success');
      }
    } catch (e) {
      console.error(e);
      showToast('Erro ao disparar notificação push', 'error');
    }
  };

  const handleValidateWhatsapp = async () => {
    try {
      setValidatingWhatsapp(true);
      const res = await fetch('/api/v1/infra/validate-whatsapp', { method: 'POST' });
      const data = await res.json();
      setWhatsappResult(data);
      if (config) {
        setConfig(prev => prev ? { ...prev, validationWhatsapp: data.validation } : null);
      }
      showToast('Validação com a política Meta WhatsApp concluída com sucesso!', 'success');
    } catch (e) {
      console.error(e);
      showToast('Erro ao validar Webhook WhatsApp', 'error');
    } finally {
      setValidatingWhatsapp(false);
    }
  };

  const handleRunFullDiagnostic = async () => {
    setValidatingSsl(true);
    setValidatingWebphone(true);
    setValidatingPwa(true);
    setValidatingWhatsapp(true);
    try {
      await Promise.all([
        handleValidateSsl(),
        handleValidateWebphone(),
        handleValidatePwa(),
        handleValidateWhatsapp(),
      ]);
      showToast('Diagnóstico completo de infraestrutura e serviços finalizado!', 'success');
    } finally {
      setValidatingSsl(false);
      setValidatingWebphone(false);
      setValidatingPwa(false);
      setValidatingWhatsapp(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-slate-500 gap-3">
        <RefreshCw className="w-8 h-8 animate-spin text-blue-600" />
        <p className="text-sm font-semibold">Carregando infraestrutura e certificados SSL...</p>
      </div>
    );
  }

  const sslStatus = config?.sslCertificate?.status || 'valid';
  const sslColor = sslStatus === 'valid' ? 'emerald' : sslStatus === 'expiring_soon' ? 'amber' : 'rose';

  return (
    <div className="max-w-[1400px] mx-auto space-y-8 pb-16">
      {/* Toast Feedback */}
      {actionMsg && (
        <div
          className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 px-5 py-3 rounded-2xl shadow-xl border text-sm font-bold animate-in fade-in slide-in-from-bottom-3 ${
            actionMsg.type === 'success'
              ? 'bg-emerald-600 text-white border-emerald-500'
              : 'bg-rose-600 text-white border-rose-500'
          }`}
        >
          {actionMsg.type === 'success' ? <CheckCircle2 className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
          <span>{actionMsg.text}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-200 pb-6">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-blue-600/10 border border-blue-600/20 text-blue-600">
              <Server className="w-7 h-7" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight flex items-center gap-2">
                Infraestrutura, Domínio & Certificado SSL
              </h1>
              <p className="text-xs sm:text-sm font-medium text-slate-500 mt-0.5">
                Hostname, IP Público (NAT WAN), Domínio FQDN, IP da LAN e validação estrita dos pilares HTTPS.
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <PWAInstallButton />

          <button
            onClick={handleRunFullDiagnostic}
            disabled={validatingSsl || validatingWebphone || validatingPwa || validatingWhatsapp}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 text-xs font-bold transition shadow-xs disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 text-blue-600 ${(validatingSsl || validatingWebphone) ? 'animate-spin' : ''}`} />
            Diagnóstico Geral HTTPS
          </button>

          <button
            onClick={handleSaveNetwork}
            disabled={saving}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 text-white hover:bg-blue-700 text-xs font-bold transition shadow-md shadow-blue-600/20 disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            {saving ? 'Sincronizando...' : 'Salvar & Sincronizar PJSIP'}
          </button>
        </div>
      </div>

      {/* Quick Status Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Hostname */}
        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Nome do Host</span>
            <span className="p-1.5 rounded-lg bg-blue-50 text-blue-600">
              <Cpu className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-3">
            <div className="text-base font-extrabold text-slate-800 truncate" title={config?.hostname}>
              {config?.hostname}
            </div>
            <div className="text-[11px] font-mono text-slate-400 mt-1 flex items-center gap-1.5">
              <span>Linux x86_64</span>
              <span>•</span>
              <span className="text-emerald-600 font-semibold">Asterisk 20 LTS</span>
            </div>
          </div>
        </div>

        {/* Public IP */}
        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">IP Público (WAN / NAT)</span>
            <span className="p-1.5 rounded-lg bg-indigo-50 text-indigo-600">
              <Globe className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-3">
            <div className="text-base font-extrabold text-slate-800 font-mono flex items-center gap-2">
              {config?.publicIp}
              <button
                onClick={() => copyToClipboard(config?.publicIp || '', 'publicIp')}
                className="text-slate-400 hover:text-slate-600"
                title="Copiar IP"
              >
                {copiedKey === 'publicIp' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>
            <div className="text-[11px] text-slate-400 mt-1">
              Modo NAT: <span className="font-semibold text-slate-600">{config?.natMode}</span>
            </div>
          </div>
        </div>

        {/* Domain FQDN */}
        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Domínio (FQDN)</span>
            <span className="p-1.5 rounded-lg bg-sky-50 text-sky-600">
              <Network className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-3">
            <div className="text-base font-extrabold text-slate-800 truncate font-mono text-blue-600" title={config?.domain}>
              {config?.domain}
            </div>
            <div className="text-[11px] text-slate-400 mt-1 flex items-center gap-1.5">
              <span>Porta HTTPS: <strong>{config?.ports.https}</strong></span>
              <span>•</span>
              <span>WSS: <strong>{config?.ports.webrtcWss}</strong></span>
            </div>
          </div>
        </div>

        {/* SSL Certificate Status */}
        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Certificado SSL / HTTPS</span>
            <span className={`p-1.5 rounded-lg bg-${sslColor}-50 text-${sslColor}-600`}>
              <Lock className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-3">
            <div className="flex items-center gap-2">
              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold ${
                sslStatus === 'valid'
                  ? 'bg-emerald-100 text-emerald-800'
                  : sslStatus === 'expiring_soon'
                  ? 'bg-amber-100 text-amber-800'
                  : 'bg-rose-100 text-rose-800'
              }`}>
                {sslStatus === 'valid' ? 'Ativo & Válido' : sslStatus === 'expiring_soon' ? 'Expirando em Breve' : 'Inválido / Expirado'}
              </span>
              <span className="text-xs font-bold text-slate-600 font-mono">
                {config?.sslCertificate.daysRemaining} dias
              </span>
            </div>
            <div className="text-[11px] text-slate-400 mt-1 truncate" title={config?.sslCertificate.issuer}>
              {config?.sslCertificate.issuer}
            </div>
          </div>
        </div>
      </div>

      {/* Main Tabs Navigation */}
      <div className="flex border-b border-slate-200 gap-2 overflow-x-auto pb-px">
        <button
          onClick={() => setActiveTab('overview')}
          className={`px-5 py-3 text-xs sm:text-sm font-bold border-b-2 transition flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'overview'
              ? 'border-blue-600 text-blue-600 bg-blue-50/50 rounded-t-xl'
              : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'
          }`}
        >
          <Sliders className="w-4 h-4" />
          Visão Geral & Topologia
        </button>

        <button
          onClick={() => setActiveTab('network')}
          className={`px-5 py-3 text-xs sm:text-sm font-bold border-b-2 transition flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'network'
              ? 'border-blue-600 text-blue-600 bg-blue-50/50 rounded-t-xl'
              : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'
          }`}
        >
          <Network className="w-4 h-4" />
          Host, Domínio, IP LAN & WAN
        </button>

        <button
          onClick={() => setActiveTab('ssl')}
          className={`px-5 py-3 text-xs sm:text-sm font-bold border-b-2 transition flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'ssl'
              ? 'border-blue-600 text-blue-600 bg-blue-50/50 rounded-t-xl'
              : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'
          }`}
        >
          <Lock className="w-4 h-4" />
          Certificado SSL/TLS & HTTPS
          <span className="ml-1.5 px-2 py-0.5 text-[10px] rounded-full bg-emerald-100 text-emerald-700 font-bold">
            TLS 1.3
          </span>
        </button>

        <button
          onClick={() => setActiveTab('services')}
          className={`px-5 py-3 text-xs sm:text-sm font-bold border-b-2 transition flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'services'
              ? 'border-blue-600 text-blue-600 bg-blue-50/50 rounded-t-xl'
              : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'
          }`}
        >
          <Sparkles className="w-4 h-4 text-amber-500" />
          Validação dos 3 Pilares HTTPS
          <span className="ml-1.5 px-2 py-0.5 text-[10px] rounded-full bg-blue-100 text-blue-700 font-bold">
            Webphone • PWA • WhatsApp
          </span>
        </button>
      </div>

      {/* TAB 1: OVERVIEW & TOPOLOGY */}
      {activeTab === 'overview' && (
        <div className="space-y-8">
          {/* Topologia Diagram */}
          <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-xs space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <Network className="w-5 h-5 text-blue-600" />
                  Diagrama de Fluxo e Segurança da Infraestrutura
                </h2>
                <p className="text-xs text-slate-500 mt-1">
                  Mapeamento de borda externa (WAN), terminação TLS/HTTPS com NGINX e comunicação de áudio RTP/PJSIP no Asterisk 20.
                </p>
              </div>

              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-bold border border-emerald-200">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                Criptografia Ponta a Ponta Ativa
              </span>
            </div>

            {/* Architecture Visual Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4">
              {/* WAN Clients */}
              <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col justify-between space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-extrabold uppercase text-slate-500">1. Clientes Externos (WAN)</span>
                  <Globe className="w-4 h-4 text-slate-400" />
                </div>
                <div className="space-y-2.5">
                  <div className="p-3 rounded-xl bg-white border border-slate-200 flex items-center gap-3">
                    <Phone className="w-4 h-4 text-emerald-600 shrink-0" />
                    <div>
                      <div className="text-xs font-bold text-slate-800">Webphone WebRTC</div>
                      <div className="text-[10px] text-slate-500">Navegador (Áudio Opus / WSS Seguro)</div>
                    </div>
                  </div>
                  <div className="p-3 rounded-xl bg-white border border-slate-200 flex items-center gap-3">
                    <Smartphone className="w-4 h-4 text-blue-600 shrink-0" />
                    <div>
                      <div className="text-xs font-bold text-slate-800">PWA Mobile & Desktop</div>
                      <div className="text-[10px] text-slate-500">Push RFC 8292 em segundo plano</div>
                    </div>
                  </div>
                  <div className="p-3 rounded-xl bg-white border border-slate-200 flex items-center gap-3">
                    <MessageSquare className="w-4 h-4 text-emerald-600 shrink-0" />
                    <div>
                      <div className="text-xs font-bold text-slate-800">Meta WhatsApp Cloud API</div>
                      <div className="text-[10px] text-slate-500">Webhook oficial via Graph API</div>
                    </div>
                  </div>
                </div>
                <div className="text-[11px] font-mono text-center text-slate-400 bg-white/70 py-1 rounded-lg border border-slate-200">
                  DNS: {config?.domain}
                </div>
              </div>

              {/* Edge Proxy & Firewall */}
              <div className="p-5 rounded-2xl bg-blue-50/50 border border-blue-200 flex flex-col justify-between space-y-4 relative">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-extrabold uppercase text-blue-700">2. Borda, NAT & Terminação SSL</span>
                  <Lock className="w-4 h-4 text-blue-600" />
                </div>
                <div className="space-y-2.5">
                  <div className="p-3 rounded-xl bg-white border border-blue-100">
                    <div className="text-xs font-bold text-slate-800 flex items-center justify-between">
                      <span>Porta HTTPS 443</span>
                      <span className="text-[10px] font-mono text-blue-600">Let's Encrypt TLS 1.3</span>
                    </div>
                    <div className="text-[10px] text-slate-500 mt-0.5">Painel Web, Webhook WhatsApp & PWA</div>
                  </div>

                  <div className="p-3 rounded-xl bg-white border border-blue-100">
                    <div className="text-xs font-bold text-slate-800 flex items-center justify-between">
                      <span>Porta WSS 8089</span>
                      <span className="text-[10px] font-mono text-blue-600">DTLS-SRTP</span>
                    </div>
                    <div className="text-[10px] text-slate-500 mt-0.5">Sinalização WebSocket para Webphone</div>
                  </div>

                  <div className="p-3 rounded-xl bg-white border border-blue-100">
                    <div className="text-xs font-bold text-slate-800 flex items-center justify-between">
                      <span>SIP 5060 / 5061</span>
                      <span className="text-[10px] font-mono text-blue-600">PJSIP UDP/TLS</span>
                    </div>
                    <div className="text-[10px] text-slate-500 mt-0.5">Troncos SIP Claro/Vivo e Ramais IP</div>
                  </div>
                </div>
                <div className="text-[11px] font-mono text-center text-blue-700 bg-blue-100/60 py-1 rounded-lg border border-blue-200">
                  IP WAN: {config?.publicIp}
                </div>
              </div>

              {/* Asterisk Core & LAN */}
              <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col justify-between space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-extrabold uppercase text-slate-500">3. Asterisk Core (LAN Local)</span>
                  <Server className="w-4 h-4 text-slate-400" />
                </div>
                <div className="space-y-2.5">
                  <div className="p-3 rounded-xl bg-white border border-slate-200">
                    <div className="text-xs font-bold text-slate-800">Asterisk 20 LTS Puro</div>
                    <div className="text-[10px] text-slate-500">Dialplan, Filas, Gravação MixMonitor</div>
                  </div>

                  <div className="p-3 rounded-xl bg-white border border-slate-200">
                    <div className="text-xs font-bold text-slate-800">Pool de Mídia RTP (Áudio)</div>
                    <div className="text-[10px] font-mono text-slate-500">UDP {config?.ports.rtpRange}</div>
                  </div>

                  <div className="p-3 rounded-xl bg-white border border-slate-200">
                    <div className="text-xs font-bold text-slate-800">Agente IA Gemini (MaIA)</div>
                    <div className="text-[10px] text-slate-500">AudioSocket 8088 & Gemini Live API</div>
                  </div>
                </div>
                <div className="text-[11px] font-mono text-center text-slate-500 bg-white/70 py-1 rounded-lg border border-slate-200">
                  LAN: {config?.lanIp} ({config?.lanInterface})
                </div>
              </div>
            </div>
          </div>

          {/* 3 Pillars Summary Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Pillar 1: Webphone */}
            <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600">
                    <Phone className="w-5 h-5" />
                  </div>
                  <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-xs font-extrabold">
                    100% Compatível
                  </span>
                </div>
                <h3 className="text-base font-bold text-slate-900">Webphone (WebRTC / WSS)</h3>
                <p className="text-xs text-slate-500 mt-1">
                  Exige <strong>HTTPS</strong> para que o navegador libere a permissão de captura do microfone (getUserMedia) e WSS para handshake.
                </p>

                <div className="mt-4 space-y-2 text-xs">
                  <div className="flex items-center justify-between py-1 border-b border-slate-100">
                    <span className="text-slate-600">Contexto Seguro</span>
                    <span className="text-emerald-600 font-bold flex items-center gap-1">
                      <Check className="w-3.5 h-3.5" /> HTTPS Ativo
                    </span>
                  </div>
                  <div className="flex items-center justify-between py-1 border-b border-slate-100">
                    <span className="text-slate-600">Porta WSS</span>
                    <span className="font-mono text-slate-800">{config?.ports.webrtcWss}/TCP</span>
                  </div>
                  <div className="flex items-center justify-between py-1">
                    <span className="text-slate-600">Codec de Voz</span>
                    <span className="font-bold text-slate-800">Opus 48kHz HD</span>
                  </div>
                </div>
              </div>

              <div className="mt-5 pt-4 border-t border-slate-100 flex items-center gap-2">
                <button
                  onClick={onOpenWebphone}
                  className="flex-1 py-2 rounded-xl bg-emerald-600 text-white font-bold text-xs hover:bg-emerald-700 transition text-center"
                >
                  Abrir Webphone
                </button>
                <button
                  onClick={() => setActiveTab('services')}
                  className="p-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50"
                  title="Ver detalhes de validação"
                >
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Pillar 2: PWA Push */}
            <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="p-2 rounded-xl bg-blue-50 text-blue-600">
                    <Smartphone className="w-5 h-5" />
                  </div>
                  <span className="px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-800 text-xs font-extrabold">
                    Pronto para Push
                  </span>
                </div>
                <h3 className="text-base font-bold text-slate-900">PWA com Notificação Push</h3>
                <p className="text-xs text-slate-500 mt-1">
                  Service Worker e Push API da W3C exigem <strong>HTTPS</strong> obrigatório para registrar eventos de chamadas em segundo plano.
                </p>

                <div className="mt-4 space-y-2 text-xs">
                  <div className="flex items-center justify-between py-1 border-b border-slate-100">
                    <span className="text-slate-600">Web App Manifest</span>
                    <span className="text-emerald-600 font-bold flex items-center gap-1">
                      <Check className="w-3.5 h-3.5" /> /manifest.json
                    </span>
                  </div>
                  <div className="flex items-center justify-between py-1 border-b border-slate-100">
                    <span className="text-slate-600">Service Worker</span>
                    <span className="text-emerald-600 font-bold flex items-center gap-1">
                      <Check className="w-3.5 h-3.5" /> Ativo (/sw.js)
                    </span>
                  </div>
                  <div className="flex items-center justify-between py-1">
                    <span className="text-slate-600">Chaves VAPID</span>
                    <span className="text-emerald-600 font-bold">NIST P-256</span>
                  </div>
                </div>
              </div>

              <div className="mt-5 pt-4 border-t border-slate-100 flex items-center gap-2">
                <button
                  onClick={handleSendTestPush}
                  className="flex-1 py-2 rounded-xl bg-blue-600 text-white font-bold text-xs hover:bg-blue-700 transition text-center"
                >
                  Testar Push de Chamada
                </button>
                <button
                  onClick={() => setActiveTab('services')}
                  className="p-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50"
                  title="Ver detalhes de validação"
                >
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Pillar 3: WhatsApp Meta */}
            <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600">
                    <MessageSquare className="w-5 h-5" />
                  </div>
                  <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-xs font-extrabold">
                    Meta Graph API OK
                  </span>
                </div>
                <h3 className="text-base font-bold text-slate-900">WhatsApp Cloud API Oficial</h3>
                <p className="text-xs text-slate-500 mt-1">
                  A Meta exige estritamente webhook público <strong>HTTPS na porta 443</strong> com certificado emitido por AC confiável.
                </p>

                <div className="mt-4 space-y-2 text-xs">
                  <div className="flex items-center justify-between py-1 border-b border-slate-100">
                    <span className="text-slate-600">Protocolo</span>
                    <span className="text-emerald-600 font-bold flex items-center gap-1">
                      <Check className="w-3.5 h-3.5" /> HTTPS (443)
                    </span>
                  </div>
                  <div className="flex items-center justify-between py-1 border-b border-slate-100">
                    <span className="text-slate-600">Autoridade Certificadora</span>
                    <span className="text-emerald-600 font-bold">Let's Encrypt / Pública</span>
                  </div>
                  <div className="flex items-center justify-between py-1">
                    <span className="text-slate-600">Webhook Challenge</span>
                    <span className="font-mono text-slate-800">200 OK</span>
                  </div>
                </div>
              </div>

              <div className="mt-5 pt-4 border-t border-slate-100 flex items-center gap-2">
                <button
                  onClick={handleValidateWhatsapp}
                  className="flex-1 py-2 rounded-xl bg-emerald-600 text-white font-bold text-xs hover:bg-emerald-700 transition text-center"
                >
                  Testar Desafio Meta
                </button>
                <button
                  onClick={() => setActiveTab('services')}
                  className="p-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50"
                  title="Ver detalhes de validação"
                >
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: NETWORK CONFIGURATION */}
      {activeTab === 'network' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Network Form */}
          <div className="lg:col-span-2 space-y-6">
            <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-xs space-y-6">
              <div>
                <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <Server className="w-5 h-5 text-blue-600" />
                  Identificação do Host, Domínio & Endereçamento IP
                </h2>
                <p className="text-xs text-slate-500 mt-1">
                  Estes parâmetros são compilados diretamente no arquivo <code>pjsip.conf</code> do Asterisk 20 para evitar problemas de áudio unidirecional (One-Way Audio) e registrar os canais WebRTC.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Hostname */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Nome do Host (Linux Hostname)
                  </label>
                  <input
                    type="text"
                    value={form.hostname}
                    onChange={(e) => setForm({ ...form, hostname: e.target.value })}
                    className="w-full px-3.5 py-2.5 text-xs font-mono rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-blue-600/30 focus:border-blue-600 bg-white"
                    placeholder="pbx.enlace.slz.br"
                  />
                  <span className="text-[10px] text-slate-400 mt-0.5 block">Identificador do nó Asterisk no cluster</span>
                </div>

                {/* Domain FQDN */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Domínio Oficial (FQDN)
                  </label>
                  <input
                    type="text"
                    value={form.domain}
                    onChange={(e) => setForm({ ...form, domain: e.target.value })}
                    className="w-full px-3.5 py-2.5 text-xs font-mono rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-blue-600/30 focus:border-blue-600 bg-white text-blue-600 font-bold"
                    placeholder="enlace.slz.br"
                  />
                  <span className="text-[10px] text-slate-400 mt-0.5 block">Nome DNS apontado para este servidor (exigido para SSL)</span>
                </div>

                {/* Public IP */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-bold text-slate-700">
                      IP Público (WAN / NAT Traversal)
                    </label>
                    <button
                      type="button"
                      onClick={handleAutoDetectIp}
                      disabled={detectingIp}
                      className="text-[11px] font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1"
                    >
                      <RefreshCw className={`w-3 h-3 ${detectingIp ? 'animate-spin' : ''}`} />
                      Auto-detectar IP
                    </button>
                  </div>
                  <input
                    type="text"
                    value={form.publicIp}
                    onChange={(e) => setForm({ ...form, publicIp: e.target.value })}
                    className="w-full px-3.5 py-2.5 text-xs font-mono rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-blue-600/30 focus:border-blue-600 bg-white"
                    placeholder="177.136.210.12"
                  />
                  <span className="text-[10px] text-slate-400 mt-0.5 block">Injetado em <code>external_media_address</code> do PJSIP</span>
                </div>

                {/* LAN IP */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    IP da Rede Local (LAN)
                  </label>
                  <input
                    type="text"
                    value={form.lanIp}
                    onChange={(e) => setForm({ ...form, lanIp: e.target.value })}
                    className="w-full px-3.5 py-2.5 text-xs font-mono rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-blue-600/30 focus:border-blue-600 bg-white"
                    placeholder="192.168.1.100"
                  />
                  <span className="text-[10px] text-slate-400 mt-0.5 block">Endereço IP da placa de rede interna</span>
                </div>

                {/* LAN Subnet */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Sub-rede LAN (CIDR)
                  </label>
                  <input
                    type="text"
                    value={form.lanSubnet}
                    onChange={(e) => setForm({ ...form, lanSubnet: e.target.value })}
                    className="w-full px-3.5 py-2.5 text-xs font-mono rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-blue-600/30 focus:border-blue-600 bg-white"
                    placeholder="192.168.1.0/24"
                  />
                  <span className="text-[10px] text-slate-400 mt-0.5 block">Injetado em <code>local_net</code> para tráfego local sem NAT</span>
                </div>

                {/* LAN Gateway */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Gateway Padrão (LAN)
                  </label>
                  <input
                    type="text"
                    value={form.lanGateway}
                    onChange={(e) => setForm({ ...form, lanGateway: e.target.value })}
                    className="w-full px-3.5 py-2.5 text-xs font-mono rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-blue-600/30 focus:border-blue-600 bg-white"
                    placeholder="192.168.1.1"
                  />
                  <span className="text-[10px] text-slate-400 mt-0.5 block">Roteador da rede local</span>
                </div>

                {/* LAN Interface */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Interface de Rede Primária
                  </label>
                  <input
                    type="text"
                    value={form.lanInterface}
                    onChange={(e) => setForm({ ...form, lanInterface: e.target.value })}
                    className="w-full px-3.5 py-2.5 text-xs font-mono rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-blue-600/30 focus:border-blue-600 bg-white"
                    placeholder="eth0 (10 Gbps Intel X520)"
                  />
                  <span className="text-[10px] text-slate-400 mt-0.5 block">Dispositivo Ethernet do servidor Linux</span>
                </div>

                {/* NAT Mode */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Comportamento NAT (Asterisk PJSIP)
                  </label>
                  <select
                    value={form.natMode}
                    onChange={(e) => setForm({ ...form, natMode: e.target.value as any })}
                    className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-blue-600/30 focus:border-blue-600 bg-white font-medium"
                  >
                    <option value="force_rport">force_rport + rewrite_contact (Recomendado)</option>
                    <option value="static_ip">static_ip (IP Fixo Dedicado)</option>
                    <option value="auto">auto (Detecção Automática de Roteamento)</option>
                    <option value="stun">stun (STUN Client Resolution)</option>
                  </select>
                  <span className="text-[10px] text-slate-400 mt-0.5 block">Garante entrega de áudio em ramais remotos</span>
                </div>
              </div>

              {/* STUN Server */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Servidor STUN (Session Traversal Utilities for NAT)
                </label>
                <input
                  type="text"
                  value={form.stunServer}
                  onChange={(e) => setForm({ ...form, stunServer: e.target.value })}
                  className="w-full px-3.5 py-2.5 text-xs font-mono rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-blue-600/30 focus:border-blue-600 bg-white"
                  placeholder="stun.l.google.com:19302"
                />
                <span className="text-[10px] text-slate-400 mt-0.5 block">Usado para descobrir IPs reflexivos dos navegadores no WebRTC</span>
              </div>
            </div>

            {/* Ports Configuration Card */}
            <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-xs space-y-4">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Sliders className="w-4 h-4 text-blue-600" />
                Portas de Serviço de Telefonia e Web
              </h3>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="text-[10px] font-bold text-slate-400 block uppercase">Web HTTPS</span>
                  <input
                    type="number"
                    value={form.https}
                    onChange={(e) => setForm({ ...form, https: Number(e.target.value) })}
                    className="w-full bg-transparent font-mono text-sm font-bold text-slate-800 focus:outline-hidden"
                  />
                  <span className="text-[10px] text-slate-500">Padrão Meta: 443</span>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="text-[10px] font-bold text-slate-400 block uppercase">WebRTC WSS</span>
                  <input
                    type="number"
                    value={form.webrtcWss}
                    onChange={(e) => setForm({ ...form, webrtcWss: Number(e.target.value) })}
                    className="w-full bg-transparent font-mono text-sm font-bold text-slate-800 focus:outline-hidden"
                  />
                  <span className="text-[10px] text-slate-500">Asterisk: 8089</span>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="text-[10px] font-bold text-slate-400 block uppercase">PJSIP SIP UDP</span>
                  <input
                    type="number"
                    value={form.sipUdp}
                    onChange={(e) => setForm({ ...form, sipUdp: Number(e.target.value) })}
                    className="w-full bg-transparent font-mono text-sm font-bold text-slate-800 focus:outline-hidden"
                  />
                  <span className="text-[10px] text-slate-500">Padrão: 5060</span>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="text-[10px] font-bold text-slate-400 block uppercase">Pool Áudio RTP</span>
                  <input
                    type="text"
                    value={form.rtpRange}
                    onChange={(e) => setForm({ ...form, rtpRange: e.target.value })}
                    className="w-full bg-transparent font-mono text-sm font-bold text-slate-800 focus:outline-hidden"
                  />
                  <span className="text-[10px] text-slate-500">UDP 10000-20000</span>
                </div>
              </div>
            </div>
          </div>

          {/* Sidebar Info & Actions */}
          <div className="space-y-6">
            <div className="p-6 rounded-3xl bg-blue-50/50 border border-blue-200 space-y-4">
              <h3 className="text-sm font-bold text-blue-900 flex items-center gap-2">
                <Info className="w-4 h-4 text-blue-600" />
                Por que estas configurações são críticas?
              </h3>
              <p className="text-xs text-blue-800/80 leading-relaxed">
                Em telefonia Asterisk PJSIP pura, se o <strong>IP público</strong> ou a <strong>sub-rede local</strong> não forem declarados com precisão, chamadas SIP sofrerão com perda de áudio bidirecional quando o firewall NAT fizer a reescrita de portas.
              </p>
              <div className="p-3 rounded-xl bg-white/80 border border-blue-100 text-xs text-blue-900 space-y-1">
                <div className="font-bold">Diretivas geradas no pjsip.conf:</div>
                <div className="font-mono text-[11px] text-slate-700">external_media_address={form.publicIp}</div>
                <div className="font-mono text-[11px] text-slate-700">external_signaling_address={form.publicIp}</div>
                <div className="font-mono text-[11px] text-slate-700">local_net={form.lanSubnet}</div>
              </div>
            </div>

            <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-xs space-y-4">
              <h3 className="text-sm font-bold text-slate-900">Aplicar no Sistema</h3>
              <p className="text-xs text-slate-500">
                Salva os dados no banco de dados e regenera as seções de transporte do Asterisk sem derrubar as chamadas ativas.
              </p>
              <button
                onClick={handleSaveNetwork}
                disabled={saving}
                className="w-full py-2.5 rounded-xl bg-blue-600 text-white font-bold text-xs hover:bg-blue-700 transition shadow-md shadow-blue-600/20 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <Save className="w-4 h-4" />
                {saving ? 'Gravando e Recarregando...' : 'Salvar e Recarregar Asterisk'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: SSL CERTIFICATE & HTTPS */}
      {activeTab === 'ssl' && (
        <div className="space-y-8">
          {/* Status Box */}
          <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-xs space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <Lock className="w-5 h-5 text-emerald-600" />
                  Certificado SSL/TLS & Criptografia de Borda
                </h2>
                <p className="text-xs text-slate-500 mt-1">
                  Certificado emitido e renovado automaticamente via <strong>Let's Encrypt / Certbot</strong> com protocolo TLS 1.3.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleValidateSsl}
                  disabled={validatingSsl}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 text-xs font-bold transition shadow-sm disabled:opacity-50"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${validatingSsl ? 'animate-spin' : ''}`} />
                  Validar Certificado Agora
                </button>
              </div>
            </div>

            {/* Certificate Details Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 pt-2">
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
                <span className="text-[10px] font-bold text-slate-400 uppercase block">Domínio Principal (CN)</span>
                <span className="text-sm font-extrabold text-slate-800 font-mono block mt-1">
                  {config?.sslCertificate.issuedTo}
                </span>
                <span className="text-[10px] text-emerald-600 font-semibold mt-0.5 block">Compatível com FQDN</span>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
                <span className="text-[10px] font-bold text-slate-400 uppercase block">Autoridade Emissora (CA)</span>
                <span className="text-sm font-extrabold text-slate-800 block mt-1">
                  {config?.sslCertificate.issuer}
                </span>
                <span className="text-[10px] text-slate-500 mt-0.5 block">Reconhecida globalmente</span>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
                <span className="text-[10px] font-bold text-slate-400 uppercase block">Cifra / Tipo de Chave</span>
                <span className="text-sm font-extrabold text-slate-800 font-mono block mt-1">
                  {config?.sslCertificate.keyType}
                </span>
                <span className="text-[10px] text-slate-500 mt-0.5 block">Nível militar de proteção</span>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
                <span className="text-[10px] font-bold text-slate-400 uppercase block">Validade Restante</span>
                <span className="text-sm font-extrabold text-emerald-700 block mt-1 font-mono">
                  {config?.sslCertificate.daysRemaining} dias
                </span>
                <span className="text-[10px] text-slate-500 mt-0.5 block">
                  Expira em: {config?.sslCertificate.validTo.slice(0, 10)}
                </span>
              </div>
            </div>

            {/* SANs (Subject Alternative Names) */}
            <div>
              <span className="text-xs font-bold text-slate-700 block mb-2">
                Nomes Alternativos Cobertos pelo Certificado (SAN):
              </span>
              <div className="flex flex-wrap gap-2">
                {config?.sslCertificate.san.map((san) => (
                  <span
                    key={san}
                    className="px-3 py-1 rounded-xl bg-blue-50 border border-blue-200 text-blue-700 font-mono text-xs font-semibold flex items-center gap-1.5"
                  >
                    <Check className="w-3 h-3 text-blue-600" />
                    {san}
                  </span>
                ))}
              </div>
            </div>

            {/* Server Paths */}
            <div className="p-4 rounded-2xl bg-slate-900 text-slate-200 font-mono text-xs space-y-2">
              <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                <FileCode className="w-4 h-4 text-emerald-400" />
                Caminhos Locais no Servidor Linux (Certbot Let's Encrypt)
              </div>
              <div className="space-y-1 text-slate-300 text-[11px]">
                <div><span className="text-blue-400">CERT:</span> {config?.sslCertificate.certPath}</div>
                <div><span className="text-amber-400">KEY: </span> {config?.sslCertificate.keyPath}</div>
                <div className="text-slate-500 text-[10px] pt-1">
                  * Ambos os arquivos são lidos pelo NGINX (HTTPS porta 443) e pelo Asterisk PJSIP (WSS porta 8089).
                </div>
              </div>
            </div>
          </div>

          {/* Certbot Command Generator */}
          <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-xs space-y-4">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Flame className="w-4 h-4 text-amber-500" />
              Comandos do Terminal Linux (Certbot ACME)
            </h3>
            <p className="text-xs text-slate-500">
              Caso deseje renovar manualmente ou reinstalar os certificados no servidor via SSH:
            </p>

            <div className="space-y-2">
              <div className="p-3 rounded-xl bg-slate-900 text-emerald-400 font-mono text-xs flex items-center justify-between">
                <span>sudo certbot certonly --standalone -d {config?.domain} -d sip.{config?.domain} --agree-tos -m {config?.sslCertificate.adminEmail}</span>
                <button
                  onClick={() => copyToClipboard(`sudo certbot certonly --standalone -d ${config?.domain} -d sip.${config?.domain} --agree-tos -m ${config?.sslCertificate.adminEmail}`, 'certbot_cmd')}
                  className="p-1 rounded-lg text-slate-400 hover:text-white"
                >
                  {copiedKey === 'certbot_cmd' ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>

              <div className="p-3 rounded-xl bg-slate-900 text-slate-300 font-mono text-xs flex items-center justify-between">
                <span>sudo certbot renew --dry-run</span>
                <button
                  onClick={() => copyToClipboard('sudo certbot renew --dry-run', 'dry_run_cmd')}
                  className="p-1 rounded-lg text-slate-400 hover:text-white"
                >
                  {copiedKey === 'dry_run_cmd' ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: 3 SERVICES VALIDATION */}
      {activeTab === 'services' && (
        <div className="space-y-8">
          {/* Master Service Check Card */}
          <div className="p-6 rounded-3xl bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white shadow-xl space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <span className="px-3 py-1 rounded-full bg-blue-500/20 text-blue-300 border border-blue-400/30 text-xs font-extrabold uppercase tracking-wider">
                  Matriz de Compatibilidade HTTPS
                </span>
                <h2 className="text-xl sm:text-2xl font-black mt-2 tracking-tight">
                  Validação dos 3 Serviços Dependentes de HTTPS
                </h2>
                <p className="text-xs sm:text-sm text-slate-300 mt-1">
                  Webphone, PWA e WhatsApp Cloud API exigem certificados SSL públicos e válidos por razões de segurança criptográfica.
                </p>
              </div>

              <button
                onClick={handleRunFullDiagnostic}
                disabled={validatingSsl || validatingWebphone || validatingPwa || validatingWhatsapp}
                className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 font-bold text-xs transition flex items-center gap-2 shadow-lg shadow-blue-600/30"
              >
                <RefreshCw className="w-4 h-4" />
                Executar Diagnóstico Geral
              </button>
            </div>
          </div>

          {/* Service 1: Webphone */}
          <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-xs space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-2xl bg-emerald-50 text-emerald-600">
                  <Phone className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                    1. Webphone (WebRTC + SIP sobre WSS)
                    <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-extrabold">
                      Requer HTTPS + WSS
                    </span>
                  </h3>
                  <p className="text-xs text-slate-500">
                    O navegador bloqueia chamadas de microfone (<code>navigator.mediaDevices.getUserMedia</code>) se a página não for HTTPS.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleValidateWebphone}
                  disabled={validatingWebphone}
                  className="px-4 py-2 rounded-xl border border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100 text-xs font-bold transition flex items-center gap-1.5"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${validatingWebphone ? 'animate-spin' : ''}`} />
                  Testar Webphone
                </button>
                <button
                  onClick={onOpenWebphone}
                  className="px-4 py-2 rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 text-xs font-bold transition flex items-center gap-1.5 shadow-sm shadow-emerald-600/20"
                >
                  <Phone className="w-3.5 h-3.5" />
                  Abrir Webphone
                </button>
              </div>
            </div>

            {/* Checklist */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <div className="text-xs">
                  <div className="font-bold text-slate-800">Contexto Seguro</div>
                  <div className="text-[10px] text-slate-500">HTTPS 100% ativo</div>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <div className="text-xs">
                  <div className="font-bold text-slate-800">Porta WSS 8089</div>
                  <div className="text-[10px] text-slate-500">Asterisk WS Handshake</div>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <div className="text-xs">
                  <div className="font-bold text-slate-800">Microfone Permitido</div>
                  <div className="text-[10px] text-slate-500">getUserMedia Liberado</div>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <div className="text-xs">
                  <div className="font-bold text-slate-800">DTLS-SRTP Audio</div>
                  <div className="text-[10px] text-slate-500">Criptografia RFC 5764</div>
                </div>
              </div>
            </div>

            {config?.validationWebphone?.details && (
              <div className="p-3 rounded-xl bg-emerald-50/70 border border-emerald-200 text-xs text-emerald-900 flex items-start gap-2">
                <Check className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
                <span>{config.validationWebphone.details}</span>
              </div>
            )}
          </div>

          {/* Service 2: PWA Push */}
          <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-xs space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-2xl bg-blue-50 text-blue-600">
                  <Smartphone className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                    2. Progressive Web App (PWA) com Notificações Push
                    <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 text-[10px] font-extrabold">
                      Requer HTTPS + VAPID
                    </span>
                  </h3>
                  <p className="text-xs text-slate-500">
                    A especificação W3C proíbe o registro de Service Workers e Web Push sem uma origem HTTPS válida.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleValidatePwa}
                  disabled={validatingPwa}
                  className="px-4 py-2 rounded-xl border border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100 text-xs font-bold transition flex items-center gap-1.5"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${validatingPwa ? 'animate-spin' : ''}`} />
                  Testar PWA
                </button>
                <button
                  onClick={handleSendTestPush}
                  className="px-4 py-2 rounded-xl bg-blue-600 text-white hover:bg-blue-700 text-xs font-bold transition flex items-center gap-1.5 shadow-sm shadow-blue-600/20"
                >
                  <Bell className="w-3.5 h-3.5" />
                  Enviar Push de Teste
                </button>
              </div>
            </div>

            {/* Checklist */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <div className="text-xs">
                  <div className="font-bold text-slate-800">Manifest Válido</div>
                  <div className="text-[10px] text-slate-500">/manifest.json</div>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <div className="text-xs">
                  <div className="font-bold text-slate-800">Service Worker</div>
                  <div className="text-[10px] text-slate-500">/sw.js Ativo</div>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <div className="text-xs">
                  <div className="font-bold text-slate-800">Chaves VAPID</div>
                  <div className="text-[10px] text-slate-500">RFC 8292 NIST P-256</div>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <div className="text-xs">
                  <div className="font-bold text-slate-800">Botão de Instalação</div>
                  <div className="text-[10px] text-slate-500">Desktop & Mobile</div>
                </div>
              </div>
            </div>

            {/* VAPID Details Box */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <Key className="w-3.5 h-3.5 text-blue-600" />
                  Chave Pública VAPID (Web Push):
                </span>
                <button
                  type="button"
                  onClick={handleGenerateVapid}
                  disabled={generatingVapid}
                  className="text-[11px] font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1"
                >
                  <RefreshCw className={`w-3 h-3 ${generatingVapid ? 'animate-spin' : ''}`} />
                  Rotacionar Chaves VAPID
                </button>
              </div>
              <div className="p-2.5 rounded-xl bg-white border border-slate-300 font-mono text-[11px] text-slate-600 break-all flex items-center justify-between gap-2">
                <span>{config?.validationPwa.vapidPublicKey}</span>
                <button
                  onClick={() => copyToClipboard(config?.validationPwa.vapidPublicKey || '', 'vapidKey')}
                  className="text-slate-400 hover:text-slate-600 shrink-0"
                >
                  {copiedKey === 'vapidKey' ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </div>

          {/* Service 3: WhatsApp Cloud API */}
          <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-xs space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-2xl bg-emerald-50 text-emerald-600">
                  <MessageSquare className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                    3. API Oficial do WhatsApp (Meta Cloud API / Graph API)
                    <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-extrabold">
                      Estritamente HTTPS 443
                    </span>
                  </h3>
                  <p className="text-xs text-slate-500">
                    A Meta <strong>rejeita sumariamente</strong> certificados autoassinados ou conexões sem HTTPS para entrega de Webhooks de mensagens.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleValidateWhatsapp}
                  disabled={validatingWhatsapp}
                  className="px-4 py-2 rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 text-xs font-bold transition flex items-center gap-1.5 shadow-sm shadow-emerald-600/20"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${validatingWhatsapp ? 'animate-spin' : ''}`} />
                  Testar Desafio Meta
                </button>
              </div>
            </div>

            {/* Checklist */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <div className="text-xs">
                  <div className="font-bold text-slate-800">HTTPS Porta 443</div>
                  <div className="text-[10px] text-slate-500">Exigência Estrita Meta</div>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <div className="text-xs">
                  <div className="font-bold text-slate-800">CA Confiável</div>
                  <div className="text-[10px] text-slate-500">Let's Encrypt / Pública</div>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <div className="text-xs">
                  <div className="font-bold text-slate-800">hub.challenge</div>
                  <div className="text-[10px] text-slate-500">Handshake 200 OK</div>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <div className="text-xs">
                  <div className="font-bold text-slate-800">Ciphers Seguros</div>
                  <div className="text-[10px] text-slate-500">TLS 1.2+ e SHA256</div>
                </div>
              </div>
            </div>

            {/* Webhook Meta URL Box */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800">
                  URL de Retorno de Chamada (Callback URL) para configurar no Meta for Developers:
                </span>
                <span className="text-[10px] font-mono text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full font-bold">
                  Pronto para Produção
                </span>
              </div>
              <div className="p-2.5 rounded-xl bg-white border border-slate-300 font-mono text-xs text-blue-600 font-bold flex items-center justify-between gap-2">
                <span>{config?.validationWhatsapp.webhookEndpoint}</span>
                <button
                  onClick={() => copyToClipboard(config?.validationWhatsapp.webhookEndpoint || '', 'webhookUrl')}
                  className="text-slate-400 hover:text-slate-600 shrink-0"
                >
                  {copiedKey === 'webhookUrl' ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-1">
                <span className="text-xs text-slate-500">
                  Token de Verificação (Verify Token): <strong className="font-mono text-slate-800">{config?.validationWhatsapp.verifyToken}</strong>
                </span>
                <button
                  onClick={() => copyToClipboard(config?.validationWhatsapp.verifyToken || '', 'verifyToken')}
                  className="text-xs text-blue-600 font-bold hover:underline flex items-center gap-1"
                >
                  <Copy className="w-3.5 h-3.5" /> Copiar Token
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
