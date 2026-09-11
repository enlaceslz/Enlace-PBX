import React, { useState, useMemo, useEffect } from 'react';
import {
  Users,
  ShieldCheck,
  Building,
  HeartPulse,
  Lock,
  CheckCircle2,
  AlertCircle,
  Clock,
  Server,
  Activity,
  ShieldAlert,
  Sparkles,
  Plus,
  Trash2,
  Edit3,
  Download,
  Search,
  RefreshCw,
  X,
  Check,
  Cpu,
  Radio,
  FileSpreadsheet,
} from 'lucide-react';
import { User, Tenant, AuditLog, HealthStatus, Extension } from '../../types/pbx';

interface AdminAndSecurityViewProps {
  users: User[];
  tenants: Tenant[];
  extensions?: Extension[];
  auditLogs: AuditLog[];
  health: HealthStatus | null;
  activeSubTab?: 'users' | 'tenants' | 'audit_logs' | 'health_check';
  onRefresh?: () => void;
}

export const AdminAndSecurityView: React.FC<AdminAndSecurityViewProps> = ({
  users,
  tenants,
  extensions = [],
  auditLogs,
  health,
  activeSubTab = 'users',
  onRefresh,
}) => {
  const [currentTab, setCurrentTab] = useState<'users' | 'tenants' | 'audit_logs' | 'health_check'>(activeSubTab);

  useEffect(() => {
    if (activeSubTab) {
      setCurrentTab(activeSubTab);
    }
  }, [activeSubTab]);

  // User management modals
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [userFormData, setUserFormData] = useState({
    name: '',
    email: '',
    role: 'operador' as User['role'],
    extension: '',
    tenantId: 'tenant-enlace-matriz',
  });

  // Tenant management modal
  const [isTenantModalOpen, setIsTenantModalOpen] = useState(false);
  const [tenantFormData, setTenantFormData] = useState({
    name: '',
    cnpj: '',
    plan: 'Enterprise Voice & AI Pro',
    maxExtensions: 100,
    maxTrunks: 16,
    aiCreditsUsd: 1000,
  });

  // Audit search & filter
  const [auditSearch, setAuditSearch] = useState('');
  const [auditActionFilter, setAuditActionFilter] = useState('ALL');

  // Diagnostic running state
  const [isRunningDiagnostic, setIsRunningDiagnostic] = useState(false);
  const [diagnosticData, setDiagnosticData] = useState<{
    timestamp: string;
    testedBy: string;
    overallHealth: string;
    diagnostics: Array<{ name: string; pingMs: number; status: string; details: string }>;
  } | null>(null);

  // Open modal to create or edit user
  const handleOpenUserModal = (user?: User) => {
    if (user) {
      setEditingUser(user);
      setUserFormData({
        name: user.name,
        email: user.email,
        role: user.role,
        extension: user.extension || '',
        tenantId: user.tenantId,
      });
    } else {
      setEditingUser(null);
      setUserFormData({
        name: '',
        email: '',
        role: 'operador',
        extension: '',
        tenantId: tenants[0]?.id || 'tenant-enlace-matriz',
      });
    }
    setIsUserModalOpen(true);
  };

  const handleSaveUser = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingUser) {
        await fetch(`/api/v1/users/${editingUser.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(userFormData),
        });
      } else {
        await fetch('/api/v1/users', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(userFormData),
        });
      }
      setIsUserModalOpen(false);
      onRefresh?.();
    } catch (err) {
      console.error('Error saving user:', err);
    }
  };

  const handleDeleteUser = async (id: string, name: string) => {
    if (!confirm(`Confirma a exclusão do usuário ${name}? Esta ação é irreversível e ficará registrada no log da LGPD.`)) {
      return;
    }
    try {
      await fetch(`/api/v1/users/${id}`, { method: 'DELETE' });
      onRefresh?.();
    } catch (err) {
      console.error('Error deleting user:', err);
    }
  };

  const handleSaveTenant = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await fetch('/api/v1/tenants', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(tenantFormData),
      });
      setIsTenantModalOpen(false);
      onRefresh?.();
    } catch (err) {
      console.error('Error saving tenant:', err);
    }
  };

  // Run full system diagnostic
  const handleRunDiagnostic = async () => {
    setIsRunningDiagnostic(true);
    try {
      const res = await fetch('/api/v1/health/run-diagnostic', { method: 'POST' });
      const data = await res.json();
      setDiagnosticData(data);
    } catch (err) {
      console.error('Diagnostic error:', err);
    } finally {
      setIsRunningDiagnostic(false);
    }
  };

  // Export LGPD Audit Logs to CSV
  const handleExportLgpdCsv = () => {
    const headers = ['ID', 'Data/Hora', 'Usuário', 'Ação', 'Recurso', 'Endereço IP', 'Detalhes'];
    const rows = filteredLogs.map((l) => [
      `"${l.id}"`,
      `"${new Date(l.timestamp).toLocaleString('pt-BR')}"`,
      `"${l.userName}"`,
      `"${l.action}"`,
      `"${l.resource}"`,
      `"${l.ip}"`,
      `"${l.details.replace(/"/g, '""')}"`,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(';'), ...rows.map((r) => r.join(';'))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `relatorio_auditoria_lgpd_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Filtered audit logs
  const filteredLogs = useMemo(() => {
    return auditLogs.filter((log) => {
      const matchesText =
        auditSearch === '' ||
        log.userName.toLowerCase().includes(auditSearch.toLowerCase()) ||
        log.action.toLowerCase().includes(auditSearch.toLowerCase()) ||
        log.resource.toLowerCase().includes(auditSearch.toLowerCase()) ||
        log.ip.includes(auditSearch) ||
        log.details.toLowerCase().includes(auditSearch.toLowerCase());

      const matchesAction = auditActionFilter === 'ALL' || log.action === auditActionFilter;

      return matchesText && matchesAction;
    });
  }, [auditLogs, auditSearch, auditActionFilter]);

  // Unique actions list for dropdown
  const uniqueActions = useMemo(() => {
    return Array.from(new Set(auditLogs.map((l) => l.action)));
  }, [auditLogs]);

  return (
    <div className="max-w-[1400px] mx-auto space-y-8 pb-12">
      {/* Premium Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-6">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
            <ShieldCheck className="w-8 h-8 text-blue-600 fill-blue-600" />
            Administração, Segurança & LGPD
          </h1>
          <p className="text-sm font-medium text-slate-500 mt-1">
            Controle de acessos (RBAC), isolamento Multi-Tenant e rastreabilidade imutável de acessos sensíveis.
          </p>
        </div>
        
        <div className="flex items-center gap-3">
            <span className="px-3 py-1.5 bg-blue-50 text-blue-700 border border-blue-200 rounded-lg text-xs font-black uppercase tracking-wider flex items-center gap-2 shadow-sm">
              <Lock className="w-4 h-4 text-blue-500" /> RBAC
            </span>
            <span className="px-3 py-1.5 bg-slate-800 text-white border border-slate-700 rounded-lg text-xs font-black uppercase tracking-wider flex items-center gap-2 shadow-sm">
              <ShieldAlert className="w-4 h-4 text-emerald-400" /> Auditoria Imutável
            </span>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-8">
        
        {/* Sub Navigation Sidebar */}
        <div className="lg:w-64 shrink-0 flex flex-col gap-2">
          <div className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2 px-2">Central de Governança</div>
          
          <button
            id="tab-users-btn"
            onClick={() => setCurrentTab('users')}
            className={`px-4 py-3 rounded-xl text-sm font-bold transition flex items-center justify-between group ${
              currentTab === 'users'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
                : 'bg-white text-slate-600 hover:bg-slate-50 hover:text-blue-600 border border-slate-200'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            Usuários & Perfis ({users.length})
          </button>
          <button
            id="tab-tenants-btn"
            onClick={() => setCurrentTab('tenants')}
            className={`px-4 py-3 rounded-xl text-sm font-bold transition flex items-center justify-between group ${
              currentTab === 'tenants'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
                : 'bg-white text-slate-600 hover:bg-slate-50 hover:text-blue-600 border border-slate-200'
            }`}
          >
            <Building className="w-3.5 h-3.5" />
            Empresas ({tenants.length})
          </button>
          <button
            id="tab-audit-btn"
            onClick={() => setCurrentTab('audit_logs')}
            className={`px-4 py-3 rounded-xl text-sm font-bold transition flex items-center justify-between group ${
              currentTab === 'audit_logs'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
                : 'bg-white text-slate-600 hover:bg-slate-50 hover:text-blue-600 border border-slate-200'
            }`}
          >
            <ShieldAlert className="w-3.5 h-3.5" />
            Auditoria LGPD ({auditLogs.length})
          </button>
          <button
            id="tab-health-btn"
            onClick={() => setCurrentTab('health_check')}
            className={`px-4 py-3 rounded-xl text-sm font-bold transition flex items-center justify-between group mt-4 ${
              currentTab === 'health_check'
                ? 'bg-rose-600 text-white shadow-md shadow-rose-600/20'
                : 'bg-white text-slate-600 hover:bg-rose-50 hover:text-rose-600 border border-slate-200'
            }`}
          >
            <HeartPulse className="w-3.5 h-3.5" />
            Diagnóstico do Sistema
          </button>
        </div>
        
        {/* Main Content Area */}
        <div className="flex-1 min-w-0">

      {/* 1. USERS TAB */}
      {currentTab === 'users' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
            <div>
              <h2 className="text-sm font-bold text-slate-900">Perfis de Acesso (RBAC) & Operadores</h2>
              <p className="text-xs text-slate-500">
                Gerencie credenciais corporativas, níveis de autorização e ramais associados para cada membro da equipe.
              </p>
            </div>
            <button
              id="add-user-btn"
              onClick={() => handleOpenUserModal()}
              className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs flex items-center gap-2 shadow-sm transition active:scale-95 whitespace-nowrap"
            >
              <Plus className="w-3.5 h-3.5" />
              Adicionar Novo Usuário
            </button>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/50 text-slate-500 font-mono text-[11px] uppercase">
                    <th className="py-3 px-4">Nome</th>
                    <th className="py-3 px-4">E-mail</th>
                    <th className="py-3 px-4">Perfil (RBAC)</th>
                    <th className="py-3 px-4">Ramal Vinculado</th>
                    <th className="py-3 px-4">Último Login</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-sans">
                  {users.map((u) => (
                    <tr key={u.id} className="hover:bg-slate-50 transition">
                      <td className="py-3.5 px-4 font-semibold text-slate-800">
                        {u.name}
                      </td>
                      <td className="py-3.5 px-4 font-mono text-slate-500 text-[11px]">
                        {u.email}
                      </td>
                      <td className="py-3.5 px-4 capitalize">
                        <span
                          className={`px-2.5 py-0.5 rounded text-[10px] font-bold font-mono uppercase ${
                            u.role === 'super_admin'
                              ? 'bg-purple-100 text-purple-800 border border-purple-200'
                              : u.role === 'admin'
                              ? 'bg-blue-100 text-blue-800 border border-blue-200'
                              : u.role === 'supervisor'
                              ? 'bg-amber-100 text-amber-800 border border-amber-200'
                              : 'bg-slate-100 text-slate-700 border border-slate-200'
                          }`}
                        >
                          {u.role.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 font-mono text-slate-700">
                        {u.extension ? (
                          <span className="inline-flex items-center gap-1 font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded">
                            Ramal {u.extension}
                          </span>
                        ) : (
                          <span className="text-slate-400">-</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-slate-500 text-[11px] font-mono">
                        {new Date(u.lastLogin).toLocaleString('pt-BR')}
                      </td>
                      <td className="py-3.5 px-4">
                        {u.isActive ? (
                          <span className="text-blue-600 text-[11px] font-semibold flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Ativo
                          </span>
                        ) : (
                          <span className="text-rose-500 text-[11px] font-semibold flex items-center gap-1">
                            <AlertCircle className="w-3.5 h-3.5" /> Bloqueado
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleOpenUserModal(u)}
                            className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-slate-100 rounded-lg transition"
                            title="Editar Usuário"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteUser(u.id, u.name)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                            title="Excluir Usuário"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 2. TENANTS TAB */}
      {currentTab === 'tenants' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
            <div>
              <h2 className="text-sm font-bold text-slate-900">Empresas e Sub-Contas Multi-Tenant</h2>
              <p className="text-xs text-slate-500">
                Isolamento estrito de bilhetagem, dialplan, troncos dedicados e quotas de Inteligência Artificial por cliente corporativo.
              </p>
            </div>
            <button
              id="add-tenant-btn"
              onClick={() => setIsTenantModalOpen(true)}
              className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs flex items-center gap-2 shadow-sm transition active:scale-95 whitespace-nowrap"
            >
              <Plus className="w-3.5 h-3.5" />
              Adicionar Nova Empresa
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {tenants.map((t) => (
              <div
                key={t.id}
                className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-4 flex flex-col justify-between"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-blue-50 text-blue-700 border border-blue-200">
                      {t.plan}
                    </span>
                    <span className="text-xs text-slate-400 font-mono">ID: {t.id}</span>
                  </div>

                  <div>
                    <h3 className="font-bold text-slate-900 text-base">{t.name}</h3>
                    <p className="text-xs text-slate-500 font-mono mt-0.5">CNPJ: {t.cnpj}</p>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200 text-center font-mono">
                  <div>
                    <span className="text-[10px] text-slate-500 block uppercase">Ramais Máx.</span>
                    <span className="text-slate-800 font-bold text-sm">{t.maxExtensions}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 block uppercase">Troncos Máx.</span>
                    <span className="text-slate-800 font-bold text-sm">{t.maxTrunks}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 block uppercase">Créditos IA</span>
                    <span className="text-blue-600 font-bold text-sm">${t.aiCreditsUsd.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 3. AUDIT LOGS LGPD */}
      {currentTab === 'audit_logs' && (
        <div className="space-y-4">
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-xs text-amber-900 flex items-start gap-3 shadow-sm">
            <ShieldAlert className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <strong className="font-bold block mb-0.5 text-amber-800">
                Conformidade com a Lei Geral de Proteção de Dados (LGPD - Lei 13.709/2018):
              </strong>
              Todos os acessos a gravações de áudio, downloads de transcrições, exclusões e alterações de prompts dos agentes de IA são registrados com endereço IP e timestamp imutável para prestação de contas aos encarregados de dados (DPO).
            </div>
          </div>

          {/* Search, Filter & Export Toolbar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
            <div className="flex flex-1 items-center gap-3 w-full sm:w-auto">
              <div className="relative flex-1 max-w-sm">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Filtrar por usuário, IP ou recurso..."
                  value={auditSearch}
                  onChange={(e) => setAuditSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-blue-500 font-sans"
                />
              </div>

              <select
                value={auditActionFilter}
                onChange={(e) => setAuditActionFilter(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-700 focus:outline-none focus:border-blue-500 font-mono"
              >
                <option value="ALL">Todas as Ações ({auditLogs.length})</option>
                {uniqueActions.map((act) => (
                  <option key={act} value={act}>
                    {act}
                  </option>
                ))}
              </select>
            </div>

            <button
              id="export-lgpd-btn"
              onClick={handleExportLgpdCsv}
              className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs flex items-center gap-2 transition active:scale-95 whitespace-nowrap border border-slate-200"
            >
              <Download className="w-3.5 h-3.5 text-slate-600" />
              Exportar Relatório LGPD (.CSV)
            </button>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/50 text-slate-500 font-mono text-[11px] uppercase">
                    <th className="py-3 px-4">Data / Hora</th>
                    <th className="py-3 px-4">Usuário</th>
                    <th className="py-3 px-4">Ação</th>
                    <th className="py-3 px-4">Recurso</th>
                    <th className="py-3 px-4">Endereço IP</th>
                    <th className="py-3 px-4">Detalhes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-sans">
                  {filteredLogs.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-slate-400">
                        Nenhum registro de auditoria corresponde aos filtros selecionados.
                      </td>
                    </tr>
                  ) : (
                    filteredLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-slate-50 transition">
                        <td className="py-3.5 px-4 font-mono text-slate-500 text-[11px] whitespace-nowrap">
                          {new Date(log.timestamp).toLocaleString('pt-BR')}
                        </td>
                        <td className="py-3.5 px-4 font-semibold text-slate-800">
                          {log.userName}
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="font-mono text-[10px] uppercase font-bold bg-slate-100 px-2 py-0.5 rounded text-slate-700 border border-slate-200">
                            {log.action}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-slate-700 font-mono text-[11px]">
                          {log.resource}
                        </td>
                        <td className="py-3.5 px-4 font-mono text-blue-600 text-[11px]">
                          {log.ip}
                        </td>
                        <td className="py-3.5 px-4 text-slate-600 text-xs max-w-md truncate" title={log.details}>
                          {log.details}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 4. HEALTH CHECK TAB */}
      {currentTab === 'health_check' && (
        <div className="space-y-6">
          {/* Header with Run Diagnostic Button */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h2 className="text-base font-bold text-slate-900">Monitor de Telemetria e Diagnóstico Ativo</h2>
                <span className="text-[10px] font-mono bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-full font-bold">
                  SLA 99.98%
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Verifique o estado de comunicação entre o motor Asterisk 20, canais AudioSocket, banco de dados e APIs do Google Gemini.
              </p>
            </div>

            <button
              id="run-diagnostic-btn"
              onClick={handleRunDiagnostic}
              disabled={isRunningDiagnostic}
              className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs flex items-center gap-2 shadow-sm transition active:scale-95 disabled:opacity-50 whitespace-nowrap"
            >
              <RefreshCw className={`w-4 h-4 ${isRunningDiagnostic ? 'animate-spin' : ''}`} />
              {isRunningDiagnostic ? 'Testando Conexões...' : 'Executar Diagnóstico do Núcleo'}
            </button>
          </div>

          {/* Diagnostic results modal/card if available */}
          {diagnosticData && (
            <div className="bg-white rounded-2xl border border-blue-200 shadow-sm p-5 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                  <span className="text-sm font-bold text-slate-900">
                    Resultado do Teste de Conectividade ({diagnosticData.overallHealth})
                  </span>
                </div>
                <span className="text-xs font-mono text-slate-400">
                  Executado em: {new Date(diagnosticData.timestamp).toLocaleTimeString('pt-BR')}
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {diagnosticData.diagnostics.map((d, i) => (
                  <div key={i} className="bg-slate-50 p-3 rounded-xl border border-slate-200 flex items-center justify-between">
                    <div>
                      <div className="text-xs font-bold text-slate-800">{d.name}</div>
                      <div className="text-[11px] text-slate-500">{d.details}</div>
                    </div>
                    <div className="text-right flex-shrink-0 ml-3">
                      <span className="text-xs font-mono font-bold text-blue-600">{d.pingMs} ms</span>
                      <span className="block text-[10px] font-bold text-emerald-600">{d.status}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Components Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {health?.components &&
              Object.entries(health.components).map(([key, val]: [string, any]) => (
                <div
                  key={key}
                  className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3 flex flex-col justify-between"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-mono text-slate-400 uppercase font-bold">
                        {key}
                      </span>
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    </div>

                    <div className="text-base font-bold text-slate-900 capitalize">
                      {key === 'geminiApi'
                        ? 'Google Gemini AI'
                        : key === 'audioSocket'
                        ? 'AudioSocket 24kHz'
                        : key}
                    </div>
                  </div>

                  <div className="pt-3 border-t border-slate-100 text-xs font-mono text-slate-600 space-y-1">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Status:</span>
                      <span className="text-blue-600 font-bold">{val.status}</span>
                    </div>
                    {val.version && (
                      <div className="flex justify-between">
                        <span className="text-slate-400">Versão:</span>
                        <span className="text-slate-700">{val.version}</span>
                      </div>
                    )}
                    {val.model && (
                      <div className="flex justify-between">
                        <span className="text-slate-400">Modelo:</span>
                        <span className="text-indigo-600 font-bold">{val.model}</span>
                      </div>
                    )}
                    {val.latencyMs && (
                      <div className="flex justify-between">
                        <span className="text-slate-400">Latência:</span>
                        <span className="text-slate-700 font-bold">{val.latencyMs} ms</span>
                      </div>
                    )}
                    {val.port && (
                      <div className="flex justify-between">
                        <span className="text-slate-400">Porta:</span>
                        <span className="text-slate-700">{val.port}</span>
                      </div>
                    )}
                    {val.uptime && (
                      <div className="flex justify-between">
                        <span className="text-slate-400">Uptime:</span>
                        <span className="text-slate-700">{val.uptime}</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

      </div>
      </div>
      {/* MODAL: ADICIONAR / EDITAR USUÁRIO */}
      {isUserModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  {editingUser ? 'Editar Usuário' : 'Novo Usuário do Sistema'}
                </h3>
                <p className="text-xs text-slate-500">Defina credenciais e controle de acesso RBAC</p>
              </div>
              <button
                onClick={() => setIsUserModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveUser} className="p-6 space-y-4 text-xs">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">Nome Completo *</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Ana Clara Ribeiro"
                  value={userFormData.name}
                  onChange={(e) => setUserFormData({ ...userFormData, name: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:border-blue-600"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">E-mail Corporativo *</label>
                <input
                  type="email"
                  required
                  placeholder="Ex: ana.ribeiro@empresa.com.br"
                  value={userFormData.email}
                  onChange={(e) => setUserFormData({ ...userFormData, email: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:border-blue-600"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Perfil (RBAC) *</label>
                  <select
                    value={userFormData.role}
                    onChange={(e) => setUserFormData({ ...userFormData, role: e.target.value as any })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:border-blue-600"
                  >
                    <option value="super_admin">Super Administrador</option>
                    <option value="admin">Administrador VoIP</option>
                    <option value="supervisor">Supervisor de Atendimento</option>
                    <option value="operador">Operador de Telefonia</option>
                    <option value="auditor">Auditor LGPD</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Ramal PJSIP Vinculado</label>
                  <select
                    value={userFormData.extension}
                    onChange={(e) => setUserFormData({ ...userFormData, extension: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 font-mono focus:outline-none focus:border-blue-600"
                  >
                    <option value="">Nenhum Ramal</option>
                    {extensions.map((ext) => (
                      <option key={ext.id} value={ext.number}>
                        {ext.number} - {ext.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsUserModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition"
                >
                  {editingUser ? 'Salvar Alterações' : 'Criar Usuário'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: ADICIONAR EMPRESA (TENANT) */}
      {isTenantModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Provisionar Nova Empresa Multi-Tenant</h3>
                <p className="text-xs text-slate-500">Crie um ambiente isolado para novo cliente</p>
              </div>
              <button
                onClick={() => setIsTenantModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveTenant} className="p-6 space-y-4 text-xs">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">Razão Social / Nome Fantasia *</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Cooperativa de Crédito Vale Verde"
                  value={tenantFormData.name}
                  onChange={(e) => setTenantFormData({ ...tenantFormData, name: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:border-blue-600"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">CNPJ *</label>
                  <input
                    type="text"
                    required
                    placeholder="00.000.000/0001-00"
                    value={tenantFormData.cnpj}
                    onChange={(e) => setTenantFormData({ ...tenantFormData, cnpj: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 font-mono focus:outline-none focus:border-blue-600"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Plano Comercial</label>
                  <select
                    value={tenantFormData.plan}
                    onChange={(e) => setTenantFormData({ ...tenantFormData, plan: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:border-blue-600"
                  >
                    <option value="Enterprise Voice & AI Pro">Enterprise Voice & AI Pro</option>
                    <option value="Contact Center Standard">Contact Center Standard</option>
                    <option value="Healthcare PBX">Healthcare PBX</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Ramais Máx.</label>
                  <input
                    type="number"
                    value={tenantFormData.maxExtensions}
                    onChange={(e) => setTenantFormData({ ...tenantFormData, maxExtensions: Number(e.target.value) })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 font-mono focus:outline-none focus:border-blue-600"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Troncos Máx.</label>
                  <input
                    type="number"
                    value={tenantFormData.maxTrunks}
                    onChange={(e) => setTenantFormData({ ...tenantFormData, maxTrunks: Number(e.target.value) })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 font-mono focus:outline-none focus:border-blue-600"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Créditos IA ($)</label>
                  <input
                    type="number"
                    value={tenantFormData.aiCreditsUsd}
                    onChange={(e) => setTenantFormData({ ...tenantFormData, aiCreditsUsd: Number(e.target.value) })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 font-mono focus:outline-none focus:border-blue-600"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsTenantModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition"
                >
                  Salvar Empresa
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
