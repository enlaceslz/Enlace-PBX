import React from 'react';
import {
  LayoutDashboard,
  Users,
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
  Server,
  Building,
  HeartPulse,
} from 'lucide-react';

export type ActiveView =
  | 'dashboard'
  | 'extensions'
  | 'trunks'
  | 'routes'
  | 'ring_groups'
  | 'queues'
  | 'ivr'
  | 'cdr'
  | 'recordings'
  | 'transcriptions'
  | 'ai_providers'
  | 'ai_agents'
  | 'ai_tools'
  | 'ai_knowledge'
  | 'ai_sessions'
  | 'asterisk_monitor'
  | 'asterisk_configs'
  | 'asterisk_installer'
  | 'users'
  | 'tenants'
  | 'audit_logs'
  | 'health_check';

interface SidebarProps {
  activeView: ActiveView;
  onSelectView: (view: ActiveView) => void;
  onOpenWebphone: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ activeView, onSelectView, onOpenWebphone }) => {
  const sections = [
    {
      title: 'GERAL',
      items: [
        { id: 'dashboard' as ActiveView, label: 'Dashboard', icon: LayoutDashboard },
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
        { id: 'asterisk_monitor' as ActiveView, label: 'Monitor ARI & Canais', icon: Terminal },
        { id: 'asterisk_configs' as ActiveView, label: 'Configurações PJSIP/Dialplan', icon: FileCode },
        { id: 'asterisk_installer' as ActiveView, label: 'Instalador Linux Oficial', icon: Download },
      ],
    },
    {
      title: 'ADMINISTRAÇÃO & LGPD',
      items: [
        { id: 'users' as ActiveView, label: 'Usuários & RBAC', icon: Users },
        { id: 'tenants' as ActiveView, label: 'Empresas (Multi-Tenant)', icon: Building },
        { id: 'audit_logs' as ActiveView, label: 'Auditoria LGPD', icon: ShieldAlert },
        { id: 'health_check' as ActiveView, label: 'Health Check do PBX', icon: HeartPulse },
      ],
    },
  ];

  return (
    <aside className="w-64 bg-slate-950 border-r border-slate-800/80 flex flex-col h-[calc(100vh-4rem)] select-none">
      <div className="flex-1 overflow-y-auto py-4 px-3 space-y-6">
        {sections.map((section, idx) => (
          <div key={idx}>
            <div className="px-3 mb-1.5 text-[10px] font-bold tracking-wider text-slate-400 uppercase">
              {section.title}
            </div>
            <div className="space-y-0.5">
              {section.items.map((item) => {
                const Icon = item.icon;
                const isActive = activeView === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => onSelectView(item.id)}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium transition ${
                      isActive
                        ? 'bg-emerald-500/15 text-emerald-300 font-semibold border border-emerald-500/30'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                    }`}
                  >
                    <Icon
                      className={`w-4 h-4 ${
                        isActive ? 'text-emerald-400' : 'text-slate-500'
                      }`}
                    />
                    <span className="truncate">{item.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Webphone Quick Drawer Footer */}
      <div className="p-3 border-t border-slate-800 bg-slate-950/90">
        <button
          onClick={onOpenWebphone}
          className="w-full py-2.5 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 flex items-center justify-between text-xs text-slate-200 group transition"
        >
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-400" />
            <span className="font-semibold">Webphone Softphone</span>
          </div>
          <span className="text-[10px] font-mono text-emerald-400 group-hover:underline">Abrir</span>
        </button>
      </div>
    </aside>
  );
};
