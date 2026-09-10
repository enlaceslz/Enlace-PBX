import React, { useState } from 'react';
import { 
  BookOpen, Info, Phone, Bot, Radio, Network, MessageSquare, Shield, 
  HelpCircle, ChevronRight, Zap, ArrowRight, Play, Terminal, Layers
} from 'lucide-react';

export const HelpManualView: React.FC = () => {
  const [activeTopic, setActiveTopic] = useState<'intro' | 'pjsip' | 'routing' | 'ai' | 'acd' | 'glossary'>('intro');

  const topics = [
    { id: 'intro', label: 'Introdução ao Sistema', icon: BookOpen },
    { id: 'pjsip', label: 'Ramais & Endpoints (PJSIP)', icon: Phone },
    { id: 'routing', label: 'Rotas & Troncos SIP', icon: Network },
    { id: 'acd', label: 'Filas, URAs e Distribuição', icon: Layers },
    { id: 'ai', label: 'Inteligência Artificial (MaIA)', icon: Bot },
    { id: 'glossary', label: 'Glossário & Legendas', icon: HelpCircle },
  ] as const;

  return (
    <div className="max-w-[1400px] mx-auto space-y-8 pb-12">
      {/* Premium Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-6">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
            <BookOpen className="w-8 h-8 text-blue-600 fill-blue-600" />
            Centro de Ajuda & Manual Operacional
          </h1>
          <p className="text-sm font-medium text-slate-500 mt-1">
            Guias interativos, arquitetura de fluxos e glossário técnico da plataforma Enlace-PBX.
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <span className="px-3 py-1.5 bg-blue-50 text-blue-700 border border-blue-200 rounded-lg text-xs font-black uppercase tracking-wider flex items-center gap-2 shadow-sm">
            <Info className="w-4 h-4" /> v20.17 LTS Documentação
          </span>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-8">
        
        {/* Sub Navigation Sidebar */}
        <div className="lg:w-72 shrink-0 flex flex-col gap-2">
          <div className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2 px-2">Capítulos do Manual</div>
          
          {topics.map(topic => {
            const Icon = topic.icon;
            const isActive = activeTopic === topic.id;
            return (
              <button
                key={topic.id}
                onClick={() => setActiveTopic(topic.id)}
                className={`px-4 py-3.5 rounded-xl text-sm font-bold transition flex items-center justify-between group ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
                    : 'bg-white text-slate-600 hover:bg-slate-50 hover:text-blue-600 border border-slate-200'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon className="w-5 h-5" /> {topic.label}
                </div>
                <ChevronRight className={`w-4 h-4 ${isActive ? 'text-blue-200' : 'text-slate-300 group-hover:text-blue-400'}`} />
              </button>
            )
          })}

          <div className="mt-6 p-5 bg-slate-900 rounded-2xl border border-slate-800 text-white relative overflow-hidden">
             <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/20 rounded-bl-full blur-2xl -mr-4 -mt-4" />
             <Shield className="w-6 h-6 text-emerald-400 mb-3 relative z-10" />
             <h4 className="font-bold text-sm mb-1 relative z-10">Suporte Técnico LGPD</h4>
             <p className="text-[11px] text-slate-400 font-medium relative z-10">
               Todas as ações são auditadas. Dúvidas sobre acessos? Consulte o log de segurança.
             </p>
          </div>
        </div>
        
        {/* Main Content Area */}
        <div className="flex-1 min-w-0">

          {/* 1. INTRO TAB */}
          {activeTopic === 'intro' && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-8 overflow-hidden relative">
                <div className="absolute right-0 top-0 w-64 h-64 bg-blue-50/50 rounded-bl-full -mr-10 -mt-10 pointer-events-none" />
                <div className="relative z-10 max-w-3xl">
                  <div className="inline-flex items-center gap-2 px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-[10px] font-black uppercase tracking-wider mb-4">
                    <Zap className="w-3 h-3" /> Bem-vindo ao Enlace-PBX
                  </div>
                  <h2 className="text-3xl font-black text-slate-900 tracking-tight mb-4">A união do Asterisk puro com Inteligência Artificial.</h2>
                  <p className="text-sm font-medium text-slate-600 leading-relaxed mb-6">
                    A plataforma foi desenhada para eliminar a complexidade dos antigos painéis de telefonia. Ao invés de lidar com arquivos confidenciais via terminal (CLI), o Enlace abstrai o <strong>Asterisk 20 LTS</strong> através de painéis visuais. Ao mesmo tempo, injetamos agentes cognitivos baseados em <strong>Google Gemini</strong> operando nativamente no barramento de eventos (Stasis/ARI).
                  </p>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-8">
                     <div className="p-5 bg-slate-50 border border-slate-200 rounded-2xl">
                        <Terminal className="w-6 h-6 text-slate-700 mb-3" />
                        <h4 className="font-bold text-sm text-slate-900 mb-1">Coração PJSIP</h4>
                        <p className="text-[11px] text-slate-500 font-medium">Motor SIP moderno do Asterisk, suportando múltiplos endpoints, WebRTC e criptografia nativa.</p>
                     </div>
                     <div className="p-5 bg-blue-50 border border-blue-200 rounded-2xl">
                        <Bot className="w-6 h-6 text-blue-700 mb-3" />
                        <h4 className="font-bold text-sm text-slate-900 mb-1">Agentes MaIA (RAG)</h4>
                        <p className="text-[11px] text-slate-500 font-medium">Integração real-time com Google Gemini para transcrição (STT), síntese (TTS) e navegação semântica.</p>
                     </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 2. PJSIP TAB */}
          {activeTopic === 'pjsip' && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-8">
                 <h2 className="text-xl font-black text-slate-900 tracking-tight mb-2">Ramais (PJSIP) & Endpoints</h2>
                 <p className="text-xs font-medium text-slate-500 mb-8">
                   No novo padrão PJSIP, separamos a "Identidade" (AOR) do "Dispositivo" (Endpoint). Isso significa que um único ramal pode estar logado no celular e no computador simultaneamente.
                 </p>

                 <div className="space-y-6">
                    <div className="flex gap-4 p-5 bg-slate-50 border border-slate-200 rounded-2xl">
                       <div className="w-12 h-12 bg-white rounded-xl shadow-sm border border-slate-200 flex items-center justify-center shrink-0">
                         <Phone className="w-6 h-6 text-blue-600" />
                       </div>
                       <div>
                         <h4 className="font-bold text-sm text-slate-900">O que é WebRTC (WSS)?</h4>
                         <p className="text-[11px] text-slate-600 font-medium mt-1">
                           Web Real-Time Communication. Permite que o Webphone funcione diretamente no navegador via websockets seguros (WSS), sem precisar instalar aplicativos de softphone como Zoiper ou MicroSIP.
                         </p>
                       </div>
                    </div>

                    <div className="flex gap-4 p-5 bg-slate-50 border border-slate-200 rounded-2xl">
                       <div className="w-12 h-12 bg-white rounded-xl shadow-sm border border-slate-200 flex items-center justify-center shrink-0">
                         <Info className="w-6 h-6 text-purple-600" />
                       </div>
                       <div>
                         <h4 className="font-bold text-sm text-slate-900">Como funciona o Contexto (Dialplan)?</h4>
                         <p className="text-[11px] text-slate-600 font-medium mt-1">
                           O contexto é o "universo" de permissões de um ramal. Um ramal no contexto <code>from-internal</code> pode ligar para outros ramais. Se estiver no contexto <code>from-external</code>, ele possui restrições severas.
                         </p>
                       </div>
                    </div>
                 </div>
              </div>
            </div>
          )}

          {/* 3. ACD / QUEUES TAB */}
          {activeTopic === 'acd' && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-8">
                 <h2 className="text-xl font-black text-slate-900 tracking-tight mb-2">Filas (ACD) e Distribuição Inteligente</h2>
                 <p className="text-xs font-medium text-slate-500 mb-8">
                   ACD (Automatic Call Distributor) é a engrenagem que roteia chamadas entrantes para o atendente correto baseado em regras matemáticas.
                 </p>

                 <h3 className="font-bold text-sm text-slate-900 uppercase tracking-wider mb-4 border-b border-slate-100 pb-2">Estratégias de Toque (Ring Strategies)</h3>
                 
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                   <div className="border border-slate-200 rounded-xl p-4 bg-white hover:border-blue-300 transition-colors">
                      <div className="font-mono text-xs font-black text-blue-700 bg-blue-50 inline-block px-2 py-0.5 rounded mb-2">ringall</div>
                      <p className="text-[11px] font-medium text-slate-600">Toca em todos os ramais da fila simultaneamente. O primeiro que atender, leva a ligação. Ideal para setores críticos onde a velocidade de atendimento é a prioridade.</p>
                   </div>
                   <div className="border border-slate-200 rounded-xl p-4 bg-white hover:border-blue-300 transition-colors">
                      <div className="font-mono text-xs font-black text-blue-700 bg-blue-50 inline-block px-2 py-0.5 rounded mb-2">roundrobin</div>
                      <p className="text-[11px] font-medium text-slate-600">Distribui em formato de roleta. Se a última chamada foi para o João, a próxima vai para a Maria, garantindo equidade de trabalho na equipe.</p>
                   </div>
                   <div className="border border-slate-200 rounded-xl p-4 bg-white hover:border-blue-300 transition-colors">
                      <div className="font-mono text-xs font-black text-blue-700 bg-blue-50 inline-block px-2 py-0.5 rounded mb-2">fewestcalls</div>
                      <p className="text-[11px] font-medium text-slate-600">Encaminha a ligação para o operador que atendeu o menor número de chamadas durante o dia.</p>
                   </div>
                   <div className="border border-slate-200 rounded-xl p-4 bg-white hover:border-blue-300 transition-colors">
                      <div className="font-mono text-xs font-black text-blue-700 bg-blue-50 inline-block px-2 py-0.5 rounded mb-2">leastrecent</div>
                      <p className="text-[11px] font-medium text-slate-600">Toca no ramal que está ocioso há mais tempo (quem desligou a última chamada há mais minutos).</p>
                   </div>
                 </div>

                 <h3 className="font-bold text-sm text-slate-900 uppercase tracking-wider mb-4 border-b border-slate-100 pb-2">O que é SLA (Service Level Agreement)?</h3>
                 <p className="text-xs text-slate-600 font-medium bg-slate-50 p-4 rounded-xl border border-slate-100">
                   É o tempo alvo de atendimento. Se você define um SLA de 20 segundos, o sistema monitora quantas chamadas foram atendidas antes de 20 segundos. Se o cliente demorar 25 segundos na fila, a chamada conta como "Fora do SLA", impactando as métricas do painel do NOC.
                 </p>
              </div>
            </div>
          )}

          {/* 6. GLOSSARY TAB */}
          {activeTopic === 'glossary' && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-8">
                 <h2 className="text-xl font-black text-slate-900 tracking-tight mb-2">Glossário Técnico (Legendas)</h2>
                 <p className="text-xs font-medium text-slate-500 mb-8">
                   Dicionário rápido para ajudar operadores e gerentes a entenderem a nomenclatura de telefonia IP.
                 </p>

                 <div className="space-y-3">
                   {[
                     { term: 'CDR (Call Detail Record)', desc: 'Registro detalhado de chamadas. Contém a origem, destino, tempo falado e status. É o "extrato bancário" do PABX.' },
                     { term: 'DID (Direct Inward Dialing)', desc: 'Número fixo ou 0800 público. É o número que o cliente liga de fora para cair na sua central.' },
                     { term: 'Tronco SIP (SIP Trunk)', desc: 'O canal de comunicação fornecido pela operadora (ex: Vivo, Claro) que conecta o seu Asterisk à rede pública de telefonia mundial.' },
                     { term: 'URA (IVR)', desc: 'Unidade de Resposta Audível (Interactive Voice Response). É o robô de menu inicial: "Disque 1 para vendas, 2 para suporte".' },
                     { term: 'RAG (Retrieval-Augmented Generation)', desc: 'Técnica de Inteligência Artificial onde o Gemini consulta a base de conhecimento da sua empresa (CRM/Manuais) antes de responder ao cliente por voz.' },
                     { term: 'ARI (Asterisk REST Interface)', desc: 'A API moderna do Asterisk que permite que linguagens como Node.js (e o Gemini) controlem canais de áudio em tempo real (Stasis).' },
                     { term: 'MoH (Music on Hold)', desc: 'Música de espera. O áudio que o cliente escuta enquanto está na fila ou quando é colocado em pausa.' },
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
    </div>
  );
};
