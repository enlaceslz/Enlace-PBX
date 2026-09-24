import React, { useState, useEffect } from 'react';
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
  Activity,
  Zap,
  ArrowRight,
  Clock,
  ShieldCheck,
  FileCode,
  Check,
  RefreshCw,
  Cpu,
  Lock,
  Globe,
  Sliders,
  Play,
  RotateCcw,
  Sparkles,
  Info,
  Hash,
} from 'lucide-react';
import { Trunk, AuthorizedIpItem } from '../../types/pbx';

interface TrunksViewProps {
  trunks: Trunk[];
  onRefresh: () => void;
  onNavigate?: (view: string) => void;
}

export const TrunksView: React.FC<TrunksViewProps> = ({ trunks, onRefresh, onNavigate }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTrunk, setEditingTrunk] = useState<Trunk | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [pingingId, setPingingId] = useState<string | null>(null);
  const [pingResult, setPingResult] = useState<{ id: string; latencyMs: number; status: string; message: string } | null>(null);

  // Diagnostics Modal State
  const [diagnosticsModalTrunk, setDiagnosticsModalTrunk] = useState<Trunk | null>(null);
  const [diagnosticsReport, setDiagnosticsReport] = useState<any | null>(null);
  const [isLoadingDiagnostics, setIsLoadingDiagnostics] = useState(false);

  // PJSIP Preview Modal State
  const [previewModalTrunk, setPreviewModalTrunk] = useState<Trunk | null>(null);
  const [previewContent, setPreviewContent] = useState<{ pjsipConf: string; extensionsConf: string } | null>(null);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);
  const [isApplyingPjsip, setIsApplyingPjsip] = useState(false);
  const [applyResult, setApplyResult] = useState<string | null>(null);
  const [isRollingBack, setIsRollingBack] = useState(false);

  // Homologation Checklist Modal
  const [isChecklistOpen, setIsChecklistOpen] = useState(false);
  const [checklistItems, setChecklistItems] = useState<any[]>([]);

  // Trunk Form State
  const [formData, setFormData] = useState({
    name: '',
    providerName: '',
    host: '',
    port: 5060,
    transport: 'UDP' as 'UDP' | 'TCP' | 'TLS',
    authMode: 'ip' as 'ip' | 'credentials',
    username: '',
    secret: '',
    register: false,
    authorizedIpsText: '',
    callerId: '',
    callerIdMode: 'pai' as 'pai' | 'rpid' | 'from',
    codecs: 'alaw, ulaw, g729',
    channelsMax: 30,
    dtmfMode: 'rfc4733' as 'rfc4733' | 'info' | 'inband' | 'auto',
    qualifyFrequency: 60,
    directMedia: false,
    natEnabled: true,
    context: 'from-trunk',
    failoverTrunkId: '',
  });

  const brazilianPresets = [
    {
      label: 'TIP Brasil (Autenticação por IP / SBC)',
      provider: 'TIP Brasil',
      host: '200.80.127.10',
      port: 5060,
      transport: 'UDP' as const,
      authMode: 'ip' as const,
      register: false,
      authorizedIps: '200.80.127.10, 200.80.127.11, 200.80.127.12',
      codecs: 'alaw, ulaw, g729',
      cid: 'pai' as const,
      dtmf: 'rfc4733' as const,
      qualify: 30,
    },
    {
      label: 'Vivo Fibra SIP (Telefônica)',
      provider: 'Telefônica Brasil (Vivo)',
      host: 'sip.vivo.com.br',
      port: 5060,
      transport: 'TLS' as const,
      authMode: 'credentials' as const,
      register: true,
      authorizedIps: '',
      codecs: 'alaw, ulaw, g722',
      cid: 'pai' as const,
      dtmf: 'rfc4733' as const,
      qualify: 60,
    },
    {
      label: 'Claro Embratel SIP / 0800',
      provider: 'Claro Brasil',
      host: 'sip0800.embratel.net.br',
      port: 5060,
      transport: 'UDP' as const,
      authMode: 'ip' as const,
      register: false,
      authorizedIps: '200.170.1.10, 200.170.1.11',
      codecs: 'alaw, ulaw',
      cid: 'rpid' as const,
      dtmf: 'rfc4733' as const,
      qualify: 60,
    },
    {
      label: 'Algar Telecom Corporativo',
      provider: 'Algar Telecom',
      host: 'sip.algartelecom.com.br',
      port: 5060,
      transport: 'TCP' as const,
      authMode: 'ip' as const,
      register: false,
      authorizedIps: '187.60.20.1, 187.60.20.2',
      codecs: 'alaw, ulaw, g729',
      cid: 'pai' as const,
      dtmf: 'rfc4733' as const,
      qualify: 60,
    },
  ];

  const handleApplyPreset = (preset: typeof brazilianPresets[0]) => {
    setFormData({
      ...formData,
      name: preset.label,
      providerName: preset.provider,
      host: preset.host,
      port: preset.port,
      transport: preset.transport,
      authMode: preset.authMode,
      register: preset.register,
      authorizedIpsText: preset.authorizedIps,
      codecs: preset.codecs,
      callerIdMode: preset.cid,
      dtmfMode: preset.dtmf,
      qualifyFrequency: preset.qualify,
    });
  };

  const handleOpenCreate = () => {
    setEditingTrunk(null);
    setFormData({
      name: 'TIP Brasil - Tronco SIP Matriz',
      providerName: 'TIP Brasil',
      host: '200.80.127.10',
      port: 5060,
      transport: 'UDP',
      authMode: 'ip',
      username: '',
      secret: '',
      register: false,
      authorizedIpsText: '200.80.127.10, 200.80.127.11, 200.80.127.12',
      callerId: '1135008000',
      callerIdMode: 'pai',
      codecs: 'alaw, ulaw, g729',
      channelsMax: 60,
      dtmfMode: 'rfc4733',
      qualifyFrequency: 30,
      directMedia: false,
      natEnabled: true,
      context: 'from-trunk',
      failoverTrunkId: '',
    });
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (t: Trunk) => {
    setEditingTrunk(t);
    setFormData({
      name: t.name,
      providerName: t.providerName,
      host: t.host,
      port: t.port,
      transport: t.transport,
      authMode: t.authMode || (t.register ? 'credentials' : 'ip'),
      username: t.username || '',
      secret: '',
      register: t.register,
      authorizedIpsText: (t.authorizedIps || []).join(', ') || t.host,
      callerId: t.callerId || '',
      callerIdMode: t.callerIdMode || 'pai',
      codecs: (t.codecs || []).join(', '),
      channelsMax: t.channelsMax || 30,
      dtmfMode: t.dtmfMode || 'rfc4733',
      qualifyFrequency: t.qualifyFrequency || 60,
      directMedia: t.directMedia || false,
      natEnabled: t.natEnabled !== false,
      context: t.context || 'from-trunk',
      failoverTrunkId: t.failoverTrunkId || '',
    });
    setFormError(null);
    setIsModalOpen(true);
  };

  const handlePingTrunk = async (trunkId: string) => {
    setPingingId(trunkId);
    setPingResult(null);
    try {
      const res = await fetch(`/api/v1/trunks/${trunkId}/ping`, { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        setPingResult({
          id: trunkId,
          latencyMs: data.latencyMs,
          status: data.status,
          message: data.message,
        });
        onRefresh();
      }
    } catch (err) {
      console.error('Ping error:', err);
    } finally {
      setPingingId(null);
    }
  };

  const handleTestSbcIp = async (trunkId: string, ip: string) => {
    try {
      const res = await fetch(`/api/v1/trunks/${trunkId}/test-ip`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ip }),
      });
      const data = await res.json();
      if (res.ok) {
        alert(`SBC ${ip} respondente!\n\nStatus: 200 OK\nLatência RTT: ${data.latencyMs}ms\nResposta: ${data.sipResponse}`);
      }
    } catch (err) {
      console.error('SBC IP test error:', err);
    }
  };

  const handleOpenDiagnostics = async (trunk: Trunk) => {
    setDiagnosticsModalTrunk(trunk);
    setIsLoadingDiagnostics(true);
    setDiagnosticsReport(null);
    try {
      const res = await fetch(`/api/v1/trunks/${trunk.id}/diagnostics`, { method: 'POST' });
      const data = await res.json();
      setDiagnosticsReport(data);
    } catch (err) {
      console.error('Diagnostics error:', err);
    } finally {
      setIsLoadingDiagnostics(false);
    }
  };

  const handleOpenPreview = async (trunk: Trunk) => {
    setPreviewModalTrunk(trunk);
    setIsLoadingPreview(true);
    setPreviewContent(null);
    setApplyResult(null);
    try {
      const res = await fetch(`/api/v1/trunks/${trunk.id}/pjsip-preview`);
      const data = await res.json();
      setPreviewContent(data);
    } catch (err) {
      console.error('Preview error:', err);
    } finally {
      setIsLoadingPreview(false);
    }
  };

  const handleApplyPjsip = async () => {
    setIsApplyingPjsip(true);
    setApplyResult(null);
    try {
      const res = await fetch('/api/v1/trunks/apply-pjsip', { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        setApplyResult(`Configuração aplicada com sucesso! Snapshot: ${data.snapshotId}`);
        onRefresh();
      } else {
        alert(data.error || 'Erro ao aplicar PJSIP');
      }
    } catch (err) {
      console.error('Apply PJSIP error:', err);
    } finally {
      setIsApplyingPjsip(false);
    }
  };

  const handleRollback = async () => {
    if (!confirm('Deseja realmente executar o rollback da última configuração do Asterisk?')) return;
    setIsRollingBack(true);
    try {
      const res = await fetch('/api/v1/trunks/rollback', { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        alert(data.message);
        onRefresh();
      } else {
        alert(data.error || 'Erro no rollback');
      }
    } catch (err) {
      console.error('Rollback error:', err);
    } finally {
      setIsRollingBack(false);
    }
  };

  const handleOpenChecklist = async () => {
    setIsChecklistOpen(true);
    try {
      const res = await fetch('/api/v1/trunks/homologation-checklist');
      const data = await res.json();
      setChecklistItems(data.items || []);
    } catch (err) {
      console.error('Checklist error:', err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!formData.name || !formData.host) {
      setFormError('Nome do tronco e Host SIP são obrigatórios.');
      return;
    }

    const authorizedIpsList = formData.authorizedIpsText
      ? formData.authorizedIpsText.split(',').map((ip) => ip.trim()).filter((ip) => ip.length > 0)
      : [formData.host];

    const payload = {
      ...formData,
      codecs: formData.codecs.split(',').map((c) => c.trim()),
      authorizedIps: authorizedIpsList,
      register: formData.authMode === 'credentials' ? formData.register : false,
      context: 'from-trunk',
      failoverTrunkId: formData.failoverTrunkId || undefined,
    };

    try {
      const url = editingTrunk ? `/api/v1/trunks/${editingTrunk.id}` : '/api/v1/trunks';
      const method = editingTrunk ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setFormError(data.error || 'Erro ao registrar tronco SIP.');
        return;
      }

      setIsModalOpen(false);
      onRefresh();
    } catch (err) {
      console.error('Error saving trunk:', err);
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
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
              <Radio className="w-5 h-5 text-blue-600" />
              Troncos SIP (Operadoras Brasileiras)
            </h1>
            <span className="text-[10px] bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-full font-mono font-bold">
              PJSIP Asterisk 20 LTS
            </span>
          </div>
          <p className="text-xs text-slate-500">
            Conexão direta com operadoras VoIP nacionais (TIP Brasil, Vivo, Claro, Algar). Suporte a Autenticação por IP (sem usuário/senha SIP), múltiplos SBCs, LCR e cabeçalhos PAI/RPID.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={handleOpenChecklist}
            className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold rounded-xl text-xs flex items-center gap-1.5 transition active:scale-95 border border-slate-300"
          >
            <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
            Checklist de Homologação (11 Testes)
          </button>

          <button
            onClick={handleRollback}
            disabled={isRollingBack}
            className="px-3 py-2 bg-amber-50 hover:bg-amber-100 text-amber-900 font-bold rounded-xl text-xs flex items-center gap-1.5 transition active:scale-95 border border-amber-200"
            title="Rollback de emergência para último snapshot PJSIP"
          >
            <RotateCcw className={`w-3.5 h-3.5 ${isRollingBack ? 'animate-spin' : ''}`} />
            Rollback PJSIP
          </button>

          <button
            onClick={handleOpenCreate}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs flex items-center gap-2 shadow-lg shadow-blue-600/20 transition active:scale-95"
          >
            <Plus className="w-4 h-4" />
            Conectar Novo Tronco SIP
          </button>
        </div>
      </div>

      {/* Ping notification alert */}
      {pingResult && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-xl text-xs flex items-center justify-between gap-3 shadow-sm animate-fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span className="font-semibold">{pingResult.message}</span>
          </div>
          <span className="font-mono text-emerald-700 font-bold bg-emerald-100 px-2 py-0.5 rounded text-[11px]">
            {pingResult.latencyMs} ms
          </span>
        </div>
      )}

      {/* Trunks Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {trunks.map((trunk) => {
          const failoverTrunk = trunks.find((t) => t.id === trunk.failoverTrunkId);
          const isIpAuth = trunk.authMode === 'ip' || (!trunk.register && !trunk.username);

          return (
            <div
              key={trunk.id}
              className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 flex flex-col justify-between group hover:border-blue-300 transition"
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase bg-slate-100 text-slate-700">
                      {trunk.transport}
                    </span>
                    {isIpAuth ? (
                      <span className="px-1.5 py-0.5 rounded text-[9px] font-mono uppercase bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold">
                        IP Auth (Sem Senha)
                      </span>
                    ) : (
                      <span className="px-1.5 py-0.5 rounded text-[9px] font-mono uppercase bg-blue-50 text-blue-700 border border-blue-200">
                        SIP REGISTER
                      </span>
                    )}
                    {trunk.callerIdMode && (
                      <span className="px-1.5 py-0.5 rounded text-[9px] font-mono uppercase bg-slate-100 text-slate-600">
                        {trunk.callerIdMode.toUpperCase()}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1.5 text-xs">
                      <span
                        className={`w-2 h-2 rounded-full ${
                          trunk.status === 'registered' ? 'bg-emerald-500' : 'bg-rose-500'
                        }`}
                      />
                      <span
                        className={`font-semibold ${
                          trunk.status === 'registered' ? 'text-emerald-700' : 'text-rose-600'
                        }`}
                      >
                        {trunk.status === 'registered' ? 'Operacional' : 'Desconectado'}
                      </span>
                    </div>

                    <button
                      onClick={() => handleOpenEdit(trunk)}
                      className="text-slate-400 hover:text-slate-700 p-1 rounded-lg hover:bg-slate-100 transition"
                      title="Editar Tronco"
                    >
                      <Sliders className="w-3.5 h-3.5" />
                    </button>

                    <button
                      onClick={() => handleDelete(trunk.id, trunk.name)}
                      className="text-slate-400 hover:text-rose-600 p-1 rounded-lg hover:bg-rose-50 transition"
                      title="Remover Tronco"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-bold text-slate-900 text-base">{trunk.name}</h3>
                    <p className="text-xs text-slate-500 mt-0.5 font-medium">{trunk.providerName}</p>
                  </div>
                </div>

                {/* SBC IPs Allowlist */}
                {isIpAuth && trunk.authorizedIps && trunk.authorizedIps.length > 0 && (
                  <div className="mt-3 p-2.5 bg-slate-50 rounded-xl border border-slate-200 space-y-1.5">
                    <span className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider font-mono">
                      SBCs Autorizados (IP Allowlist):
                    </span>
                    <div className="space-y-1">
                      {trunk.authorizedIps.map((sbcIp, idx) => (
                        <div
                          key={idx}
                          className="flex items-center justify-between text-[11px] font-mono bg-white px-2 py-1 rounded border border-slate-200"
                        >
                          <div className="flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                            <span className="font-semibold text-slate-800">{sbcIp}</span>
                            {idx === 0 && (
                              <span className="text-[9px] bg-blue-50 text-blue-700 px-1 rounded font-bold">
                                Principal
                              </span>
                            )}
                          </div>
                          <button
                            type="button"
                            onClick={() => handleTestSbcIp(trunk.id, sbcIp)}
                            className="text-[10px] text-blue-600 hover:underline flex items-center gap-0.5"
                          >
                            <Zap className="w-2.5 h-2.5" /> Testar
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="mt-4 space-y-2 text-xs font-mono">
                  <div className="flex items-center justify-between text-slate-500 py-1 border-b border-slate-200">
                    <span>Host / SIP Proxy:</span>
                    <span className="text-slate-800 font-semibold">{trunk.host}:{trunk.port}</span>
                  </div>
                  <div className="flex items-center justify-between text-slate-500 py-1 border-b border-slate-200">
                    <span>BINA / Caller ID:</span>
                    <span className="text-slate-800">{trunk.callerId || 'Padrão da Operadora'}</span>
                  </div>
                  <div className="flex items-center justify-between text-slate-500 py-1 border-b border-slate-200">
                    <span>Canais Simultâneos:</span>
                    <span className="text-blue-600 font-bold">
                      {trunk.channelsInUse} / {trunk.channelsMax} canais
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-slate-500 py-1 border-b border-slate-200">
                    <span>Codecs Permitidos:</span>
                    <span className="text-slate-700">{(trunk.codecs || ['alaw', 'ulaw']).join(', ')}</span>
                  </div>
                  {failoverTrunk && (
                    <div className="flex items-center justify-between text-slate-500 py-1 border-b border-slate-200">
                      <span>Failover (LCR):</span>
                      <span className="text-emerald-700 font-bold bg-emerald-50 px-1.5 py-0.5 rounded text-[10px]">
                        {failoverTrunk.name}
                      </span>
                    </div>
                  )}
                  <div className="flex items-center justify-between text-slate-500 py-1">
                    <span>Latência SIP (RTT):</span>
                    <span className="text-slate-800 font-bold flex items-center gap-1">
                      <Activity className={`w-3 h-3 ${trunk.lastPingStatus === 'NOT_TESTED' || !trunk.lastPingStatus ? 'text-slate-400' : 'text-emerald-500'}`} />
                      {trunk.lastPingLatencyMs !== null && trunk.lastPingLatencyMs !== undefined
                        ? `${trunk.lastPingLatencyMs} ms (${trunk.lastPingStatus || 'Reachable'})`
                        : (trunk.lastPingStatus || 'NOT_TESTED')}
                    </span>
                  </div>
                </div>
              </div>

              <div className="mt-5 pt-3 border-t border-slate-200 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <button
                    onClick={() => handleOpenDiagnostics(trunk)}
                    className="flex-1 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold rounded-xl text-[11px] flex items-center justify-center gap-1.5 transition"
                  >
                    <Activity className="w-3 h-3 text-blue-600" />
                    Diagnóstico NOC
                  </button>

                  <button
                    onClick={() => handleOpenPreview(trunk)}
                    className="flex-1 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold rounded-xl text-[11px] flex items-center justify-center gap-1.5 transition"
                  >
                    <FileCode className="w-3 h-3 text-purple-600" />
                    PJSIP & Dialplan
                  </button>
                </div>

                <div className="flex items-center justify-between pt-1 text-[11px] text-slate-500">
                  <button
                    onClick={() => onNavigate?.('dids')}
                    className="text-blue-600 hover:underline flex items-center gap-1 font-semibold"
                  >
                    <Hash className="w-3 h-3" />
                    Ver DIDs vinculados
                  </button>

                  <button
                    onClick={() => handlePingTrunk(trunk.id)}
                    disabled={pingingId === trunk.id}
                    className="px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold rounded-lg flex items-center gap-1 transition active:scale-95 disabled:opacity-50"
                    title="Disparar keepalive SIP OPTIONS"
                  >
                    <Zap className={`w-3 h-3 text-amber-500 ${pingingId === trunk.id ? 'animate-spin' : ''}`} />
                    {pingingId === trunk.id ? 'Pingando...' : 'SIP OPTIONS'}
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Diagnostics Modal */}
      {diagnosticsModalTrunk && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between sticky top-0 z-10">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                  <Activity className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Diagnóstico NOC: {diagnosticsModalTrunk.name}
                  </h3>
                  <p className="text-xs text-slate-500">
                    Checagem de conectividade com SBCs, NAT Traversal, portas RTP e PJSIP
                  </p>
                </div>
              </div>
              <button
                onClick={() => setDiagnosticsModalTrunk(null)}
                className="p-1 text-slate-500 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              {isLoadingDiagnostics ? (
                <div className="py-12 text-center text-slate-500 space-y-2">
                  <RefreshCw className="w-6 h-6 animate-spin mx-auto text-blue-600" />
                  <p className="font-semibold">Executando varredura e testes de handshake SIP...</p>
                </div>
              ) : diagnosticsReport ? (
                <div className="space-y-4">
                  {/* Score Banner */}
                  <div
                    className={`p-4 rounded-xl border flex items-center justify-between ${
                      diagnosticsReport.overallStatus === 'healthy'
                        ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                        : 'bg-amber-50 border-amber-200 text-amber-900'
                    }`}
                  >
                    <div>
                      <span className="font-bold text-sm block">
                        Status Geral: {diagnosticsReport.overallStatus.toUpperCase()}
                      </span>
                      <p className="text-xs opacity-90 mt-0.5">
                        {diagnosticsReport.overallStatus === 'healthy'
                          ? 'O tronco SIP está 100% validado para receber e originar chamadas com áudio bidirecional.'
                          : 'Atenção a alguns itens de configuração para evitar perda de pacotes ou áudio mudo.'}
                      </p>
                    </div>

                    <div className="text-right">
                      <div className="text-2xl font-black font-mono">{diagnosticsReport.score}%</div>
                      <span className="text-[10px] uppercase font-bold tracking-wider">Health Score</span>
                    </div>
                  </div>

                  {/* Individual Checks List */}
                  <div className="space-y-2">
                    <span className="block font-bold text-slate-800 uppercase text-[10px] tracking-wider font-mono">
                      Itens de Verificação Técnica:
                    </span>
                    <div className="space-y-2">
                      {diagnosticsReport.checks?.map((check: any, idx: number) => (
                        <div
                          key={idx}
                          className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-start gap-3"
                        >
                          {check.status === 'ok' ? (
                            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                          ) : check.status === 'warn' ? (
                            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                          ) : (
                            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                          )}
                          <div className="flex-1">
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-slate-900">{check.name}</span>
                              <span
                                className={`font-mono font-bold text-[10px] uppercase px-1.5 py-0.5 rounded ${
                                  check.status === 'ok'
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : check.status === 'warn'
                                    ? 'bg-amber-100 text-amber-800'
                                    : 'bg-rose-100 text-rose-800'
                                }`}
                              >
                                {check.status}
                              </span>
                            </div>
                            <p className="text-slate-600 text-[11px] mt-0.5">{check.details}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      )}

      {/* PJSIP & Dialplan Preview Modal */}
      {previewModalTrunk && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between sticky top-0 z-10">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
                  <FileCode className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Configuração PJSIP & Dialplan: {previewModalTrunk.name}
                  </h3>
                  <p className="text-xs text-slate-500">
                    Preview oficial dos arquivos <code>pjsip.conf</code> e <code>extensions.conf</code> gerados para o Asterisk 20
                  </p>
                </div>
              </div>
              <button onClick={() => setPreviewModalTrunk(null)} className="p-1 text-slate-500 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              {applyResult && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl font-medium">
                  {applyResult}
                </div>
              )}

              {isLoadingPreview ? (
                <div className="py-12 text-center text-slate-500">
                  <RefreshCw className="w-6 h-6 animate-spin mx-auto text-blue-600 mb-2" />
                  Gerando blocos de configuração PJSIP...
                </div>
              ) : previewContent ? (
                <div className="space-y-4">
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="font-bold text-slate-800 font-mono text-[11px] uppercase">
                        /etc/asterisk/pjsip.conf (Endpoint & Identify por IP):
                      </span>
                      <span className="text-[10px] text-slate-500 font-mono">Modo: {previewContent.authMode}</span>
                    </div>
                    <pre className="p-4 bg-slate-900 text-slate-100 rounded-xl font-mono text-[11px] overflow-x-auto border border-slate-800 leading-relaxed">
                      {previewContent.pjsipConf}
                    </pre>
                  </div>

                  <div>
                    <span className="font-bold text-slate-800 font-mono text-[11px] uppercase block mb-1.5">
                      /etc/asterisk/extensions.conf (Contexto [from-trunk] & DIDs):
                    </span>
                    <pre className="p-4 bg-slate-900 text-emerald-300 rounded-xl font-mono text-[11px] overflow-x-auto border border-slate-800 leading-relaxed max-h-48">
                      {previewContent.extensionsConf}
                    </pre>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-slate-200">
                    <span className="text-[11px] text-slate-500">
                      O Hot Reload recarrega o Asterisk (<code>pjsip reload</code>) sem derrubar chamadas em curso.
                    </span>

                    <button
                      type="button"
                      onClick={handleApplyPjsip}
                      disabled={isApplyingPjsip}
                      className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl text-xs flex items-center gap-2 transition disabled:opacity-50 shadow-md shadow-purple-600/20"
                    >
                      <Zap className={`w-3.5 h-3.5 ${isApplyingPjsip ? 'animate-spin' : ''}`} />
                      {isApplyingPjsip ? 'Aplicando no Asterisk...' : 'Aplicar PJSIP Hot Reload'}
                    </button>
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      )}

      {/* Homologation Checklist Modal */}
      {isChecklistOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between sticky top-0 z-10">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Checklist de Homologação em Produção (11 Testes de Aceite)
                  </h3>
                  <p className="text-xs text-slate-500">
                    Matriz formal de conformidade de telecomunicações para operadoras SIP e TIP Brasil
                  </p>
                </div>
              </div>
              <button onClick={() => setIsChecklistOpen(false)} className="p-1 text-slate-500 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-3 text-xs">
              <div className="space-y-2">
                {checklistItems.map((item) => (
                  <div
                    key={item.id}
                    className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-start gap-3"
                  >
                    <div className="w-6 h-6 rounded-lg bg-blue-100 text-blue-700 font-mono font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                      {item.id}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-900">{item.name}</span>
                        <span
                          className={`text-[9px] px-1.5 py-0.5 rounded font-bold uppercase ${
                            item.status === 'passed'
                              ? 'bg-emerald-100 text-emerald-800'
                              : item.status === 'warning'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-slate-200 text-slate-700'
                          }`}
                        >
                          {item.status === 'passed' ? 'Validado' : item.status}
                        </span>
                      </div>
                      <p className="text-slate-600 text-[11px] mt-0.5">{item.description}</p>
                      <div className="text-[10px] text-slate-500 font-mono mt-1">
                        Critério: {item.criteria}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal: New / Edit Trunk */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between sticky top-0 z-10">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  {editingTrunk ? 'Editar Tronco SIP' : 'Conectar Novo Tronco SIP'}
                </h3>
                <p className="text-xs text-slate-500">
                  Configuração PJSIP avançada para operadoras brasileiras (IP Auth ou Registro)
                </p>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="p-1 text-slate-500 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
              {formError && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                  <span>{formError}</span>
                </div>
              )}

              {/* Presets */}
              <div>
                <label className="block text-slate-500 font-semibold mb-1.5 uppercase text-[10px] tracking-wider font-mono">
                  Presets Rápidos de Operadoras Nacionais:
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {brazilianPresets.map((p, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleApplyPreset(p)}
                      className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg text-[11px] font-semibold transition flex items-center gap-1 border border-slate-200"
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Authentication Mode Toggle */}
              <div className="p-3.5 bg-blue-50/70 border border-blue-200 rounded-xl space-y-2">
                <span className="block font-bold text-blue-900 text-xs">
                  Modo de Autenticação SIP *
                </span>
                <div className="grid grid-cols-2 gap-2">
                  <label
                    className={`flex items-start gap-2.5 p-2.5 rounded-xl border cursor-pointer transition ${
                      formData.authMode === 'ip'
                        ? 'bg-white border-blue-500 shadow-sm'
                        : 'bg-white/50 border-slate-200 hover:bg-white'
                    }`}
                  >
                    <input
                      type="radio"
                      name="authMode"
                      checked={formData.authMode === 'ip'}
                      onChange={() => setFormData({ ...formData, authMode: 'ip', register: false })}
                      className="mt-0.5 text-blue-600"
                    />
                    <div>
                      <span className="font-bold text-slate-900 text-xs block">
                        Autenticação por IP (SBC)
                      </span>
                      <span className="text-[10px] text-slate-500 leading-tight block mt-0.5">
                        Sem registro, sem usuário/senha. Exigido pela TIP Brasil, Embratel e links dedicados.
                      </span>
                    </div>
                  </label>

                  <label
                    className={`flex items-start gap-2.5 p-2.5 rounded-xl border cursor-pointer transition ${
                      formData.authMode === 'credentials'
                        ? 'bg-white border-blue-500 shadow-sm'
                        : 'bg-white/50 border-slate-200 hover:bg-white'
                    }`}
                  >
                    <input
                      type="radio"
                      name="authMode"
                      checked={formData.authMode === 'credentials'}
                      onChange={() => setFormData({ ...formData, authMode: 'credentials', register: true })}
                      className="mt-0.5 text-blue-600"
                    />
                    <div>
                      <span className="font-bold text-slate-900 text-xs block">
                        Usuário e Senha SIP (REGISTER)
                      </span>
                      <span className="text-[10px] text-slate-500 leading-tight block mt-0.5">
                        Autenticação SIP padrão RFC 3261 com handshake Digest MD5/SHA256.
                      </span>
                    </div>
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Nome do Tronco *</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Ex: TIP Brasil - Tronco Principal"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 focus:border-blue-500 focus:outline-none text-xs"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <label className="block text-slate-700 font-bold mb-1">Host / IP do SBC Principal *</label>
                  <input
                    type="text"
                    required
                    value={formData.host}
                    onChange={(e) => setFormData({ ...formData, host: e.target.value })}
                    placeholder="Ex: 200.80.127.10"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 font-mono text-xs focus:border-blue-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Porta SIP</label>
                  <input
                    type="number"
                    value={formData.port}
                    onChange={(e) => setFormData({ ...formData, port: Number(e.target.value) })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 font-mono text-xs focus:border-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* IP Auth: Multiple SBC IPs field */}
              {formData.authMode === 'ip' ? (
                <div>
                  <label className="block text-slate-700 font-bold mb-1">
                    IPs Autorizados da Operadora (Múltiplos SBCs) *
                  </label>
                  <input
                    type="text"
                    value={formData.authorizedIpsText}
                    onChange={(e) => setFormData({ ...formData, authorizedIpsText: e.target.value })}
                    placeholder="Ex: 200.80.127.10, 200.80.127.11, 200.80.127.12"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 font-mono text-xs focus:border-blue-500 focus:outline-none"
                  />
                  <p className="text-[10px] text-slate-500 mt-1">
                    Separe por vírgulas os IPs dos servidores da TIP Brasil autorizados a enviar chamadas para o Asterisk. O Asterisk criará seções <code>identify</code> correspondentes.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-700 font-bold mb-1">Usuário SIP *</label>
                    <input
                      type="text"
                      value={formData.username}
                      onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                      placeholder="Ex: 1135008000"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 font-mono text-xs focus:border-blue-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-700 font-bold mb-1">Senha SIP</label>
                    <input
                      type="password"
                      value={formData.secret}
                      onChange={(e) => setFormData({ ...formData, secret: e.target.value })}
                      placeholder="••••••••••••"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 font-mono text-xs focus:border-blue-500 focus:outline-none"
                    />
                  </div>
                </div>
              )}

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Transporte</label>
                  <select
                    value={formData.transport}
                    onChange={(e) => setFormData({ ...formData, transport: e.target.value as any })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 font-mono text-xs focus:border-blue-500 focus:outline-none"
                  >
                    <option value="UDP">UDP (Padrão TIP)</option>
                    <option value="TCP">TCP</option>
                    <option value="TLS">TLS (Criptografado)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">Cabeçalho BINA (Caller ID)</label>
                  <select
                    value={formData.callerIdMode}
                    onChange={(e) => setFormData({ ...formData, callerIdMode: e.target.value as any })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 font-mono text-xs focus:border-blue-500 focus:outline-none"
                  >
                    <option value="pai">P-Asserted-Identity (PAI)</option>
                    <option value="rpid">Remote-Party-ID (RPID)</option>
                    <option value="from">From Header</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">Canais Máximos</label>
                  <input
                    type="number"
                    value={formData.channelsMax}
                    onChange={(e) => setFormData({ ...formData, channelsMax: Number(e.target.value) })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 font-mono text-xs focus:border-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Codecs de Áudio</label>
                  <input
                    type="text"
                    value={formData.codecs}
                    onChange={(e) => setFormData({ ...formData, codecs: e.target.value })}
                    placeholder="alaw, ulaw, g729"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 font-mono text-xs focus:border-blue-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">Tronco de Contingência (Failover LCR)</label>
                  <select
                    value={formData.failoverTrunkId}
                    onChange={(e) => setFormData({ ...formData, failoverTrunkId: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 text-xs focus:border-blue-500 focus:outline-none"
                  >
                    <option value="">Nenhum (Sem failover automático)</option>
                    {trunks
                      .filter((t) => t.id !== editingTrunk?.id)
                      .map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.name} ({t.providerName})
                        </option>
                      ))}
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-slate-600 hover:text-slate-800 text-xs font-semibold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 transition active:scale-95 shadow-md shadow-blue-600/20"
                >
                  {editingTrunk ? 'Salvar Alterações' : 'Conectar Tronco'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
