import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Navbar } from './components/Navbar';
import { Sidebar, ActiveView } from './components/Sidebar';
import { WebphoneModal } from './components/WebphoneModal';
import { DashboardView } from './components/views/DashboardView';
import { ExtensionsView } from './components/views/ExtensionsView';
import { TrunksView } from './components/views/TrunksView';
import { RoutesView } from './components/views/RoutesView';
import { QueuesAndGroupsView } from './components/views/QueuesAndGroupsView';
import { IvrView } from './components/views/IvrView';
import { CdrAndRecordingsView } from './components/views/CdrAndRecordingsView';
import { AiGatewayView } from './components/views/AiGatewayView';
import { AsteriskCoreView } from './components/views/AsteriskCoreView';
import { AdminAndSecurityView } from './components/views/AdminAndSecurityView';
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
  const [activeView, setActiveView] = useState<ActiveView>('dashboard');
  const [isWebphoneOpen, setIsWebphoneOpen] = useState(false);
  const [webphoneTarget, setWebphoneTarget] = useState<string>('');

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
        fetch('/api/v1/dashboard/metrics').then((r) => r.json()),
        fetch('/api/v1/tenants').then((r) => r.json()),
        fetch('/api/v1/users').then((r) => r.json()),
        fetch('/api/v1/asterisk/channels').then((r) => r.json()),
        fetch('/api/v1/extensions').then((r) => r.json()),
        fetch('/api/v1/trunks').then((r) => r.json()),
        fetch('/api/v1/routes').then((r) => r.json()),
        fetch('/api/v1/queues').then((r) => r.json()),
        fetch('/api/v1/ring-groups').then((r) => r.json()),
        fetch('/api/v1/ivr').then((r) => r.json()),
        fetch('/api/v1/cdr').then((r) => r.json()),
        fetch('/api/v1/ai/agents').then((r) => r.json()),
        fetch('/api/v1/ai/providers').then((r) => r.json()),
        fetch('/api/v1/ai/tools').then((r) => r.json()),
        fetch('/api/v1/ai/knowledge').then((r) => r.json()),
        fetch('/api/v1/ai/sessions').then((r) => r.json()),
        fetch('/api/v1/audit-logs').then((r) => r.json()),
        fetch('/api/v1/health').then((r) => r.json()),
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
    loadAllData();
  }, [loadAllData]);

  // Periodic polling for channels and metrics
  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const [chRes, metRes] = await Promise.all([
          fetch('/api/v1/asterisk/channels').then((r) => r.json()),
          fetch('/api/v1/dashboard/metrics').then((r) => r.json()),
        ]);
        setChannels(chRes);
        setMetrics(metRes);
      } catch {
        // Ignored
      }
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  const handleOpenWebphone = (number?: string) => {
    if (number) setWebphoneTarget(number);
    setIsWebphoneOpen(true);
  };

  const renderActiveView = () => {
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
      case 'queues':
        return (
          <QueuesAndGroupsView
            queues={queues}
            ringGroups={ringGroups}
            onOpenWebphone={handleOpenWebphone}
            onRefresh={loadAllData}
          />
        );
      case 'ivr':
        return (
          <IvrView
            ivrs={ivrs}
            onOpenWebphone={handleOpenWebphone}
            onRefresh={loadAllData}
          />
        );
      case 'cdr':
      case 'recordings':
      case 'transcriptions':
        return (
          <CdrAndRecordingsView
            cdrs={cdrs}
            onRefresh={loadAllData}
            onOpenWebphone={handleOpenWebphone}
          />
        );
      case 'ai_agents':
        return (
          <AiGatewayView
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
      case 'asterisk_monitor':
        return (
          <AsteriskCoreView
            channels={channels}
            onRefreshChannels={loadAllData}
            initialTab="monitor"
          />
        );
      case 'asterisk_configs':
        return (
          <AsteriskCoreView
            channels={channels}
            onRefreshChannels={loadAllData}
            initialTab="configs"
          />
        );
      case 'asterisk_installer':
        return (
          <AsteriskCoreView
            channels={channels}
            onRefreshChannels={loadAllData}
            initialTab="installer"
          />
        );
      case 'users':
        return (
          <AdminAndSecurityView
            users={users}
            tenants={tenants}
            auditLogs={auditLogs}
            health={health}
            activeSubTab="users"
          />
        );
      case 'tenants':
        return (
          <AdminAndSecurityView
            users={users}
            tenants={tenants}
            auditLogs={auditLogs}
            health={health}
            activeSubTab="tenants"
          />
        );
      case 'audit_logs':
        return (
          <AdminAndSecurityView
            users={users}
            tenants={tenants}
            auditLogs={auditLogs}
            health={health}
            activeSubTab="audit_logs"
          />
        );
      case 'health_check':
        return (
          <AdminAndSecurityView
            users={users}
            tenants={tenants}
            auditLogs={auditLogs}
            health={health}
            activeSubTab="health_check"
          />
        );
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
      />

      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        <Sidebar
          activeView={activeView}
          onSelectView={(v) => setActiveView(v)}
          onOpenWebphone={() => handleOpenWebphone()}
        />

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
