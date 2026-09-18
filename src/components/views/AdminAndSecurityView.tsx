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
  ShieldOff,
  Crosshair,
  Database,
  Zap,
  Fingerprint,
  FileText,
  FileCode,
} from 'lucide-react';
import { User, Tenant, AuditLog, HealthStatus, Extension } from '../../types/pbx';

interface AdminAndSecurityViewProps {
  users: User[];
  tenants: Tenant[];
  extensions?: Extension[];
  auditLogs: AuditLog[];
  health: HealthStatus | null;
  activeSubTab?: 'users' | 'tenants' | 'audit_logs' | 'health_check' | 'anti_fraud';
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
  const [currentTab, setCurrentTab] = useState<'users' | 'tenants' | 'audit_logs' | 'health_check' | 'anti_fraud'>(activeSubTab);

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
  const [auditCategoryFilter, setAuditCategoryFilter] = useState('ALL');
  const [auditSeverityFilter, setAuditSeverityFilter] = useState('ALL');
  const [isVerifyingIntegrity, setIsVerifyingIntegrity] = useState(false);
  const [integrityResult, setIntegrityResult] = useState<{
    status: string;
    verified: boolean;
    totalChecked: number;
    tamperedCount: number;
    algorithm: string;
    message: string;
    timestamp: string;
  } | null>(null);

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

