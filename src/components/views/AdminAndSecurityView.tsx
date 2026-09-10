import React, { useState } from 'react';
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
} from 'lucide-react';
import { User, Tenant, AuditLog, HealthStatus } from '../../types/pbx';

interface AdminAndSecurityViewProps {
  users: User[];
  tenants: Tenant[];
  auditLogs: AuditLog[];
  health: HealthStatus | null;
  activeSubTab?: 'users' | 'tenants' | 'audit_logs' | 'health_check';
}

export const AdminAndSecurityView: React.FC<AdminAndSecurityViewProps> = ({
  users,
  tenants,
  auditLogs,
  health,
  activeSubTab = 'users',
}) => {
  const [currentTab, setCurrentTab] = useState<'users' | 'tenants' | 'audit_logs' | 'health_check'>(activeSubTab);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-xl font-black text-slate-800 tracking-tight">
              Administração, Segurança & Conformidade LGPD
            </h1>
            <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-mono">
              RBAC • Multi-Tenant • Auditoria Imutável
            </span>
          </div>
          <p className="text-xs text-slate-400">
            Controle de acessos, perfis de usuários, isolamento de dados por empresa e rastreabilidade de acessos a dados sensíveis.
          </p>
        </div>

        {/* Sub Navigation */}
        <div className="flex bg-white p-1 rounded-xl border border-slate-200 self-start overflow-x-auto">
          <button
            onClick={() => setCurrentTab('users')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition flex items-center gap-1.5 ${
              currentTab === 'users'
                ? 'bg-blue-600 text-white shadow'
                : 'text-slate-400 hover:text-slate-700'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            Usuários & Perfis ({users.length})
          </button>
          <button
            onClick={() => setCurrentTab('tenants')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition flex items-center gap-1.5 ${
              currentTab === 'tenants'
                ? 'bg-blue-600 text-white shadow'
                : 'text-slate-400 hover:text-slate-700'
            }`}
          >
            <Building className="w-3.5 h-3.5" />
            Empresas ({tenants.length})
          </button>
          <button
            onClick={() => setCurrentTab('audit_logs')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition flex items-center gap-1.5 ${
              currentTab === 'audit_logs'
                ? 'bg-blue-600 text-white shadow'
                : 'text-slate-400 hover:text-slate-700'
            }`}
          >
            <ShieldAlert className="w-3.5 h-3.5" />
            Auditoria LGPD ({auditLogs.length})
          </button>
          <button
            onClick={() => setCurrentTab('health_check')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition flex items-center gap-1.5 ${
              currentTab === 'health_check'
                ? 'bg-blue-600 text-white shadow'
                : 'text-slate-400 hover:text-slate-700'
            }`}
          >
            <HeartPulse className="w-3.5 h-3.5" />
            Diagnóstico do Sistema
          </button>
        </div>
      </div>

      {/* 1. USERS TAB */}
      {currentTab === 'users' && (
        <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/50 text-slate-400 font-mono text-[11px] uppercase">
                  <th className="py-3 px-4">Nome</th>
                  <th className="py-3 px-4">E-mail</th>
                  <th className="py-3 px-4">Perfil (RBAC)</th>
                  <th className="py-3 px-4">Ramal Vinculado</th>
                  <th className="py-3 px-4">Último Login</th>
                  <th className="py-3 px-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-sans">
                {users.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-50 transition">
                    <td className="py-3.5 px-4 font-semibold text-slate-700">
                      {u.name}
                    </td>
                    <td className="py-3.5 px-4 font-mono text-slate-400 text-[11px]">
                      {u.email}
                    </td>
                    <td className="py-3.5 px-4 capitalize">
                      <span
                        className={`px-2.5 py-0.5 rounded text-[10px] font-bold font-mono uppercase ${
                          u.role === 'super_admin'
                            ? 'bg-purple-950 text-purple-300 border border-purple-800'
                            : u.role === 'admin'
                            ? 'bg-sky-950 text-blue-700 border border-sky-800'
                            : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {u.role.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-mono text-slate-600">
                      {u.extension ? `Ramal ${u.extension}` : '-'}
                    </td>
                    <td className="py-3.5 px-4 text-slate-400 text-[11px] font-mono">
                      {new Date(u.lastLogin).toLocaleString('pt-BR')}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="text-blue-600 text-[11px] font-semibold flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Ativo
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 2. TENANTS TAB */}
      {currentTab === 'tenants' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {tenants.map((t) => (
            <div
              key={t.id}
              className="bg-white rounded-2xl border border-slate-100 p-5 space-y-4"
            >
              <div className="flex items-center justify-between">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-sky-950 text-blue-700 border border-sky-800">
                  {t.plan}
                </span>
                <span className="text-xs text-slate-400 font-mono">ID: {t.id}</span>
              </div>

              <div>
                <h3 className="font-bold text-slate-800 text-base">{t.name}</h3>
                <p className="text-xs text-slate-400 font-mono mt-0.5">CNPJ: {t.cnpj}</p>
              </div>

              <div className="grid grid-cols-3 gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200 text-center font-mono">
                <div>
                  <span className="text-[10px] text-slate-400 block uppercase">Ramais Máx.</span>
                  <span className="text-slate-700 font-bold text-sm">{t.maxExtensions}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block uppercase">Troncos Máx.</span>
                  <span className="text-slate-700 font-bold text-sm">{t.maxTrunks}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block uppercase">Créditos IA</span>
                  <span className="text-blue-600 font-bold text-sm">${t.aiCreditsUsd}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 3. AUDIT LOGS LGPD */}
      {currentTab === 'audit_logs' && (
        <div className="space-y-4">
          <div className="bg-amber-950/20 border border-amber-800/40 rounded-2xl p-4 text-xs text-amber-200/90 flex items-start gap-3">
            <ShieldAlert className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
            <div>
              <strong className="font-bold block mb-0.5 text-amber-300">
                Conformidade com a Lei Geral de Proteção de Dados (LGPD - Lei 13.709/2018):
              </strong>
              Todos os acessos a gravações de áudio, downloads de transcrições, exclusões e alterações de prompts dos agentes de IA são registrados com endereço IP e timestamp imutável.
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/50 text-slate-400 font-mono text-[11px] uppercase">
                    <th className="py-3 px-4">Data / Hora</th>
                    <th className="py-3 px-4">Usuário</th>
                    <th className="py-3 px-4">Ação</th>
                    <th className="py-3 px-4">Recurso</th>
                    <th className="py-3 px-4">Endereço IP</th>
                    <th className="py-3 px-4">Detalhes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-sans">
                  {auditLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-50 transition">
                      <td className="py-3.5 px-4 font-mono text-slate-400 text-[11px] whitespace-nowrap">
                        {new Date(log.timestamp).toLocaleString('pt-BR')}
                      </td>
                      <td className="py-3.5 px-4 font-semibold text-slate-700">
                        {log.userName}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="font-mono text-[10px] uppercase font-bold bg-slate-100 px-2 py-0.5 rounded text-slate-600">
                          {log.action}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-slate-600 font-mono text-[11px]">
                        {log.resource}
                      </td>
                      <td className="py-3.5 px-4 font-mono text-blue-600 text-[11px]">
                        {log.ip}
                      </td>
                      <td className="py-3.5 px-4 text-slate-400 text-xs">
                        {log.details}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 4. HEALTH CHECK TAB */}
      {currentTab === 'health_check' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {health?.components &&
              Object.entries(health.components).map(([key, val]: [string, any]) => (
                <div
                  key={key}
                  className="bg-white p-5 rounded-2xl border border-slate-100 space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono text-slate-400 uppercase font-bold">
                      {key}
                    </span>
                    <span className="w-2 h-2 rounded-full bg-sky-400 animate-pulse" />
                  </div>

                  <div className="text-base font-bold text-slate-800 capitalize">
                    {key === 'geminiApi' ? 'Google Gemini AI' : key}
                  </div>

                  <div className="pt-2 border-t border-slate-200 text-xs font-mono text-slate-400 space-y-1">
                    <div>Status: <span className="text-blue-600 font-bold">{val.status}</span></div>
                    {val.version && <div>Versão: <span className="text-slate-700">{val.version}</span></div>}
                    {val.model && <div>Modelo: <span className="text-teal-600">{val.model}</span></div>}
                    {val.latencyMs && <div>Latência: <span className="text-slate-700">{val.latencyMs}ms</span></div>}
                    {val.port && <div>Porta: <span className="text-slate-700">{val.port}</span></div>}
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
};
