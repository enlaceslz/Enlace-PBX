import React, { useState, useMemo } from 'react';
import {
  Hash,
  Plus,
  Search,
  Filter,
  PhoneCall,
  Bot,
  Users,
  Split,
  Layers,
  Clock,
  CheckCircle2,
  AlertCircle,
  Play,
  ArrowRight,
  ShieldCheck,
  Radio,
  FileCode,
  Trash2,
  Edit2,
  X,
  UploadCloud,
  ChevronRight,
  Sparkles,
  Info,
  Server,
  Activity,
  Copy,
  Check,
  Building2,
  DollarSign,
  User,
} from 'lucide-react';
import { Did, Trunk, Extension, Queue, Ivr, AiAgent, RingGroup } from '../../types/pbx';

interface DidsViewProps {
  dids: Did[];
  trunks: Trunk[];
  extensions?: Extension[];
  queues?: Queue[];
  ivrs?: Ivr[];
  aiAgents?: AiAgent[];
  ringGroups?: RingGroup[];
  onRefresh: () => void;
  onNavigate?: (view: string) => void;
}

export const DidsView: React.FC<DidsViewProps> = ({
  dids,
  trunks,
  extensions = [],
  queues = [],
  ivrs = [],
  aiAgents = [],
  ringGroups = [],
  onRefresh,
  onNavigate,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterTrunkId, setFilterTrunkId] = useState<string>('all');
  const [filterDestinationType, setFilterDestinationType] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  // Modals state
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [isBatchModalOpen, setIsBatchModalOpen] = useState(false);
  const [isSimulateModalOpen, setIsSimulateModalOpen] = useState(false);
  const [editingDid, setEditingDid] = useState<Did | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    did: '',
    trunkId: trunks[0]?.id || '',
    description: '',
    assignedCompany: '',
    assignedCnpj: '',
    assignedUser: '',
    monthlyFee: '29.90',
    billingCycleDay: '10',
    destinationType: 'ai_agent' as 'ai_agent' | 'extension' | 'queue' | 'ivr' | 'ring_group',
    destinationId: 'agent-maia-general',
    destinationLabel: 'Agente de Voz MaIA (IA Matriz)',
    timeConditionEnabled: false,
    startHour: '08:00',
    endHour: '18:00',
    weekdays: ['mon', 'tue', 'wed', 'thu', 'fri'],
    afterHoursDestType: 'ai_agent' as 'ai_agent' | 'extension' | 'queue' | 'ivr',
    afterHoursDestId: 'agent-maia-general',
    fallbackType: 'human' as 'human' | 'voicemail' | 'hangup',
    fallbackTarget: '4101',
    didSourceHeader: 'request_uri' as 'request_uri' | 'to' | 'p_called_party_id' | 'custom',
    customHeaderName: '',
    unknownDidAction: 'reject_404' as 'reject_404' | 'default_route' | 'busy_486',
  });
  const [formError, setFormError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Batch Form State
  const [batchData, setBatchData] = useState({
    startNumber: '1135008000',
    count: 10,
    trunkId: trunks[0]?.id || '',
    destinationType: 'extension' as const,
    destinationId: '4101',
  });
  const [isBatchSaving, setIsBatchSaving] = useState(false);

  // Simulator State
  const [simulateData, setSimulateData] = useState({
    didNumber: dids[0]?.did || '1135008000',
    sourceIp: '200.80.127.10',
    callerNumber: '11987654321',
  });
  const [simulateResult, setSimulateResult] = useState<any | null>(null);
  const [isSimulating, setIsSimulating] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Format DID helper
  const formatDidDisplay = (didStr: string) => {
    const clean = didStr.replace(/\D/g, '');
    if (clean.length === 10) {
      return `(${clean.slice(0, 2)}) ${clean.slice(2, 6)}-${clean.slice(6)}`;
    }
    if (clean.length === 11) {
      return `(${clean.slice(0, 2)}) ${clean.slice(2, 7)}-${clean.slice(7)}`;
    }
    if (clean.startsWith('0800') && clean.length === 11) {
      return `${clean.slice(0, 4)} ${clean.slice(4, 7)} ${clean.slice(7)}`;
    }
    return didStr;
  };

  // Filtered list
  const filteredDids = useMemo(() => {
    return dids.filter((item) => {
      const matchSearch =
        item.did.includes(searchTerm) ||
        item.presentedNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.operatorName.toLowerCase().includes(searchTerm.toLowerCase());

      const matchTrunk = filterTrunkId === 'all' || item.trunkId === filterTrunkId;
      const matchDest = filterDestinationType === 'all' || item.destinationType === filterDestinationType;
      const matchStatus = filterStatus === 'all' || item.status === filterStatus;

      return matchSearch && matchTrunk && matchDest && matchStatus;
    });
  }, [dids, searchTerm, filterTrunkId, filterDestinationType, filterStatus]);

  // Handle open create modal
  const handleOpenCreate = () => {
    setEditingDid(null);
    setFormData({
      did: '',
      trunkId: trunks[0]?.id || '',
      description: '',
      assignedCompany: '',
      assignedCnpj: '',
      assignedUser: '',
      monthlyFee: '29.90',
      billingCycleDay: '10',
      destinationType: 'ai_agent',
      destinationId: aiAgents[0]?.id || 'agent-maia-general',
      destinationLabel: aiAgents[0]?.name || 'Agente de Voz MaIA',
      timeConditionEnabled: false,
      startHour: '08:00',
      endHour: '18:00',
      weekdays: ['mon', 'tue', 'wed', 'thu', 'fri'],
      afterHoursDestType: 'ai_agent',
      afterHoursDestId: aiAgents[0]?.id || 'agent-maia-general',
      fallbackType: 'human',
      fallbackTarget: '4101',
      didSourceHeader: 'request_uri',
      customHeaderName: '',
      unknownDidAction: 'reject_404',
    });
    setFormError(null);
    setIsNewModalOpen(true);
  };

  // Handle open edit modal
  const handleOpenEdit = (did: Did) => {
    setEditingDid(did);
    setFormData({
      did: did.did,
      trunkId: did.trunkId,
      description: did.description,
      assignedCompany: did.assignedCompany || '',
      assignedCnpj: did.assignedCnpj || '',
      assignedUser: did.assignedUser || '',
      monthlyFee: did.monthlyFee !== undefined ? String(did.monthlyFee) : '29.90',
      billingCycleDay: did.billingCycleDay !== undefined ? String(did.billingCycleDay) : '10',
      destinationType: did.destinationType,
      destinationId: did.destinationId,
      destinationLabel: did.destinationLabel,
      timeConditionEnabled: did.timeConditionEnabled,
      startHour: did.timeSchedule?.startHour || '08:00',
      endHour: did.timeSchedule?.endHour || '18:00',
      weekdays: did.timeSchedule?.weekdays || ['mon', 'tue', 'wed', 'thu', 'fri'],
      afterHoursDestType: (did.afterHoursDestType as any) || 'ai_agent',
      afterHoursDestId: did.afterHoursDestId || 'agent-maia-general',
      fallbackType: did.fallbackType,
      fallbackTarget: did.fallbackTarget,
      didSourceHeader: did.didSourceHeader,
      customHeaderName: did.customHeaderName || '',
      unknownDidAction: did.unknownDidAction,
    });
    setFormError(null);
    setIsNewModalOpen(true);
  };

  // Save DID
  const handleSaveDid = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setIsSaving(true);

    try {
      const payload = {
        did: formData.did,
        trunkId: formData.trunkId,
        description: formData.description,
        assignedCompany: formData.assignedCompany || undefined,
        assignedCnpj: formData.assignedCnpj || undefined,
        assignedUser: formData.assignedUser || undefined,
        monthlyFee: formData.monthlyFee ? parseFloat(formData.monthlyFee) : undefined,
        billingCycleDay: formData.billingCycleDay ? parseInt(formData.billingCycleDay, 10) : undefined,
        destinationType: formData.destinationType,
        destinationId: formData.destinationId,
        destinationLabel: formData.destinationLabel,
        timeConditionEnabled: formData.timeConditionEnabled,
        timeSchedule: formData.timeConditionEnabled
          ? {
              startHour: formData.startHour,
              endHour: formData.endHour,
              weekdays: formData.weekdays,
            }
          : undefined,
        afterHoursDestType: formData.afterHoursDestType,
        afterHoursDestId: formData.afterHoursDestId,
        fallbackType: formData.fallbackType,
        fallbackTarget: formData.fallbackTarget,
        didSourceHeader: formData.didSourceHeader,
        customHeaderName: formData.customHeaderName,
        unknownDidAction: formData.unknownDidAction,
      };

      const url = editingDid ? `/api/v1/dids/${editingDid.id}` : '/api/v1/dids';
      const method = editingDid ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        setFormError(err.error || 'Erro ao salvar DID');
        setIsSaving(false);
        return;
      }

      setIsNewModalOpen(false);
      onRefresh();
    } catch (err: any) {
      setFormError(err.message || 'Falha de comunicação com o servidor');
    } finally {
      setIsSaving(false);
    }
  };

  // Delete DID
  const handleDeleteDid = async (id: string, numberStr: string) => {
    if (!confirm(`Confirma a exclusão do DID ${numberStr}? As chamadas recebidas para este número não serão mais completadas.`)) return;
    try {
      await fetch(`/api/v1/dids/${id}`, { method: 'DELETE' });
      onRefresh();
    } catch (err) {
      console.error('Delete DID error:', err);
    }
  };

  // Save Batch
  const handleSaveBatch = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsBatchSaving(true);
    try {
      const res = await fetch('/api/v1/dids/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(batchData),
      });
      if (res.ok) {
        setIsBatchModalOpen(false);
        onRefresh();
      } else {
        const data = await res.json().catch(() => ({}));
        alert(data.error || 'Erro na importação em lote.');
      }
    } catch (err) {
      console.error('Batch error:', err);
    } finally {
      setIsBatchSaving(false);
    }
  };

  // Run Inbound Call Simulation
  const handleRunSimulation = async () => {
    setIsSimulating(true);
    try {
      const res = await fetch('/api/v1/dids/simulate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rawDid: simulateData.didNumber,
          sourceIp: simulateData.sourceIp,
          callerNumber: simulateData.callerNumber,
        }),
      });
      const data = await res.json();
      setSimulateResult(data);
    } catch (err) {
      console.error('Simulation error:', err);
    } finally {
      setIsSimulating(false);
    }
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Render Destination Icon
  const getDestIcon = (type: string) => {
    switch (type) {
      case 'ai_agent':
        return <Bot className="w-3.5 h-3.5 text-purple-600" />;
      case 'queue':
        return <Split className="w-3.5 h-3.5 text-amber-600" />;
      case 'ivr':
        return <PhoneCall className="w-3.5 h-3.5 text-blue-600" />;
      case 'ring_group':
        return <Layers className="w-3.5 h-3.5 text-emerald-600" />;
      default:
        return <Users className="w-3.5 h-3.5 text-slate-600" />;
    }
  };

  const totalReceived = dids.reduce((acc, d) => acc + (d.totalCallsReceived || 0), 0);
  const activeCount = dids.filter((d) => d.status === 'active').length;
  const inUseChannels = dids.reduce((acc, d) => acc + (d.channelsInUse || 0), 0);

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
              <Hash className="w-5 h-5 text-blue-600" />
              DIDs & Numerações E.164
            </h1>
            <span className="text-[10px] bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 rounded-full font-mono font-bold">
              Inbound Routing Engine
            </span>
          </div>
          <p className="text-xs text-slate-500">
            Gerenciamento de números de telefone fixos, celulares e 0800 vinculados a troncos SIP (TIP Brasil, Embratel, Vivo). Roteamento inteligente para IA MaIA, Filas ACD e Ramais.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={() => {
              if (dids.length > 0) {
                setSimulateData({
                  didNumber: dids[0].did,
                  sourceIp: '200.80.127.10',
                  callerNumber: '11987654321',
                });
              }
              setSimulateResult(null);
              setIsSimulateModalOpen(true);
            }}
            className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold rounded-xl text-xs flex items-center gap-1.5 transition active:scale-95 border border-slate-300"
          >
            <Play className="w-3.5 h-3.5 text-blue-600 fill-blue-600" />
            Simulador de Roteamento
          </button>

          <button
            onClick={() => setIsBatchModalOpen(true)}
            className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold rounded-xl text-xs flex items-center gap-1.5 transition active:scale-95 border border-slate-300"
          >
            <UploadCloud className="w-3.5 h-3.5 text-emerald-600" />
            Importar Faixa em Lote
          </button>

          <button
            onClick={handleOpenCreate}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs flex items-center gap-2 shadow-lg shadow-blue-600/20 transition active:scale-95"
          >
            <Plus className="w-4 h-4" />
            Cadastrar Novo DID
          </button>
        </div>
      </div>

      {/* Metrics Banner */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Total de DIDs</span>
            <div className="text-2xl font-black text-slate-900 mt-0.5">{dids.length}</div>
            <span className="text-[10px] text-emerald-700 font-semibold">{activeCount} operacionais</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100">
            <Hash className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Tronco Principal</span>
            <div className="text-base font-bold text-slate-900 mt-0.5 truncate max-w-[150px]">
              {trunks.find((t) => t.authMode === 'ip')?.name || trunks[0]?.name || 'Nenhum'}
            </div>
            <span className="text-[10px] text-blue-600 font-mono font-semibold">Autenticação por IP (SBC)</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center border border-purple-100">
            <Radio className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Chamadas Recebidas</span>
            <div className="text-2xl font-black text-slate-900 mt-0.5">{totalReceived.toLocaleString('pt-BR')}</div>
            <span className="text-[10px] text-slate-500">Histórico acumulado</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100">
            <PhoneCall className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Canais em Uso</span>
            <div className="text-2xl font-black text-blue-600 mt-0.5">{inUseChannels}</div>
            <span className="text-[10px] text-slate-500">Chamadas ativas no Asterisk</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center border border-amber-100">
            <Activity className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-3.5 flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por número, DDD, operadora..."
            className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-blue-500 font-mono"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 rounded-xl px-2 py-1">
            <Filter className="w-3.5 h-3.5 text-slate-500" />
            <select
              value={filterTrunkId}
              onChange={(e) => setFilterTrunkId(e.target.value)}
              className="bg-transparent text-xs text-slate-700 font-semibold focus:outline-none"
            >
              <option value="all">Todos os Troncos</option>
              {trunks.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 rounded-xl px-2 py-1">
            <select
              value={filterDestinationType}
              onChange={(e) => setFilterDestinationType(e.target.value)}
              className="bg-transparent text-xs text-slate-700 font-semibold focus:outline-none"
            >
              <option value="all">Todos os Destinos</option>
              <option value="ai_agent">Agente IA (MaIA)</option>
              <option value="extension">Ramal PJSIP</option>
              <option value="queue">Fila ACD</option>
              <option value="ivr">URA / IVR</option>
              <option value="ring_group">Grupo de Toque</option>
            </select>
          </div>

          <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 rounded-xl px-2 py-1">
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="bg-transparent text-xs text-slate-700 font-semibold focus:outline-none"
            >
              <option value="all">Todos os Status</option>
              <option value="active">Ativo</option>
              <option value="inactive">Inativo</option>
              <option value="testing">Homologação</option>
            </select>
          </div>
        </div>
      </div>

      {/* DIDs List Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200 uppercase text-[10px] tracking-wider font-mono">
              <tr>
                <th className="px-4 py-3">Número DID / Formato Nacional</th>
                <th className="px-4 py-3">Empresa / Beneficiário</th>
                <th className="px-4 py-3">Tronco SIP Associado</th>
                <th className="px-4 py-3">Destino Principal</th>
                <th className="px-4 py-3">Horário & Fallback</th>
                <th className="px-4 py-3">Mensalidade (R$)</th>
                <th className="px-4 py-3 text-center">Status</th>
                <th className="px-4 py-3 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredDids.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-slate-500">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Hash className="w-8 h-8 text-slate-300" />
                      <p className="font-semibold text-sm">Nenhum DID encontrado</p>
                      <p className="text-xs text-slate-500">Tente ajustar seus filtros ou cadastre um novo número.</p>
                      <button
                        onClick={handleOpenCreate}
                        className="mt-2 px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-bold"
                      >
                        Cadastrar Primeiro DID
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredDids.map((item) => {
                  const trunk = trunks.find((t) => t.id === item.trunkId);
                  return (
                    <tr key={item.id} className="hover:bg-slate-50/80 transition group">
                      <td className="px-4 py-3.5 font-medium text-slate-900">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-mono font-bold text-xs shrink-0">
                            {item.did.slice(0, 2)}
                          </div>
                          <div>
                            <div className="font-bold text-slate-900 font-mono text-sm">
                              {formatDidDisplay(item.presentedNumber || item.did)}
                            </div>
                            <div className="text-[10px] text-slate-500 flex items-center gap-1.5">
                              <span>{item.operatorName}</span>
                              {item.description && <span>• {item.description}</span>}
                            </div>
                          </div>
                        </div>
                      </td>

                      <td className="px-4 py-3.5">
                        <div className="flex flex-col gap-0.5">
                          {item.assignedCompany ? (
                            <span className="font-bold text-slate-900 text-xs flex items-center gap-1">
                              <Building2 className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                              <span className="truncate max-w-[150px]">{item.assignedCompany}</span>
                            </span>
                          ) : (
                            <span className="text-slate-400 italic text-[11px]">Não vinculado</span>
                          )}
                          <div className="text-[10px] text-slate-500 flex items-center gap-1">
                            {item.assignedCnpj && <span>{item.assignedCnpj}</span>}
                            {item.assignedUser && <span>• {item.assignedUser}</span>}
                          </div>
                        </div>
                      </td>

                      <td className="px-4 py-3.5">
                        <div className="flex flex-col gap-0.5">
                          <span className="font-semibold text-slate-800 text-xs">
                            {trunk?.name || item.operatorName}
                          </span>
                          <div className="flex items-center gap-1">
                            {trunk?.authMode === 'ip' ? (
                              <span className="text-[9px] bg-emerald-50 text-emerald-700 border border-emerald-200 px-1 rounded font-mono font-bold">
                                IP Auth (SBC)
                              </span>
                            ) : (
                              <span className="text-[9px] bg-slate-100 text-slate-600 px-1 rounded font-mono">
                                Registro SIP
                              </span>
                            )}
                            <span className="text-[10px] text-slate-500 font-mono">:{trunk?.port || 5060}</span>
                          </div>
                        </div>
                      </td>

                      <td className="px-4 py-3.5">
                        <div className="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg bg-slate-100 border border-slate-200 text-slate-800 text-xs font-semibold">
                          {getDestIcon(item.destinationType)}
                          <span className="truncate max-w-[130px]">{item.destinationLabel || item.destinationId}</span>
                        </div>
                      </td>

                      <td className="px-4 py-3.5 text-xs">
                        {item.timeConditionEnabled ? (
                          <div className="flex flex-col gap-0.5">
                            <span className="font-semibold text-amber-700 flex items-center gap-1 text-[11px]">
                              <Clock className="w-3 h-3" />
                              {item.timeSchedule?.startHour || '08:00'} - {item.timeSchedule?.endHour || '18:00'}
                            </span>
                            <span className="text-[10px] text-slate-500">
                              Fora de hora: {item.afterHoursDestType || 'IA MaIA'}
                            </span>
                          </div>
                        ) : (
                          <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-100">
                            24 Horas / Direto
                          </span>
                        )}
                      </td>

                      <td className="px-4 py-3.5 text-xs font-mono">
                        <div className="flex flex-col">
                          <span className="font-black text-slate-900">
                            R$ {(item.monthlyFee !== undefined ? item.monthlyFee : 29.9).toFixed(2).replace('.', ',')}
                          </span>
                          <span className="text-[10px] text-slate-500 font-sans">
                            venc. dia {item.billingCycleDay || 10}
                          </span>
                        </div>
                      </td>

                      <td className="px-4 py-3.5 text-center">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            item.status === 'active'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-rose-50 text-rose-700 border border-rose-200'
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              item.status === 'active' ? 'bg-emerald-500' : 'bg-rose-500'
                            }`}
                          />
                          {item.status === 'active' ? 'Ativo' : 'Inativo'}
                        </span>
                      </td>

                      <td className="px-4 py-3.5 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => {
                              setSimulateData({
                                didNumber: item.did,
                                sourceIp: trunk?.host || '200.80.127.10',
                                callerNumber: '11987654321',
                              });
                              setSimulateResult(null);
                              setIsSimulateModalOpen(true);
                            }}
                            className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"
                            title="Simular chamada para este DID"
                          >
                            <Play className="w-3.5 h-3.5" />
                          </button>

                          <button
                            onClick={() => handleOpenEdit(item)}
                            className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition"
                            title="Editar DID"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>

                          <button
                            onClick={() => handleDeleteDid(item.id, item.presentedNumber || item.did)}
                            className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                            title="Excluir DID"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Simulator Modal */}
      {isSimulateModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between sticky top-0 z-10">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                  <Play className="w-4 h-4 fill-blue-600" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Simulador de Chamada Recebida (Inbound Call)</h3>
                  <p className="text-xs text-slate-500">Validação em tempo real do PJSIP Identify, normalização E.164 e Asterisk Dialplan</p>
                </div>
              </div>
              <button onClick={() => setIsSimulateModalOpen(false)} className="p-1 text-slate-500 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">DID de Destino</label>
                  <select
                    value={simulateData.didNumber}
                    onChange={(e) => setSimulateData({ ...simulateData, didNumber: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 font-mono text-xs focus:border-blue-500 focus:outline-none"
                  >
                    {dids.map((d) => (
                      <option key={d.id} value={d.did}>
                        {formatDidDisplay(d.presentedNumber)} ({d.operatorName})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">IP de Origem (SBC)</label>
                  <input
                    type="text"
                    value={simulateData.sourceIp}
                    onChange={(e) => setSimulateData({ ...simulateData, sourceIp: e.target.value })}
                    placeholder="Ex: 200.80.127.10"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 font-mono text-xs focus:border-blue-500 focus:outline-none"
                  />
                  <div className="flex gap-1 mt-1">
                    <button
                      type="button"
                      onClick={() => setSimulateData({ ...simulateData, sourceIp: '200.80.127.10' })}
                      className="text-[9px] text-blue-600 hover:underline font-mono"
                    >
                      SBC TIP 1
                    </button>
                    <span className="text-[9px] text-slate-400">•</span>
                    <button
                      type="button"
                      onClick={() => setSimulateData({ ...simulateData, sourceIp: '200.80.127.11' })}
                      className="text-[9px] text-blue-600 hover:underline font-mono"
                    >
                      SBC TIP 2
                    </button>
                    <span className="text-[9px] text-slate-400">•</span>
                    <button
                      type="button"
                      onClick={() => setSimulateData({ ...simulateData, sourceIp: '198.51.100.99' })}
                      className="text-[9px] text-rose-600 hover:underline font-mono"
                    >
                      IP Não Autorizado
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">BINA do Chamador (Caller ID)</label>
                  <input
                    type="text"
                    value={simulateData.callerNumber}
                    onChange={(e) => setSimulateData({ ...simulateData, callerNumber: e.target.value })}
                    placeholder="Ex: 11987654321"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 font-mono text-xs focus:border-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="button"
                  onClick={handleRunSimulation}
                  disabled={isSimulating}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs flex items-center gap-2 transition disabled:opacity-50"
                >
                  <Play className={`w-3.5 h-3.5 ${isSimulating ? 'animate-spin' : ''}`} />
                  {isSimulating ? 'Processando Roteamento Asterisk...' : 'Executar Simulação de Chamada'}
                </button>
              </div>

              {/* Simulation Results Display */}
              {simulateResult && (
                <div className="mt-4 pt-4 border-t border-slate-200 space-y-3">
                  <div
                    className={`p-3 rounded-xl border flex items-center justify-between ${
                      simulateResult.allowed && simulateResult.matched
                        ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                        : 'bg-rose-50 border-rose-200 text-rose-900'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      {simulateResult.allowed && simulateResult.matched ? (
                        <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                      ) : (
                        <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
                      )}
                      <div>
                        <div className="font-bold text-xs">
                          {simulateResult.allowed && simulateResult.matched
                            ? 'Chamada Inbound Autorizada e Roteada com Sucesso!'
                            : 'Chamada Inbound Rejeitada pelo Asterisk'}
                        </div>
                        <div className="text-[11px] opacity-90">
                          {simulateResult.allowed && simulateResult.matched
                            ? `Destino Final: ${simulateResult.destination}`
                            : `Motivo: ${simulateResult.rejectionReason || 'DID não reconhecido ou IP não autorizado.'}`}
                        </div>
                      </div>
                    </div>

                    <span className="font-mono font-bold text-xs bg-white/70 px-2 py-1 rounded">
                      SIP {simulateResult.responseCode || 200}
                    </span>
                  </div>

                  {/* Step by Step Execution Trace */}
                  <div className="space-y-2">
                    <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wider font-mono">
                      Rastreamento Passo-a-Passo (Trace de Execução):
                    </h4>
                    <div className="space-y-1.5 font-mono text-[11px]">
                      {simulateResult.steps?.map((step: any, idx: number) => (
                        <div
                          key={idx}
                          className="bg-slate-50 border border-slate-200 rounded-lg p-2.5 flex items-start gap-2.5"
                        >
                          <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">
                            {idx + 1}
                          </span>
                          <div className="flex-1">
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-slate-800">{step.name}</span>
                              <span
                                className={`text-[9px] px-1.5 py-0.5 rounded font-bold uppercase ${
                                  step.status === 'ok'
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : step.status === 'warn'
                                    ? 'bg-amber-100 text-amber-800'
                                    : 'bg-rose-100 text-rose-800'
                                }`}
                              >
                                {step.status}
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-600 mt-0.5">{step.details}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* New / Edit DID Modal */}
      {isNewModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between sticky top-0 z-10">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  {editingDid ? 'Editar Roteamento do DID' : 'Cadastrar Novo DID'}
                </h3>
                <p className="text-xs text-slate-500">
                  Defina a numeração nacional, tronco SIP e regras de destino no Asterisk
                </p>
              </div>
              <button onClick={() => setIsNewModalOpen(false)} className="p-1 text-slate-500 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveDid} className="p-6 space-y-4 text-xs">
              {formError && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                  <span>{formError}</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">
                    Número de Telefone (DID) *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.did}
                    onChange={(e) => setFormData({ ...formData, did: e.target.value })}
                    placeholder="Ex: 1135008000 ou 0800888999"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 font-mono text-xs focus:border-blue-500 focus:outline-none"
                  />
                  <p className="text-[10px] text-slate-500 mt-1">
                    Formatos aceitos: DDD + 8 ou 9 dígitos (ex: 1135008000, 11987654321) ou 0800.
                  </p>
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">Tronco SIP Associado *</label>
                  <select
                    value={formData.trunkId}
                    onChange={(e) => setFormData({ ...formData, trunkId: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 text-xs focus:border-blue-500 focus:outline-none"
                  >
                    {trunks.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name} ({t.authMode === 'ip' ? 'Autenticação IP' : 'Registro SIP'})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Descrição / Identificação</label>
                <input
                  type="text"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Ex: Central Comercial Matriz SP"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 text-xs focus:border-blue-500 focus:outline-none"
                />
              </div>

              {/* Company & Billing Assignment */}
              <div className="p-3.5 bg-blue-50/50 border border-blue-100 rounded-xl space-y-3">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5 font-bold text-blue-900 text-xs uppercase tracking-wider">
                    <Building2 className="w-3.5 h-3.5 text-blue-600" />
                    Vinculação Empresarial & Faturamento / Billing
                  </span>
                  <span className="text-[10px] text-blue-700 font-medium bg-blue-100 px-2 py-0.5 rounded-full">
                    Módulo Financeiro
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-700 font-bold mb-1">
                      Empresa / Cliente Titular do DID
                    </label>
                    <input
                      type="text"
                      value={formData.assignedCompany}
                      onChange={(e) => setFormData({ ...formData, assignedCompany: e.target.value })}
                      placeholder="Ex: Alfa Logística e Transportes Ltda"
                      className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-slate-900 text-xs focus:border-blue-500 focus:outline-none"
                    />
                    <p className="text-[10px] text-slate-500 mt-1">
                      Razão social ou nome fantasia que recebe o DID.
                    </p>
                  </div>

                  <div>
                    <label className="block text-slate-700 font-bold mb-1">
                      CNPJ / CPF do Titular
                    </label>
                    <input
                      type="text"
                      value={formData.assignedCnpj}
                      onChange={(e) => setFormData({ ...formData, assignedCnpj: e.target.value })}
                      placeholder="Ex: 12.345.678/0001-90"
                      className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-slate-900 font-mono text-xs focus:border-blue-500 focus:outline-none"
                    />
                    <p className="text-[10px] text-slate-500 mt-1">
                      Documento fiscal para emissão de nota e fatura.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-slate-700 font-bold mb-1">
                      Responsável / Usuário de Contato
                    </label>
                    <div className="relative">
                      <User className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                      <input
                        type="text"
                        value={formData.assignedUser}
                        onChange={(e) => setFormData({ ...formData, assignedUser: e.target.value })}
                        placeholder="Ex: Roberto Silva"
                        className="w-full bg-white border border-slate-200 rounded-xl pl-8 pr-3 py-2 text-slate-900 text-xs focus:border-blue-500 focus:outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-slate-700 font-bold mb-1">
                      Mensalidade do DID (R$)
                    </label>
                    <div className="relative">
                      <DollarSign className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={formData.monthlyFee}
                        onChange={(e) => setFormData({ ...formData, monthlyFee: e.target.value })}
                        placeholder="29.90"
                        className="w-full bg-white border border-slate-200 rounded-xl pl-8 pr-3 py-2 text-slate-900 font-mono text-xs focus:border-blue-500 focus:outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-slate-700 font-bold mb-1">
                      Dia de Vencimento
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="31"
                      value={formData.billingCycleDay}
                      onChange={(e) => setFormData({ ...formData, billingCycleDay: e.target.value })}
                      placeholder="10"
                      className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-slate-900 font-mono text-xs focus:border-blue-500 focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Destination Settings */}
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                <span className="block font-bold text-slate-800 text-xs uppercase tracking-wider">
                  Destino da Chamada Recebida
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">Tipo de Destino</label>
                    <select
                      value={formData.destinationType}
                      onChange={(e) => {
                        const type = e.target.value as any;
                        let defaultId = '4101';
                        let defaultLabel = 'Ramal 4101';
                        if (type === 'ai_agent') {
                          defaultId = aiAgents[0]?.id || 'agent-maia-general';
                          defaultLabel = aiAgents[0]?.name || 'Agente de Voz MaIA';
                        } else if (type === 'queue') {
                          defaultId = queues[0]?.id || 'queue-suporte-n1';
                          defaultLabel = queues[0]?.name || 'Fila Suporte N1';
                        } else if (type === 'ivr') {
                          defaultId = ivrs[0]?.id || 'ivr-principal';
                          defaultLabel = ivrs[0]?.name || 'URA Principal';
                        } else if (type === 'ring_group') {
                          defaultId = ringGroups[0]?.id || 'rg-comercial';
                          defaultLabel = ringGroups[0]?.name || 'Grupo Comercial';
                        } else if (type === 'extension') {
                          defaultId = extensions[0]?.number || '4101';
                          defaultLabel = `Ramal ${defaultId}`;
                        }
                        setFormData({
                          ...formData,
                          destinationType: type,
                          destinationId: defaultId,
                          destinationLabel: defaultLabel,
                        });
                      }}
                      className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-slate-900 text-xs focus:border-blue-500 focus:outline-none"
                    >
                      <option value="ai_agent">Agente de Voz IA (MaIA)</option>
                      <option value="extension">Ramal PJSIP</option>
                      <option value="queue">Fila de Atendimento (ACD)</option>
                      <option value="ivr">URA / IVR</option>
                      <option value="ring_group">Grupo de Toque</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">Destino Selecionado</label>
                    {formData.destinationType === 'ai_agent' && (
                      <select
                        value={formData.destinationId}
                        onChange={(e) => {
                          const ag = aiAgents.find((a) => a.id === e.target.value);
                          setFormData({
                            ...formData,
                            destinationId: e.target.value,
                            destinationLabel: ag ? ag.name : 'Agente IA',
                          });
                        }}
                        className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-slate-900 text-xs focus:border-blue-500 focus:outline-none"
                      >
                        {aiAgents.map((a) => (
                          <option key={a.id} value={a.id}>
                            {a.name} ({a.role})
                          </option>
                        ))}
                      </select>
                    )}

                    {formData.destinationType === 'extension' && (
                      <select
                        value={formData.destinationId}
                        onChange={(e) => {
                          const ext = extensions.find((ex) => ex.number === e.target.value);
                          setFormData({
                            ...formData,
                            destinationId: e.target.value,
                            destinationLabel: ext ? `Ramal ${ext.number} (${ext.name})` : `Ramal ${e.target.value}`,
                          });
                        }}
                        className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-slate-900 text-xs focus:border-blue-500 focus:outline-none"
                      >
                        {extensions.map((ex) => (
                          <option key={ex.id} value={ex.number}>
                            {ex.number} - {ex.name}
                          </option>
                        ))}
                      </select>
                    )}

                    {formData.destinationType === 'queue' && (
                      <select
                        value={formData.destinationId}
                        onChange={(e) => {
                          const q = queues.find((qu) => qu.id === e.target.value);
                          setFormData({
                            ...formData,
                            destinationId: e.target.value,
                            destinationLabel: q ? q.name : e.target.value,
                          });
                        }}
                        className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-slate-900 text-xs focus:border-blue-500 focus:outline-none"
                      >
                        {queues.map((q) => (
                          <option key={q.id} value={q.id}>
                            {q.name} (Estratégia: {q.strategy})
                          </option>
                        ))}
                      </select>
                    )}

                    {formData.destinationType === 'ivr' && (
                      <select
                        value={formData.destinationId}
                        onChange={(e) => {
                          const iv = ivrs.find((i) => i.id === e.target.value);
                          setFormData({
                            ...formData,
                            destinationId: e.target.value,
                            destinationLabel: iv ? iv.name : e.target.value,
                          });
                        }}
                        className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-slate-900 text-xs focus:border-blue-500 focus:outline-none"
                      >
                        {ivrs.map((iv) => (
                          <option key={iv.id} value={iv.id}>
                            {iv.name}
                          </option>
                        ))}
                      </select>
                    )}

                    {formData.destinationType === 'ring_group' && (
                      <select
                        value={formData.destinationId}
                        onChange={(e) => {
                          const rg = ringGroups.find((g) => g.id === e.target.value);
                          setFormData({
                            ...formData,
                            destinationId: e.target.value,
                            destinationLabel: rg ? rg.name : e.target.value,
                          });
                        }}
                        className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-slate-900 text-xs focus:border-blue-500 focus:outline-none"
                      >
                        {ringGroups.map((rg) => (
                          <option key={rg.id} value={rg.id}>
                            {rg.name}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>
                </div>
              </div>

              {/* Time Conditions Checkbox */}
              <div className="border border-slate-200 rounded-xl p-3.5 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-bold text-slate-900 text-xs">Controle de Horário de Atendimento</span>
                    <p className="text-[10px] text-slate-500">
                      Roteie para destino alternativo (ex: MaIA 24/7) fora do expediente comercial
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={formData.timeConditionEnabled}
                    onChange={(e) => setFormData({ ...formData, timeConditionEnabled: e.target.checked })}
                    className="w-4 h-4 text-blue-600 rounded border-slate-300"
                  />
                </div>

                {formData.timeConditionEnabled && (
                  <div className="pt-2 border-t border-slate-200 grid grid-cols-2 gap-3 text-xs">
                    <div>
                      <label className="block text-slate-700 font-semibold mb-1">Horário de Início</label>
                      <input
                        type="time"
                        value={formData.startHour}
                        onChange={(e) => setFormData({ ...formData, startHour: e.target.value })}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2 py-1.5 font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-700 font-semibold mb-1">Horário de Fim</label>
                      <input
                        type="time"
                        value={formData.endHour}
                        onChange={(e) => setFormData({ ...formData, endHour: e.target.value })}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2 py-1.5 font-mono"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* SIP Advanced Header Extraction */}
              <div className="border border-slate-200 rounded-xl p-3.5 space-y-2">
                <span className="font-bold text-slate-900 text-xs">Extração do DID no Cabeçalho SIP</span>
                <p className="text-[10px] text-slate-500">
                  A maioria das operadoras (TIP Brasil) envia o DID no <code>Request-URI</code>. Se necessário, selecione <code>To</code> ou <code>P-Called-Party-ID</code>.
                </p>

                <div className="grid grid-cols-2 gap-2">
                  <select
                    value={formData.didSourceHeader}
                    onChange={(e) => setFormData({ ...formData, didSourceHeader: e.target.value as any })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-900 font-mono focus:border-blue-500 focus:outline-none"
                  >
                    <option value="request_uri">Request-URI (Padrão TIP Brasil)</option>
                    <option value="to">To: &lt;sip:DID@...&gt;</option>
                    <option value="p_called_party_id">P-Called-Party-ID</option>
                    <option value="custom">Cabeçalho Customizado</option>
                  </select>

                  <select
                    value={formData.unknownDidAction}
                    onChange={(e) => setFormData({ ...formData, unknownDidAction: e.target.value as any })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-900 text-xs focus:border-blue-500 focus:outline-none"
                  >
                    <option value="reject_404">Rejeitar com SIP 404 (Not Found)</option>
                    <option value="busy_486">Rejeitar com SIP 486 (Busy)</option>
                    <option value="default_route">Encaminhar para Operador Padrão</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsNewModalOpen(false)}
                  className="px-4 py-2 text-slate-600 hover:text-slate-800 text-xs font-semibold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 transition disabled:opacity-50"
                >
                  {isSaving ? 'Salvando...' : editingDid ? 'Salvar Alterações' : 'Cadastrar DID'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Batch Import Modal */}
      {isBatchModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-lg shadow-2xl">
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900">Importar Faixa Sequencial de DIDs</h3>
                <p className="text-xs text-slate-500">Crie múltiplos DIDs sequenciais em lote automaticamente</p>
              </div>
              <button onClick={() => setIsBatchModalOpen(false)} className="p-1 text-slate-500 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveBatch} className="p-6 space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Número Inicial *</label>
                  <input
                    type="text"
                    required
                    value={batchData.startNumber}
                    onChange={(e) => setBatchData({ ...batchData, startNumber: e.target.value })}
                    placeholder="Ex: 1135008000"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 font-mono text-xs focus:border-blue-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">Quantidade de Números</label>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    required
                    value={batchData.count}
                    onChange={(e) => setBatchData({ ...batchData, count: parseInt(e.target.value, 10) || 1 })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 font-mono text-xs focus:border-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Tronco SIP Associado</label>
                <select
                  value={batchData.trunkId}
                  onChange={(e) => setBatchData({ ...batchData, trunkId: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 text-xs focus:border-blue-500 focus:outline-none"
                >
                  {trunks.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="p-3 bg-blue-50 border border-blue-200 text-blue-900 rounded-xl text-[11px] font-mono">
                Faixa que será gerada: {batchData.startNumber} até{' '}
                {(parseInt(batchData.startNumber || '0', 10) + batchData.count - 1).toString()} (
                {batchData.count} números)
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsBatchModalOpen(false)}
                  className="px-4 py-2 text-slate-600 hover:text-slate-800 text-xs font-semibold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isBatchSaving}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 transition disabled:opacity-50"
                >
                  {isBatchSaving ? 'Importando...' : 'Confirmar Importação'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
