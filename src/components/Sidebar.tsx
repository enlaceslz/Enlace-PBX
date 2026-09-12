import React, { useState, useEffect } from 'react';
import {
  LayoutDashboard,
  Users,
  Settings,
  PhoneCall,
  GitFork,
  Radio,
  Layers,
  Split,
  FileText,
  Mic,
  Sparkles,
  Bot,
  Wrench,
  BookOpen,
  Activity,
  Terminal,
  FileCode,
  Download,
  ShieldAlert,
  ShieldCheck,
  Server,
  Building,
  HeartPulse,
  HelpCircle,
  Database,
  MonitorPlay,
  Plug,
  MessageSquare,
  Zap,
  Megaphone,
  BarChart3,
  ScrollText,
  Menu,
  ChevronDown,
  ChevronRight,
  Phone
} from 'lucide-react';

export type ActiveView =
  | 'dashboard'
  | 'operation_dashboard'
  | 'quick_setup'
  | 'crm_hub'
  | 'omnichannel'
  | 'campaigns'
  | 'extensions'
  | 'trunks'
  | 'routes'
  | 'ring_groups'
  | 'queues'
  | 'ivr'
  | 'cdr'
  | 'recordings'
  | 'transcriptions'
  | 'reports'
  | 'ai_providers'
  | 'ai_agents'
  | 'ai_tools'
  | 'ai_knowledge'
  | 'ai_sessions'
  | 'network_security'
  | 'system_logs'
  | 'asterisk_monitor'
  | 'asterisk_configs'
  | 'asterisk_installer'
  | 'users'
  | 'tenants'
  | 'audit_logs'
  | 'billing'
  | 'health_check'
  | 'settings'
  | 'help_manual'
  | 'backup_restore';

