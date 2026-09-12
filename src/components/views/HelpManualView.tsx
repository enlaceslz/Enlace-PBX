import React, { useState, useMemo } from 'react';
import { 
  BookOpen, Info, Phone, Bot, Radio, Network, MessageSquare, Shield, 
  HelpCircle, ChevronRight, Zap, ArrowRight, Play, Terminal, Layers,
  Globe, Lock, Cpu, Server, FileText, CheckCircle2, AlertTriangle,
  Copy, Check, Search, Download, ExternalLink, Wrench, Sparkles,
  Smartphone, Share2, Bell, ShieldCheck, Database, Sliders, RefreshCw
} from 'lucide-react';
import { ActiveView } from '../Sidebar';

interface HelpManualViewProps {
  onNavigate?: (view: ActiveView) => void;
}

type ChapterId = 
  | 'intro'
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
    { id: 'infra_ssl', label: 'Host, Domínio, Rede & SSL', badge: 'Novo', icon: Globe, description: 'Configuração de IP WAN/LAN, NAT Traversal e Certificados HTTPS' },
    { id: 'pjsip_webrtc', label: 'Ramais PJSIP & Webphone', icon: Phone, description: 'Endpoints, transportes TLS/WSS, WebRTC e softphones' },
    { id: 'routing_trunks', label: 'Rotas, Troncos SIP & DIDs', icon: Network, description: 'Planos de discagem, operadoras VoIP e rotas de entrada/saída' },
    { id: 'acd_queues', label: 'Filas (ACD), URAs & SLA', icon: Layers, description: 'Estratégias de atendimento, IVR multinível e regras de transbordo' },
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
      {/* Header com Busca e Status */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 bg-blue-100 text-blue-800 rounded-full text-[10px] font-black uppercase tracking-wider">
              Documentação Oficial v20.17 LTS
            </span>
            <span className="px-2.5 py-0.5 bg-emerald-100 text-emerald-800 rounded-full text-[10px] font-black uppercase tracking-wider flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" /> Sistema Verificado
            </span>
          </div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
            <BookOpen className="w-8 h-8 text-blue-600 fill-blue-600" />
            Centro de Ajuda, Manuais & Documentação
          </h1>
          <p className="text-sm font-medium text-slate-500 mt-1">
            Guias práticos, arquitetura de rede, procedimentos operacionais e resolução rápida de problemas.
          </p>
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
                href="mailto:slzenlace@gmail.com"
                className="block text-center text-xs font-bold bg-blue-600 hover:bg-blue-500 py-2 rounded-lg transition"
              >
                Abrir Chamado Técnico
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

          {/* 2. INFRAESTRUTURA, REDE & SSL */}
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
                      onClick={() => handleCopy("certbot certonly --standalone -d pbx.seudominio.com.br --agree-tos -m contato@seudominio.com.br", "certbot_cmd")}
                      className="text-[11px] font-mono bg-slate-800 hover:bg-slate-700 text-slate-200 px-3 py-1 rounded-lg border border-slate-700 flex items-center gap-1.5 transition"
                    >
                      {copiedKey === 'certbot_cmd' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                      Copiar Comando
                    </button>
                  </div>
                  <pre className="text-xs font-mono text-emerald-400 bg-black/40 p-3.5 rounded-xl overflow-x-auto">
certbot certonly --standalone -d pbx.seudominio.com.br --agree-tos -m contato@seudominio.com.br
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
                  A telefonia IP exposta à internet sem controle pode ser vítima de fraudes de terminação telefônica internacional (toll fraud). O Enlace aplica 4 camadas de defesa ativa para proteger a empresa.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                  <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl">
                    <h4 className="font-bold text-xs text-slate-900 mb-1 flex items-center gap-1.5">
                      <Shield className="w-4 h-4 text-blue-600" /> Fail2ban Ativo (Jail Asterisk)
                    </h4>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      Se um IP externo errar a senha de um ramal ou tentar conexões SIP não autorizadas 3 vezes em 60 segundos, o IP é imediatamente banido no <code>iptables</code> por 24 horas.
                    </p>
                  </div>

                  <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl">
                    <h4 className="font-bold text-xs text-slate-900 mb-1 flex items-center gap-1.5">
                      <Lock className="w-4 h-4 text-indigo-600" /> Túneis WireGuard VPN
                    </h4>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      Para filiais ou home-office de alto sigilo, os ramais e troncos conectam-se via VPN criptografada moderna, fechando as portas SIP para a internet pública.
                    </p>
                  </div>

                  <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl">
                    <h4 className="font-bold text-xs text-slate-900 mb-1 flex items-center gap-1.5">
                      <FileText className="w-4 h-4 text-purple-600" /> Conformidade LGPD & Trilha de Auditoria
                    </h4>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      Gravações de chamadas contêm dados sensíveis. O sistema grava os registros de acesso (quem ouviu o áudio, quando e de qual IP) em logs imutáveis com retenção parametrizável.
                    </p>
                  </div>

                  <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl">
                    <h4 className="font-bold text-xs text-slate-900 mb-1 flex items-center gap-1.5">
                      <Sliders className="w-4 h-4 text-emerald-600" /> Controle de Acesso Baseado em Papéis (RBAC)
                    </h4>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      Perfis de acesso granulares (Superadmin, Administrador de Empresa, Supervisor de Call Center e Agente de Atendimento) com restrição de visualização.
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
          <a href="https://enlace.slz.br" target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:text-blue-600 hover:underline transition">Enlace Telecom</a>
          <span className="w-1 h-1 rounded-full bg-slate-300" />
          <a href="mailto:slzenlace@gmail.com" className="hover:text-slate-600 transition">slzenlace@gmail.com</a>
        </p>
      </div>
    </div>
  );
};
