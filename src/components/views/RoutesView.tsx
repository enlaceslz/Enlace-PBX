import React, { useState } from 'react';
import {
  GitFork,
  ArrowRight,
  Bot,
  PhoneCall,
  Split,
  Plus,
  Radio,
  Clock,
  CheckCircle2,
  Trash2,
  Edit2,
  AlertCircle,
  X,
  Layers,
  Sparkles,
  ShieldCheck,
  Check,
  Play,
  Search,
} from 'lucide-react';
import { Route, Trunk, Extension, RouteExtensionOverride } from '../../types/pbx';
import { getAuthHeaders } from '../../utils/api';

interface RoutesViewProps {
  routes: Route[];
  trunks: Trunk[];
  extensions?: Extension[];
  onRefresh: () => void;
}

export const RoutesView: React.FC<RoutesViewProps> = ({ routes, trunks, extensions = [], onRefresh }) => {
  const [activeTab, setActiveTab] = useState<'inbound' | 'outbound'>('outbound');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [editingRoute, setEditingRoute] = useState<Route | null>(null);
  const [editError, setEditError] = useState<string | null>(null);

  // Estados para Simulação / Diagnóstico de CallerID CLI/ITX
  const [isSimulatorOpen, setIsSimulatorOpen] = useState(false);
  const [simExtension, setSimExtension] = useState<string>(extensions[0]?.number || '4101');
  const [simRouteId, setSimRouteId] = useState<string>(
    (routes || []).find((r) => r.type === 'outbound' && r.isCliItx)?.id ||
      (routes || []).find((r) => r.type === 'outbound')?.id ||
      routes?.[0]?.id ||
      ''
  );
  const [simResult, setSimResult] = useState<{
    extensionNumber: string;
    extensionName: string;
    originalCallerId: string;
    routeId: string;
    routeName: string;
    pattern: string;
    isCliItx: boolean;
    resolutionSource: string;
    resolvedCallerId: string;
    headersAdded: {
      callerIdNum: string;
      callerIdName: string;
      pAssertedIdentity?: string;
      remotePartyId?: string;
    };
    explanation: string;
    matchedTrunk: { id: string; name: string; provider: string; host: string } | null;
  } | null>(null);
  const [isSimulating, setIsSimulating] = useState(false);

  // Estados temporários para adicionar overrides na criação de rota
  const [newOverrideExt, setNewOverrideExt] = useState('');
  const [newOverrideCallerId, setNewOverrideCallerId] = useState('');
  const [newOverrideLabel, setNewOverrideLabel] = useState('');

  // Estados temporários para adicionar overrides na edição de rota
  const [editOverrideExt, setEditOverrideExt] = useState('');
  const [editOverrideCallerId, setEditOverrideCallerId] = useState('');
  const [editOverrideLabel, setEditOverrideLabel] = useState('');

  const [formData, setFormData] = useState({
    name: '',
    type: 'outbound' as 'inbound' | 'outbound',
    pattern: '_9XXXXXXXX',
    prefixRemove: '',
    prepend: '',
    trunkId: trunks[0]?.id || '',
    failoverTrunkId: '',
    destinationType: 'trunk' as 'trunk' | 'ai_agent' | 'extension' | 'queue' | 'ivr',
    destinationId: trunks[0]?.id || '',
    priority: 1,
    fallbackType: 'human',
    fallbackTarget: '4101',
    timeConditionEnabled: false,
    timeSchedule: {
      startHour: '08:00',
      endHour: '18:00',
      daysOfWeek: [1, 2, 3, 4, 5],
      outOfHoursDestinationType: 'ai_agent' as 'ai_agent' | 'ivr' | 'queue' | 'extension',
      outOfHoursDestinationId: 'agent-maia-247',
    },
    // Parâmetros CLI / ITX (Interconexão com BINA Aberta)
    isCliItx: false,
    callerIdMode: 'per_extension' as 'per_extension' | 'forced_route' | 'passthrough',
    callerIdOverride: '',
    extensionOverrides: [] as RouteExtensionOverride[],
  });

  const filteredRoutes = routes.filter((r) => r.type === activeTab);

  const brazilianRulesHelper = [
    { pattern: '_9XXXXXXXX', desc: 'Celular Local (9 dígitos SP/Brasil)' },
    { pattern: '_[2-5]XXXXXXX', desc: 'Fixo Local (8 dígitos)' },
    { pattern: '_0XX9XXXXXXXX', desc: 'DDD Móvel Nacional (Ex: 011 98765-4321)' },
    { pattern: '_0XX[2-5]XXXXXXX', desc: 'DDD Fixo Nacional' },
    { pattern: '_0800XXXXXXX', desc: 'Chamadas Gratuitas 0800' },
  ];

  const routePresets = [
    {
      title: 'Saída Celular Local',
      type: 'outbound' as const,
      pattern: '_9XXXXXXXX',
      prefixRemove: '',
      destType: 'trunk' as const,
      priority: 1,
    },
    {
      title: 'Saída DDD Nacional (0 + DDD + Número)',
      type: 'outbound' as const,
      pattern: '_0XX9XXXXXXXX',
      prefixRemove: '0',
      destType: 'trunk' as const,
      priority: 2,
    },
    {
      title: 'Saída CLI / ITX (BINA Dinâmica por Ramal)',
      type: 'outbound' as const,
      pattern: '_0[1-9]XXXXXXXXX',
      prefixRemove: '0',
      destType: 'trunk' as const,
      priority: 1,
      isCliItx: true,
      callerIdMode: 'per_extension' as const,
      callerIdOverride: '1135008000',
    },
    {
      title: 'Entrada DID 0800 → Agente IA Gemini',
      type: 'inbound' as const,
      pattern: '08007702020',
      prefixRemove: '',
      destType: 'ai_agent' as const,
      destId: 'agent-maia-247',
      priority: 1,
    },
    {
      title: 'Entrada DID Matriz → URA Principal',
      type: 'inbound' as const,
      pattern: '1130900100',
      prefixRemove: '',
      destType: 'ivr' as const,
      destId: 'ivr-principal',
      priority: 2,
    },
  ];

  const handleApplyPreset = (p: typeof routePresets[0]) => {
    setFormData((prev) => ({
      ...prev,
      name: p.title,
      type: p.type,
      pattern: p.pattern,
      prefixRemove: p.prefixRemove,
      destinationType: p.destType,
      destinationId: p.destId || (p.destType === 'trunk' ? trunks[0]?.id || '' : '4101'),
      trunkId: trunks[0]?.id || '',
      priority: p.priority,
      isCliItx: (p as any).isCliItx || false,
      callerIdMode: (p as any).callerIdMode || 'per_extension',
      callerIdOverride: (p as any).callerIdOverride || '',
      extensionOverrides: [],
    }));
  };

  const handleSimulateCallerId = async (targetRouteId?: string, targetExtension?: string) => {
    const routeToSimulate = targetRouteId || simRouteId;
    const extToSimulate = targetExtension || simExtension;
    if (!routeToSimulate || !extToSimulate) return;

    setIsSimulating(true);
    try {
      const res = await fetch('/api/v1/routes/simulate-callerid', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          extensionNumber: extToSimulate,
          routeId: routeToSimulate,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setSimResult(data);
      } else {
        console.error('Simulação retornou erro:', data.error);
      }
    } catch (err) {
      console.error('Erro na requisição de simulação:', err);
    } finally {
      setIsSimulating(false);
    }
  };

  const handleCreateRoute = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    if (!formData.name || !formData.pattern) {
      setFormError('Nome da rota e padrão de discagem são obrigatórios.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/v1/routes', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          name: formData.name,
          type: formData.type,
          pattern: formData.pattern,
          prefixRemove: formData.prefixRemove || undefined,
          prepend: formData.prepend || undefined,
          trunkId: formData.type === 'outbound' ? formData.trunkId : undefined,
          failoverTrunkId: formData.type === 'outbound' ? (formData.failoverTrunkId || undefined) : undefined,
          destinationType: formData.destinationType,
          destinationId: formData.type === 'outbound' ? formData.trunkId : formData.destinationId,
          priority: Number(formData.priority) || 1,
          fallbackType: formData.fallbackType,
          fallbackTarget: formData.fallbackTarget,
          timeConditionEnabled: formData.timeConditionEnabled,
          timeSchedule: formData.timeConditionEnabled ? formData.timeSchedule : undefined,
          isCliItx: formData.type === 'outbound' ? formData.isCliItx : false,
          callerIdMode: formData.type === 'outbound' && formData.isCliItx ? formData.callerIdMode : undefined,
          callerIdOverride: formData.type === 'outbound' && formData.callerIdOverride ? formData.callerIdOverride.trim() : undefined,
          extensionOverrides:
            formData.type === 'outbound' && formData.isCliItx && (formData.extensionOverrides?.length || 0) > 0
              ? formData.extensionOverrides
              : undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setFormError(data.error || 'Erro ao cadastrar rota no Dialplan.');
        setIsSubmitting(false);
        return;
      }

      setIsModalOpen(false);
      setFormData({
        name: '',
        type: 'outbound',
        pattern: '_9XXXXXXXX',
        prefixRemove: '',
        prepend: '',
        trunkId: trunks[0]?.id || '',
        failoverTrunkId: '',
        destinationType: 'trunk',
        destinationId: trunks[0]?.id || '',
        priority: 1,
        fallbackType: 'human',
        fallbackTarget: '4101',
        timeConditionEnabled: false,
        timeSchedule: {
          startHour: '08:00',
          endHour: '18:00',
          daysOfWeek: [1, 2, 3, 4, 5],
          outOfHoursDestinationType: 'ai_agent',
          outOfHoursDestinationId: 'agent-maia-247',
        },
        isCliItx: false,
        callerIdMode: 'per_extension',
        callerIdOverride: '',
        extensionOverrides: [],
      });
      onRefresh();
    } catch (err) {
      console.error('Erro ao cadastrar rota:', err);
      setFormError('Falha na comunicação com o servidor.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateRoute = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRoute) return;
    setEditError(null);
    setIsSubmitting(true);

    try {
      const res = await fetch(`/api/v1/routes/${editingRoute.id}`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify(editingRoute),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setEditError(data.error || 'Erro ao atualizar rota.');
        setIsSubmitting(false);
        return;
      }

      setEditingRoute(null);
      onRefresh();
    } catch (err) {
      console.error('Erro ao atualizar rota:', err);
      setEditError('Falha na comunicação com o servidor.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteRoute = async (id: string, name: string) => {
    if (!confirm(`Deseja realmente excluir a rota "${name}"?`)) return;
    try {
      await fetch(`/api/v1/routes/${id}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });
      onRefresh();
    } catch (err) {
      console.error('Erro ao excluir rota:', err);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-xl font-black text-slate-900 tracking-tight">
              Rotas de Entrada e Saída (Dialplan)
            </h1>
            <span className="text-[10px] bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 rounded-full font-mono">
              extensions.conf • Padrão E.164 Brasil
            </span>
          </div>
          <p className="text-xs text-slate-500">
            Regras de discagem para operadoras nacionais, tratamento de DDD e direcionamento inteligente para IA Gemini.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start">
          {/* Tab Switcher */}
          <div className="flex bg-white p-1 rounded-xl border border-slate-200">
            <button
              onClick={() => setActiveTab('outbound')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                activeTab === 'outbound'
                  ? 'bg-blue-600 text-white shadow'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              Rotas de Saída (Outbound)
            </button>
            <button
              onClick={() => setActiveTab('inbound')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                activeTab === 'inbound'
                  ? 'bg-blue-600 text-white shadow'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              Rotas de Entrada (DIDs)
            </button>
          </div>

          <button
            onClick={() => {
              const nextState = !isSimulatorOpen;
              setIsSimulatorOpen(nextState);
              if (nextState) {
                const targetRoute =
                  simRouteId ||
                  routes.find((r) => r.type === 'outbound' && r.isCliItx)?.id ||
                  routes.find((r) => r.type === 'outbound')?.id ||
                  '';
                const targetExt = simExtension || extensions[0]?.number || '4101';
                if (targetRoute && targetExt) {
                  handleSimulateCallerId(targetRoute, targetExt);
                }
              }
            }}
            className={`px-3 py-2 font-bold rounded-xl text-xs flex items-center gap-1.5 border transition shadow-sm ${
              isSimulatorOpen
                ? 'bg-amber-500 text-white border-amber-600'
                : 'bg-white border-amber-200 text-amber-900 hover:bg-amber-50 hover:border-amber-300'
            }`}
          >
            <Radio className="w-3.5 h-3.5 text-amber-500" />
            Simulador de BINA CLI/ITX
          </button>

          <button
            onClick={() => {
              setFormData((prev) => ({ ...prev, type: activeTab }));
              setIsModalOpen(true);
            }}
            className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-sm transition"
          >
            <Plus className="w-3.5 h-3.5" />
            Nova Rota
          </button>
        </div>
      </div>

      {/* CALLERID / CLI-ITX SIMULATOR & DIAGNOSTIC PANEL */}
      {isSimulatorOpen && (
        <div className="bg-gradient-to-br from-amber-50/60 via-white to-slate-50 border border-amber-200 rounded-2xl p-5 shadow-md space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-amber-200/70 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-amber-100 border border-amber-300 flex items-center justify-center text-amber-800">
                <Radio className="w-4 h-4 text-amber-700" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  Simulador de BINA de Saída & Interconexão CLI/ITX
                  <span className="text-[10px] bg-amber-100 text-amber-800 font-mono font-normal px-2 py-0.5 rounded border border-amber-200">
                    Hierarquia Asterisk 20 PJSIP
                  </span>
                </h3>
                <p className="text-xs text-slate-500">
                  Valide em tempo real qual número será binado na operadora e quais cabeçalhos SIP serão gerados
                </p>
              </div>
            </div>
            <button
              onClick={() => setIsSimulatorOpen(false)}
              className="p-1 text-slate-400 hover:text-slate-600 rounded-lg self-end sm:self-auto"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Selector Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
            <div className="sm:col-span-4">
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-600 block mb-1">
                Ramal Chamador (Origem):
              </label>
              <select
                value={simExtension}
                onChange={(e) => {
                  setSimExtension(e.target.value);
                  if (simRouteId) handleSimulateCallerId(simRouteId, e.target.value);
                }}
                className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-mono text-slate-900 focus:outline-none focus:border-amber-500"
              >
                {extensions.map((ext) => (
                  <option key={ext.id} value={ext.number}>
                    Ramal {ext.number} - {ext.name}{' '}
                    {ext.cliCallerId ? `(CLI: ${ext.cliCallerId})` : '(Sem CLI individual)'}
                  </option>
                ))}
              </select>
            </div>

            <div className="sm:col-span-5">
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-600 block mb-1">
                Rota de Saída Selecionada:
              </label>
              <select
                value={simRouteId}
                onChange={(e) => {
                  setSimRouteId(e.target.value);
                  if (simExtension) handleSimulateCallerId(e.target.value, simExtension);
                }}
                className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-mono text-slate-900 focus:outline-none focus:border-amber-500"
              >
                {routes
                  .filter((r) => r.type === 'outbound')
                  .map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name} [{r.pattern}] {r.isCliItx ? '★ Rota CLI/ITX' : '(Rota Normal)'}
                    </option>
                  ))}
              </select>
            </div>

            <div className="sm:col-span-3">
              <button
                onClick={() => handleSimulateCallerId(simRouteId, simExtension)}
                disabled={isSimulating || !simRouteId || !simExtension}
                className="w-full py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 transition disabled:opacity-50 shadow-sm"
              >
                <Play className="w-3.5 h-3.5 fill-white" />
                {isSimulating ? 'Simulando...' : 'Executar Diagnóstico'}
              </button>
            </div>
          </div>

          {/* Simulation Output Card */}
          {simResult && (
            <div className="bg-white rounded-xl border border-amber-200 p-4 space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Result Column */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-600">Número Binado (CallerID Final):</span>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                        simResult.resolutionSource === 'extension_override'
                          ? 'bg-purple-100 text-purple-800 border border-purple-200'
                          : simResult.resolutionSource === 'extension_cli'
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                          : simResult.resolutionSource === 'route_override'
                          ? 'bg-blue-100 text-blue-800 border border-blue-200'
                          : 'bg-slate-100 text-slate-700 border border-slate-200'
                      }`}
                    >
                      {simResult.resolutionSource === 'extension_override' && '1. Sobrescrita de Ramal na Rota'}
                      {simResult.resolutionSource === 'extension_cli' && '2. BINA CLI Individual do Ramal'}
                      {simResult.resolutionSource === 'route_override' && '3. Fallback Padrão da Rota'}
                      {simResult.resolutionSource === 'route_forced' && 'BINA Fixa Forçada da Rota'}
                      {simResult.resolutionSource === 'original' && 'CallerID Original do Ramal'}
                    </span>
                  </div>

                  <div className="p-3 bg-slate-900 rounded-xl text-white flex items-center justify-between">
                    <div>
                      <div className="text-[10px] text-slate-400 uppercase tracking-widest font-mono">
                        BINA na Operadora
                      </div>
                      <div className="text-2xl font-black font-mono text-amber-400">
                        {simResult.resolvedCallerId}
                      </div>
                    </div>
                    <div className="text-right text-xs text-slate-400 font-mono">
                      <div>Ramal: {simResult.extensionNumber}</div>
                      <div>Rota: {simResult.routeName}</div>
                    </div>
                  </div>

                  <p className="text-xs text-slate-600 bg-amber-50/60 p-2.5 rounded-lg border border-amber-200/60 flex items-start gap-1.5">
                    <Sparkles className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    <span>{simResult.explanation}</span>
                  </p>
                </div>

                {/* Technical Headers Column */}
                <div className="space-y-2">
                  <div className="text-xs font-bold text-slate-600 flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                    Cabeçalhos SIP Gerados para a Operadora (Asterisk 20):
                  </div>

                  <div className="bg-slate-50 rounded-xl p-3 border border-slate-200 font-mono text-[11px] space-y-1.5">
                    <div className="flex justify-between border-b border-slate-200 pb-1">
                      <span className="text-slate-500">CALLERID(num):</span>
                      <span className="font-bold text-slate-900">{simResult.headersAdded.callerIdNum}</span>
                    </div>
                    <div className="flex justify-between border-b border-slate-200 pb-1">
                      <span className="text-slate-500">CALLERID(name):</span>
                      <span className="text-slate-800">{simResult.headersAdded.callerIdName}</span>
                    </div>
                    {simResult.headersAdded.pAssertedIdentity && (
                      <div className="flex justify-between border-b border-slate-200 pb-1">
                        <span className="text-indigo-600 font-semibold">P-Asserted-Identity:</span>
                        <span className="font-bold text-indigo-700">{simResult.headersAdded.pAssertedIdentity}</span>
                      </div>
                    )}
                    {simResult.headersAdded.remotePartyId && (
                      <div className="flex justify-between border-b border-slate-200 pb-1">
                        <span className="text-slate-500">Remote-Party-ID:</span>
                        <span className="text-slate-700">{simResult.headersAdded.remotePartyId}</span>
                      </div>
                    )}
                    {simResult.matchedTrunk && (
                      <div className="flex justify-between pt-1">
                        <span className="text-emerald-700 font-semibold">Tronco de Entrega:</span>
                        <span className="text-slate-800 font-sans font-bold">
                          {simResult.matchedTrunk.name} ({simResult.matchedTrunk.host})
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Rules Cheatsheet for Brazilian Dialing */}
      {activeTab === 'outbound' && (
        <div className="bg-white/80 rounded-2xl border border-slate-200 shadow-sm p-4">
          <div className="text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-2 font-mono flex items-center gap-2">
            <GitFork className="w-3.5 h-3.5 text-blue-600" />
            Expressões Regulares do Dialplan Brasileiro:
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 text-xs">
            {brazilianRulesHelper.map((rule, idx) => (
              <div key={idx} className="bg-slate-50 p-2 rounded-xl border border-slate-200 font-mono">
                <span className="text-blue-600 font-bold block">{rule.pattern}</span>
                <span className="text-[10px] text-slate-500 font-sans">{rule.desc}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Routes List */}
      <div className="space-y-3">
        {filteredRoutes.length === 0 ? (
          <div className="p-8 text-center bg-white rounded-2xl border border-slate-200 text-slate-500 text-xs">
            Nenhuma rota cadastrada para esta direção ({activeTab}). Clique em "Nova Rota" acima para adicionar.
          </div>
        ) : (
          filteredRoutes.map((route) => (
            <div
              key={route.id}
              className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 flex flex-col md:flex-row md:items-center justify-between gap-4"
            >
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center font-bold text-blue-600 font-mono text-xs">
                  P{route.priority}
                </div>

                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold text-slate-900">{route.name}</h3>
                    <span className="font-mono text-[11px] text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200 shadow-sm">
                      {route.pattern}
                    </span>
                  </div>
                  <div className="text-xs text-slate-500 mt-1 flex items-center gap-2">
                    {route.type === 'outbound' ? (
                      <span>
                        Tronco de Saída:{' '}
                        <strong className="text-slate-700">
                          {trunks.find((t) => t.id === route.trunkId)?.name || 'Padrão'}
                        </strong>
                      </span>
                    ) : (
                      <span>
                        Destino de Entrada:{' '}
                        <strong className="text-slate-700 uppercase">{route.destinationType}</strong>
                      </span>
                    )}
                    {route.prefixRemove && (
                      <span className="text-[10px] font-mono text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                        Strip: {route.prefixRemove}
                      </span>
                    )}
                    {route.prepend && (
                      <span className="text-[10px] font-mono text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-200">
                        Prepend: {route.prepend}
                      </span>
                    )}
                    {route.failoverTrunkId && (
                      <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                        LCR Failover: {trunks.find((t) => t.id === route.failoverTrunkId)?.name || 'Tronco Reserva'}
                      </span>
                    )}
                    {route.timeConditionEnabled && (
                      <span className="text-[10px] font-semibold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200 flex items-center gap-1">
                        <Clock className="w-3 h-3 text-amber-600" />
                        {route.timeSchedule ? `${route.timeSchedule.startHour}-${route.timeSchedule.endHour} (Seg-Sex)` : 'Horário Comercial'}
                      </span>
                    )}
                    {route.isCliItx && (
                      <span className="text-[10px] font-bold text-amber-900 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-300 flex items-center gap-1 shadow-xs">
                        <Radio className="w-3 h-3 text-amber-600 animate-pulse" />
                        CLI/ITX BINA Aberta
                      </span>
                    )}
                    {route.isCliItx && route.callerIdMode && (
                      <span className="text-[10px] font-mono text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
                        Modo: {route.callerIdMode === 'forced_route' ? 'Fixo Rota' : route.callerIdMode === 'passthrough' ? 'Pass-through' : 'Dinâmico por Ramal'}
                      </span>
                    )}
                    {route.isCliItx && route.callerIdOverride && (
                      <span className="text-[10px] font-mono text-amber-800 bg-amber-50/60 px-1.5 py-0.5 rounded border border-amber-200">
                        Fallback: {route.callerIdOverride}
                      </span>
                    )}
                    {route.isCliItx && route.extensionOverrides && route.extensionOverrides.length > 0 && (
                      <span className="text-[10px] font-semibold text-purple-700 bg-purple-50 px-1.5 py-0.5 rounded border border-purple-200 flex items-center gap-1">
                        <Layers className="w-3 h-3 text-purple-600" />
                        {route.extensionOverrides.length} ramal(is) com BINA dedicada
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Target Destination, Fallback & Delete */}
              <div className="flex items-center gap-4 text-xs">
                <div className="text-right">
                  <div className="font-mono text-slate-700 flex items-center gap-1.5 justify-end">
                    <span>Destino:</span>
                    {route.destinationType === 'ai_agent' ? (
                      <span className="px-2 py-0.5 rounded bg-cyan-50 text-cyan-700 border border-cyan-200 shadow-sm font-sans font-bold flex items-center gap-1">
                        <Bot className="w-3 h-3 text-cyan-600" /> MaIA (Gemini IA)
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-mono">
                        {route.destinationId}
                      </span>
                    )}
                  </div>
                  {route.fallbackType && (
                    <div className="text-[10px] text-slate-500 mt-0.5">
                      Fallback: Transbordo para {route.fallbackType} ({route.fallbackTarget})
                    </div>
                  )}
                </div>

                {route.type === 'outbound' && (
                  <button
                    onClick={() => {
                      setSimRouteId(route.id);
                      setIsSimulatorOpen(true);
                      handleSimulateCallerId(route.id, simExtension);
                    }}
                    className="p-1.5 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition"
                    title="Simular BINA de Saída desta Rota"
                  >
                    <Radio className="w-4 h-4" />
                  </button>
                )}

                <button
                  onClick={() => {
                    setEditError(null);
                    setEditingRoute({
                      ...route,
                      extensionOverrides: route.extensionOverrides ? [...route.extensionOverrides] : [],
                    });
                  }}
                  className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"
                  title="Editar Rota"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleDeleteRoute(route.id, route.name)}
                  className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                  title="Excluir Rota"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* CREATE ROUTE MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-[#0f172a]/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-lg w-full max-h-[90vh] flex flex-col my-auto">
            <div className="p-5 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600">
                  <GitFork className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-slate-900">
                    Cadastrar Nova Rota no Dialplan
                  </h3>
                  <p className="text-xs text-slate-500">
                    Gera regras em extensions.conf compatíveis com Asterisk 20
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateRoute} className="p-5 space-y-4 overflow-y-auto">
              {/* Presets */}
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-1">
                  Atalhos de Discagem Brasileira:
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {routePresets.map((p, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleApplyPreset(p)}
                      className="p-2 rounded-xl border border-slate-200 bg-slate-50 hover:bg-blue-50 hover:border-blue-300 text-left transition text-xs font-semibold text-slate-800"
                    >
                      {p.title}
                    </button>
                  ))}
                </div>
              </div>

              {/* Direction Switcher */}
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, type: 'outbound' })}
                  className={`py-2 text-xs font-bold rounded-xl border transition ${
                    formData.type === 'outbound'
                      ? 'bg-blue-50 border-blue-500 text-blue-700'
                      : 'bg-slate-50 border-slate-200 text-slate-600'
                  }`}
                >
                  Rota de Saída (Outbound)
                </button>
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, type: 'inbound' })}
                  className={`py-2 text-xs font-bold rounded-xl border transition ${
                    formData.type === 'inbound'
                      ? 'bg-blue-50 border-blue-500 text-blue-700'
                      : 'bg-slate-50 border-slate-200 text-slate-600'
                  }`}
                >
                  Rota de Entrada (Inbound/DID)
                </button>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Nome da Rota *
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full text-xs bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  placeholder="Ex: Saída Celular SP (DDD 11)"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    Padrão de Discagem (Pattern) *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.pattern}
                    onChange={(e) => setFormData({ ...formData, pattern: e.target.value })}
                    className="w-full text-xs font-mono bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    placeholder="Ex: _9XXXXXXXX ou 08007702020"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    Prioridade no Dialplan
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={formData.priority}
                    onChange={(e) =>
                      setFormData({ ...formData, priority: parseInt(e.target.value) || 1 })
                    }
                    className="w-full text-xs font-mono bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-800"
                  />
                </div>
              </div>

              {formData.type === 'outbound' ? (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-semibold text-slate-700 block mb-1">
                        Tronco SIP Primário
                      </label>
                      <select
                        value={formData.trunkId}
                        onChange={(e) => setFormData({ ...formData, trunkId: e.target.value })}
                        className="w-full text-xs bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-800 focus:outline-none"
                      >
                        {trunks.map((t) => (
                          <option key={t.id} value={t.id}>
                            {t.name} ({t.providerName})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-slate-700 block mb-1">
                        Tronco de Contingência (LCR Failover)
                      </label>
                      <select
                        value={formData.failoverTrunkId}
                        onChange={(e) => setFormData({ ...formData, failoverTrunkId: e.target.value })}
                        className="w-full text-xs bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-800 focus:outline-none"
                      >
                        <option value="">Nenhum (Sem contingência)</option>
                        {trunks.map((t) => (
                          <option key={t.id} value={t.id}>
                            {t.name} ({t.host})
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-semibold text-slate-700 block mb-1">
                        Remover Prefixo (Strip)
                      </label>
                      <input
                        type="text"
                        value={formData.prefixRemove}
                        onChange={(e) =>
                          setFormData({ ...formData, prefixRemove: e.target.value })
                        }
                        className="w-full text-xs font-mono bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-800"
                        placeholder="Ex: 0 (para remover dígito da operadora)"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-slate-700 block mb-1">
                        Adicionar Prefixo (Prepend)
                      </label>
                      <input
                        type="text"
                        value={formData.prepend}
                        onChange={(e) =>
                          setFormData({ ...formData, prepend: e.target.value })
                        }
                        className="w-full text-xs font-mono bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-800"
                        placeholder="Ex: 015 ou 021 (CSP de operadora)"
                      />
                    </div>
                  </div>

                  {/* CLI / ITX CallerID Configuration */}
                  <div className="p-4 bg-amber-50/70 border border-amber-200 rounded-xl space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Radio className="w-4 h-4 text-amber-600" />
                        <div>
                          <span className="text-xs font-bold text-amber-950 block">
                            Interconexão CLI / ITX (BINA Aberta)
                          </span>
                          <span className="text-[10px] text-amber-800">
                            Permite enviar CallerID personalizado por ramal para a operadora
                          </span>
                        </div>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={formData.isCliItx}
                          onChange={(e) => setFormData({ ...formData, isCliItx: e.target.checked })}
                          className="sr-only peer"
                        />
                        <div className="w-9 h-5 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-amber-600" />
                      </label>
                    </div>

                    {formData.isCliItx && (
                      <div className="pt-3 border-t border-amber-200/80 space-y-3">
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="text-[11px] font-semibold text-amber-950 block mb-1">
                              Modo de Resolução de CallerID
                            </label>
                            <select
                              value={formData.callerIdMode}
                              onChange={(e) => setFormData({ ...formData, callerIdMode: e.target.value as any })}
                              className="w-full bg-white border border-amber-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 focus:outline-none"
                            >
                              <option value="per_extension">Dinâmico (BINA CLI do Ramal → Fallback da Rota)</option>
                              <option value="forced_route">Fixo da Rota (Aplica BINA fixa a todos os ramais)</option>
                              <option value="passthrough">Pass-through (Mantém identificador original do ramal)</option>
                            </select>
                          </div>
                          <div>
                            <label className="text-[11px] font-semibold text-amber-950 block mb-1">
                              CallerID Fallback da Rota
                            </label>
                            <input
                              type="text"
                              value={formData.callerIdOverride}
                              onChange={(e) => setFormData({ ...formData, callerIdOverride: e.target.value })}
                              placeholder="Ex: 1135008000"
                              className="w-full bg-white border border-amber-300 rounded-lg px-2.5 py-1.5 text-xs font-mono text-slate-800 focus:outline-none"
                            />
                          </div>
                        </div>

                        {/* Extension Overrides List */}
                        <div className="space-y-2 pt-2 border-t border-amber-200/60">
                          <div className="flex items-center justify-between">
                            <span className="text-[11px] font-bold text-amber-950">
                              Sobrescritas Específicas por Ramal nesta Rota (Prioridade 1)
                            </span>
                            <span className="text-[10px] text-amber-800">
                              {formData.extensionOverrides?.length || 0} ramal(is) com BINA dedicada
                            </span>
                          </div>

                          {/* Add override row */}
                          <div className="flex items-center gap-2">
                            <select
                              value={newOverrideExt}
                              onChange={(e) => setNewOverrideExt(e.target.value)}
                              className="w-2/5 bg-white border border-amber-300 rounded-lg px-2 py-1.5 text-xs text-slate-800 font-mono"
                            >
                              <option value="">Selecione o Ramal...</option>
                              {extensions.map((ext) => (
                                <option key={ext.id} value={ext.number}>
                                  {ext.number} - {ext.name}
                                </option>
                              ))}
                            </select>
                            <input
                              type="text"
                              value={newOverrideCallerId}
                              onChange={(e) => setNewOverrideCallerId(e.target.value)}
                              placeholder="BINA nesta rota (ex: 1135008010)"
                              className="flex-1 bg-white border border-amber-300 rounded-lg px-2 py-1.5 text-xs font-mono text-slate-800"
                            />
                            <input
                              type="text"
                              value={newOverrideLabel}
                              onChange={(e) => setNewOverrideLabel(e.target.value)}
                              placeholder="Rótulo (opcional)"
                              className="w-1/4 bg-white border border-amber-300 rounded-lg px-2 py-1.5 text-xs text-slate-800"
                            />
                            <button
                              type="button"
                              onClick={() => {
                                if (!newOverrideExt || !newOverrideCallerId) return;
                                setFormData({
                                  ...formData,
                                  extensionOverrides: [
                                    ...(formData.extensionOverrides || []).filter((o) => o.extensionNumber !== newOverrideExt),
                                    {
                                      extensionNumber: newOverrideExt,
                                      callerId: newOverrideCallerId.trim(),
                                      label: newOverrideLabel.trim() || undefined,
                                    },
                                  ],
                                });
                                setNewOverrideExt('');
                                setNewOverrideCallerId('');
                                setNewOverrideLabel('');
                              }}
                              className="px-2.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold transition shrink-0"
                            >
                              Adicionar
                            </button>
                          </div>

                          {(formData.extensionOverrides?.length || 0) > 0 && (
                            <div className="bg-white rounded-lg border border-amber-200 divide-y divide-amber-100 max-h-36 overflow-y-auto">
                              {(formData.extensionOverrides || []).map((ov, idx) => (
                                <div key={idx} className="px-3 py-1.5 flex items-center justify-between text-xs">
                                  <div className="flex items-center gap-2 font-mono">
                                    <span className="font-bold text-slate-900">Ramal {ov.extensionNumber}</span>
                                    <ArrowRight className="w-3 h-3 text-amber-600" />
                                    <span className="text-amber-800 font-bold bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                                      {ov.callerId}
                                    </span>
                                    {ov.label && (
                                      <span className="text-slate-500 font-sans text-[10px]">({ov.label})</span>
                                    )}
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setFormData({
                                        ...formData,
                                        extensionOverrides: formData.extensionOverrides.filter((_, i) => i !== idx),
                                      })
                                    }
                                    className="text-rose-600 hover:text-rose-800 text-[11px] font-semibold"
                                  >
                                    Remover
                                  </button>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-slate-700 block mb-1">
                      Tipo de Destino
                    </label>
                    <select
                      value={formData.destinationType}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          destinationType: e.target.value as any,
                        })
                      }
                      className="w-full text-xs bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-800"
                    >
                      <option value="ai_agent">Agente Gemini (MaIA)</option>
                      <option value="ivr">URA / IVR</option>
                      <option value="queue">Fila de Atendimento (ACD)</option>
                      <option value="extension">Ramal PJSIP</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-700 block mb-1">
                      Identificador / Alvo
                    </label>
                    <input
                      type="text"
                      value={formData.destinationId}
                      onChange={(e) =>
                        setFormData({ ...formData, destinationId: e.target.value })
                      }
                      className="w-full text-xs font-mono bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-800"
                      placeholder="Ex: agent-maia-247 ou 4101"
                    />
                  </div>
                </div>
              )}

              {/* Time Conditions Section */}
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-amber-600" />
                    <span className="text-xs font-bold text-slate-800">
                      Regra de Horário Comercial (Time Conditions)
                    </span>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.timeConditionEnabled}
                      onChange={(e) =>
                        setFormData({ ...formData, timeConditionEnabled: e.target.checked })
                      }
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600" />
                  </label>
                </div>

                {formData.timeConditionEnabled && (
                  <div className="pt-2 border-t border-slate-200 space-y-2 text-xs">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-[11px] font-semibold text-slate-600 block mb-1">
                          Início do Expediente
                        </label>
                        <input
                          type="time"
                          value={formData.timeSchedule.startHour}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              timeSchedule: { ...formData.timeSchedule, startHour: e.target.value },
                            })
                          }
                          className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-800"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] font-semibold text-slate-600 block mb-1">
                          Término do Expediente
                        </label>
                        <input
                          type="time"
                          value={formData.timeSchedule.endHour}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              timeSchedule: { ...formData.timeSchedule, endHour: e.target.value },
                            })
                          }
                          className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-800"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-[11px] font-semibold text-slate-600 block mb-1">
                        Destino Fora do Horário Comercial
                      </label>
                      <select
                        value={formData.timeSchedule.outOfHoursDestinationType}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            timeSchedule: {
                              ...formData.timeSchedule,
                              outOfHoursDestinationType: e.target.value as any,
                            },
                          })
                        }
                        className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-800"
                      >
                        <option value="ai_agent">Atendimento IA MaIA (24/7 Noturno)</option>
                        <option value="ivr">URA / Mensagem de Fora de Expediente</option>
                        <option value="extension">Caixa Postal / Ramal de Plantão</option>
                      </select>
                    </div>
                  </div>
                )}
              </div>

              <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow transition disabled:opacity-50 flex items-center gap-1.5"
                >
                  <GitFork className="w-3.5 h-3.5" />
                  {isSubmitting ? 'Salvando...' : 'Salvar Rota'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT ROUTE MODAL */}
      {editingRoute && (
        <div className="fixed inset-0 bg-[#0f172a]/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-xl max-h-[90vh] flex flex-col overflow-hidden shadow-2xl">
            <div className="px-6 py-4 bg-slate-50/90 border-b border-slate-200 flex items-center justify-between shrink-0">
              <div>
                <h3 className="text-base font-bold text-slate-900">Editar Rota</h3>
                <p className="text-xs text-slate-500 font-mono">{editingRoute.pattern}</p>
              </div>
              <button
                onClick={() => setEditingRoute(null)}
                className="p-1 text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateRoute} className="p-6 space-y-4 text-xs overflow-y-auto">
              {editError && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                  <span>{editError}</span>
                </div>
              )}

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Nome da Rota *</label>
                <input
                  type="text"
                  required
                  value={editingRoute.name}
                  onChange={(e) => setEditingRoute({ ...editingRoute, name: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Padrão (Pattern Asterisk) *</label>
                  <input
                    type="text"
                    required
                    value={editingRoute.pattern}
                    onChange={(e) => setEditingRoute({ ...editingRoute, pattern: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 font-mono focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Prioridade</label>
                  <input
                    type="number"
                    min={1}
                    max={99}
                    value={editingRoute.priority}
                    onChange={(e) => setEditingRoute({ ...editingRoute, priority: Number(e.target.value) })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 font-mono focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              {editingRoute.type === "outbound" && (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-slate-700 font-semibold mb-1">Tronco Primário</label>
                      <select
                        value={editingRoute.trunkId || ""}
                        onChange={(e) => setEditingRoute({ ...editingRoute, trunkId: e.target.value })}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:border-blue-500"
                      >
                        {trunks.map((t) => (
                          <option key={t.id} value={t.id}>
                            {t.name} ({t.providerName})
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-slate-700 font-semibold mb-1">Tronco de Contingência (LCR)</label>
                      <select
                        value={editingRoute.failoverTrunkId || ""}
                        onChange={(e) => setEditingRoute({ ...editingRoute, failoverTrunkId: e.target.value || undefined })}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:border-blue-500"
                      >
                        <option value="">Nenhum (Sem contingência)</option>
                        {trunks.map((t) => (
                          <option key={t.id} value={t.id}>
                            {t.name} ({t.host})
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-slate-700 font-semibold mb-1">Remover Prefixo (Strip)</label>
                      <input
                        type="text"
                        value={editingRoute.prefixRemove || ""}
                        onChange={(e) => setEditingRoute({ ...editingRoute, prefixRemove: e.target.value })}
                        placeholder="Ex: 0"
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 font-mono focus:outline-none focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-700 font-semibold mb-1">Adicionar Prefixo (Prepend)</label>
                      <input
                        type="text"
                        value={editingRoute.prepend || ""}
                        onChange={(e) => setEditingRoute({ ...editingRoute, prepend: e.target.value })}
                        placeholder="Ex: 015 ou 021"
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 font-mono focus:outline-none focus:border-blue-500"
                      />
                    </div>
                  </div>

                  {/* CLI / ITX CallerID Configuration for Edit Modal */}
                  <div className="p-4 bg-amber-50/70 border border-amber-200 rounded-xl space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Radio className="w-4 h-4 text-amber-600" />
                        <div>
                          <span className="text-xs font-bold text-amber-950 block">
                            Interconexão CLI / ITX (BINA Aberta)
                          </span>
                          <span className="text-[10px] text-amber-800">
                            Permite enviar CallerID personalizado por ramal para a operadora
                          </span>
                        </div>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={!!editingRoute.isCliItx}
                          onChange={(e) =>
                            setEditingRoute({
                              ...editingRoute,
                              isCliItx: e.target.checked,
                              callerIdMode: editingRoute.callerIdMode || 'per_extension',
                              extensionOverrides: editingRoute.extensionOverrides || [],
                            })
                          }
                          className="sr-only peer"
                        />
                        <div className="w-9 h-5 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-amber-600" />
                      </label>
                    </div>

                    {editingRoute.isCliItx && (
                      <div className="pt-3 border-t border-amber-200/80 space-y-3">
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="text-[11px] font-semibold text-amber-950 block mb-1">
                              Modo de Resolução de CallerID
                            </label>
                            <select
                              value={editingRoute.callerIdMode || 'per_extension'}
                              onChange={(e) =>
                                setEditingRoute({ ...editingRoute, callerIdMode: e.target.value as any })
                              }
                              className="w-full bg-white border border-amber-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 focus:outline-none"
                            >
                              <option value="per_extension">Dinâmico (BINA CLI do Ramal → Fallback da Rota)</option>
                              <option value="forced_route">Fixo da Rota (Aplica BINA fixa a todos os ramais)</option>
                              <option value="passthrough">Pass-through (Mantém identificador original do ramal)</option>
                            </select>
                          </div>
                          <div>
                            <label className="text-[11px] font-semibold text-amber-950 block mb-1">
                              CallerID Fallback da Rota
                            </label>
                            <input
                              type="text"
                              value={editingRoute.callerIdOverride || ''}
                              onChange={(e) =>
                                setEditingRoute({ ...editingRoute, callerIdOverride: e.target.value })
                              }
                              placeholder="Ex: 1135008000"
                              className="w-full bg-white border border-amber-300 rounded-lg px-2.5 py-1.5 text-xs font-mono text-slate-800 focus:outline-none"
                            />
                          </div>
                        </div>

                        {/* Extension Overrides List */}
                        <div className="space-y-2 pt-2 border-t border-amber-200/60">
                          <div className="flex items-center justify-between">
                            <span className="text-[11px] font-bold text-amber-950">
                              Sobrescritas Específicas por Ramal nesta Rota (Prioridade 1)
                            </span>
                            <span className="text-[10px] text-amber-800">
                              {(editingRoute.extensionOverrides || []).length} ramal(is) com BINA dedicada
                            </span>
                          </div>

                          {/* Add override row */}
                          <div className="flex items-center gap-2">
                            <select
                              value={editOverrideExt}
                              onChange={(e) => setEditOverrideExt(e.target.value)}
                              className="w-2/5 bg-white border border-amber-300 rounded-lg px-2 py-1.5 text-xs text-slate-800 font-mono"
                            >
                              <option value="">Selecione o Ramal...</option>
                              {extensions.map((ext) => (
                                <option key={ext.id} value={ext.number}>
                                  {ext.number} - {ext.name}
                                </option>
                              ))}
                            </select>
                            <input
                              type="text"
                              value={editOverrideCallerId}
                              onChange={(e) => setEditOverrideCallerId(e.target.value)}
                              placeholder="BINA nesta rota (ex: 1135008010)"
                              className="flex-1 bg-white border border-amber-300 rounded-lg px-2 py-1.5 text-xs font-mono text-slate-800"
                            />
                            <input
                              type="text"
                              value={editOverrideLabel}
                              onChange={(e) => setEditOverrideLabel(e.target.value)}
                              placeholder="Rótulo (opcional)"
                              className="w-1/4 bg-white border border-amber-300 rounded-lg px-2 py-1.5 text-xs text-slate-800"
                            />
                            <button
                              type="button"
                              onClick={() => {
                                if (!editOverrideExt || !editOverrideCallerId) return;
                                const currentList = editingRoute.extensionOverrides || [];
                                setEditingRoute({
                                  ...editingRoute,
                                  extensionOverrides: [
                                    ...currentList.filter((o) => o.extensionNumber !== editOverrideExt),
                                    {
                                      extensionNumber: editOverrideExt,
                                      callerId: editOverrideCallerId.trim(),
                                      label: editOverrideLabel.trim() || undefined,
                                    },
                                  ],
                                });
                                setEditOverrideExt('');
                                setEditOverrideCallerId('');
                                setEditOverrideLabel('');
                              }}
                              className="px-2.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold transition shrink-0"
                            >
                              Adicionar
                            </button>
                          </div>

                          {(editingRoute.extensionOverrides || []).length > 0 && (
                            <div className="bg-white rounded-lg border border-amber-200 divide-y divide-amber-100 max-h-36 overflow-y-auto">
                              {editingRoute.extensionOverrides!.map((ov, idx) => (
                                <div key={idx} className="px-3 py-1.5 flex items-center justify-between text-xs">
                                  <div className="flex items-center gap-2 font-mono">
                                    <span className="font-bold text-slate-900">Ramal {ov.extensionNumber}</span>
                                    <ArrowRight className="w-3 h-3 text-amber-600" />
                                    <span className="text-amber-800 font-bold bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                                      {ov.callerId}
                                    </span>
                                    {ov.label && (
                                      <span className="text-slate-500 font-sans text-[10px]">({ov.label})</span>
                                    )}
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setEditingRoute({
                                        ...editingRoute,
                                        extensionOverrides: editingRoute.extensionOverrides!.filter((_, i) => i !== idx),
                                      })
                                    }
                                    className="text-rose-600 hover:text-rose-800 text-[11px] font-semibold"
                                  >
                                    Remover
                                  </button>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </>
              )}

              {editingRoute.type === "inbound" && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">Tipo de Destino</label>
                    <select
                      value={editingRoute.destinationType}
                      onChange={(e) =>
                        setEditingRoute({
                          ...editingRoute,
                          destinationType: e.target.value as any,
                        })
                      }
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:border-blue-500"
                    >
                      <option value="ai_agent">Agente IA Gemini (MaIA)</option>
                      <option value="ivr">URA / Menu Interativo</option>
                      <option value="queue">Fila de Atendimento</option>
                      <option value="extension">Ramal Direto</option>
                      <option value="ring_group">Grupo de Toque</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">ID / Ramal Destino</label>
                    <input
                      type="text"
                      value={editingRoute.destinationId}
                      onChange={(e) => setEditingRoute({ ...editingRoute, destinationId: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 font-mono focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>
              )}

              {/* Time Conditions Section */}
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-amber-600" />
                    <span className="text-xs font-bold text-slate-800">
                      Regra de Horário Comercial (Time Conditions)
                    </span>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={!!editingRoute.timeConditionEnabled}
                      onChange={(e) =>
                        setEditingRoute({
                          ...editingRoute,
                          timeConditionEnabled: e.target.checked,
                          timeSchedule: editingRoute.timeSchedule || {
                            startHour: '08:00',
                            endHour: '18:00',
                            daysOfWeek: [1, 2, 3, 4, 5],
                            outOfHoursDestinationType: 'ai_agent',
                            outOfHoursDestinationId: 'agent-maia-247',
                          },
                        })
                      }
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600" />
                  </label>
                </div>

                {editingRoute.timeConditionEnabled && (
                  <div className="pt-2 border-t border-slate-200 space-y-2 text-xs">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-[11px] font-semibold text-slate-600 block mb-1">
                          Início do Expediente
                        </label>
                        <input
                          type="time"
                          value={editingRoute.timeSchedule?.startHour || '08:00'}
                          onChange={(e) =>
                            setEditingRoute({
                              ...editingRoute,
                              timeSchedule: {
                                ...(editingRoute.timeSchedule || {
                                  startHour: '08:00',
                                  endHour: '18:00',
                                  daysOfWeek: [1, 2, 3, 4, 5],
                                  outOfHoursDestinationType: 'ai_agent',
                                  outOfHoursDestinationId: 'agent-maia-247',
                                }),
                                startHour: e.target.value,
                              },
                            })
                          }
                          className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-800"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] font-semibold text-slate-600 block mb-1">
                          Término do Expediente
                        </label>
                        <input
                          type="time"
                          value={editingRoute.timeSchedule?.endHour || '18:00'}
                          onChange={(e) =>
                            setEditingRoute({
                              ...editingRoute,
                              timeSchedule: {
                                ...(editingRoute.timeSchedule || {
                                  startHour: '08:00',
                                  endHour: '18:00',
                                  daysOfWeek: [1, 2, 3, 4, 5],
                                  outOfHoursDestinationType: 'ai_agent',
                                  outOfHoursDestinationId: 'agent-maia-247',
                                }),
                                endHour: e.target.value,
                              },
                            })
                          }
                          className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-800"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-[11px] font-semibold text-slate-600 block mb-1">
                        Destino Fora do Horário Comercial
                      </label>
                      <select
                        value={editingRoute.timeSchedule?.outOfHoursDestinationType || 'ai_agent'}
                        onChange={(e) =>
                          setEditingRoute({
                            ...editingRoute,
                            timeSchedule: {
                              ...(editingRoute.timeSchedule || {
                                startHour: '08:00',
                                endHour: '18:00',
                                daysOfWeek: [1, 2, 3, 4, 5],
                                outOfHoursDestinationType: 'ai_agent',
                                outOfHoursDestinationId: 'agent-maia-247',
                              }),
                              outOfHoursDestinationType: e.target.value as any,
                            },
                          })
                        }
                        className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-800"
                      >
                        <option value="ai_agent">Atendimento IA MaIA (24/7 Noturno)</option>
                        <option value="ivr">URA / Mensagem de Fora de Expediente</option>
                        <option value="extension">Caixa Postal / Ramal de Plantão</option>
                      </select>
                    </div>
                  </div>
                )}
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingRoute(null)}
                  className="px-4 py-2 text-slate-600 hover:text-slate-900"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold transition disabled:opacity-50"
                >
                  {isSubmitting ? "Salvando..." : "Salvar Alterações"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

