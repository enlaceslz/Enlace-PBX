import React, { useState, useMemo } from 'react';
import { 
  BookOpen, Info, Phone, Bot, Radio, Network, MessageSquare, Shield, 
  HelpCircle, ChevronRight, Zap, ArrowRight, Play, Terminal, Layers,
  Globe, Lock, Cpu, Server, FileText, CheckCircle2, AlertTriangle,
  Copy, Check, Search, Download, ExternalLink, Wrench, Sparkles,
  Smartphone, Share2, Bell, ShieldCheck, Database, Sliders, RefreshCw,
  Palette, CreditCard, GitFork, Split, Mic, Activity, Plug, Megaphone,
  PhoneCall
} from 'lucide-react';
import { ActiveView } from '../Sidebar';

interface HelpManualViewProps {
  onNavigate?: (view: ActiveView) => void;
}

type ChapterId = 
  | 'intro'
  | 'brand_assets'
  | 'modules_guide'
  | 'deploy_guide'
  | 'infra_ssl'
  | 'pjsip_webrtc'
  | 'routing_trunks'
  | 'acd_queues'
  | 'ai_maia'
  | 'whatsapp_pwa'
  | 'security_lgpd'
  | 'troubleshooting'
  | 'glossary';

interface DocTopic {
  id: ChapterId;
  label: string;
  badge?: string;
  icon: React.ElementType;
  description: string;
}

