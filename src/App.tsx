import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ShieldAlert } from 'lucide-react';
import { Navbar } from './components/Navbar';
import { Sidebar, ActiveView, checkAccess } from './components/Sidebar';
import { UserRole } from './types/pbx';
import { WebphoneModal } from './components/WebphoneModal';
import { DashboardView } from './components/views/DashboardView';
import { OperationDashboardView } from './components/views/OperationDashboardView';
import { OmnichannelView } from './components/views/OmnichannelView';
import { CrmContactsView } from "./components/views/CrmContactsView";
import { CrmHubView } from './components/views/CrmHubView';
import { CampaignsView } from './components/views/CampaignsView';
import { QuickSetupView } from './components/views/QuickSetupView';
import { BillingView } from './components/views/BillingView';
import { ExtensionsView } from './components/views/ExtensionsView';
import { TrunksView } from './components/views/TrunksView';
import { RoutesView } from './components/views/RoutesView';
import { QueuesAndGroupsView } from './components/views/QueuesAndGroupsView';
import { IvrView } from './components/views/IvrView';
import { MediaManagerView } from './components/views/MediaManagerView';
import { CdrAndRecordingsView } from './components/views/CdrAndRecordingsView';
import { AiGatewayView } from './components/views/AiGatewayView';
import { AsteriskCoreView } from './components/views/AsteriskCoreView';
import { NetworkSecurityView } from './components/views/NetworkSecurityView';
import { InfraSettingsView } from './components/views/InfraSettingsView';
import { SystemLogsView } from './components/views/SystemLogsView';
import { AdminAndSecurityView } from './components/views/AdminAndSecurityView';
import { HealthCheckView } from './components/views/HealthCheckView';
import { SettingsView } from './components/views/SettingsView';
import { HelpManualView } from './components/views/HelpManualView';
import { BackupRestoreView } from './components/views/BackupRestoreView';
import { LoginView } from './components/views/LoginView';
import {
  Tenant,
  User,
  Extension,
  Trunk,
  Route,
  Queue,
  RingGroup,
  Ivr,
  AiProvider,
  AiAgent,
  AiTool,
  AiKnowledgeSource,
  AiSession,
  CdrRecord,
  DashboardMetrics,
  AsteriskChannel,
  AuditLog,
  HealthStatus,
} from './types/pbx';

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(!!localStorage.getItem('enlace_jwt'));
  const [authToken, setAuthToken] = useState<string | null>(localStorage.getItem('enlace_jwt'));

  const [activeView, setActiveView] = useState<ActiveView>('dashboard');
  const [userRole, setUserRole] = useState<UserRole>('super_admin');
  const [isWebphoneOpen, setIsWebphoneOpen] = useState(false);
  const [webphoneTarget, setWebphoneTarget] = useState<string>('');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Core Data States
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [currentTenant, setCurrentTenant] = useState<Tenant | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [channels, setChannels] = useState<AsteriskChannel[]>([]);
  const [extensions, setExtensions] = useState<Extension[]>([]);
  const [trunks, setTrunks] = useState<Trunk[]>([]);
  const [routes, setRoutes] = useState<Route[]>([]);
  const [queues, setQueues] = useState<Queue[]>([]);
  const [ringGroups, setRingGroups] = useState<RingGroup[]>([]);
  const [ivrs, setIvrs] = useState<Ivr[]>([]);
  const [cdrs, setCdrs] = useState<CdrRecord[]>([]);
  const [aiAgents, setAiAgents] = useState<AiAgent[]>([]);
  const [aiProviders, setAiProviders] = useState<AiProvider[]>([]);
  const [aiTools, setAiTools] = useState<AiTool[]>([]);
  const [aiKnowledge, setAiKnowledge] = useState<AiKnowledgeSource[]>([]);
  const [aiSessions, setAiSessions] = useState<AiSession[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [health, setHealth] = useState<HealthStatus | null>(null);

  const [loading, setLoading] = useState(true);

  const loadAllData = useCallback(async () => {
    try {
      const fetchWithAuth = (url: string) => fetch(url, {
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      }).then(r => r.json());

      const [
        metricsRes,
        tenantsRes,
        usersRes,
        channelsRes,
        extensionsRes,
        trunksRes,
        routesRes,
        queuesRes,
        ringGroupsRes,
        ivrsRes,
        cdrsRes,
        agentsRes,
        providersRes,
        toolsRes,
        knowledgeRes,
        sessionsRes,
        auditRes,
        healthRes,
      ] = await Promise.all([
        fetchWithAuth('/api/v1/dashboard/metrics'),
        fetchWithAuth('/api/v1/tenants'),
        fetchWithAuth('/api/v1/users'),
        fetchWithAuth('/api/v1/asterisk/channels'),
        fetchWithAuth('/api/v1/extensions'),
        fetchWithAuth('/api/v1/trunks'),
        fetchWithAuth('/api/v1/routes'),
        fetchWithAuth('/api/v1/queues'),
        fetchWithAuth('/api/v1/ring-groups'),
        fetchWithAuth('/api/v1/ivr'),
        fetchWithAuth('/api/v1/cdr'),
        fetchWithAuth('/api/v1/ai/agents'),
        fetchWithAuth('/api/v1/ai/providers'),
        fetchWithAuth('/api/v1/ai/tools'),
        fetchWithAuth('/api/v1/ai/knowledge'),
        fetchWithAuth('/api/v1/ai/sessions'),
        fetchWithAuth('/api/v1/audit-logs'),
        fetchWithAuth('/api/v1/health'),
      ]);

      setMetrics(metricsRes);
      setTenants(tenantsRes);
      if (tenantsRes.length > 0 && !currentTenant) {
        setCurrentTenant(tenantsRes[0]);
      }
      setUsers(usersRes);
      if (usersRes.length > 0 && !currentUser) {
        setCurrentUser(usersRes[0]);
      }
      setChannels(channelsRes);
      setExtensions(extensionsRes);
      setTrunks(trunksRes);
      setRoutes(routesRes);
      setQueues(queuesRes);
      setRingGroups(ringGroupsRes);
      setIvrs(ivrsRes);
      setCdrs(cdrsRes);
      setAiAgents(agentsRes);
      setAiProviders(providersRes);
      setAiTools(toolsRes);
      setAiKnowledge(knowledgeRes);
      setAiSessions(sessionsRes);
      setAuditLogs(auditRes);
      setHealth(healthRes);
    } catch (e) {
      console.error('Error loading PBX data:', e);
    } finally {
      setLoading(false);
    }
  }, [currentTenant, currentUser]);

  useEffect(() => {
    if (isAuthenticated) {
      loadAllData();
    }
  }, [loadAllData, isAuthenticated]);

  // Real-time SSE for channels and metrics
  useEffect(() => {
    if (!isAuthenticated) return;
    const eventSource = new EventSource('/api/v1/events/asterisk');
    
    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.channels) setChannels(data.channels);
        if (data.metrics) setMetrics(data.metrics);
      } catch (err) {
        // Ignored
      }
    };

    eventSource.onerror = () => {
      // Browser or proxy closed connection, EventSource will auto-reconnect
      // Mute the error to avoid console noise
    };

    return () => {
      eventSource.close();
    };
  }, []);

  const handleOpenWebphone = (number?: string) => {
    if (number) setWebphoneTarget(number);
    setIsWebphoneOpen(true);
  };

  const handleLogout = () => {
    localStorage.removeItem('enlace_jwt');
    setAuthToken(null);
    setIsAuthenticated(false);
    setCurrentUser(null);
  };

  if (!isAuthenticated) {
    return (
      <LoginView 
        onLoginSuccess={(user, token) => {
          setAuthToken(token);
          setIsAuthenticated(true);
          setCurrentUser(user);
          setUserRole(user.role);
        }} 
      />
    );
  }

  const renderActiveView = () => {

    if (!checkAccess(activeView, userRole)) {
      return (
        <div className="flex-1 flex flex-col items-center justify-center bg-slate-50 p-6">
          <div className="w-24 h-24 mb-6 rounded-full bg-slate-100 flex items-center justify-center border border-slate-200">
            <ShieldAlert className="w-10 h-10 text-slate-400" />
          </div>
          <h2 className="text-xl font-bold text-slate-700 mb-2">Acesso Negado</h2>
          <p className="text-slate-500 text-center max-w-md">
            Seu perfil atual ({userRole.replace('_', ' ').toUpperCase()}) não tem permissão para acessar esta área do sistema.
          </p>
          <button onClick={() => setActiveView('dashboard')} className="mt-6 px-4 py-2 bg-blue-600 text-white font-medium rounded-xl hover:bg-blue-700 transition">
            Voltar ao Início
          </button>
        </div>
      );
    }
    switch (activeView) {
      case 'dashboard':
        return (
          <DashboardView
            metrics={metrics}
            channels={channels}
            recentCdrs={cdrs}
            onOpenWebphone={handleOpenWebphone}
            onNavigate={(v) => setActiveView(v)}
          />
        );
      case 'operation_dashboard':
        return <OperationDashboardView channels={channels} metrics={metrics} onOpenWebphone={handleOpenWebphone} />;
      case 'omnichannel':
        return <OmnichannelView />;
      case 'crm_contacts':
        return <CrmContactsView />;
      case 'crm_hub':
        return <CrmHubView />;
      case 'campaigns':
        return <CampaignsView />;
      case 'billing':
        return <BillingView currentTenant={currentTenant} />;
      case 'quick_setup':
        return <QuickSetupView />;
      case 'extensions':
        return (
          <ExtensionsView
            extensions={extensions}
            onRefresh={loadAllData}
            onOpenWebphone={handleOpenWebphone}
          />
        );
      case 'trunks':
        return <TrunksView trunks={trunks} onRefresh={loadAllData} />;
      case 'routes':
        return <RoutesView routes={routes} trunks={trunks} onRefresh={loadAllData} />;
      case 'ring_groups':
        return (
          <QueuesAndGroupsView
            key="ring_groups"
            initialTab="ring_groups"
            queues={queues}
            ringGroups={ringGroups}
            onOpenWebphone={handleOpenWebphone}
            onRefresh={loadAllData}
          />
        );
      case 'queues':
        return (
          <QueuesAndGroupsView
            key="queues"
            initialTab="queues"
            queues={queues}
            ringGroups={ringGroups}
            onOpenWebphone={handleOpenWebphone}
            onRefresh={loadAllData}
          />
        );
      case 'media_manager':
        return <MediaManagerView key="media_manager" />;
      case 'ivr':
        return (
          <IvrView
            key="ivr"
            ivrs={ivrs}
            onOpenWebphone={handleOpenWebphone}
            onRefresh={loadAllData}
          />
        );
      case 'cdr':
        return (
          <CdrAndRecordingsView
            key="cdr"
            initialTab="cdr"
            currentTenant={currentTenant}
            cdrs={cdrs}
            onRefresh={loadAllData}
            onOpenWebphone={handleOpenWebphone}
          />
        );
      case 'recordings':
        return (
          <CdrAndRecordingsView
            key="recordings"
            initialTab="recordings"
            currentTenant={currentTenant}
            cdrs={cdrs}
            onRefresh={loadAllData}
            onOpenWebphone={handleOpenWebphone}
          />
        );
      case 'transcriptions':
        return (
          <CdrAndRecordingsView
            key="transcriptions"
            initialTab="transcriptions"
            currentTenant={currentTenant}
            cdrs={cdrs}
            onRefresh={loadAllData}
            onOpenWebphone={handleOpenWebphone}
          />
        );
      case 'reports':
        return (
          <CdrAndRecordingsView
            key="reports"
            initialTab="reports"
            currentTenant={currentTenant}
            cdrs={cdrs}
            onRefresh={loadAllData}
            onOpenWebphone={handleOpenWebphone}
          />
        );
      case 'ai_agents':
        return (
          <AiGatewayView
            key="ai_agents"
            agents={aiAgents}
            providers={aiProviders}
            tools={aiTools}
            knowledge={aiKnowledge}
            sessions={aiSessions}
            activeSubTab="agents"
            onOpenWebphone={handleOpenWebphone}
            onRefresh={loadAllData}
          />
        );
      case 'ai_providers':
        return (
          <AiGatewayView
            key="ai_providers"
            agents={aiAgents}
            providers={aiProviders}
            tools={aiTools}
            knowledge={aiKnowledge}
            sessions={aiSessions}
            activeSubTab="providers"
            onOpenWebphone={handleOpenWebphone}
            onRefresh={loadAllData}
          />
        );
      case 'ai_tools':
        return (
          <AiGatewayView
            key="ai_tools"
            agents={aiAgents}
            providers={aiProviders}
            tools={aiTools}
            knowledge={aiKnowledge}
            sessions={aiSessions}
            activeSubTab="tools"
            onOpenWebphone={handleOpenWebphone}
            onRefresh={loadAllData}
          />
        );
      case 'ai_knowledge':
        return (
          <AiGatewayView
            key="ai_knowledge"
            agents={aiAgents}
            providers={aiProviders}
            tools={aiTools}
            knowledge={aiKnowledge}
            sessions={aiSessions}
            activeSubTab="knowledge"
            onOpenWebphone={handleOpenWebphone}
            onRefresh={loadAllData}
          />
        );
      case 'ai_sessions':
        return (
          <AiGatewayView
            key="ai_sessions"
            agents={aiAgents}
            providers={aiProviders}
            tools={aiTools}
            knowledge={aiKnowledge}
            sessions={aiSessions}
            activeSubTab="sessions"
            onOpenWebphone={handleOpenWebphone}
            onRefresh={loadAllData}
          />
        );
      case 'network_security':
        return <NetworkSecurityView key="network_security" />;
      case 'infra_settings':
        return (
          <InfraSettingsView
            key="infra_settings"
            onOpenWebphone={() => handleOpenWebphone()}
            onNavigate={(v) => setActiveView(v)}
          />
        );
      case 'system_logs':
        return <SystemLogsView key="system_logs" />;
      case 'asterisk_monitor':
        return (
          <AsteriskCoreView
            key="asterisk_monitor"
            channels={channels}
            onRefreshChannels={loadAllData}
            initialTab="monitor"
          />
        );
      case 'asterisk_configs':
        return (
          <AsteriskCoreView
            key="asterisk_configs"
            channels={channels}
            onRefreshChannels={loadAllData}
            initialTab="configs"
          />
        );
      case 'asterisk_installer':
        return (
          <AsteriskCoreView
            key="asterisk_installer"
            channels={channels}
            onRefreshChannels={loadAllData}
            initialTab="installer"
          />
        );
      case 'users':
        return (
          <AdminAndSecurityView
            key="users"
            users={users}
            tenants={tenants}
            extensions={extensions}
            auditLogs={auditLogs}
            health={health}
            activeSubTab="users"
            onRefresh={loadAllData}
          />
        );
      case 'tenants':
        return (
          <AdminAndSecurityView
            key="tenants"
            users={users}
            tenants={tenants}
            extensions={extensions}
            auditLogs={auditLogs}
            health={health}
            activeSubTab="tenants"
            onRefresh={loadAllData}
          />
        );
      case 'audit_logs':
        return (
          <AdminAndSecurityView
            key="audit_logs"
            users={users}
            tenants={tenants}
            extensions={extensions}
            auditLogs={auditLogs}
            health={health}
            activeSubTab="audit_logs"
            onRefresh={loadAllData}
          />
        );
      case 'health_check':
        return <HealthCheckView />;
      case 'settings':
        return <SettingsView onNavigate={setActiveView} />;
      case 'help_manual':
        return <HelpManualView onNavigate={setActiveView} />;
      case 'backup_restore':
        return <BackupRestoreView />;
      default:
        return (
          <DashboardView
            metrics={metrics}
            channels={channels}
            recentCdrs={cdrs}
            onOpenWebphone={handleOpenWebphone}
            onNavigate={(v) => setActiveView(v)}
          />
        );
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col font-sans selection:bg-blue-600 selection:text-white">
      {/* Top Navigation */}
      <Navbar
        tenants={tenants}
        currentTenant={currentTenant}
        onSelectTenant={(t) => setCurrentTenant(t)}
        currentUser={currentUser}
        activeCallsCount={channels.length}
        onOpenWebphone={() => handleOpenWebphone()}
        isWebphoneOpen={isWebphoneOpen}
        userRole={userRole}
        onChangeUserRole={setUserRole}
        onToggleMobileMenu={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        onLogout={handleLogout}
      />

      {/* Sidebar Mobile Overlay */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-[#0f172a]/50 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      <div className="flex-1 flex overflow-hidden relative">
        {/* Sidebar */}
        <div className={`fixed lg:static inset-y-0 left-0 z-50 transform transition-transform duration-300 ease-in-out ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
          <Sidebar
            userRole={userRole}
            activeView={activeView}
            onSelectView={(v) => { setActiveView(v); setIsMobileMenuOpen(false); }}
            onOpenWebphone={() => handleOpenWebphone()}
          />
        </div>

        {/* Main Content Area */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8 bg-slate-50 relative">
          {loading ? (
            <div className="h-full flex flex-col items-center justify-center py-20 text-slate-500 gap-3">
              <div className="w-8 h-8 rounded-full border-2 border-blue-600 border-t-transparent animate-spin" />
              <p className="text-xs font-mono">Conectando ao núcleo Asterisk 20 e PostgreSQL...</p>
            </div>
          ) : (
            <AnimatePresence mode="wait">
              <motion.div
                key={activeView}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.25, ease: 'easeOut' }}
                className="h-full max-w-7xl mx-auto"
              >
                {renderActiveView()}
              </motion.div>
            </AnimatePresence>
          )}
        </main>
      </div>

      {/* Embedded Webphone Softphone Modal */}
      <WebphoneModal
        isOpen={isWebphoneOpen}
        onClose={() => setIsWebphoneOpen(false)}
        defaultNumber={webphoneTarget}
        onCallEnded={loadAllData}
      />
    </div>
  );
}