  // Export LGPD Audit Logs to CSV with SHA-256 and Category
  const handleExportLgpdCsv = () => {
    const headers = ['ID', 'Data/Hora', 'Usuário', 'Ação', 'Categoria', 'Severidade', 'Recurso', 'Endereço IP', 'Detalhes', 'Hash SHA-256 (Cadeia de Custódia)'];
    const rows = filteredLogs.map((l) => [
      `"${l.id}"`,
      `"${new Date(l.timestamp).toLocaleString('pt-BR')}"`,
      `"${l.userName}"`,
      `"${l.action}"`,
      `"${l.category || 'GERAL'}"`,
      `"${l.severity || 'INFO'}"`,
      `"${l.resource}"`,
      `"${l.ip}"`,
      `"${l.details.replace(/"/g, '""')}"`,
      `"${l.hashSha256 || 'N/A'}"`,
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

  // Export Syslog RFC 5424 formatted for SIEM (Splunk, Elastic, QRadar)
  const handleExportSyslog = async () => {
    try {
      const res = await fetch('/api/v1/audit-logs?format=syslog');
      const text = await res.text();
      const blob = new Blob([text], { type: 'text/plain;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `enlace_pbx_syslog_rfc5424_${new Date().toISOString().slice(0, 10)}.log`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error('Erro ao exportar syslog:', err);
    }
  };

  // Verify SHA-256 forensic integrity / chain-of-custody
  const handleVerifyIntegrity = async () => {
    setIsVerifyingIntegrity(true);
    try {
      const res = await fetch('/api/v1/audit-logs/verify-integrity', { method: 'POST' });
      const data = await res.json();
      setIntegrityResult(data);
    } catch (err) {
      console.error('Erro na verificação de integridade:', err);
    } finally {
      setIsVerifyingIntegrity(false);
    }
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
        log.details.toLowerCase().includes(auditSearch.toLowerCase()) ||
        (log.hashSha256 && log.hashSha256.toLowerCase().includes(auditSearch.toLowerCase()));

      const matchesAction = auditActionFilter === 'ALL' || log.action === auditActionFilter;
      const matchesCategory = auditCategoryFilter === 'ALL' || log.category === auditCategoryFilter;
      const matchesSeverity = auditSeverityFilter === 'ALL' || log.severity === auditSeverityFilter;

      return matchesText && matchesAction && matchesCategory && matchesSeverity;
    });
  }, [auditLogs, auditSearch, auditActionFilter, auditCategoryFilter, auditSeverityFilter]);

  // Unique actions list for dropdown
  const uniqueActions = useMemo(() => {
    return Array.from(new Set(auditLogs.map((l) => l.action)));
  }, [auditLogs]);

  // Unique categories list for dropdown
  const uniqueCategories = useMemo(() => {
    return Array.from(new Set(auditLogs.map((l) => l.category).filter(Boolean)));
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
            id="tab-anti-fraud-btn"
            onClick={() => setCurrentTab('anti_fraud')}
            className={`px-4 py-3 rounded-xl text-sm font-bold transition flex items-center justify-between group ${
              currentTab === 'anti_fraud'
                ? 'bg-purple-600 text-white shadow-md shadow-purple-600/20'
                : 'bg-white text-slate-600 hover:bg-purple-50 hover:text-purple-600 border border-slate-200'
            }`}
          >
            <ShieldOff className="w-3.5 h-3.5" />
            Motor Anti-Fraude
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
        <div className="space-y-6">
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 text-sm text-amber-900 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 shadow-sm relative overflow-hidden">
            <div className="absolute top-0 right-0 w-48 h-48 bg-amber-500/10 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none" />
            <div className="flex items-start gap-4 relative z-10">
              <div className="p-2.5 bg-amber-100 rounded-xl text-amber-600 flex-shrink-0">
                <ShieldAlert className="w-6 h-6" />
              </div>
              <div>
                <strong className="font-bold text-base block mb-1 text-amber-900">
                  Auditoria Forense & Conformidade LGPD (Art. 37) / NIST FIPS 180-4
                </strong>
                <p className="text-amber-800/80 leading-relaxed max-w-3xl text-xs">
                  Acessos a CDR, alterações de rotas Asterisk, comandos SIP e chamadas de IA possuem hashes criptográficos SHA-256 encadeados. Compatível com ingestão SIEM em formato RFC 5424 (Splunk, Elastic, QRadar).
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 relative z-10">
              <button
                id="verify-integrity-btn"
                onClick={handleVerifyIntegrity}
                disabled={isVerifyingIntegrity}
                className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 transition shadow-sm disabled:opacity-50 whitespace-nowrap"
              >
                <Fingerprint className={`w-4 h-4 ${isVerifyingIntegrity ? 'animate-spin' : ''}`} />
                {isVerifyingIntegrity ? 'Verificando...' : 'Verificar Cadeia SHA-256'}
              </button>
              <button
                id="export-syslog-btn"
                onClick={handleExportSyslog}
                className="px-4 py-2.5 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 transition shadow-sm whitespace-nowrap"
              >
                <FileCode className="w-4 h-4 text-emerald-400" />
                Syslog (RFC 5424)
              </button>
              <button
                id="export-lgpd-btn"
                onClick={handleExportLgpdCsv}
                className="px-4 py-2.5 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 transition shadow-sm shadow-amber-600/20 whitespace-nowrap"
              >
                <Download className="w-4 h-4" />
                Exportar CSV
              </button>
            </div>
          </div>

          {/* Cryptographic Integrity Result Card */}
          {integrityResult && (
            <div className={`p-4 rounded-2xl border flex items-center justify-between text-xs transition animate-fade-in ${
              integrityResult.verified
                ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                : 'bg-rose-50 border-rose-200 text-rose-900'
            }`}>
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-xl ${integrityResult.verified ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                  {integrityResult.verified ? <CheckCircle2 className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
                </div>
                <div>
                  <div className="font-bold text-sm">
                    {integrityResult.verified
                      ? 'Selo Criptográfico Válido — Cadeia de Custódia Intacta'
                      : 'Alerta de Violação de Integridade Forense'}
                  </div>
                  <div className="text-[11px] opacity-80 mt-0.5 font-mono">
                    {integrityResult.totalChecked} registros validados • 0 corrupções • Algoritmo: {integrityResult.algorithm} • {new Date(integrityResult.timestamp).toLocaleTimeString('pt-BR')}
                  </div>
                </div>
              </div>
              <button
                onClick={() => setIntegrityResult(null)}
                className="p-1 rounded-lg hover:bg-black/5 text-slate-500"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
             <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
                <div className="flex items-center gap-2 text-slate-500 mb-2">
                   <Activity className="w-4 h-4 text-blue-500" />
                   <span className="text-[11px] font-bold uppercase tracking-wider">Eventos Hoje</span>
                </div>
                <div className="text-2xl font-black text-slate-900">{auditLogs.length}</div>
             </div>
             <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
                <div className="flex items-center gap-2 text-slate-500 mb-2">
                   <Download className="w-4 h-4 text-purple-500" />
                   <span className="text-[11px] font-bold uppercase tracking-wider">Downloads / Exportações</span>
                </div>
                <div className="text-2xl font-black text-slate-900">
                  {auditLogs.filter(l => l.action.includes('EXPORT') || l.action.includes('DOWNLOAD')).length}
                </div>
             </div>
             <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
                <div className="flex items-center gap-2 text-slate-500 mb-2">
                   <Fingerprint className="w-4 h-4 text-emerald-500" />
                   <span className="text-[11px] font-bold uppercase tracking-wider">Hashes Criptográficos</span>
                </div>
                <div className="text-2xl font-black text-slate-900 font-mono text-emerald-600">
                  {auditLogs.filter(l => l.hashSha256).length} <span className="text-xs text-slate-400 font-sans">/ 100%</span>
                </div>
             </div>
             <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
                <div className="flex items-center gap-2 text-slate-500 mb-2">
                   <AlertCircle className="w-4 h-4 text-rose-500" />
                   <span className="text-[11px] font-bold uppercase tracking-wider">Avisos / Críticos</span>
                </div>
                <div className="text-2xl font-black text-slate-900">
                  {auditLogs.filter(l => l.severity === 'CRITICAL' || l.severity === 'WARNING').length}
                </div>
             </div>
          </div>

          {/* Search, Filter & Table */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
            <div className="p-4 border-b border-slate-100 flex flex-col md:flex-row items-center justify-between gap-3 bg-slate-50/50">
              <div className="flex flex-1 flex-wrap items-center gap-2.5 w-full">
                <div className="relative flex-1 min-w-[200px]">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Filtrar por usuário, recurso, IP, hash SHA-256..."
                    value={auditSearch}
                    onChange={(e) => setAuditSearch(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-blue-500 font-sans shadow-sm"
                  />
                </div>

                <select
                  value={auditActionFilter}
                  onChange={(e) => setAuditActionFilter(e.target.value)}
                  className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-700 focus:outline-none focus:border-blue-500 font-mono shadow-sm cursor-pointer"
                >
                  <option value="ALL">Todas as Ações ({auditLogs.length})</option>
                  {uniqueActions.map((act) => (
                    <option key={act} value={act}>
                      {act}
                    </option>
                  ))}
                </select>

                <select
                  value={auditCategoryFilter}
                  onChange={(e) => setAuditCategoryFilter(e.target.value)}
                  className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-700 focus:outline-none focus:border-blue-500 font-mono shadow-sm cursor-pointer"
                >
                  <option value="ALL">Todas as Categorias</option>
                  {uniqueCategories.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>

                <select
                  value={auditSeverityFilter}
                  onChange={(e) => setAuditSeverityFilter(e.target.value)}
                  className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-700 focus:outline-none focus:border-blue-500 font-mono shadow-sm cursor-pointer"
                >
                  <option value="ALL">Severidade: Todas</option>
                  <option value="INFO">INFO</option>
                  <option value="WARNING">WARNING</option>
                  <option value="CRITICAL">CRITICAL</option>
                </select>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-100 bg-white text-slate-400 font-mono text-[10px] uppercase tracking-wider">
                    <th className="py-3 px-4 font-bold">Data / Hora</th>
                    <th className="py-3 px-4 font-bold">Usuário</th>
                    <th className="py-3 px-4 font-bold">Ação & Categoria</th>
                    <th className="py-3 px-4 font-bold">Severidade</th>
                    <th className="py-3 px-4 font-bold">Recurso</th>
                    <th className="py-3 px-4 font-bold">IP Origem</th>
                    <th className="py-3 px-4 font-bold">Hash SHA-256 (Custódia)</th>
                    <th className="py-3 px-4 font-bold">Detalhes Técnicos</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 font-sans">
                  {filteredLogs.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center">
                        <div className="flex flex-col items-center justify-center text-slate-400">
                          <Search className="w-8 h-8 mb-3 opacity-20" />
                          <p className="text-sm font-medium">Nenhum registro de auditoria encontrado.</p>
                          <p className="text-xs mt-1">Tente ajustar seus filtros de busca.</p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filteredLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-slate-50/80 transition-colors group">
                        <td className="py-3.5 px-4 font-mono text-slate-500 text-[11px] whitespace-nowrap">
                          {new Date(log.timestamp).toLocaleString('pt-BR')}
                        </td>
                        <td className="py-3.5 px-4 font-bold text-slate-800 text-xs whitespace-nowrap">
                          {log.userName}
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="flex flex-col gap-1 items-start">
                            <span className={`font-mono text-[10px] uppercase font-bold px-2 py-0.5 rounded border ${
                              log.action.includes('DELETE') ? 'bg-rose-50 text-rose-700 border-rose-200' :
                              log.action.includes('DOWNLOAD') || log.action.includes('EXPORT') ? 'bg-purple-50 text-purple-700 border-purple-200' :
                              log.action.includes('UPDATE') ? 'bg-amber-50 text-amber-700 border-amber-200' :
                              'bg-slate-100 text-slate-700 border-slate-200'
                            }`}>
                              {log.action}
                            </span>
                            {log.category && (
                              <span className="font-mono text-[9px] text-slate-400 uppercase tracking-wider">
                                {log.category}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold font-mono border ${
                            log.severity === 'CRITICAL'
                              ? 'bg-rose-100 text-rose-800 border-rose-300'
                              : log.severity === 'WARNING'
                              ? 'bg-amber-100 text-amber-800 border-amber-300'
                              : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          }`}>
                            {log.severity || 'INFO'}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-slate-600 font-mono text-xs whitespace-nowrap">
                          {log.resource}
                        </td>
                        <td className="py-3.5 px-4 font-mono text-blue-600/80 text-xs font-medium whitespace-nowrap">
                          {log.ip}
                        </td>
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          {log.hashSha256 ? (
                            <span
                              className="font-mono text-[10px] text-slate-600 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded flex items-center gap-1 max-w-[140px] truncate"
                              title={`Hash SHA-256 Forense: ${log.hashSha256}`}
                            >
                              <Fingerprint className="w-3 h-3 text-emerald-600 shrink-0" />
                              {log.hashSha256.slice(0, 10)}...
                            </span>
                          ) : (
                            <span className="text-[10px] text-slate-400 font-mono">Assinatura Legado</span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-slate-500 text-xs max-w-xs truncate group-hover:text-slate-800 transition-colors" title={log.details}>
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

      {currentTab === 'anti_fraud' && (
        <div className="flex-1 space-y-6">
          <div className="bg-purple-900 border border-purple-800 rounded-2xl p-5 text-sm text-purple-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-lg shadow-purple-900/20 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-fuchsia-500/20 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none" />
            <div className="absolute bottom-0 left-20 w-48 h-48 bg-blue-500/20 rounded-full blur-3xl -ml-20 -mb-20 pointer-events-none" />
            
            <div className="flex items-start gap-4 relative z-10">
              <div className="p-3 bg-purple-800/50 rounded-xl text-fuchsia-400 flex-shrink-0 border border-purple-700/50 shadow-inner">
                <ShieldOff className="w-6 h-6" />
              </div>
              <div>
                <strong className="font-bold text-base block mb-1 text-white">
                  Motor Anti-Fraude & Prevenção de Toll Fraud
                </strong>
                <p className="text-purple-200/80 leading-relaxed max-w-3xl text-xs">
                  O PBX utiliza heurística comportamental para bloquear picos anômalos de chamadas internacionais (DDI), números premium (0900/0300) e ataques de força bruta no registro SIP (Fail2Ban).
                </p>
              </div>
            </div>
            <button className="px-5 py-2.5 bg-fuchsia-600 hover:bg-fuchsia-500 text-white font-bold rounded-xl text-sm flex items-center gap-2 transition shadow-md shadow-fuchsia-600/30 whitespace-nowrap relative z-10">
              <Crosshair className="w-4 h-4" />
              Auditoria de Ameaças
            </button>
          </div>

          {/* Quick Metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Ameaças Bloqueadas (24h)</div>
              <div className="flex items-end gap-2">
                <span className="text-2xl font-black text-slate-800">12</span>
                <span className="text-xs font-bold text-emerald-500 mb-1">seguro</span>
              </div>
            </div>
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">IPs em Quarentena</div>
              <div className="flex items-end gap-2">
                <span className="text-2xl font-black text-slate-800">145</span>
                <span className="text-xs font-bold text-rose-500 mb-1">Fail2Ban</span>
              </div>
            </div>
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Tentativas SIP Inválidas</div>
              <div className="flex items-end gap-2">
                <span className="text-2xl font-black text-slate-800">3,490</span>
                <span className="text-xs font-bold text-slate-400 mb-1">requests</span>
              </div>
            </div>
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Status da Heurística</div>
              <div className="flex items-end gap-2">
                <span className="text-2xl font-black text-emerald-600">Ativo</span>
                <span className="text-xs font-bold text-emerald-500 mb-1 flex items-center"><CheckCircle2 className="w-3 h-3 ml-1" /></span>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between mt-8 mb-4">
            <h3 className="text-lg font-bold text-slate-800">Regras por Empresa (Tenant)</h3>
            <span className="text-xs font-bold text-slate-500 bg-slate-100 px-3 py-1 rounded-full">{tenants.length} tenants</span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {tenants.map(tenant => (
              <div key={tenant.id} className="bg-white rounded-3xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group flex flex-col h-full">
                {/* Visual Header */}
                <div className="p-6 border-b border-slate-100 flex justify-between items-start bg-slate-50/50">
                  <div className="flex gap-3">
                     <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-600 flex items-center justify-center shrink-0">
                        <Building className="w-5 h-5" />
                     </div>
                     <div>
                        <h3 className="font-bold text-slate-900 text-base leading-tight">{tenant.name}</h3>
                        <p className="text-[11px] text-slate-500 font-mono mt-0.5">TENANT_ID: {tenant.id}</p>
                     </div>
                  </div>
                  <span className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border uppercase tracking-wider flex items-center gap-1.5 ${tenant.antiFraud?.autoSuspendOnAnomaly ? 'bg-emerald-50 text-emerald-700 border-emerald-200 shadow-sm shadow-emerald-500/10' : 'bg-slate-100 text-slate-500 border-slate-200'}`}>
                    {tenant.antiFraud?.autoSuspendOnAnomaly && <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />}
                    {tenant.antiFraud?.autoSuspendOnAnomaly ? 'Auto-Bloqueio Ativo' : 'Somente Alertas'}
                  </span>
                </div>

                {/* Body Content */}
                <div className="p-6 flex-1 flex flex-col gap-6">
                  {tenant.antiFraud ? (
                    <>
                      {/* Operational Limits */}
                      <div>
                        <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-3">Limites Operacionais</h4>
                        <div className="grid grid-cols-2 gap-3">
                          <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex justify-between items-center">
                            <span className="text-xs font-bold text-slate-600">Max Chamadas Simul.</span>
                            <span className="font-mono font-black text-slate-800 bg-white px-2 py-0.5 rounded shadow-sm border border-slate-200">{tenant.antiFraud.maxConcurrentCalls}</span>
                          </div>
                          <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex justify-between items-center">
                            <span className="text-xs font-bold text-slate-600">Duração Max (Min)</span>
                            <span className="font-mono font-black text-slate-800 bg-white px-2 py-0.5 rounded shadow-sm border border-slate-200">{tenant.antiFraud.maxCallDurationMinutes}</span>
                          </div>
                        </div>
                      </div>

                      {/* International & Premium */}
                      <div>
                        <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-3">Destinos Sensíveis & DDI</h4>
                        <div className="bg-rose-50/50 border border-rose-100 rounded-xl p-1 divide-y divide-rose-100/50">
                          <div className="flex items-center justify-between p-3">
                            <span className="text-xs font-bold text-rose-900 flex items-center gap-2">
                              <Crosshair className="w-3.5 h-3.5 text-rose-500" />
                              Bloquear Ligações DDI
                            </span>
                            {tenant.antiFraud.blockInternational ? (
                              <span className="bg-rose-500 text-white text-[10px] font-bold px-2 py-0.5 rounded uppercase shadow-sm">Ativo</span>
                            ) : (
                              <span className="bg-slate-200 text-slate-500 text-[10px] font-bold px-2 py-0.5 rounded uppercase">Inativo</span>
                            )}
                          </div>
                          <div className="flex items-center justify-between p-3">
                            <span className="text-xs font-bold text-rose-900 flex items-center gap-2">
                              <Crosshair className="w-3.5 h-3.5 text-rose-500" />
                              Bloquear Premium (0900)
                            </span>
                            {tenant.antiFraud.blockExpensiveDestinations ? (
                              <span className="bg-rose-500 text-white text-[10px] font-bold px-2 py-0.5 rounded uppercase shadow-sm">Ativo</span>
                            ) : (
                              <span className="bg-slate-200 text-slate-500 text-[10px] font-bold px-2 py-0.5 rounded uppercase">Inativo</span>
                            )}
                          </div>
                          <div className="flex items-center justify-between p-3">
                            <span className="text-xs font-bold text-rose-900 ml-5">
                              Teto de DDI / Dia
                            </span>
                            <span className="font-mono font-black text-rose-700 bg-white px-2 py-0.5 rounded shadow-sm border border-rose-200 text-xs">
                              {tenant.antiFraud.maxInternationalPerDay} reqs
                            </span>
                          </div>
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="flex-1 flex flex-col items-center justify-center bg-slate-50 rounded-xl border border-dashed border-slate-200 p-6 text-center">
                      <ShieldOff className="w-8 h-8 text-slate-300 mb-2" />
                      <p className="text-sm font-bold text-slate-700">Sem regras anti-fraude</p>
                      <p className="text-xs text-slate-500 mt-1">Este tenant está utilizando o limite padrão do sistema.</p>
                    </div>
                  )}
                </div>
                
                {/* Footer Action */}
                <div className="p-4 bg-slate-50/50 border-t border-slate-100 flex justify-end mt-auto">
                  <button className="px-4 py-2 bg-white border border-slate-200 hover:border-purple-600 hover:text-purple-700 text-slate-700 rounded-xl text-xs font-bold transition-all flex items-center gap-2 shadow-sm">
                    <Edit3 className="w-3.5 h-3.5" />
                    Ajustar Parâmetros
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 4. HEALTH CHECK TAB */}
      {currentTab === 'health_check' && (
        <div className="flex-1 space-y-6">
          {/* Premium Header */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 text-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-lg shadow-slate-900/20 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none" />
            <div className="absolute bottom-0 left-20 w-48 h-48 bg-blue-500/10 rounded-full blur-3xl -ml-20 -mb-20 pointer-events-none" />
            
            <div className="flex items-start gap-4 relative z-10">
              <div className="p-3 bg-slate-800/80 rounded-xl text-emerald-400 flex-shrink-0 border border-slate-700/50 shadow-inner">
                <Activity className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <strong className="font-bold text-base block text-white">
                    Monitor de Telemetria e Diagnóstico Ativo
                  </strong>
                  <span className="text-[9px] font-mono bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded shadow-sm font-bold uppercase tracking-wider">
                    SLA 99.99%
                  </span>
                </div>
                <p className="text-slate-400 leading-relaxed max-w-3xl text-xs">
                  Acompanhe a saúde operacional do cluster em tempo real. Monitore o motor Asterisk 20, pontes de mídia AudioSocket e as rotas de inferência do Google Gemini.
                </p>
              </div>
            </div>
            
            <button
              id="run-diagnostic-btn"
              onClick={handleRunDiagnostic}
              disabled={isRunningDiagnostic}
              className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-sm flex items-center gap-2 transition shadow-md shadow-emerald-600/30 whitespace-nowrap relative z-10 disabled:opacity-70 disabled:cursor-not-allowed"
            >
              <RefreshCw className={`w-4 h-4 ${isRunningDiagnostic ? 'animate-spin' : ''}`} />
              {isRunningDiagnostic ? 'Testando Malha...' : 'Executar Diagnóstico do Núcleo'}
            </button>
          </div>

          {/* Diagnostic results modal/card if available */}
          {diagnosticData && (
            <div className="bg-white rounded-2xl border border-emerald-200 shadow-sm p-5 space-y-4 animate-in fade-in slide-in-from-top-4 duration-300">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center">
                    <CheckCircle2 className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-sm font-bold text-slate-900 block">
                      Relatório de Conectividade ({diagnosticData.overallHealth})
                    </span>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      Latência End-to-End validada
                    </span>
                  </div>
                </div>
                <span className="text-xs font-mono font-bold text-slate-400 bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-100">
                  {new Date(diagnosticData.timestamp).toLocaleTimeString('pt-BR')}
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {diagnosticData.diagnostics.map((d, i) => (
                  <div key={i} className="bg-slate-50 p-3 rounded-xl border border-slate-100 flex items-center justify-between">
                    <div>
                      <div className="text-xs font-bold text-slate-800">{d.name}</div>
                      <div className="text-[10px] text-slate-500 truncate max-w-[120px]">{d.details}</div>
                    </div>
                    <div className="text-right flex-shrink-0 ml-3">
                      <span className="text-xs font-mono font-black text-slate-700 bg-white px-2 py-0.5 rounded shadow-sm border border-slate-200 block mb-1">{d.pingMs} ms</span>
                      <span className="block text-[10px] font-bold text-emerald-600 uppercase tracking-wider">{d.status}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Components Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {health?.components &&
              Object.entries(health.components).map(([key, val]: [string, any]) => {
                // Determine icons based on service name
                let Icon = Server;
                let bgClass = "bg-blue-100 text-blue-600";
                
                if (key === 'geminiApi' || key.includes('ai')) { Icon = Sparkles; bgClass = "bg-indigo-100 text-indigo-600"; }
                if (key === 'asterisk' || key.includes('sip')) { Icon = Radio; bgClass = "bg-orange-100 text-orange-600"; }
                if (key === 'database' || key.includes('db')) { Icon = Database; bgClass = "bg-emerald-100 text-emerald-600"; }
                if (key === 'audioSocket') { Icon = Zap; bgClass = "bg-fuchsia-100 text-fuchsia-600"; }

                return (
                <div
                  key={key}
                  className="bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow flex flex-col h-full overflow-hidden group"
                >
                  <div className="p-5 border-b border-slate-100 bg-slate-50/50 flex justify-between items-start">
                     <div className="flex gap-3 items-center">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-inner ${bgClass}`}>
                           <Icon className="w-5 h-5" />
                        </div>
                        <div>
                           <div className="text-sm font-bold text-slate-900 capitalize leading-tight">
                              {key === 'geminiApi'
                                ? 'Google Gemini AI'
                                : key === 'audioSocket'
                                ? 'AudioSocket 24kHz'
                                : key}
                           </div>
                           <span className="text-[10px] font-mono text-slate-400 uppercase font-bold mt-0.5 block">
                              Service Worker
                           </span>
                        </div>
                     </div>
                     <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse mt-1 shadow-sm shadow-emerald-500/50" />
                  </div>
                  
                  <div className="p-5 flex-1 flex flex-col justify-end bg-white">
                    <div className="space-y-2.5">
                      <div className="flex justify-between items-center text-xs">
                        <span className="font-bold text-slate-500 uppercase tracking-wider text-[10px]">Status</span>
                        <span className="font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100">{val.status}</span>
                      </div>
                      
                      {val.version && (
                        <div className="flex justify-between items-center text-xs">
                          <span className="font-bold text-slate-500 uppercase tracking-wider text-[10px]">Version</span>
                          <span className="font-mono text-slate-700 font-bold">{val.version}</span>
                        </div>
                      )}
                      
                      {val.model && (
                        <div className="flex justify-between items-center text-xs">
                          <span className="font-bold text-slate-500 uppercase tracking-wider text-[10px]">Model</span>
                          <span className="font-mono text-indigo-600 font-bold bg-indigo-50 px-1.5 py-0.5 rounded text-[10px] border border-indigo-100">{val.model}</span>
                        </div>
                      )}
                      
                      {val.latencyMs !== undefined && (
                        <div className="flex justify-between items-center text-xs">
                          <span className="font-bold text-slate-500 uppercase tracking-wider text-[10px]">Latência</span>
                          <span className="font-mono text-slate-700 font-bold">{val.latencyMs} ms</span>
                        </div>
                      )}
                      
                      {val.port && (
                        <div className="flex justify-between items-center text-xs">
                          <span className="font-bold text-slate-500 uppercase tracking-wider text-[10px]">Porta</span>
                          <span className="font-mono text-slate-700 font-bold">{val.port}</span>
                        </div>
                      )}
                      
                      {val.uptime && (
                        <div className="flex justify-between items-center text-xs">
                          <span className="font-bold text-slate-500 uppercase tracking-wider text-[10px]">Uptime</span>
                          <span className="font-mono text-slate-700 font-bold">{val.uptime}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )})}
          </div>
        </div>
      )}
      </div>

      {/* MODAL: ADICIONAR / EDITAR USUÁRIO */}
      {isUserModalOpen && (
        <div className="fixed inset-0 z-50 bg-[#0f172a]/40 backdrop-blur-sm flex items-center justify-center p-4">
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
        <div className="fixed inset-0 z-50 bg-[#0f172a]/40 backdrop-blur-sm flex items-center justify-center p-4">
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
    </div>
  );
};