export const HelpManualView: React.FC<HelpManualViewProps> = ({ onNavigate }) => {
  const [activeTopic, setActiveTopic] = useState<ChapterId>('intro');
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const topics: DocTopic[] = [
    { id: 'intro', label: 'Introdução & Arquitetura', icon: BookOpen, description: 'Visão geral do Enlace-PBX e fluxo Asterisk 20 + IA' },
    { id: 'brand_assets', label: 'Identidade Visual & Logos', badge: 'Oficial', icon: Palette, description: 'Mascote Polvo com IA, tipografia Enlace-PBX e download de ativos' },
    { id: 'modules_guide', label: 'Módulos, URA & Recursos', badge: 'Completo', icon: Layers, description: 'Guia de ponta a ponta: URA Visual, CRM Hub, Billing, Snapshots' },
    { id: 'deploy_guide', label: 'Procedimentos de Deploy & Linux', badge: 'Produção', icon: Server, description: 'Script deploy.sh, Asterisk 20, NGINX SSL, PM2 e Firewall UFW' },
    { id: 'infra_ssl', label: 'Host, Domínio, Rede & SSL', badge: 'Novo', icon: Globe, description: 'Configuração de IP WAN/LAN, NAT Traversal e Certificados HTTPS' },
    { id: 'pjsip_webrtc', label: 'Ramais PJSIP & Webphone', icon: Phone, description: 'Endpoints, transportes TLS/WSS, WebRTC e softphones' },
    { id: 'routing_trunks', label: 'Rotas, Troncos SIP & DIDs', icon: Network, description: 'Planos de discagem, operadoras VoIP e rotas de entrada/saída' },
    { id: 'acd_queues', label: 'Filas (ACD), URAs & SLA', icon: Split, description: 'Estratégias de atendimento, IVR multinível e regras de transbordo' },
    { id: 'ai_maia', label: 'Agentes MaIA (Google Gemini)', badge: 'IA Realtime', icon: Bot, description: 'Arquitetura ARI Stasis, RAG semântico e Function Calling' },
    { id: 'whatsapp_pwa', label: 'WhatsApp Meta & PWA Push', badge: 'Omnichannel', icon: MessageSquare, description: 'Webhooks na porta 443, PWA desktop/mobile e notificações VAPID' },
    { id: 'security_lgpd', label: 'Segurança, Firewall & LGPD', icon: ShieldCheck, description: 'Fail2ban, WireGuard, RBAC e trilha de auditoria criptográfica' },
    { id: 'troubleshooting', label: 'Diagnóstico & Resolução (FAQ)', icon: Wrench, description: 'Áudio mudo, registro SIP rejeitado, falha SSL e comandos CLI' },
    { id: 'glossary', label: 'Glossário Técnico Completo', icon: HelpCircle, description: 'Dicionário de termos de Telecom, VoIP e Inteligência Artificial' },
  ];

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  // Filter topics based on search query
  const filteredTopics = useMemo(() => {
    if (!searchQuery.trim()) return topics;
    const q = searchQuery.toLowerCase();
    return topics.filter(t => 
      t.label.toLowerCase().includes(q) || 
      t.description.toLowerCase().includes(q)
    );
  }, [searchQuery]);

  return (
    <div className="max-w-[1400px] mx-auto space-y-8 pb-16">
      {/* Header com Logo Oficial, Busca e Status */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-6">
        <div className="flex items-center gap-4">
          <div className="p-2 bg-white rounded-2xl border border-slate-200 shadow-sm shrink-0">
            <img
              src="/logo.png"
              alt="Enlace-PBX Enterprise Logo"
              className="h-10 w-auto object-contain"
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).src = '/logo.svg';
              }}
            />
          </div>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2.5 py-0.5 bg-blue-100 text-blue-800 rounded-full text-[10px] font-black uppercase tracking-wider">
                Documentação Oficial v20.17 LTS
              </span>
              <span className="px-2.5 py-0.5 bg-emerald-100 text-emerald-800 rounded-full text-[10px] font-black uppercase tracking-wider flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" /> Sistema Verificado
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              Centro de Ajuda, Manuais & Documentação
            </h1>
            <p className="text-sm font-medium text-slate-500 mt-1">
              Guias práticos, arquitetura de rede, procedimentos operacionais e resolução rápida de problemas.
            </p>
          </div>
        </div>
        
        {/* Quick Search Bar */}
        <div className="w-full md:w-80 relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Buscar guia, termo ou erro..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600"
            >
              Limpar
            </button>
          )}
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-8">
        
        {/* Sub Navigation Sidebar */}
        <div className="lg:w-80 shrink-0 flex flex-col gap-2">
          <div className="flex items-center justify-between text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2 px-2">
            <span>Índice do Manual</span>
            <span>{topics.length} Capítulos</span>
          </div>
          
          <div className="space-y-1">
            {filteredTopics.map(topic => {
              const Icon = topic.icon;
              const isActive = activeTopic === topic.id;
              return (
                <button
                  key={topic.id}
                  onClick={() => setActiveTopic(topic.id)}
                  className={`w-full px-3.5 py-3 rounded-xl text-left transition flex items-center justify-between group ${
                    isActive
                      ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
                      : 'bg-white text-slate-700 hover:bg-slate-50 hover:text-blue-600 border border-slate-200'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-slate-500 group-hover:text-blue-600'}`} />
                    <div className="truncate">
                      <div className="text-xs font-bold leading-tight truncate">{topic.label}</div>
                      <div className={`text-[10px] truncate ${isActive ? 'text-blue-100' : 'text-slate-400'}`}>
                        {topic.description}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0 ml-2">
                    {topic.badge && (
                      <span className={`text-[9px] font-black uppercase px-1.5 py-0.5 rounded ${
                        isActive ? 'bg-blue-500 text-white' : 'bg-blue-50 text-blue-700'
                      }`}>
                        {topic.badge}
                      </span>
                    )}
                    <ChevronRight className={`w-3.5 h-3.5 ${isActive ? 'text-blue-200' : 'text-slate-300 group-hover:text-blue-500'}`} />
                  </div>
                </button>
              );
            })}
          </div>

          {/* Quick Help Card */}
          <div className="mt-6 p-5 bg-gradient-to-br from-slate-900 to-slate-950 rounded-2xl border border-slate-800 text-white relative overflow-hidden shadow-lg">
            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-bl-full blur-xl pointer-events-none" />
            <div className="flex items-center gap-2 mb-2">
              <Shield className="w-5 h-5 text-emerald-400" />
              <h4 className="font-bold text-xs uppercase tracking-wider text-emerald-300">Suporte Dedicado</h4>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed mb-4">
              Precisa de auxílio avançado com interconexão E1, rotas SIP de alta densidade ou treinamento?
            </p>
            <div className="space-y-2">
              <a
                href="mailto:pbx@enlace.slz.br"
                className="block text-center text-xs font-bold bg-blue-600 hover:bg-blue-500 py-2 rounded-lg transition"
              >
                Abrir Chamado Técnico (pbx@enlace.slz.br)
              </a>
              {onNavigate && (
                <button
                  onClick={() => onNavigate('system_logs')}
                  className="w-full text-center text-[11px] font-semibold text-slate-400 hover:text-white py-1.5 transition"
                >
                  Ver Logs do Sistema em Tempo Real →
                </button>
              )}
            </div>
          </div>
        </div>
        
        {/* Main Content Area */}
        <div className="flex-1 min-w-0">

          {/* 1. INTRODUÇÃO & ARQUITETURA */}
          {activeTopic === 'intro' && (
            <div className="space-y-6 animate-in fade-in duration-300">
              <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-8 relative overflow-hidden">
                <div className="absolute right-0 top-0 w-72 h-72 bg-blue-50/60 rounded-bl-full -mr-12 -mt-12 pointer-events-none" />
                <div className="relative z-10 max-w-3xl">
                  <div className="inline-flex items-center gap-2 px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-[10px] font-black uppercase tracking-wider mb-4">
                    <Zap className="w-3 h-3" /> Bem-vindo ao Enlace-PBX Enterprise
                  </div>
                  <h2 className="text-2xl font-black text-slate-900 tracking-tight mb-4">
                    Telefonia IP Aberta com Potência Asterisk 20 e Inteligência Artificial
                  </h2>
                  <p className="text-sm font-medium text-slate-600 leading-relaxed mb-6">
                    O <strong>Enlace-PBX</strong> foi arquitetado para unir a estabilidade inabalável do motor <strong>Asterisk 20 LTS (PJSIP)</strong> à flexibilidade de interfaces modernas em React e agentes cognitivos baseados em <strong>Google Gemini</strong>. Diferente das antigas centrais de telefonia que exigiam edição manual de arquivos no terminal, o Enlace oferece controle visual completo sem sacrificar a fidelidade aos padrões internacionais da IETF e ITU-T.
                  </p>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8">
                    <div className="p-5 bg-slate-50 border border-slate-200 rounded-2xl">
                      <Terminal className="w-6 h-6 text-slate-700 mb-3" />
                      <h4 className="font-bold text-sm text-slate-900 mb-1">Coração Asterisk 20</h4>
                      <p className="text-[11px] text-slate-500 font-medium leading-relaxed">
                        Motor PJSIP de última geração, WebRTC de baixa latência, suporte a SRTP e codecs de voz em alta definição (Opus, G.722, G.711).
                      </p>
                    </div>

                    <div className="p-5 bg-blue-50 border border-blue-200 rounded-2xl">
                      <Bot className="w-6 h-6 text-blue-700 mb-3" />
                      <h4 className="font-bold text-sm text-slate-900 mb-1">Agentes MaIA (Gemini)</h4>
                      <p className="text-[11px] text-slate-600 font-medium leading-relaxed">
                        Comunicação direta via Asterisk REST Interface (ARI/Stasis). RAG semântico, atendimento autônomo e function calling em tempo real.
                      </p>
                    </div>

                    <div className="p-5 bg-emerald-50 border border-emerald-200 rounded-2xl">
                      <Globe className="w-6 h-6 text-emerald-700 mb-3" />
                      <h4 className="font-bold text-sm text-slate-900 mb-1">Omnichannel & PWA</h4>
                      <p className="text-[11px] text-slate-600 font-medium leading-relaxed">
                        Webphone integrado ao navegador, API Oficial do WhatsApp Meta Cloud com Webhooks seguros e PWA com notificações Push.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Brand Mascot Banner */}
              <div className="bg-gradient-to-r from-slate-950 via-blue-950 to-slate-900 rounded-3xl p-6 sm:p-8 text-white border border-slate-800 relative overflow-hidden shadow-xl">
                <div className="absolute -right-12 -bottom-12 w-64 h-64 bg-blue-500/20 rounded-full blur-3xl pointer-events-none" />
                <div className="flex flex-col md:flex-row items-center gap-6 relative z-10">
                  <div className="w-24 h-24 sm:w-28 sm:h-28 shrink-0 bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 p-2 flex items-center justify-center shadow-inner">
                    <img
                      src="/logo-icon.png"
                      alt="Mascote Oficial Enlace-PBX"
                      className="w-full h-full object-contain filter drop-shadow-md"
                      onError={(e) => {
                        (e.currentTarget as HTMLImageElement).src = '/logo-icon.svg';
                      }}
                    />
                  </div>
                  <div className="flex-1 text-center md:text-left">
                    <div className="inline-flex items-center gap-2 px-3 py-1 bg-blue-500/20 text-blue-300 rounded-full text-[10px] font-black uppercase tracking-wider mb-2 border border-blue-400/30">
                      <Sparkles className="w-3 h-3 text-cyan-300" /> Mascote Oficial Enlace-PBX
                    </div>
                    <h3 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                      O Polvo Tecnológico de Voz & Inteligência Artificial
                    </h3>
                    <p className="text-xs sm:text-sm text-slate-300 mt-2 leading-relaxed max-w-2xl">
                      Simboliza a capacidade multicanal de atender dezenas de chamadas simultâneas (tentáculos operacionais) com precisão neural centralizada (emblema IA e headset profissional de call center).
                    </p>
                    <div className="flex flex-wrap items-center justify-center md:justify-start gap-3 mt-4">
                      <button
                        onClick={() => setActiveTopic('brand_assets')}
                        className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-md"
                      >
                        <Palette className="w-3.5 h-3.5" /> Ver Kit de Marca & Logos
                      </button>
                      <button
                        onClick={() => setActiveTopic('modules_guide')}
                        className="px-3.5 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 border border-white/20"
                      >
                        <Layers className="w-3.5 h-3.5" /> Explorar Módulos & URA
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Fluxo de Chamada */}
              <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-8">
                <h3 className="text-base font-black text-slate-900 uppercase tracking-wider mb-4 flex items-center gap-2">
                  <Network className="w-5 h-5 text-blue-600" /> Fluxo Arquitetural de uma Chamada
                </h3>
                <div className="relative p-6 bg-slate-900 text-white rounded-2xl font-mono text-xs overflow-x-auto">
                  <pre className="text-slate-300 leading-relaxed">
{`[Cliente / PSTN] ──(SIP/E1)──> [Operadora VoIP / Tronco SIP]
                                         │
                                         ▼ (Porta 5060/5061)
                             [NGINX / Firewall / Fail2ban]
                                         │
                                         ▼ (NAT Traversal / local_net)
                                [Asterisk 20 Core - PJSIP]
                                         │
          ┌──────────────────────────────┴──────────────────────────────┐
          │                                                             │
          ▼ (Context: from-trunk)                                       ▼ (Stasis Application)
[Dialplan: extensions.conf]                                    [ARI WebSocket: MaIA Core]
   ├─ Rota Entrada (DID)                                           ├─ Google Gemini Live STT/TTS
   ├─ Horário de Atendimento                                       ├─ Base de Conhecimento RAG
   ├─ URA Interativa (IVR)                                         └─ Transferência Automática
   └─ Fila ACD (ringall, roundrobin)
          │
          ▼ (WSS Porta 8089 / DTLS-SRTP)
[Webphone Navegador / Ramal PJSIP / PWA com Push]`}
                  </pre>
                </div>
              </div>
            </div>
          )}

          {/* CAPÍTULO: IDENTIDADE VISUAL & KIT DE MARCA */}
          {activeTopic === 'brand_assets' && (
            <div className="space-y-6 animate-in fade-in duration-300">
              <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-8">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                  <div>
                    <span className="px-2.5 py-0.5 bg-blue-100 text-blue-800 rounded-full text-[10px] font-black uppercase tracking-wider mb-2 inline-block">
                      Manual de Marca & Design System
                    </span>
                    <h2 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
                      <Palette className="w-6 h-6 text-blue-600" /> Identidade Visual Oficial Enlace-PBX
                    </h2>
                    <p className="text-xs font-medium text-slate-500 mt-1">
                      Conceito, ativos em alta definição, diretrizes cromáticas e downloads para parceiros e apresentações.
                    </p>
                  </div>
                </div>

                {/* Showcase dos Logos */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                  {/* Logo Horizontal */}
                  <div className="p-6 bg-slate-50 border border-slate-200 rounded-2xl flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between mb-4">
                        <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">Logotipo Principal Horizontal</span>
                        <span className="text-[10px] bg-blue-100 text-blue-700 font-bold px-2 py-0.5 rounded">1000 × 480 px</span>
                      </div>
                      <div className="bg-white p-6 rounded-xl border border-slate-200 flex items-center justify-center min-h-[160px] shadow-sm">
                        <img
                          src="/logo.png"
                          alt="Enlace-PBX Logo Principal"
                          className="max-h-24 w-auto object-contain"
                          onError={(e) => {
                            (e.currentTarget as HTMLImageElement).src = '/logo.svg';
                          }}
                        />
                      </div>
                      <p className="text-xs text-slate-500 mt-3 leading-relaxed">
                        Utilizado em cabeçalhos do painel, faturas em PDF, apresentações comerciais e documentos oficiais.
                      </p>
                    </div>
                    <div className="flex items-center gap-2 mt-4 pt-4 border-t border-slate-200">
                      <a
                        href="/logo.png"
                        download="enlace-pbx-logo-principal.png"
                        className="flex-1 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5"
                      >
                        <Download className="w-3.5 h-3.5" /> Baixar PNG HD
                      </a>
                      <a
                        href="/logo.svg"
                        download="enlace-pbx-logo.svg"
                        className="flex-1 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5"
                      >
                        <Download className="w-3.5 h-3.5" /> Baixar Vetor SVG
                      </a>
                    </div>
                  </div>

                  {/* Mascote Redondo / Quadrado */}
                  <div className="p-6 bg-slate-50 border border-slate-200 rounded-2xl flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between mb-4">
                        <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">Ícone & Mascote Oficial</span>
                        <span className="text-[10px] bg-blue-100 text-blue-700 font-bold px-2 py-0.5 rounded">512 × 512 px</span>
                      </div>
                      <div className="bg-white p-6 rounded-xl border border-slate-200 flex items-center justify-center min-h-[160px] shadow-sm">
                        <img
                          src="/logo-icon.png"
                          alt="Mascote Enlace-PBX"
                          className="max-h-28 w-auto object-contain"
                          onError={(e) => {
                            (e.currentTarget as HTMLImageElement).src = '/logo-icon.svg';
                          }}
                        />
                      </div>
                      <p className="text-xs text-slate-500 mt-3 leading-relaxed">
                        Utilizado no favicon, ícone PWA em dispositivos móveis, avatares de bot e menus compactados.
                      </p>
                    </div>
                    <div className="flex items-center gap-2 mt-4 pt-4 border-t border-slate-200">
                      <a
                        href="/logo-icon.png"
                        download="enlace-pbx-mascote-icon.png"
                        className="flex-1 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5"
                      >
                        <Download className="w-3.5 h-3.5" /> Baixar PNG HD
                      </a>
                      <a
                        href="/logo-icon.svg"
                        download="enlace-pbx-mascote.svg"
                        className="flex-1 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5"
                      >
                        <Download className="w-3.5 h-3.5" /> Baixar Vetor SVG
                      </a>
                    </div>
                  </div>
                </div>

                {/* Conceito da Marca e Cores */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                  <div className="p-6 bg-white border border-slate-200 rounded-2xl">
                    <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider mb-3 flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-blue-600" /> A Simbologia do Mascote Polvo
                    </h4>
                    <p className="text-xs text-slate-600 leading-relaxed mb-4">
                      O polvo foi escolhido por representar com perfeição o coração de uma central de telecomunicações de nova geração:
                    </p>
                    <ul className="space-y-2 text-xs text-slate-600">
                      <li className="flex items-start gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                        <span><strong>Múltiplos Canais Simultâneos:</strong> Cada tentáculo simboliza um fluxo de atendimento em paralelo (Voz, WhatsApp, Chat, CRM, IA).</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                        <span><strong>Núcleo Cognitivo IA:</strong> O nó neural luminoso na cabeça indica o processamento em tempo real com Google Gemini.</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                        <span><strong>Headset Profissional:</strong> Representa o compromisso com a telefonia profissional e acústica de alta fidelidade (Opus 48kHz).</span>
                      </li>
                    </ul>
                  </div>

                  <div className="p-6 bg-white border border-slate-200 rounded-2xl">
                    <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider mb-3 flex items-center gap-2">
                      <Palette className="w-4 h-4 text-blue-600" /> Paleta Cromática Corporativa
                    </h4>
                    <div className="space-y-2.5">
                      <div className="flex items-center justify-between p-2.5 bg-slate-50 rounded-xl border border-slate-100">
                        <div className="flex items-center gap-3">
                          <div className="w-6 h-6 rounded-lg bg-[#0066ff] shadow-sm shrink-0" />
                          <div>
                            <span className="text-xs font-bold text-slate-800">Azul Enlace Royal</span>
                            <span className="text-[10px] text-slate-400 block font-mono">#0066ff — Cor primária da marca e botões de ação</span>
                          </div>
                        </div>
                        <span className="text-[10px] font-bold text-slate-500 bg-white px-2 py-0.5 rounded border border-slate-200">Primária</span>
                      </div>

                      <div className="flex items-center justify-between p-2.5 bg-slate-50 rounded-xl border border-slate-100">
                        <div className="flex items-center gap-3">
                          <div className="w-6 h-6 rounded-lg bg-[#38bdf8] shadow-sm shrink-0" />
                          <div>
                            <span className="text-xs font-bold text-slate-800">Ciano Elétrico</span>
                            <span className="text-[10px] text-slate-400 block font-mono">#38bdf8 — Destaques, headset e nó neural IA</span>
                          </div>
                        </div>
                        <span className="text-[10px] font-bold text-slate-500 bg-white px-2 py-0.5 rounded border border-slate-200">Destaque</span>
                      </div>

                      <div className="flex items-center justify-between p-2.5 bg-slate-50 rounded-xl border border-slate-100">
                        <div className="flex items-center gap-3">
                          <div className="w-6 h-6 rounded-lg bg-[#0f172a] shadow-sm shrink-0" />
                          <div>
                            <span className="text-xs font-bold text-slate-800">Slate 900 (Noturno)</span>
                            <span className="text-[10px] text-slate-400 block font-mono">#0f172a — Textos, terminais CLI e barras de navegação</span>
                          </div>
                        </div>
                        <span className="text-[10px] font-bold text-slate-500 bg-white px-2 py-0.5 rounded border border-slate-200">Contraste</span>
                      </div>

                      <div className="flex items-center justify-between p-2.5 bg-slate-50 rounded-xl border border-slate-100">
                        <div className="flex items-center gap-3">
                          <div className="w-6 h-6 rounded-lg bg-[#10b981] shadow-sm shrink-0" />
                          <div>
                            <span className="text-xs font-bold text-slate-800">Verde Esmeralda Operacional</span>
                            <span className="text-[10px] text-slate-400 block font-mono">#10b981 — Status online, chamadas ativas e sucesso</span>
                          </div>
                        </div>
                        <span className="text-[10px] font-bold text-slate-500 bg-white px-2 py-0.5 rounded border border-slate-200">Status</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* CAPÍTULO: GUIA DE MÓDULOS & RECURSOS INTEGRADOS */}
          {activeTopic === 'modules_guide' && (
            <div className="space-y-6 animate-in fade-in duration-300">
              <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-8">
                <span className="px-2.5 py-0.5 bg-blue-100 text-blue-800 rounded-full text-[10px] font-black uppercase tracking-wider mb-2 inline-block">
                  Visão de Ponta a Ponta
                </span>
                <h2 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2 mb-2">
                  <Layers className="w-6 h-6 text-blue-600" /> Guia Completo dos Módulos do Sistema
                </h2>
                <p className="text-xs font-medium text-slate-500 mb-8 leading-relaxed">
                  O Enlace-PBX opera como um ecossistema integrado unindo voz, inteligência artificial, mensageria e gestão financeira.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Módulo 1: URA Visual & IVR */}
                  <div className="p-6 bg-slate-50 border border-slate-200 rounded-2xl flex flex-col justify-between">
                    <div>
                      <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center mb-4 shadow-sm">
                        <PhoneCall className="w-5 h-5" />
                      </div>
                      <h3 className="text-base font-bold text-slate-900 mb-2">1. URA Interativa Visual (IVR Flow)</h3>
                      <p className="text-xs text-slate-600 leading-relaxed mb-4">
                        Crie fluxos de atendimento em árvore arrastando nós interativos. Defina mensagens gravadas, opções DTMF (1 a 9), transbordo por timeout e rotas para filas ACD ou agentes cognitivos MaIA.
                      </p>
                      <ul className="space-y-1.5 text-xs text-slate-600">
                        <li className="flex items-center gap-2">
                          <Check className="w-3.5 h-3.5 text-emerald-500" /> Simulador de chamadas passo a passo no navegador
                        </li>
                        <li className="flex items-center gap-2">
                          <Check className="w-3.5 h-3.5 text-emerald-500" /> Geração automática de Dialplan <code className="font-mono text-slate-700">extensions.conf</code>
                        </li>
                        <li className="flex items-center gap-2">
                          <Check className="w-3.5 h-3.5 text-emerald-500" /> Gravações de áudio e música em espera (MoH)
                        </li>
                      </ul>
                    </div>
                    {onNavigate && (
                      <button
                        onClick={() => onNavigate('ivr')}
                        className="mt-4 pt-3 border-t border-slate-200 text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1"
                      >
                        Acessar Módulo de URA Visual →
                      </button>
                    )}
                  </div>

                  {/* Módulo 2: AI Gateway & MaIA */}
                  <div className="p-6 bg-slate-50 border border-slate-200 rounded-2xl flex flex-col justify-between">
                    <div>
                      <div className="w-10 h-10 rounded-xl bg-purple-600 text-white flex items-center justify-center mb-4 shadow-sm">
                        <Bot className="w-5 h-5" />
                      </div>
                      <h3 className="text-base font-bold text-slate-900 mb-2">2. Agentes de Voz Cognitivos (MaIA)</h3>
                      <p className="text-xs text-slate-600 leading-relaxed mb-4">
                        Conectados diretamente ao Asterisk via ARI Stasis WebSocket e Google Gemini Flash / Live. Atendem chamadas de forma natural, consultam a base RAG semântica e acionam ferramentas do sistema via function calling.
                      </p>
                      <ul className="space-y-1.5 text-xs text-slate-600">
                        <li className="flex items-center gap-2">
                          <Check className="w-3.5 h-3.5 text-emerald-500" /> Latência inferior a 400ms para fala bidirecional
                        </li>
                        <li className="flex items-center gap-2">
                          <Check className="w-3.5 h-3.5 text-emerald-500" /> Memória de cliente (Customer Memory) persistente
                        </li>
                        <li className="flex items-center gap-2">
                          <Check className="w-3.5 h-3.5 text-emerald-500" /> LLM-as-a-Judge para nota de atendimento e risco de churn
                        </li>
                      </ul>
                    </div>
                    {onNavigate && (
                      <button
                        onClick={() => onNavigate('ai_agents')}
                        className="mt-4 pt-3 border-t border-slate-200 text-xs font-bold text-purple-600 hover:text-purple-700 flex items-center gap-1"
                      >
                        Acessar Agentes de Voz (MaIA) →
                      </button>
                    )}
                  </div>

                  {/* Módulo 3: WhatsApp & Omnichannel */}
                  <div className="p-6 bg-slate-50 border border-slate-200 rounded-2xl flex flex-col justify-between">
                    <div>
                      <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center mb-4 shadow-sm">
                        <MessageSquare className="w-5 h-5" />
                      </div>
                      <h3 className="text-base font-bold text-slate-900 mb-2">3. Contact Center Omnichannel</h3>
                      <p className="text-xs text-slate-600 leading-relaxed mb-4">
                        Caixa de entrada unificada (BFF Express) combinando chamadas de voz com mensagens oficiais do WhatsApp. O Webphone conta com a aba lateral flutuante "Hub Omnichannel", permitindo gerenciar o softphone (chamada ativa, mudo, espera, AMI/ARI) e o chat no mesmo modal de forma lado a lado, sem recarregar a página (React Context State).
                      </p>
                      <ul className="space-y-1.5 text-xs text-slate-600">
                        <li className="flex items-center gap-2">
                          <Check className="w-3.5 h-3.5 text-emerald-500" /> Webhook nativo na porta 443 sem ngrok
                        </li>
                        <li className="flex items-center gap-2">
                          <Check className="w-3.5 h-3.5 text-emerald-500" /> Histórico compartilhado com o CRM Hub
                        </li>
                        <li className="flex items-center gap-2">
                          <Check className="w-3.5 h-3.5 text-emerald-500" /> Distribuição inteligente de mensagens para operadores
                        </li>
                      </ul>
                    </div>
                    {onNavigate && (
                      <button
                        onClick={() => onNavigate('omnichannel')}
                        className="mt-4 pt-3 border-t border-slate-200 text-xs font-bold text-emerald-600 hover:text-emerald-700 flex items-center gap-1"
                      >
                        Acessar Webchat & WhatsApp →
                      </button>
                    )}
                  </div>

                  {/* Módulo 4: Billing, Tarifador & PDF */}
                  <div className="p-6 bg-slate-50 border border-slate-200 rounded-2xl flex flex-col justify-between">
                    <div>
                      <div className="w-10 h-10 rounded-xl bg-amber-600 text-white flex items-center justify-center mb-4 shadow-sm">
                        <CreditCard className="w-5 h-5" />
                      </div>
                      <h3 className="text-base font-bold text-slate-900 mb-2">4. Faturamento, Tarifador & Invoices</h3>
                      <p className="text-xs text-slate-600 leading-relaxed mb-4">
                        Sistema financeiro completo para controle de custos de telefonia. Tarifação por minuto com arredondamento configurável, recarga pré-paga via PIX e exportação de faturas em PDF estilizadas com a logo oficial.
                      </p>
                      <ul className="space-y-1.5 text-xs text-slate-600">
                        <li className="flex items-center gap-2">
                          <Check className="w-3.5 h-3.5 text-emerald-500" /> Débito de saldo em tempo real por chamada completada
                        </li>
                        <li className="flex items-center gap-2">
                          <Check className="w-3.5 h-3.5 text-emerald-500" /> Tabela de tarifas por prefixo (Móvel, Fixo, 0800, DDI)
                        </li>
                        <li className="flex items-center gap-2">
                          <Check className="w-3.5 h-3.5 text-emerald-500" /> Geração de relatórios gerenciais e extratos analíticos
                        </li>
                      </ul>
                    </div>
                    {onNavigate && (
                      <button
                        onClick={() => onNavigate('billing')}
                        className="mt-4 pt-3 border-t border-slate-200 text-xs font-bold text-amber-600 hover:text-amber-700 flex items-center gap-1"
                      >
                        Acessar Módulo Financeiro & Billing →
                      </button>
                    )}
                  </div>

                  {/* Módulo 5: Snapshots & Backup */}
                  <div className="p-6 bg-slate-50 border border-slate-200 rounded-2xl flex flex-col justify-between">
                    <div>
                      <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center mb-4 shadow-sm">
                        <Database className="w-5 h-5" />
                      </div>
                      <h3 className="text-base font-bold text-slate-900 mb-2">5. Snapshots & Proteção Rollback</h3>
                      <p className="text-xs text-slate-600 leading-relaxed mb-4">
                        Gere instantâneos de todo o estado operacional do PABX com 1 clique antes de grandes alterações. Restaure a qualquer momento sem interrupção de chamadas ativas ou perda de gravações.
                      </p>
                      <ul className="space-y-1.5 text-xs text-slate-600">
                        <li className="flex items-center gap-2">
                          <Check className="w-3.5 h-3.5 text-emerald-500" /> Backup automático diário em arquivo JSON/SQL
                        </li>
                        <li className="flex items-center gap-2">
                          <Check className="w-3.5 h-3.5 text-emerald-500" /> Histórico com data, autor e número de registros
                        </li>
                        <li className="flex items-center gap-2">
                          <Check className="w-3.5 h-3.5 text-emerald-500" /> Rollback instantâneo em caso de erro humano
                        </li>
                      </ul>
                    </div>
                    {onNavigate && (
                      <button
                        onClick={() => onNavigate('backup_restore')}
                        className="mt-4 pt-3 border-t border-slate-200 text-xs font-bold text-indigo-600 hover:text-indigo-700 flex items-center gap-1"
                      >
                        Acessar Backup & Snapshots →
                      </button>
                    )}
                  </div>

                  {/* Módulo 6: NOC & Logs de Sistema */}
                  <div className="p-6 bg-slate-50 border border-slate-200 rounded-2xl flex flex-col justify-between">
                    <div>
                      <div className="w-10 h-10 rounded-xl bg-slate-800 text-white flex items-center justify-center mb-4 shadow-sm">
                        <Terminal className="w-5 h-5" />
                      </div>
                      <h3 className="text-base font-bold text-slate-900 mb-2">6. NOC & Terminal Asterisk CLI</h3>
                      <p className="text-xs text-slate-600 leading-relaxed mb-4">
                        Monitoramento contínuo de infraestrutura telefônica. Acompanhe canais PJSIP registrados, latência do pool RTP, utilização de memória e execute comandos no console nativo do Asterisk sem abrir SSH.
                      </p>
                      <ul className="space-y-1.5 text-xs text-slate-600">
                        <li className="flex items-center gap-2">
                          <Check className="w-3.5 h-3.5 text-emerald-500" /> Terminal interativo web conectado via WebSocket
                        </li>
                        <li className="flex items-center gap-2">
                          <Check className="w-3.5 h-3.5 text-emerald-500" /> Streaming de logs com filtros por serviço e severidade
                        </li>
                        <li className="flex items-center gap-2">
                          <Check className="w-3.5 h-3.5 text-emerald-500" /> Alertas proativos de falha de tronco e SIP rejection
                        </li>
                      </ul>
                    </div>
                    {onNavigate && (
                      <button
                        onClick={() => onNavigate('system_logs')}
                        className="mt-4 pt-3 border-t border-slate-200 text-xs font-bold text-slate-700 hover:text-slate-900 flex items-center gap-1"
                      >
                        Acessar NOC & Logs em Tempo Real →
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 3. DEPLOY & PRODUÇÃO LINUX */}
          {activeTopic === 'deploy_guide' && (
            <div className="space-y-6 animate-in fade-in duration-300">
              <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-8">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
                  <div>
                    <span className="px-2.5 py-0.5 bg-blue-100 text-blue-800 rounded-full text-[10px] font-black uppercase tracking-wider mb-2 inline-block">
                      Guia Oficial de Instalação Linux
                    </span>
                    <h2 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
                      <Server className="w-6 h-6 text-blue-600" /> Procedimentos de Deploy & Instalação em Produção
                    </h2>
                  </div>
                  <div className="flex items-center gap-2">
                    {onNavigate && (
                      <button
                        onClick={() => onNavigate('asterisk_installer')}
                        className="text-xs font-bold text-slate-700 hover:text-blue-600 bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-lg border border-slate-200 flex items-center gap-1.5 transition"
                      >
                        <Terminal className="w-3.5 h-3.5" /> Instalador Asterisk
                      </button>
                    )}
                    {onNavigate && (
                      <button
                        onClick={() => onNavigate('infra_settings')}
                        className="text-xs font-bold text-blue-600 hover:text-blue-800 bg-blue-50 px-3 py-1.5 rounded-lg border border-blue-200 flex items-center gap-1.5 transition"
                      >
                        Host, Rede & SSL <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                <p className="text-xs font-medium text-slate-500 mb-6 leading-relaxed">
                  O Enlace-PBX Enterprise foi concebido para rodar como uma pilha de telecomunicações corporativa de alta disponibilidade sobre distribuições Linux <strong>Debian 12 (Bookworm)</strong> ou <strong>Ubuntu Server 22.04/24.04 LTS</strong>.
                </p>

                {/* Bloco de Execução Rápida do Script de Deploy */}
                <div className="p-6 bg-slate-900 text-white rounded-2xl mb-8 border border-slate-800 shadow-lg">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Terminal className="w-5 h-5 text-emerald-400" />
                      <span className="text-sm font-bold font-mono">Deploy Automatizado Tudo-em-Um (deploy.sh)</span>
                    </div>
                    <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded border border-emerald-500/30 font-bold">
                      Recomendado
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 mb-4 leading-relaxed">
                    O script <code className="text-emerald-300 font-mono">deploy.sh</code> instala o Node.js 20, compila o frontend e backend, provisiona opcionalmente o Asterisk 20 com Opus e WebRTC DTLS-SRTP, configura o NGINX com proxy WebSocket, emite o certificado SSL Let's Encrypt e sobe o serviço no PM2:
                  </p>
                  <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 flex items-center justify-between font-mono text-xs text-emerald-400">
                    <code>git clone https://github.com/enlace-telecom/enlace-pbx.git /opt/enlace-pbx && cd /opt/enlace-pbx && chmod +x deploy.sh && sudo ./deploy.sh</code>
                    <button
                      onClick={() => handleCopy('git clone https://github.com/enlace-telecom/enlace-pbx.git /opt/enlace-pbx && cd /opt/enlace-pbx && chmod +x deploy.sh && sudo ./deploy.sh', 'deploy_cmd')}
                      className="ml-4 p-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg transition shrink-0"
                      title="Copiar comando"
                    >
                      {copiedKey === 'deploy_cmd' ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Requisitos de Hardware & Rede */}
                <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider mb-4 flex items-center gap-2">
                  <Cpu className="w-4 h-4 text-blue-600" /> Requisitos de Servidor & Topologia de Rede
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                  <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">PROCESSADOR (CPU)</span>
                    <span className="text-sm font-bold text-slate-900 block mt-1">2 a 4 vCPUs</span>
                    <p className="text-[10px] text-slate-500 mt-1">Essencial para codecs Opus 48kHz e compilação em paralelo.</p>
                  </div>
                  <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">MEMÓRIA RAM</span>
                    <span className="text-sm font-bold text-slate-900 block mt-1">4 GB RAM</span>
                    <p className="text-[10px] text-slate-500 mt-1">Garante buffer de áudio do AudioSocket e instâncias do Node/PM2.</p>
                  </div>
                  <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">DISCO (ARMAZENAMENTO)</span>
                    <span className="text-sm font-bold text-slate-900 block mt-1">25 GB+ SSD NVMe</span>
                    <p className="text-[10px] text-slate-500 mt-1">Gravações WAV em <code>/var/spool/asterisk/recording</code>.</p>
                  </div>
                  <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">ENDEREÇO IP & DNS</span>
                    <span className="text-sm font-bold text-slate-900 block mt-1">1 IPv4 Público Fixo</span>
                    <p className="text-[10px] text-slate-500 mt-1">Apontamento <code>A</code> no DNS para emissão automática do SSL.</p>
                  </div>
                </div>

                {/* Matriz de Portas do Firewall */}
                <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider mb-4 flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" /> Matriz de Portas Obrigatórias no Firewall (UFW / Edge)
                </h3>
                <div className="overflow-x-auto border border-slate-200 rounded-2xl mb-8">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200 uppercase text-[10px]">
                      <tr>
                        <th className="py-2.5 px-4">Porta</th>
                        <th className="py-2.5 px-4">Protocolo</th>
                        <th className="py-2.5 px-4">Serviço / Aplicação</th>
                        <th className="py-2.5 px-4">Finalidade Técnica</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      <tr>
                        <td className="py-2 px-4 font-mono font-bold text-slate-800">22</td>
                        <td className="py-2 px-4 font-mono text-blue-600">TCP</td>
                        <td className="py-2 px-4 font-bold text-slate-700">SSH</td>
                        <td className="py-2 px-4 text-slate-500">Acesso administrativo remoto ao servidor Linux</td>
                      </tr>
                      <tr>
                        <td className="py-2 px-4 font-mono font-bold text-slate-800">80</td>
                        <td className="py-2 px-4 font-mono text-blue-600">TCP</td>
                        <td className="py-2 px-4 font-bold text-slate-700">HTTP / ACME</td>
                        <td className="py-2 px-4 text-slate-500">Validação de desafios Let's Encrypt (Certbot HTTP-01)</td>
                      </tr>
                      <tr className="bg-emerald-50/50">
                        <td className="py-2 px-4 font-mono font-bold text-emerald-700">443</td>
                        <td className="py-2 px-4 font-mono text-blue-600">TCP</td>
                        <td className="py-2 px-4 font-bold text-emerald-800">HTTPS (NGINX)</td>
                        <td className="py-2 px-4 text-slate-600 font-medium">Dashboard Web, PWA, Webphone e Webhooks WhatsApp Cloud</td>
                      </tr>
                      <tr>
                        <td className="py-2 px-4 font-mono font-bold text-slate-800">5060</td>
                        <td className="py-2 px-4 font-mono text-purple-600">UDP</td>
                        <td className="py-2 px-4 font-bold text-slate-700">PJSIP SIP</td>
                        <td className="py-2 px-4 text-slate-500">Sinalização padrão para Softphones e Troncos de Operadoras VoIP</td>
                      </tr>
                      <tr>
                        <td className="py-2 px-4 font-mono font-bold text-slate-800">5061</td>
                        <td className="py-2 px-4 font-mono text-blue-600">TCP</td>
                        <td className="py-2 px-4 font-bold text-slate-700">PJSIP TLS</td>
                        <td className="py-2 px-4 text-slate-500">Sinalização SIP criptografada com certificado TLS</td>
                      </tr>
                      <tr className="bg-blue-50/50">
                        <td className="py-2 px-4 font-mono font-bold text-blue-700">8089</td>
                        <td className="py-2 px-4 font-mono text-blue-600">TCP</td>
                        <td className="py-2 px-4 font-bold text-blue-800">WebRTC WSS</td>
                        <td className="py-2 px-4 text-slate-600 font-medium">WebSocket seguro direto do Asterisk para o Webphone WebRTC</td>
                      </tr>
                      <tr>
                        <td className="py-2 px-4 font-mono font-bold text-slate-800">10000-20000</td>
                        <td className="py-2 px-4 font-mono text-purple-600">UDP</td>
                        <td className="py-2 px-4 font-bold text-slate-700">RTP Pool</td>
                        <td className="py-2 px-4 text-slate-500">Fluxos bidirecionais de áudio de voz (G.711u/a, Opus)</td>
                      </tr>
                      <tr>
                        <td className="py-2 px-4 font-mono font-bold text-slate-800">51820</td>
                        <td className="py-2 px-4 font-mono text-purple-600">UDP</td>
                        <td className="py-2 px-4 font-bold text-slate-700">WireGuard</td>
                        <td className="py-2 px-4 text-slate-500">Túneis seguros de VPN para conectar filiais sem expor portas SIP</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* Comandos de Gestão Operacional */}
                <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider mb-4 flex items-center gap-2">
                  <Wrench className="w-4 h-4 text-blue-600" /> Guia de Comandos Operacionais Pós-Deploy
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-2">
                    <span className="text-xs font-bold text-slate-800 block">Aplicação Web & Backend (PM2)</span>
                    <div className="bg-slate-900 text-slate-200 p-3 rounded-xl font-mono text-xs space-y-1">
                      <div>pm2 status</div>
                      <div>pm2 logs enlace-pbx</div>
                      <div>pm2 restart enlace-pbx</div>
                      <div>pm2 stop enlace-pbx</div>
                    </div>
                  </div>

                  <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-2">
                    <span className="text-xs font-bold text-slate-800 block">Núcleo Asterisk 20 LTS (CLI)</span>
                    <div className="bg-slate-900 text-slate-200 p-3 rounded-xl font-mono text-xs space-y-1">
                      <div>asterisk -rvvvv</div>
                      <div>asterisk -rx "core show channels"</div>
                      <div>asterisk -rx "pjsip show endpoints"</div>
                      <div>asterisk -rx "core reload"</div>
                    </div>
                  </div>

                  <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-2">
                    <span className="text-xs font-bold text-slate-800 block">Servidor Web NGINX & SSL</span>
                    <div className="bg-slate-900 text-slate-200 p-3 rounded-xl font-mono text-xs space-y-1">
                      <div>nginx -t</div>
                      <div>systemctl reload nginx</div>
                      <div>certbot renew --dry-run</div>
                      <div>systemctl status nginx</div>
                    </div>
                  </div>

                  <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-2">
                    <span className="text-xs font-bold text-slate-800 block">Segurança & Firewall UFW</span>
                    <div className="bg-slate-900 text-slate-200 p-3 rounded-xl font-mono text-xs space-y-1">
                      <div>ufw status verbose</div>
                      <div>fail2ban-client status</div>
                      <div>fail2ban-client status asterisk</div>
                      <div>wg show</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 3. INFRAESTRUTURA, REDE & SSL */}
          {activeTopic === 'infra_ssl' && (
            <div className="space-y-6 animate-in fade-in duration-300">
              <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-8">
                <div className="flex items-center justify-between gap-4 mb-4">
                  <h2 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
                    <Globe className="w-6 h-6 text-indigo-600" /> Host, Domínio, Rede LAN/WAN & Certificados SSL/TLS
                  </h2>
                  {onNavigate && (
                    <button
                      onClick={() => onNavigate('infra_settings')}
                      className="text-xs font-bold text-blue-600 hover:text-blue-800 bg-blue-50 px-3 py-1.5 rounded-lg border border-blue-200 flex items-center gap-1.5 transition"
                    >
                      Ir para Configurações de Infraestrutura <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
                <p className="text-xs font-medium text-slate-500 mb-6 leading-relaxed">
                  Para garantir que o áudio trafegue sem bloqueios (resolvendo o clássico problema de "áudio mudo" em ligações externas) e que o navegador permita o uso de Webphone e Webhooks da Meta, a infraestrutura deve estar perfeitamente parametrizada.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                  {/* Bloco 1: NAT Traversal */}
                  <div className="p-5 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
                    <div className="flex items-center gap-2 font-bold text-sm text-slate-900">
                      <Server className="w-4 h-4 text-blue-600" />
                      Por que o IP Público (WAN) é vital?
                    </div>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      Se o seu Asterisk estiver atrás de um roteador ou firewall em nuvem (NAT), pacotes SDP (que negociam onde o áudio deve ser enviado) podem sair com o IP privado da máquina (ex: <code>192.168.1.100</code>). O telefone do cliente na internet não sabe para onde mandar o áudio, resultando em <strong>chamada conectada com silêncio total</strong>.
                    </p>
                    <div className="p-3 bg-white rounded-xl border border-slate-200 text-[11px] font-mono text-slate-700">
                      external_media_address = 189.120.45.10<br/>
                      external_signaling_address = 189.120.45.10<br/>
                      local_net = 192.168.1.0/24
                    </div>
                  </div>

                  {/* Bloco 2: SSL & HTTPS */}
                  <div className="p-5 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
                    <div className="flex items-center gap-2 font-bold text-sm text-slate-900">
                      <Lock className="w-4 h-4 text-emerald-600" />
                      A Regra de Ouro do HTTPS
                    </div>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      Os 3 pilares mais modernos da telefonia atual <strong>exigem obrigatoriamente um certificado SSL/TLS válido</strong>:
                    </p>
                    <ul className="text-xs text-slate-700 space-y-1.5 list-disc list-inside">
                      <li><strong>Webphone WebRTC:</strong> O navegador bloqueia o microfone em HTTP não seguro.</li>
                      <li><strong>PWA & Push:</strong> O Service Worker só registra sob origem HTTPS.</li>
                      <li><strong>WhatsApp Cloud API:</strong> A Meta recusa Webhooks sem SSL na porta 443.</li>
                    </ul>
                  </div>
                </div>

                {/* Comandos Certbot */}
                <div className="border border-slate-200 rounded-2xl p-5 bg-slate-900 text-white">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-bold text-slate-300 flex items-center gap-2">
                      <Terminal className="w-4 h-4 text-emerald-400" /> Geração de Certificado Oficial no Linux (Certbot Let's Encrypt)
                    </span>
                    <button
                      onClick={() => handleCopy("certbot certonly --standalone -d pbx.enlace.slz.br -d enlace.slz.br --agree-tos -m pbx@enlace.slz.br", "certbot_cmd")}
                      className="text-[11px] font-mono bg-slate-800 hover:bg-slate-700 text-slate-200 px-3 py-1 rounded-lg border border-slate-700 flex items-center gap-1.5 transition"
                    >
                      {copiedKey === 'certbot_cmd' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                      Copiar Comando
                    </button>
                  </div>
                  <pre className="text-xs font-mono text-emerald-400 bg-black/40 p-3.5 rounded-xl overflow-x-auto">
certbot certonly --standalone -d pbx.enlace.slz.br -d enlace.slz.br --agree-tos -m pbx@enlace.slz.br
                  </pre>
                  <p className="text-[11px] text-slate-400 mt-3">
                    Após gerar, o script automatizado sincroniza os certificados em <code>/etc/asterisk/keys/</code> e reinicia o transporte PJSIP seguro.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* 3. RAMAIS PJSIP & WEBRTC */}
          {activeTopic === 'pjsip_webrtc' && (
            <div className="space-y-6 animate-in fade-in duration-300">
              <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-8">
                <div className="flex items-center justify-between gap-4 mb-4">
                  <h2 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
                    <Phone className="w-6 h-6 text-blue-600" /> Ramais, Endpoints PJSIP e Webphone
                  </h2>
                  {onNavigate && (
                    <button
                      onClick={() => onNavigate('extensions')}
                      className="text-xs font-bold text-blue-600 hover:text-blue-800 bg-blue-50 px-3 py-1.5 rounded-lg border border-blue-200 flex items-center gap-1.5 transition"
                    >
                      Ir para Gestão de Ramais <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
                <p className="text-xs font-medium text-slate-500 mb-6 leading-relaxed">
                  Diferente do legado <code>chan_sip</code> (descontinuado no Asterisk 21), a stack moderna <strong>chan_pjsip</strong> divide uma conta em 4 entidades complementares: Endpoint, AOR (Address of Record), Auth e Transport.
                </p>

                <div className="space-y-4">
                  <div className="flex gap-4 p-5 bg-slate-50 border border-slate-200 rounded-2xl">
                    <div className="w-12 h-12 bg-white rounded-xl shadow-sm border border-slate-200 flex items-center justify-center shrink-0">
                      <Cpu className="w-6 h-6 text-indigo-600" />
                    </div>
                    <div>
                      <h4 className="font-bold text-sm text-slate-900">Multi-Registro (max_contacts)</h4>
                      <p className="text-xs text-slate-600 font-medium mt-1 leading-relaxed">
                        No PJSIP, um mesmo número de ramal (ex: <strong>1001</strong>) pode estar registrado ao mesmo tempo no telefone de mesa IP, no aplicativo móvel e no Webphone do computador. Ao receber uma chamada, todos tocam simultaneamente via parâmetro <code>max_contacts = 5</code>.
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-4 p-5 bg-slate-50 border border-slate-200 rounded-2xl">
                    <div className="w-12 h-12 bg-white rounded-xl shadow-sm border border-slate-200 flex items-center justify-center shrink-0">
                      <Radio className="w-6 h-6 text-emerald-600" />
                    </div>
                    <div>
                      <h4 className="font-bold text-sm text-slate-900">Como funciona o Webphone (WebRTC / WSS)?</h4>
                      <p className="text-xs text-slate-600 font-medium mt-1 leading-relaxed">
                        O Webphone conecta-se diretamente à porta <strong>8089/tcp</strong> do Asterisk via protocolo <code>wss://</code> (WebSocket Seguro). A sinalização é feita em SIP puro encapsulado em pacotes WebSocket, e os pacotes de áudio são criptografados através de <strong>DTLS-SRTP</strong> com suporte a ICE/STUN para passagem por roteadores de clientes remotos.
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-4 p-5 bg-slate-50 border border-slate-200 rounded-2xl">
                    <div className="w-12 h-12 bg-white rounded-xl shadow-sm border border-slate-200 flex items-center justify-center shrink-0">
                      <Lock className="w-6 h-6 text-rose-600" />
                    </div>
                    <div>
                      <h4 className="font-bold text-sm text-slate-900">Segurança de Senhas de Ramal</h4>
                      <p className="text-xs text-slate-600 font-medium mt-1 leading-relaxed">
                        Senhas fracas de ramal (como "1234" ou o próprio número do ramal) são o principal alvo de ataques de força bruta no mundo VoIP. O Enlace-PBX impõe senhas criptográficas alfanuméricas aleatórias e isolamento de contexto <code>from-internal</code> com proteção Fail2ban ativada.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 4. ROTAS & TRONCOS */}
          {activeTopic === 'routing_trunks' && (
            <div className="space-y-6 animate-in fade-in duration-300">
              <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-8">
                <div className="flex items-center justify-between gap-4 mb-4">
                  <h2 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
                    <Network className="w-6 h-6 text-blue-600" /> Rotas de Entrada, Saída e Troncos SIP
                  </h2>
                  {onNavigate && (
                    <button
                      onClick={() => onNavigate('trunks')}
                      className="text-xs font-bold text-blue-600 hover:text-blue-800 bg-blue-50 px-3 py-1.5 rounded-lg border border-blue-200 flex items-center gap-1.5 transition"
                    >
                      Ir para Troncos SIP <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
                <p className="text-xs font-medium text-slate-500 mb-6 leading-relaxed">
                  O tronco SIP é o canal que conecta sua central telefônica com a PSTN (Rede Pública Comutada de Telefonia). As rotas de saída definem qual operadora usar com base no número discado, e as rotas de entrada direcionam as ligações dos seus DIDs para atendentes, URAs ou Inteligência Artificial.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                  <div className="border border-slate-200 rounded-2xl p-5 bg-white">
                    <h4 className="font-bold text-sm text-slate-900 mb-3 flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-blue-600" /> Padrões de Discagem (Dial Patterns)
                    </h4>
                    <ul className="text-xs text-slate-600 space-y-2">
                      <li><code className="bg-slate-100 px-1.5 py-0.5 rounded text-blue-700 font-bold">_0[1-9][1-9]9XXXXXXXX</code>: Celular DDD Brasil (ex: 011988887777)</li>
                      <li><code className="bg-slate-100 px-1.5 py-0.5 rounded text-blue-700 font-bold">_0[1-9][1-9][2-5]XXXXXXX</code>: Fixo DDD Brasil</li>
                      <li><code className="bg-slate-100 px-1.5 py-0.5 rounded text-blue-700 font-bold">_0800XXXXXXX</code>: Números gratuitos 0800</li>
                      <li><code className="bg-slate-100 px-1.5 py-0.5 rounded text-blue-700 font-bold">_1XXX</code>: Chamadas internas entre ramais de 4 dígitos</li>
                    </ul>
                  </div>

                  <div className="border border-slate-200 rounded-2xl p-5 bg-white">
                    <h4 className="font-bold text-sm text-slate-900 mb-3 flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-emerald-600" /> Failover & Rota de Menor Custo (LCR)
                    </h4>
                    <p className="text-xs text-slate-600 leading-relaxed mb-3">
                      Ao configurar uma rota de saída, você pode atribuir múltiplos troncos em ordem de prioridade. Se o <strong>Tronco Primário</strong> retornar status de congestionamento (SIP 503 Service Unavailable), o Asterisk tenta automaticamente o <strong>Tronco Secundário</strong> sem que o usuário perceba a falha.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 5. ACD, FILAS & SLA */}
          {activeTopic === 'acd_queues' && (
            <div className="space-y-6 animate-in fade-in duration-300">
              <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-8">
                <div className="flex items-center justify-between gap-4 mb-4">
                  <h2 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
                    <Layers className="w-6 h-6 text-purple-600" /> Filas de Atendimento (ACD), URAs & SLA
                  </h2>
                  {onNavigate && (
                    <button
                      onClick={() => onNavigate('queues')}
                      className="text-xs font-bold text-blue-600 hover:text-blue-800 bg-blue-50 px-3 py-1.5 rounded-lg border border-blue-200 flex items-center gap-1.5 transition"
                    >
                      Ir para Gestão de Filas <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
                <p className="text-xs font-medium text-slate-500 mb-6 leading-relaxed">
                  O módulo ACD (Automatic Call Distributor) organiza os atendentes em grupos de atendimento, reproduz músicas de espera (MoH), avisa a posição do cliente na fila e distribui as ligações de acordo com algoritmos estocásticos.
                </p>

                <h3 className="font-bold text-sm text-slate-900 uppercase tracking-wider mb-4 border-b border-slate-100 pb-2">
                  Estratégias de Toque dos Operadores
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                  <div className="border border-slate-200 rounded-xl p-4 bg-white hover:border-blue-300 transition-colors">
                    <div className="font-mono text-xs font-black text-blue-700 bg-blue-50 inline-block px-2 py-0.5 rounded mb-2">ringall</div>
                    <p className="text-xs font-medium text-slate-600 leading-relaxed">
                      Toca em todos os ramais da fila simultaneamente. O primeiro atendente a retirar o fone do gancho assume a chamada. Recomendado para recepção e equipes de emergência.
                    </p>
                  </div>
                  <div className="border border-slate-200 rounded-xl p-4 bg-white hover:border-blue-300 transition-colors">
                    <div className="font-mono text-xs font-black text-blue-700 bg-blue-50 inline-block px-2 py-0.5 rounded mb-2">roundrobin / rrmemory</div>
                    <p className="text-xs font-medium text-slate-600 leading-relaxed">
                      Distribuição circular balanceada. Se o atendente A atendeu por último, o próximo cliente é direcionado ao atendente B, garantindo carga de trabalho equivalente.
                    </p>
                  </div>
                  <div className="border border-slate-200 rounded-xl p-4 bg-white hover:border-blue-300 transition-colors">
                    <div className="font-mono text-xs font-black text-blue-700 bg-blue-50 inline-block px-2 py-0.5 rounded mb-2">fewestcalls</div>
                    <p className="text-xs font-medium text-slate-600 leading-relaxed">
                      Prioriza o operador que atendeu o menor número de ligações completadas durante a jornada de trabalho atual.
                    </p>
                  </div>
                  <div className="border border-slate-200 rounded-xl p-4 bg-white hover:border-blue-300 transition-colors">
                    <div className="font-mono text-xs font-black text-blue-700 bg-blue-50 inline-block px-2 py-0.5 rounded mb-2">leastrecent</div>
                    <p className="text-xs font-medium text-slate-600 leading-relaxed">
                      Toca no ramal que terminou sua última ligação há mais tempo (operador mais ocioso no momento).
                    </p>
                  </div>
                </div>

                <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl flex items-start gap-3">
                  <Info className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
                  <div className="text-xs text-amber-900 leading-relaxed">
                    <strong>Regras de Transbordo (Timeout & Capacidade Máxima):</strong> Se uma chamada aguardar mais que o tempo limite configurado (ex: 60 segundos) ou se a fila estiver com o número máximo de chamadores na espera, o fluxo pode transbordar automaticamente para o <strong>Agente Cognitivo MaIA</strong> ou para a caixa postal de voz.
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 6. IA MAIA (GOOGLE GEMINI) */}
          {activeTopic === 'ai_maia' && (
            <div className="space-y-6 animate-in fade-in duration-300">
              <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-8">
                <div className="flex items-center justify-between gap-4 mb-4">
                  <h2 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
                    <Bot className="w-6 h-6 text-blue-600" /> Inteligência Artificial Cognitiva (MaIA & Google Gemini)
                  </h2>
                  {onNavigate && (
                    <button
                      onClick={() => onNavigate('ai_agents')}
                      className="text-xs font-bold text-blue-600 hover:text-blue-800 bg-blue-50 px-3 py-1.5 rounded-lg border border-blue-200 flex items-center gap-1.5 transition"
                    >
                      Configurar Agentes de Voz <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
                <p className="text-xs font-medium text-slate-500 mb-6 leading-relaxed">
                  O Enlace-PBX não utiliza simples robôs de árvore de discagem com voz mecânica. A tecnologia <strong>MaIA</strong> conecta o fluxo de áudio da chamada telefônica diretamente aos modelos multimodais do Google Gemini via WebSocket de baixa latência e ARI Stasis.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                  <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl">
                    <Sparkles className="w-5 h-5 text-indigo-600 mb-2" />
                    <h4 className="font-bold text-xs text-slate-900 mb-1">RAG de Conhecimento</h4>
                    <p className="text-[11px] text-slate-600 leading-relaxed">
                      Carregue manuais, PDFs e FAQs da empresa. O Gemini pesquisa semanticamente e responde perguntas de suporte ou vendas com precisão corporativa.
                    </p>
                  </div>

                  <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl">
                    <Wrench className="w-5 h-5 text-blue-600 mb-2" />
                    <h4 className="font-bold text-xs text-slate-900 mb-1">Function Calling (Tools)</h4>
                    <p className="text-[11px] text-slate-600 leading-relaxed">
                      O agente pode consultar status de pedido no ERP, emitir 2ª via de boleto, consultar CPF ou transferir para um ramal específico chamando funções do sistema.
                    </p>
                  </div>

                  <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl">
                    <Cpu className="w-5 h-5 text-emerald-600 mb-2" />
                    <h4 className="font-bold text-xs text-slate-900 mb-1">STT & TTS de Baixa Latência</h4>
                    <p className="text-[11px] text-slate-600 leading-relaxed">
                      Streaming de áudio full-duplex com detecção de interrupção (Barge-in). Se o cliente falar por cima, a IA interrompe sua própria fala imediatamente.
                    </p>
                  </div>
                </div>

                <div className="border border-slate-200 rounded-2xl p-5 bg-slate-900 text-white font-mono text-xs">
                  <div className="text-emerald-400 font-bold mb-2">// Como vincular um número DID diretamente à MaIA:</div>
                  <pre className="text-slate-300 leading-relaxed overflow-x-auto">
{`[from-trunk]
exten => 1140049999,1,NoOp(Chamada direcionada ao Agente MaIA)
 same => n,Answer()
 same => n,Stasis(maia-voice-gateway,pt_BR,vendas_suporte)
 same => n,Hangup()`}
                  </pre>
                </div>
              </div>
            </div>
          )}

          {/* 7. WHATSAPP & PWA */}
          {activeTopic === 'whatsapp_pwa' && (
            <div className="space-y-6 animate-in fade-in duration-300">
              <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-8">
                <div className="flex items-center justify-between gap-4 mb-4">
                  <h2 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
                    <MessageSquare className="w-6 h-6 text-emerald-600" /> WhatsApp Oficial Meta Cloud & PWA com Notificações Push
                  </h2>
                  {onNavigate && (
                    <button
                      onClick={() => onNavigate('whatsapp_sessions')}
                      className="text-xs font-bold text-emerald-700 hover:text-emerald-900 bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-200 flex items-center gap-1.5 transition"
                    >
                      Ir para WhatsApp Sessions <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
                <p className="text-xs font-medium text-slate-500 mb-6 leading-relaxed">
                  O Enlace-PBX opera como plataforma omnichannel integrada, unindo voz e mensageria instantânea com suporte aos requisitos da Meta e da W3C.
                </p>

                <div className="space-y-4 mb-6">
                  <div className="border border-slate-200 rounded-2xl p-5 bg-slate-50">
                    <h4 className="font-bold text-sm text-slate-900 mb-2 flex items-center gap-2">
                      <MessageSquare className="w-4 h-4 text-emerald-600" /> Requisitos do Webhook da Meta (Cloud API)
                    </h4>
                    <p className="text-xs text-slate-600 leading-relaxed mb-3">
                      A Meta exige que o endpoint de callback esteja respondendo com código HTTP 200 ao desafio <code>hub.challenge</code>, utilize porta padrão <strong>443 (HTTPS)</strong> e possua certificado SSL assinado por uma autoridade confiável.
                    </p>
                    <div className="p-3 bg-white rounded-xl border border-slate-200 font-mono text-[11px] text-slate-700">
                      URL do Webhook: https://pbx.seudominio.com.br/api/v1/webhooks/whatsapp<br/>
                      Token de Verificação: Definido na tela de Infraestrutura e no Meta Developer Portal
                    </div>
                  </div>

                  <div className="border border-slate-200 rounded-2xl p-5 bg-slate-50">
                    <h4 className="font-bold text-sm text-slate-900 mb-2 flex items-center gap-2">
                      <Smartphone className="w-4 h-4 text-indigo-600" /> PWA (Progressive Web App) & Chaves VAPID
                    </h4>
                    <p className="text-xs text-slate-600 leading-relaxed mb-3">
                      O Enlace-PBX pode ser instalado como aplicativo nativo no Windows, macOS, Android e iOS. Graças ao protocolo <strong>Web Push (RFC 8292)</strong> e chaves VAPID, quando o ramal recebe uma chamada, o computador ou celular exibe a notificação de toque mesmo com a janela do navegador minimizada ou fechada.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 8. SEGURANÇA, FIREWALL & LGPD */}
          {activeTopic === 'security_lgpd' && (
            <div className="space-y-6 animate-in fade-in duration-300">
              <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-8">
                <div className="flex items-center justify-between gap-4 mb-4">
                  <h2 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
                    <ShieldCheck className="w-6 h-6 text-emerald-600" /> Segurança, Firewall, Fail2ban & Conformidade LGPD
                  </h2>
                  {onNavigate && (
                    <button
                      onClick={() => onNavigate('network_security')}
                      className="text-xs font-bold text-blue-600 hover:text-blue-800 bg-blue-50 px-3 py-1.5 rounded-lg border border-blue-200 flex items-center gap-1.5 transition"
                    >
                      Ir para Redes, VPN & Fail2ban <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
                <p className="text-xs font-medium text-slate-500 mb-6 leading-relaxed">
                  A telefonia IP exposta à internet sem controle pode ser vítima de fraudes (Toll Fraud) e ataques. O Enlace aplica múltiplas camadas de defesa ativa Enterprise para proteger o perímetro de rede, a API e os dados sensíveis.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                  <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl">
                    <h4 className="font-bold text-xs text-slate-900 mb-1 flex items-center gap-1.5">
                      <Lock className="w-4 h-4 text-blue-600" /> Autenticação JWT e Headers de Segurança
                    </h4>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      Todas as requisições API são assinadas via tokens JWT (JSON Web Tokens). O backend utiliza Middlewares como Helmet e CORS restritivo para blindar o sistema contra injeções.
                    </p>
                  </div>
                  <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl">
                    <h4 className="font-bold text-xs text-slate-900 mb-1 flex items-center gap-1.5">
                      <Shield className="w-4 h-4 text-rose-600" /> Rate Limiting Dinâmico e Brute Force
                    </h4>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      Bloqueio automático temporário em rotas sensíveis: limite rígido de 10 tentativas por hora em rotas de Login/Autenticação, prevenindo ataques sistemáticos de força bruta.
                    </p>
                  </div>
                  <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl">
                    <h4 className="font-bold text-xs text-slate-900 mb-1 flex items-center gap-1.5">
                      <Zap className="w-4 h-4 text-emerald-600" /> Motor Anti-Fraude e Fail2Ban
                    </h4>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      Se um IP tentar conexões SIP inválidas, ele vai para a quarentena (iptables). Limites rigorosos de chamadas DDI (Internacional) são aplicados por Tenant para evitar Toll Fraud.
                    </p>
                  </div>
                  <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl">
                    <h4 className="font-bold text-xs text-slate-900 mb-1 flex items-center gap-1.5">
                      <FileText className="w-4 h-4 text-purple-600" /> Trilha de Auditoria (Conformidade LGPD)
                    </h4>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      Acessos a recursos críticos ou cópias de backup (Snapshots JSON) geram trilhas registradas imutáveis de SIEM. Controle de acesso total baseado em RBAC de Privilégio Mínimo.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 9. DIAGNÓSTICO & FAQ */}
          {activeTopic === 'troubleshooting' && (
            <div className="space-y-6 animate-in fade-in duration-300">
              <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-8">
                <h2 className="text-xl font-black text-slate-900 tracking-tight mb-2 flex items-center gap-2">
                  <Wrench className="w-6 h-6 text-amber-600" /> Diagnóstico Rápido & Resolução de Problemas Frequentes
                </h2>
                <p className="text-xs font-medium text-slate-500 mb-6 leading-relaxed">
                  Consulte os cenários mais comuns enfrentados no dia a dia de operações de telecomunicações e seus procedimentos de correção.
                </p>

                <div className="space-y-4">
                  {/* Problema 1 */}
                  <div className="border border-slate-200 rounded-2xl p-5 bg-white space-y-2">
                    <div className="flex items-center gap-2 font-bold text-sm text-rose-700">
                      <AlertTriangle className="w-4 h-4 shrink-0" />
                      1. Chamada conecta normalmente, mas ninguém escuta nada (Áudio Unidirecional ou Silêncio)
                    </div>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      <strong>Causa:</strong> Falha de NAT Traversal. Os pacotes SIP foram entregues, mas os pacotes de mídia RTP estão sendo roteados para um IP privado local.
                    </p>
                    <p className="text-xs text-slate-700 bg-slate-50 p-3 rounded-xl border border-slate-200 font-medium">
                      <strong>Solução:</strong> Acesse a aba <strong>Infraestrutura, Domínio & SSL</strong>, clique no botão "Auto-detectar IP Público via STUN", verifique se o IP retornado confere com o da sua internet e salve as alterações para atualizar as chaves <code>external_media_address</code> do PJSIP.
                    </p>
                  </div>

                  {/* Problema 2 */}
                  <div className="border border-slate-200 rounded-2xl p-5 bg-white space-y-2">
                    <div className="flex items-center gap-2 font-bold text-sm text-rose-700">
                      <AlertTriangle className="w-4 h-4 shrink-0" />
                      2. Webphone não registra ou exibe erro "getUserMedia Permission Denied"
                    </div>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      <strong>Causa:</strong> O navegador bloqueou o acesso ao microfone ou a aplicação está sendo acessada sem HTTPS/SSL.
                    </p>
                    <p className="text-xs text-slate-700 bg-slate-50 p-3 rounded-xl border border-slate-200 font-medium">
                      <strong>Solução:</strong> Garanta que o acesso ocorra via domínio oficial com cadeado verde (ex: <code>https://pbx.seudominio.com.br</code>) e que as permissões de microfone do navegador estejam autorizadas no ícone ao lado da barra de endereços.
                    </p>
                  </div>

                  {/* Problema 3 */}
                  <div className="border border-slate-200 rounded-2xl p-5 bg-white space-y-2">
                    <div className="flex items-center gap-2 font-bold text-sm text-rose-700">
                      <AlertTriangle className="w-4 h-4 shrink-0" />
                      3. Chamadas de saída retornam tom de ocupado rápido (SIP 403 Forbidden / 503 Unavailable)
                    </div>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      <strong>Causa:</strong> Operadora rejeitou o Caller ID informado ou o saldo/limite do tronco SIP foi atingido.
                    </p>
                    <p className="text-xs text-slate-700 bg-slate-50 p-3 rounded-xl border border-slate-200 font-medium">
                      <strong>Solução:</strong> Vá em <strong>Troncos SIP</strong>, verifique o status de registro do tronco (Registrado / Online) e certifique-se de que o campo <code>from_user</code> coincide exatamente com o número DID fornecido pelo seu provedor VoIP.
                    </p>
                  </div>
                </div>

                {/* Comandos Úteis do Terminal */}
                <div className="mt-8 pt-6 border-t border-slate-200">
                  <h4 className="font-bold text-xs uppercase tracking-wider text-slate-700 mb-3 flex items-center gap-2">
                    <Terminal className="w-4 h-4 text-slate-500" /> Comandos Úteis no Asterisk CLI
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs font-mono">
                    <div className="p-3 bg-slate-900 text-slate-300 rounded-xl">
                      <span className="text-emerald-400">asterisk -rvvvv</span>
                      <div className="text-[11px] text-slate-400 font-sans mt-1">Conecta ao console com verbosidade alta</div>
                    </div>
                    <div className="p-3 bg-slate-900 text-slate-300 rounded-xl">
                      <span className="text-emerald-400">pjsip show endpoints</span>
                      <div className="text-[11px] text-slate-400 font-sans mt-1">Lista todos os ramais e status de registro</div>
                    </div>
                    <div className="p-3 bg-slate-900 text-slate-300 rounded-xl">
                      <span className="text-emerald-400">core show channels</span>
                      <div className="text-[11px] text-slate-400 font-sans mt-1">Exibe canais e ligações ativas no momento</div>
                    </div>
                    <div className="p-3 bg-slate-900 text-slate-300 rounded-xl">
                      <span className="text-emerald-400">queue show</span>
                      <div className="text-[11px] text-slate-400 font-sans mt-1">Mostra atendentes logados e fila de espera</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 10. GLOSSÁRIO COMPLETO */}
          {activeTopic === 'glossary' && (
            <div className="space-y-6 animate-in fade-in duration-300">
              <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-8">
                <h2 className="text-xl font-black text-slate-900 tracking-tight mb-2">Glossário Técnico Completo & Legendas</h2>
                <p className="text-xs font-medium text-slate-500 mb-8 leading-relaxed">
                  Dicionário de consulta rápida para administradores, supervisores e operadores de telecomunicações.
                </p>

                <div className="space-y-3">
                  {[
                    { term: 'AOR (Address of Record)', desc: 'Objeto PJSIP que armazena a localização e os IPs dos dispositivos associados a uma identidade de ramal.' },
                    { term: 'ARI (Asterisk REST Interface)', desc: 'API WebSocket moderna do Asterisk que possibilita que aplicações externas (como o motor de IA do Enlace) controlem mídia em tempo real via Stasis.' },
                    { term: 'CDR (Call Detail Record)', desc: 'Bilhete detalhado da chamada contendo número de origem, destino, timestamps, duração, tronco e status de conclusão (ANSWERED, BUSY, NO ANSWER).' },
                    { term: 'DID (Direct Inward Dialing)', desc: 'Número telefônico público fornecido pela operadora para receber chamadas diretamente na central.' },
                    { term: 'DTLS-SRTP', desc: 'Datagram Transport Layer Security / Secure Real-time Transport Protocol. Criptografia ponta a ponta obrigatória para áudio em WebRTC.' },
                    { term: 'Fail2ban', desc: 'Sistema de prevenção de intrusão que monitora logs do Asterisk e bloqueia IPs maliciosos no firewall Linux.' },
                    { term: 'FQDN (Fully Qualified Domain Name)', desc: 'Nome de domínio completo na internet (ex: pbx.empresa.com.br) apontando para o IP do seu servidor PBX.' },
                    { term: 'IVR / URA', desc: 'Unidade de Resposta Audível. Menu interativo de autoatendimento que reproduz áudios e direciona chamadas via tons DTMF (teclado).' },
                    { term: 'MoH (Music on Hold)', desc: 'Música ou áudio institucional reproduzido enquanto o chamador está em espera ou na fila de atendimento.' },
                    { term: 'NAT Traversal', desc: 'Técnicas (STUN, ICE, external_media_address) usadas para permitir que áudio VoIP atravesse roteadores domésticos e corporativos.' },
                    { term: 'PJSIP', desc: 'Stack SIP moderna do Asterisk baseada na biblioteca de código aberto Teluu PJSIP, substituindo o obsoleto chan_sip.' },
                    { term: 'PWA (Progressive Web App)', desc: 'Tecnologia que transforma a interface web em aplicativo instalável no computador e celular com suporte a Push Notifications.' },
                    { term: 'RAG (Retrieval-Augmented Generation)', desc: 'Metodologia que permite ao modelo de IA consultar documentos corporativos para responder dúvidas com fatos reais da empresa.' },
                    { term: 'SLA (Service Level Agreement)', desc: 'Acordo de Nível de Serviço. Percentual de chamadas atendidas dentro do tempo meta (ex: 80% das chamadas atendidas em até 20 segundos).' },
                    { term: 'STUN (Session Traversal Utilities for NAT)', desc: 'Protocolo utilizado para descobrir o endereço IP público e porta externa de um servidor ou cliente VoIP.' },
                    { term: 'Tronco SIP (SIP Trunk)', desc: 'Link de comunicação digital que conecta o PABX à rede pública da operadora telefônica via internet.' },
                    { term: 'VAPID (RFC 8292)', desc: 'Voluntary Application Server Identification. Par de chaves criptográficas para autenticar o envio de Web Push com segurança.' },
                    { term: 'WebRTC (WSS)', desc: 'Comunicação em tempo real nativa no navegador sem necessidade de plugins ou softwares externos.' },
                  ].map((item, i) => (
                    <div key={i} className="flex flex-col sm:flex-row sm:items-start gap-2 sm:gap-6 p-4 bg-slate-50 rounded-xl border border-slate-100 hover:border-blue-200 hover:bg-white transition-colors group">
                      <div className="w-full sm:w-1/3 shrink-0">
                        <span className="text-[11px] font-black font-mono text-blue-700 bg-blue-100 px-2 py-1 rounded block w-max">{item.term}</span>
                      </div>
                      <p className="text-xs font-medium text-slate-600 leading-relaxed group-hover:text-slate-800">
                        {item.desc}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

        </div>
      </div>

      {/* Open Source Contribution Footer */}
      <div className="mt-12 pt-6 border-t border-slate-200 text-center flex flex-col items-center justify-center animate-in fade-in duration-700">
        <p className="text-xs text-slate-500 font-medium max-w-2xl">
          O <strong className="text-slate-700">Enlace-PBX</strong> é uma contribuição orgulhosa para a comunidade open-source. Desenvolvido para democratizar a comunicação inteligente no Brasil.
        </p>
        <p className="text-[11px] text-slate-400 mt-2 flex items-center justify-center gap-2 flex-wrap">
          <span>Criado por <strong>André LJP</strong></span>
          <span className="w-1 h-1 rounded-full bg-slate-300" />
          <a href="https://enlace.slz.br" target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:text-blue-600 hover:underline transition">Enlace Telecom (enlace.slz.br)</a>
          <span className="w-1 h-1 rounded-full bg-slate-300" />
          <a href="mailto:pbx@enlace.slz.br" className="hover:text-slate-600 transition">pbx@enlace.slz.br</a>
          <span className="w-1 h-1 rounded-full bg-slate-300" />
          <a href="mailto:slzenlace@gmail.com" className="hover:text-slate-600 transition">slzenlace@gmail.com</a>
        </p>
      </div>
    </div>
  );
};