interface SidebarProps {
  activeView: ActiveView;
  onSelectView: (view: ActiveView) => void;
  onOpenWebphone: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ activeView, onSelectView, onOpenWebphone }) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [openSections, setOpenSections] = useState<string[]>([]);

  const sections = [
    {
      title: 'GERAL',
      items: [
        { id: 'dashboard' as ActiveView, label: 'Dashboard', icon: LayoutDashboard },
        { id: 'operation_dashboard' as ActiveView, label: 'NOC / Tempo Real', icon: MonitorPlay },
      ],
    },
    {
      title: 'CONTACT CENTER OMNICHANNEL',
      items: [
        { id: 'omnichannel' as ActiveView, label: 'Webchat & WhatsApp', icon: MessageSquare },
        { id: 'crm_hub' as ActiveView, label: 'Integrações (CRM)', icon: Plug },
        { id: 'campaigns' as ActiveView, label: 'Campanhas & Ativo', icon: Megaphone },
      ],
    },
    {
      title: 'TELEFONIA (ASTERISK 20)',
      items: [
        { id: 'extensions' as ActiveView, label: 'Ramais PJSIP', icon: Users },
        { id: 'trunks' as ActiveView, label: 'Troncos SIP', icon: Radio },
        { id: 'routes' as ActiveView, label: 'Rotas de Entrada/Saída', icon: GitFork },
        { id: 'ring_groups' as ActiveView, label: 'Grupos de Toque', icon: Layers },
        { id: 'queues' as ActiveView, label: 'Filas de Atendimento', icon: Split },
        { id: 'ivr' as ActiveView, label: 'URAs / IVR', icon: PhoneCall },
      ],
    },
    {
      title: 'CHAMADAS & ÁUDIO',
      items: [
        { id: 'cdr' as ActiveView, label: 'Histórico CDR', icon: FileText },
        { id: 'recordings' as ActiveView, label: 'Gravações & Player', icon: Mic },
        { id: 'transcriptions' as ActiveView, label: 'Transcrições & IA', icon: Sparkles },
        { id: 'reports' as ActiveView, label: 'Relatórios & SLA (PDF)', icon: BarChart3 },
      ],
    },
    {
      title: 'INTELIGÊNCIA ARTIFICIAL',
      items: [
        { id: 'ai_agents' as ActiveView, label: 'Agentes de Voz (MaIA)', icon: Bot },
        { id: 'ai_providers' as ActiveView, label: 'Provedores (Gemini)', icon: Sparkles },
        { id: 'ai_tools' as ActiveView, label: 'Tools (Function Calling)', icon: Wrench },
        { id: 'ai_knowledge' as ActiveView, label: 'Conhecimento (RAG)', icon: BookOpen },
        { id: 'ai_sessions' as ActiveView, label: 'Sessões em Tempo Real', icon: Activity },
      ],
    },
    {
      title: 'ASTERISK & INFRAESTRUTURA',
      items: [
        { id: 'network_security' as ActiveView, label: 'Redes, VPN & Fail2ban', icon: ShieldCheck },
        { id: 'system_logs' as ActiveView, label: 'Logs do Sistema em Tempo Real', icon: ScrollText },
        { id: 'asterisk_monitor' as ActiveView, label: 'Monitor ARI & Canais', icon: Terminal },
        { id: 'asterisk_configs' as ActiveView, label: 'Configurações PJSIP/Dialplan', icon: FileCode },
        { id: 'asterisk_installer' as ActiveView, label: 'Instalador Linux Oficial', icon: Download },
        { id: 'backup_restore' as ActiveView, label: 'Backup & Restore', icon: Database },
      ],
    },
    {
      title: 'ADMINISTRAÇÃO & LGPD',
      items: [
        { id: 'quick_setup' as ActiveView, label: 'Quick Setup Wizard', icon: Zap },
        { id: 'users' as ActiveView, label: 'Usuários & RBAC', icon: Users },
        { id: 'tenants' as ActiveView, label: 'Empresas (Multi-Tenant)', icon: Building },
        { id: 'billing' as ActiveView, label: 'Faturamento & Custos', icon: FileText },
        { id: 'audit_logs' as ActiveView, label: 'Auditoria LGPD', icon: ShieldAlert },
        { id: 'health_check' as ActiveView, label: 'Health Check do PBX', icon: HeartPulse },
        { id: 'settings' as ActiveView, label: 'Configurações Globais', icon: Settings },
      ],
    },
    {
      title: 'AJUDA & SUPORTE',
      items: [
        { id: 'help_manual' as ActiveView, label: 'Manual & Glossário', icon: HelpCircle },
      ],
    },
  ];

  // Auto-expand section containing the active view, keeping others collapsed by default
  useEffect(() => {
    const activeSection = sections.find(sec => sec.items.some(item => item.id === activeView));
    if (activeSection && !openSections.includes(activeSection.title)) {
      setOpenSections([activeSection.title]);
    }
  }, [activeView]); // Intentionally leaving out sections from dependency array to avoid loops

  const toggleSection = (title: string) => {
    if (isCollapsed) setIsCollapsed(false); // Auto-expand sidebar if trying to open an accordion
    setOpenSections(prev => 
      prev.includes(title) ? prev.filter(t => t !== title) : [...prev, title]
    );
  };

  return (
    <aside className={`bg-white/95 backdrop-blur-sm border-r border-slate-200 flex flex-col h-[calc(100vh-4rem)] select-none relative transition-all duration-300 ease-in-out ${isCollapsed ? 'w-20' : 'w-64'}`}>
      {/* Subtle tech background glow */}
      <div className="absolute top-0 left-0 w-full h-48 bg-blue-50/50 blur-[80px] pointer-events-none" />

      {/* Brand & Logo Header Card */}
      <div className="p-3 pb-0 relative z-10 flex items-center justify-between">
        <div className={`flex items-center gap-2.5 p-2 rounded-xl bg-slate-50 border border-slate-200/80 hover:bg-blue-50/60 hover:border-blue-200 transition group flex-1 ${isCollapsed ? 'justify-center' : ''}`}>
          <img 
            src="/logo-icon.png" 
            alt="Enlace Telecom Logo" 
            className="w-8 h-8 rounded-lg object-contain shadow-sm border border-white shrink-0"
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).src = '/logo-icon.svg';
            }}
          />
          {!isCollapsed && (
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-black text-slate-900 tracking-tight truncate">Enlace Telecom</span>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shrink-0" title="Sistema Online" />
              </div>
              <p className="text-[9px] font-medium text-slate-500 truncate">Telecom &amp; IA</p>
            </div>
          )}
        </div>
        <button 
          onClick={() => setIsCollapsed(!isCollapsed)}
          className={`p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition shrink-0 ${isCollapsed ? 'mt-2 mb-1 hidden' : 'ml-1'}`}
          title="Recolher Menu"
        >
          <Menu className="w-4 h-4" />
        </button>
      </div>

      {isCollapsed && (
        <div className="flex justify-center mt-2 relative z-10">
          <button 
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"
            title="Expandir Menu"
          >
            <Menu className="w-4 h-4" />
          </button>
        </div>
      )}

      <div className={`flex-1 overflow-y-auto py-4 ${isCollapsed ? 'px-2' : 'px-4'} space-y-2 relative z-10 custom-scrollbar`}>
        {sections.map((section, idx) => {
          const isOpen = openSections.includes(section.title);
          const hasActiveChild = section.items.some(item => item.id === activeView);

          return (
            <div key={idx} className="relative">
              {/* Section Header */}
              <button 
                onClick={() => toggleSection(section.title)}
                className={`w-full flex items-center justify-between group rounded-lg py-1.5 ${isCollapsed ? 'px-0 justify-center' : 'px-1'} hover:bg-slate-50 transition`}
                title={isCollapsed ? section.title : undefined}
              >
                {!isCollapsed ? (
                  <>
                    <div className="flex items-center gap-2">
                      <span className={`w-1.5 h-1.5 rounded-full ${hasActiveChild ? 'bg-blue-500' : 'bg-slate-200 group-hover:bg-slate-300'}`} />
                      <span className={`text-[10px] font-bold tracking-[0.1em] uppercase truncate ${hasActiveChild ? 'text-blue-600' : 'text-slate-500 group-hover:text-slate-700'}`}>
                        {section.title}
                      </span>
                    </div>
                    {isOpen ? <ChevronDown className="w-3 h-3 text-slate-400" /> : <ChevronRight className="w-3 h-3 text-slate-400" />}
                  </>
                ) : (
                   <span className={`w-1.5 h-1.5 rounded-full ${hasActiveChild ? 'bg-blue-500' : 'bg-slate-300'} mx-auto`} />
                )}
              </button>

              {/* Section Items */}
              {(!isCollapsed && isOpen) || isCollapsed ? (
                <div className={`space-y-0.5 mt-1 ${isCollapsed ? 'flex flex-col items-center' : ''}`}>
                  {section.items.map((item) => {
                    const Icon = item.icon;
                    const isActive = activeView === item.id;
                    return (
                      <button
                        key={item.id}
                        onClick={() => onSelectView(item.id)}
                        title={isCollapsed ? item.label : undefined}
                        className={`flex items-center gap-3 rounded-lg text-xs font-medium transition-all duration-200 group ${
                          isCollapsed ? 'w-10 h-10 justify-center p-0' : 'w-full px-3 py-2.5'
                        } ${
                          isActive
                            ? isCollapsed 
                               ? 'bg-blue-50 text-blue-700 shadow-sm border border-blue-200' 
                               : 'bg-blue-50 text-blue-700 font-semibold shadow-[inset_2px_0_0_0_rgba(37,99,235,1)]'
                            : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'
                        }`}
                      >
                        <Icon
                          className={`shrink-0 transition-colors ${
                            isCollapsed ? 'w-5 h-5' : 'w-4 h-4'
                          } ${
                            isActive ? 'text-blue-600' : 'text-slate-500 group-hover:text-slate-600'
                          }`}
                        />
                        {!isCollapsed && <span className="truncate">{item.label}</span>}
                      </button>
                    );
                  })}
                </div>
              ) : null}
            </div>
          );
        })}
      </div>

      {/* Open Source Contribution (Hidden when collapsed) */}
      {!isCollapsed && (
        <div className="px-4 py-3 border-t border-slate-200 bg-slate-50 text-center shrink-0">
          <p className="text-[9px] text-slate-400 font-medium leading-relaxed">
            O Enlace-PBX é uma contribuição open-source da <a href="https://enlace.slz.br" target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">Enlace Telecom</a> e <strong>André LJP</strong>.
            <br />
            <a href="mailto:slzenlace@gmail.com" className="hover:text-slate-600 transition-colors">slzenlace@gmail.com</a>
          </p>
        </div>
      )}

      {/* Webphone Quick Drawer Footer */}
      <div className={`p-3 border-t border-slate-200 bg-white/90 backdrop-blur-md relative z-10 shrink-0 ${isCollapsed ? 'flex justify-center' : ''}`}>
        <button
          onClick={onOpenWebphone}
          title={isCollapsed ? 'Abrir Webphone' : undefined}
          className={`${
            isCollapsed 
              ? 'w-10 h-10 justify-center p-0 rounded-xl' 
              : 'w-full py-2.5 px-3 rounded-xl justify-between'
          } bg-gradient-to-br from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 border border-blue-400 shadow-lg shadow-blue-600/20 flex items-center text-xs text-white group transition-all duration-300`}
        >
          <div className="flex items-center justify-center gap-2">
            {!isCollapsed && (
              <div className="relative flex h-2 w-2 shrink-0">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-sky-200 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-white"></span>
              </div>
            )}
            {isCollapsed ? <Phone className="w-5 h-5" /> : <span className="font-semibold tracking-wide truncate">Webphone</span>}
          </div>
          {!isCollapsed && <span className="text-[10px] font-mono font-bold text-blue-100 transition-colors shrink-0">ABRIR</span>}
        </button>
      </div>
    </aside>
  );
};
