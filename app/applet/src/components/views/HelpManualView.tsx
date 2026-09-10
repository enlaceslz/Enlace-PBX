import React, { useState } from 'react';
import { 
  BookOpen, Info, Phone, Bot, Radio, Network, MessageSquare, Shield, 
  HelpCircle, ChevronRight, Zap, ArrowRight, Play, Terminal, Layers,
  Video, Database, HardDrive, Lock, Server
} from 'lucide-react';

export const HelpManualView: React.FC = () => {
  const [activeTopic, setActiveTopic] = useState<'intro' | 'pjsip' | 'routing' | 'acd' | 'ai' | 'infra' | 'glossary'>('intro');

  const topics = [
    { id: 'intro', label: 'Introdução ao Sistema', icon: BookOpen },
    { id: 'pjsip', label: 'Ramais, PJSIP e Vídeo', icon: Phone },
    { id: 'routing', label: 'Rotas & Troncos SIP', icon: Network },
    { id: 'acd', label: 'Filas, URAs e Distribuição', icon: Layers },
    { id: 'ai', label: 'Inteligência Artificial (MaIA)', icon: Bot },
    { id: 'infra', label: 'Infraestrutura & Backups', icon: Database },
    { id: 'glossary', label: 'Glossário & Legendas', icon: HelpCircle },
  ] as const;

  return (
    <div className="max-w-[1400px] mx-auto space-y-8 pb-12">
      {/* Premium Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-6">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
            <BookOpen className="w-8 h-8 text-blue-600 fill-blue-600" />
            Centro de Ajuda & Documentação Completa
          </h1>
          <p className="text-sm font-medium text-slate-500 mt-1">
            Guias interativos, arquitetura de fluxos, segurança e glossário técnico da plataforma Enlace-PBX.
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
               Todas as ações são auditadas. Dúvidas sobre acessos? Consulte o log de segurança na aba de Auditoria.
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
                        <p className="text-[11px] text-slate-500 font-medium">Integração real-time com IA generativa para transcrição (STT), síntese (TTS) e navegação semântica avançada.</p>
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
                 <h2 className="text-xl font-black text-slate-900 tracking-tight mb-2">Ramais (PJSIP), WebRTC e Vídeo</h2>
                 <p className="text-xs font-medium text-slate-500 mb-8">
                   No novo padrão PJSIP, separamos a "Identidade" (AOR) do "Dispositivo" (Endpoint). Isso significa que um único ramal pode estar logado no celular e no computador simultaneamente.
                 </p>

                 <div className="space-y-6">
                    <div className="flex gap-4 p-5 bg-slate-50 border border-slate-200 rounded-2xl">
                       <div className="w-12 h-12 bg-white rounded-xl shadow-sm border border-slate-200 flex items-center justify-center shrink-0">
                         <Phone className="w-6 h-6 text-blue-600" />
                       </div>
                       <div>
                         <h4 className="font-bold text-sm text-slate-900">WebRTC Nativo (WSS e DTLS)</h4>
                         <p className="text-[11px] text-slate-600 font-medium mt-1">
                           Web Real-Time Communication. Permite que o Webphone integrado funcione diretamente no navegador via websockets seguros (WSS) com criptografia DTLS, sem precisar instalar aplicativos externos de softphone.
                         </p>
                       </div>
                    </div>

                    <div className="flex gap-4 p-5 bg-slate-50 border border-slate-200 rounded-2xl">
                       <div className="w-12 h-12 bg-white rounded-xl shadow-sm border border-slate-200 flex items-center justify-center shrink-0">
                         <Video className="w-6 h-6 text-purple-600" />
                       </div>
                       <div>
                         <h4 className="font-bold text-sm text-slate-900">Suporte a Chamadas de Vídeo</h4>
                         <p className="text-[11px] text-slate-600 font-medium mt-1">
                           O Enlace-PBX agora suporta Vídeo ponto a ponto (P2P). Ao habilitar a flag de vídeo em um ramal, liberamos os codecs <strong>VP8</strong> e <strong>H.264</strong>, permitindo que interfones IP ou webcams transmitam vídeo nativo junto ao áudio Opus.
                         </p>
                       </div>
                    </div>

                    <div className="flex gap-4 p-5 bg-slate-50 border border-slate-200 rounded-2xl">
                       <div className="w-12 h-12 bg-white rounded-xl shadow-sm border border-slate-200 flex items-center justify-center shrink-0">
                         <Info className="w-6 h-6 text-slate-600" />
                       </div>
                       <div>
                         <h4 className="font-bold text-sm text-slate-900">Dialplan Context (Contextos de Segurança)</h4>
                         <p className="text-[11px] text-slate-600 font-medium mt-1">
                           O contexto é o "universo" de permissões de um ramal. Um ramal no contexto <code>from-internal</code> pode ligar para outros ramais. Se estiver no contexto <code>from-external</code>, ele possui restrições severas.
                         </p>
                       </div>
                    </div>
                 </div>
              </div>
            </div>
          )}

          {/* 3. ROUTING & TRUNKS TAB */}
          {activeTopic === 'routing' && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-8">
                 <h2 className="text-xl font-black text-slate-900 tracking-tight mb-2">Rotas & Troncos SIP</h2>
                 <p className="text-xs font-medium text-slate-500 mb-8">
                   Como o Enlace-PBX se comunica com o mundo externo (Operadoras e Gateways).
                 </p>

                 <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                    <div className="border border-slate-200 rounded-2xl p-5 bg-slate-50">
                       <Network className="w-6 h-6 text-emerald-600 mb-3" />
                       <h4 className="font-bold text-sm text-slate-900 mb-2">Troncos SIP (Trunks)</h4>
                       <p className="text-xs font-medium text-slate-600 mb-4">
                         É a conexão direta com provedores de telefonia (ex: Claro, Vivo) ou Gateways GSM. Eles recebem as chamadas do mundo real e convertem em pacotes IP para o PBX.
                       </p>
                       <ul className="text-[11px] font-medium text-slate-500 space-y-1 list-disc pl-4">
                         <li>Suporte a registro IP ou Autenticação via Senha.</li>
                         <li>Controle de canais simultâneos (Channels limit).</li>
                         <li>Transcodificação de Codecs automática.</li>
                       </ul>
                    </div>

                    <div className="border border-slate-200 rounded-2xl p-5 bg-slate-50">
                       <Server className="w-6 h-6 text-blue-600 mb-3" />
                       <h4 className="font-bold text-sm text-slate-900 mb-2">DID e Rotas de Entrada (Inbound)</h4>
                       <p className="text-xs font-medium text-slate-600 mb-4">
                         Quando alguém liga para o seu número público (DID), a rota de entrada define para onde a ligação vai. Pode ser direcionada para um Atendente Virtual (IA), URA Clássica ou direto para uma Fila de espera.
                       </p>
                    </div>
                 </div>

                 <h3 className="font-bold text-sm text-slate-900 uppercase tracking-wider mb-4 border-b border-slate-100 pb-2">Padrões de Rotas de Saída (Outbound Patterns)</h3>
                 <p className="text-xs text-slate-600 font-medium bg-white p-4 rounded-xl border border-slate-200 shadow-sm mb-4">
                   As rotas de saída utilizam expressões regulares simples para determinar por qual operadora uma chamada deve sair. Por exemplo:
                 </p>
                 <div className="space-y-2 font-mono text-xs">
                    <div className="flex gap-4 p-3 bg-slate-50 rounded-lg">
                      <span className="font-bold text-blue-700 w-24">0[1-9]X.</span>
                      <span className="text-slate-600">Qualquer chamada DDD começando com 0.</span>
                    </div>
                    <div className="flex gap-4 p-3 bg-slate-50 rounded-lg">
                      <span className="font-bold text-blue-700 w-24">9[6-9]XXXXXXX</span>
                      <span className="text-slate-600">Celulares locais com o nono dígito (iniciando em 6, 7, 8 ou 9).</span>
                    </div>
                 </div>
              </div>
            </div>
          )}

          {/* 4. ACD / QUEUES TAB */}
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

          {/* 5. AI TAB */}
          {activeTopic === 'ai' && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-8 relative overflow-hidden">
                 <div className="absolute top-0 right-0 w-64 h-64 bg-purple-500/10 rounded-bl-full -mr-10 -mt-10 pointer-events-none" />
                 
                 <h2 className="text-xl font-black text-slate-900 tracking-tight mb-2 relative z-10 flex items-center gap-2">
                   Inteligência Artificial (MaIA) <Bot className="w-6 h-6 text-purple-600" />
                 </h2>
                 <p className="text-xs font-medium text-slate-500 mb-8 relative z-10 max-w-2xl">
                   O Enlace-PBX substitui as antigas URAs ("Tecle 1, Tecle 2") por conversação fluida baseada em LLMs e RAG, integrada profundamente ao barramento do Asterisk via ARI (Asterisk REST Interface).
                 </p>

                 <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8 relative z-10">
                    <div className="p-5 bg-white border border-slate-200 rounded-xl shadow-sm">
                      <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center mb-3">
                        <Radio className="w-4 h-4" />
                      </div>
                      <h4 className="font-bold text-sm text-slate-900 mb-1">STT / TTS em Tempo Real</h4>
                      <p className="text-[11px] text-slate-600">
                        O áudio da ligação é extraído do Asterisk (AudioSockets), transcrito usando Speech-to-Text, processado pelo Gemini e devolvido ao usuário com vozes ultra-realistas (Text-to-Speech).
                      </p>
                    </div>
                    <div className="p-5 bg-white border border-slate-200 rounded-xl shadow-sm">
                      <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center mb-3">
                        <BookOpen className="w-4 h-4" />
                      </div>
                      <h4 className="font-bold text-sm text-slate-900 mb-1">Base de Conhecimento (RAG)</h4>
                      <p className="text-[11px] text-slate-600">
                        A IA responde dúvidas específicas da sua empresa vasculhando documentos internos em milissegundos antes de gerar a resposta de áudio, evitando alucinações.
                      </p>
                    </div>
                    <div className="p-5 bg-white border border-slate-200 rounded-xl shadow-sm">
                      <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center mb-3">
                        <ArrowRight className="w-4 h-4" />
                      </div>
                      <h4 className="font-bold text-sm text-slate-900 mb-1">Execução de Tarefas (Tool Calling)</h4>
                      <p className="text-[11px] text-slate-600">
                        A IA pode disparar Webhooks, checar status de pedidos ou até transferir a chamada para um atendente humano caso identifique que o cliente está frustrado.
                      </p>
                    </div>
                 </div>
              </div>
            </div>
          )}

          {/* 6. INFRA TAB */}
          {activeTopic === 'infra' && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-8">
                 <h2 className="text-xl font-black text-slate-900 tracking-tight mb-2">Infraestrutura, Backup & Restore</h2>
                 <p className="text-xs font-medium text-slate-500 mb-8">
                   Gerenciamento de desastres (Disaster Recovery) e proteção de dados críticos (PostgreSQL e Asterisk Conf).
                 </p>

                 <div className="space-y-6">
                    <div className="flex gap-4 p-5 bg-slate-50 border border-slate-200 rounded-2xl">
                       <div className="w-12 h-12 bg-white rounded-xl shadow-sm border border-slate-200 flex items-center justify-center shrink-0">
                         <Database className="w-6 h-6 text-blue-600" />
                       </div>
                       <div>
                         <h4 className="font-bold text-sm text-slate-900">O que é um Snapshot de Sistema?</h4>
                         <p className="text-[11px] text-slate-600 font-medium mt-1">
                           No Enlace-PBX, um snapshot consolida um dump completo do banco de dados relacional e copia arquivos sensíveis (como gravações locais de ura e scripts dialplan customizados). Caso o servidor quebre, o arquivo .tar.gz restaura toda a plataforma com 1 clique.
                         </p>
                       </div>
                    </div>

                    <div className="flex gap-4 p-5 bg-slate-50 border border-slate-200 rounded-2xl">
                       <div className="w-12 h-12 bg-white rounded-xl shadow-sm border border-slate-200 flex items-center justify-center shrink-0">
                         <Lock className="w-6 h-6 text-slate-700" />
                       </div>
                       <div>
                         <h4 className="font-bold text-sm text-slate-900">Rotinas de Backup na Nuvem (S3 / Cron)</h4>
                         <p className="text-[11px] text-slate-600 font-medium mt-1">
                           Você não precisa baixar backups físicos todos os dias. O módulo de "Backup & Restore" permite programar um crontab (ex: 0 3 * * * - todo dia às 3 da manhã) para enviar pacotes criptografados diretamente para um bucket da AWS S3, garantindo resiliência contra Ransomware.
                         </p>
                       </div>
                    </div>
                 </div>
              </div>
            </div>
          )}

          {/* 7. GLOSSARY TAB */}
          {activeTopic === 'glossary' && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-8">
                 <h2 className="text-xl font-black text-slate-900 tracking-tight mb-2">Glossário Técnico (Legendas)</h2>
                 <p className="text-xs font-medium text-slate-500 mb-8">
                   Dicionário rápido para ajudar operadores e gerentes a entenderem a nomenclatura de telefonia IP moderna.
                 </p>

                 <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
                   {[
                     { term: 'CDR (Call Detail Record)', desc: 'Registro detalhado de chamadas. Contém a origem, destino, tempo falado e status. É o "extrato bancário" do PABX.' },
                     { term: 'DID (Direct Inward Dialing)', desc: 'Número fixo ou 0800 público. É o número que o cliente liga de fora para cair na sua central.' },
                     { term: 'Tronco SIP (SIP Trunk)', desc: 'O canal de comunicação fornecido pela operadora (ex: Vivo, Claro) que conecta o seu Asterisk à rede pública de telefonia mundial.' },
                     { term: 'URA (IVR)', desc: 'Unidade de Resposta Audível (Interactive Voice Response). É o robô de menu inicial clássico numérico.' },
                     { term: 'RAG (Retrieval-Augmented Generation)', desc: 'Técnica de Inteligência Artificial onde o Gemini consulta a base de conhecimento da sua empresa antes de responder ao cliente por voz.' },
                     { term: 'ARI (Asterisk REST Interface)', desc: 'A API moderna do Asterisk que permite que linguagens como Node.js (e o Gemini) controlem canais de áudio em tempo real (Stasis).' },
                     { term: 'MoH (Music on Hold)', desc: 'Música de espera. O áudio que o cliente escuta enquanto está na fila ou quando é colocado em pausa.' },
                     { term: 'VP8 / H.264', desc: 'Codecs de processamento de vídeo. Necessários para permitir video-chamadas no Webphone ou em interfornes/câmeras SIP.' },
                     { term: 'WebRTC / WSS', desc: 'Web Real-Time Communication. Tecnologia que permite ligações e vídeo direto pelo Google Chrome via WebSockets encriptados (WSS), descartando softwares externos.' },
                     { term: 'Cron Job', desc: 'Agendador de tarefas do Linux. Usado no PBX para definir de quanto em quanto tempo o backup automático será gerado.' },
                     { term: 'SLA', desc: 'Service Level Agreement. Acordo de nível de serviço; a métrica que define em quantos segundos uma chamada DEVE ser atendida para que o cliente não fique frustrado.' },
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
