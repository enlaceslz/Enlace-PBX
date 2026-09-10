import React, { useState } from 'react';
import {
  Bot,
  Sparkles,
  Wrench,
  BookOpen,
  Activity,
  Plus,
  Play,
  ShieldCheck,
  Zap,
  Clock,
  ArrowRight,
  Code,
  CheckCircle2,
  Lock,
} from 'lucide-react';
import {
  AiAgent,
  AiProvider,
  AiTool,
  AiKnowledgeSource,
  AiSession,
} from '../../types/pbx';

interface AiGatewayViewProps {
  agents: AiAgent[];
  providers: AiProvider[];
  tools: AiTool[];
  knowledge: AiKnowledgeSource[];
  sessions: AiSession[];
  activeSubTab?: 'agents' | 'providers' | 'tools' | 'knowledge' | 'sessions';
  onOpenWebphone: (number: string) => void;
  onRefresh: () => void;
}

export const AiGatewayView: React.FC<AiGatewayViewProps> = ({
  agents,
  providers,
  tools,
  knowledge,
  sessions,
  activeSubTab = 'agents',
  onOpenWebphone,
  onRefresh,
}) => {
  const [currentTab, setCurrentTab] = useState<'agents' | 'providers' | 'tools' | 'knowledge' | 'sessions'>(activeSubTab);
  const [selectedAgent, setSelectedAgent] = useState<AiAgent | null>(agents[0] || null);
  const [selectedTool, setSelectedTool] = useState<AiTool | null>(null);
  const [testToolArgs, setTestToolArgs] = useState('{"documento": "12345678900"}');
  const [toolSimResult, setToolSimResult] = useState<any>(null);

  const handleSimulateTool = (tool: AiTool) => {
    setSelectedTool(tool);
    setToolSimResult(tool.mockResponse);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-xl font-black text-slate-100 tracking-tight">
              Gateway de Inteligência Artificial & Gemini Live
            </h1>
            <span className="text-[10px] bg-cyan-950 text-cyan-300 border border-cyan-800/80 px-2 py-0.5 rounded-full font-mono">
              Google GenAI SDK • AudioSocket
            </span>
          </div>
          <p className="text-xs text-slate-400">
            Orquestração de agentes de voz conversacionais em português brasileiro com suporte a barge-in e function calling.
          </p>
        </div>

        {/* Sub Navigation */}
        <div className="flex bg-slate-900 p-1 rounded-xl border border-slate-800 self-start overflow-x-auto">
          <button
            onClick={() => setCurrentTab('agents')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition flex items-center gap-1.5 ${
              currentTab === 'agents'
                ? 'bg-emerald-500 text-slate-950 shadow'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Bot className="w-3.5 h-3.5" />
            Agentes de Voz ({agents.length})
          </button>
          <button
            onClick={() => setCurrentTab('providers')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition flex items-center gap-1.5 ${
              currentTab === 'providers'
                ? 'bg-emerald-500 text-slate-950 shadow'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            Provedores Gemini ({providers.length})
          </button>
          <button
            onClick={() => setCurrentTab('tools')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition flex items-center gap-1.5 ${
              currentTab === 'tools'
                ? 'bg-emerald-500 text-slate-950 shadow'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Wrench className="w-3.5 h-3.5" />
            Tools / APIs ({tools.length})
          </button>
          <button
            onClick={() => setCurrentTab('knowledge')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition flex items-center gap-1.5 ${
              currentTab === 'knowledge'
                ? 'bg-emerald-500 text-slate-950 shadow'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            Base RAG ({knowledge.length})
          </button>
          <button
            onClick={() => setCurrentTab('sessions')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition flex items-center gap-1.5 ${
              currentTab === 'sessions'
                ? 'bg-emerald-500 text-slate-950 shadow'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Activity className="w-3.5 h-3.5" />
            Sessões Ativas ({sessions.length})
          </button>
        </div>
      </div>

      {/* 1. AGENTS TAB */}
      {currentTab === 'agents' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Agents List */}
          <div className="space-y-3">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
              Agentes Cadastrados
            </span>
            {agents.map((agent) => (
              <div
                key={agent.id}
                onClick={() => setSelectedAgent(agent)}
                className={`p-4 rounded-2xl border cursor-pointer transition ${
                  selectedAgent?.id === agent.id
                    ? 'bg-slate-900 border-emerald-500/80 shadow-lg'
                    : 'bg-slate-900/60 border-slate-800/80 hover:bg-slate-800/40'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-950/80 text-emerald-300 border border-emerald-800/60 font-bold">
                    Ramal / DID: 9001
                  </span>
                  <span className="text-[11px] text-emerald-400 font-semibold flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" /> Ativo
                  </span>
                </div>

                <h3 className="font-bold text-slate-100 text-base">{agent.name}</h3>
                <p className="text-xs text-slate-400 mt-1 line-clamp-2">{agent.description}</p>

                <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between text-xs font-mono text-slate-400">
                  <span>Modelo: {agent.model}</span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onOpenWebphone('9001');
                    }}
                    className="text-emerald-400 font-sans font-bold hover:underline"
                  >
                    Testar Voz →
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Agent Configuration Details Panel */}
          {selectedAgent && (
            <div className="lg:col-span-2 bg-slate-900/80 rounded-2xl border border-slate-800/80 p-6 space-y-5">
              <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                <div>
                  <h2 className="text-lg font-bold text-slate-100">{selectedAgent.name}</h2>
                  <p className="text-xs text-slate-400">
                    Configuração detalhada do fluxo de voz com Asterisk Stasis
                  </p>
                </div>
                <button
                  onClick={() => onOpenWebphone('9001')}
                  className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-xl text-xs flex items-center gap-2 transition"
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  Iniciar Chamada de Teste
                </button>
              </div>

              {/* Engine Parameters */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                  <span className="text-slate-500 font-mono text-[10px] block">MODELO GEMINI</span>
                  <span className="text-slate-200 font-mono font-bold">{selectedAgent.model}</span>
                </div>
                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                  <span className="text-slate-500 font-mono text-[10px] block">VOZ SINTETIZADA</span>
                  <span className="text-slate-200 font-bold">{selectedAgent.voice} (pt-BR)</span>
                </div>
                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                  <span className="text-slate-500 font-mono text-[10px] block">BARGE-IN</span>
                  <span className="text-emerald-400 font-bold">Habilitado</span>
                </div>
                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                  <span className="text-slate-500 font-mono text-[10px] block">TRANSBORDO RAMAL</span>
                  <span className="text-cyan-400 font-mono font-bold">
                    Ramal {selectedAgent.transferExtension}
                  </span>
                </div>
              </div>

              {/* System Instruction */}
              <div>
                <label className="text-slate-400 text-[11px] font-bold uppercase tracking-wider block mb-1.5">
                  System Instruction / Prompt do Sistema (pt-BR):
                </label>
                <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 text-xs text-slate-300 font-mono leading-relaxed whitespace-pre-wrap max-h-48 overflow-y-auto">
                  {selectedAgent.systemInstruction}
                </div>
              </div>

              {/* Initial Greeting */}
              <div>
                <label className="text-slate-400 text-[11px] font-bold uppercase tracking-wider block mb-1.5">
                  Mensagem de Saudação Inicial:
                </label>
                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 text-xs text-slate-200">
                  "{selectedAgent.initialGreeting}"
                </div>
              </div>

              {/* Tools Active */}
              <div>
                <label className="text-slate-400 text-[11px] font-bold uppercase tracking-wider block mb-2">
                  Ferramentas Vinculadas (Function Calling):
                </label>
                <div className="flex flex-wrap gap-2">
                  {selectedAgent.tools.map((tName) => (
                    <span
                      key={tName}
                      className="px-3 py-1 bg-cyan-950/60 border border-cyan-800/80 text-cyan-300 rounded-lg text-xs font-mono flex items-center gap-1.5"
                    >
                      <Wrench className="w-3 h-3 text-cyan-400" />
                      {tName}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 2. PROVIDERS TAB */}
      {currentTab === 'providers' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {providers.map((prov) => (
            <div
              key={prov.id}
              className="bg-slate-900/80 rounded-2xl border border-slate-800/80 p-5 space-y-4"
            >
              <div className="flex items-center justify-between">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-cyan-950 text-cyan-300 border border-cyan-800">
                  {prov.providerType}
                </span>
                <span className="text-xs text-emerald-400 font-semibold flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Conectado
                </span>
              </div>

              <div>
                <h3 className="font-bold text-slate-100 text-base">{prov.name}</h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Região Cloud: <strong className="text-slate-200 font-mono">{prov.googleLocation || 'southamerica-east1 (São Paulo)'}</strong>
                </p>
              </div>

              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-2 text-xs font-mono">
                <div className="flex items-center justify-between text-slate-400">
                  <span className="flex items-center gap-1">
                    <Lock className="w-3 h-3 text-emerald-400" /> API Key Protegida:
                  </span>
                  <span className="text-slate-200">{prov.apiKeyMasked}</span>
                </div>
                <div className="flex items-center justify-between text-slate-400">
                  <span>Modelo Padrão:</span>
                  <span className="text-cyan-400">{prov.defaultModel}</span>
                </div>
                <div className="flex items-center justify-between text-slate-400">
                  <span>Temperatura Padrão:</span>
                  <span className="text-slate-200">{prov.defaultTemperature}</span>
                </div>
              </div>

              <div className="pt-2 text-[11px] text-slate-500">
                Segurança: Chaves executadas estritamente em ambiente de servidor (Server-Side). Nunca expostas ao browser.
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 3. TOOLS TAB */}
      {currentTab === 'tools' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-3">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
              Ferramentas de Integração (ERP/CRM)
            </span>
            {tools.map((tool) => (
              <div
                key={tool.id}
                onClick={() => handleSimulateTool(tool)}
                className={`p-4 rounded-2xl border cursor-pointer transition ${
                  selectedTool?.id === tool.id
                    ? 'bg-slate-900 border-cyan-500/80'
                    : 'bg-slate-900/60 border-slate-800/80 hover:bg-slate-800/40'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-bold font-mono text-cyan-300 flex items-center gap-1.5">
                    <Wrench className="w-3.5 h-3.5 text-cyan-400" />
                    {tool.name}
                  </span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                    {tool.method}
                  </span>
                </div>
                <p className="text-xs text-slate-400">{tool.description}</p>
                <div className="text-[10px] text-slate-500 font-mono mt-2">
                  Endpoint: {tool.endpoint}
                </div>
              </div>
            ))}
          </div>

          {/* Schema & Simulator View */}
          <div className="bg-slate-900/80 rounded-2xl border border-slate-800/80 p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-bold text-sm text-slate-100 flex items-center gap-2">
                <Code className="w-4 h-4 text-cyan-400" />
                Schema OpenAPI & Simulador de Resposta
              </h3>
              <span className="text-xs font-mono text-slate-400">
                {selectedTool ? selectedTool.name : 'Selecione uma ferramenta'}
              </span>
            </div>

            {selectedTool ? (
              <div className="space-y-4 text-xs">
                <div>
                  <label className="text-slate-400 font-semibold block mb-1">
                    JSON Schema (Enviado para o Gemini):
                  </label>
                  <pre className="bg-slate-950 p-3 rounded-xl border border-slate-800 text-[11px] font-mono text-slate-300 max-h-48 overflow-y-auto">
                    {JSON.stringify(selectedTool.schemaJson, null, 2)}
                  </pre>
                </div>

                <div>
                  <label className="text-slate-400 font-semibold block mb-1">
                    Simulação de Resposta Retornada pela API:
                  </label>
                  <pre className="bg-slate-950 p-3 rounded-xl border border-slate-800 text-[11px] font-mono text-emerald-300 max-h-48 overflow-y-auto">
                    {JSON.stringify(toolSimResult || selectedTool.mockResponse, null, 2)}
                  </pre>
                </div>
              </div>
            ) : (
              <div className="py-12 text-center text-slate-500 text-xs">
                Clique em uma ferramenta ao lado para visualizar os parâmetros de chamada e resposta.
              </div>
            )}
          </div>
        </div>
      )}

      {/* 4. KNOWLEDGE TAB */}
      {currentTab === 'knowledge' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {knowledge.map((k) => (
            <div
              key={k.id}
              className="bg-slate-900/80 rounded-2xl border border-slate-800/80 p-5 space-y-3 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
                  <span className="px-2 py-0.5 rounded bg-slate-800 text-[10px] font-mono">
                    {k.category}
                  </span>
                  <span>{new Date(k.updatedAt).toLocaleDateString('pt-BR')}</span>
                </div>
                <h3 className="font-bold text-slate-100 text-sm">{k.title}</h3>
                <p className="text-xs text-slate-400 mt-2 font-mono line-clamp-4 bg-slate-950 p-3 rounded-xl border border-slate-800/80">
                  {k.content}
                </p>
              </div>

              <div className="pt-3 border-t border-slate-800 flex items-center justify-between text-[11px] text-emerald-400">
                <span>Grounding Ativo</span>
                <span>Enlace RAG Engine</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 5. SESSIONS TAB */}
      {currentTab === 'sessions' && (
        <div className="space-y-4">
          {sessions.map((sess) => (
            <div
              key={sess.id}
              className="bg-slate-900/80 rounded-2xl border border-slate-800/80 p-5 space-y-4"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
                <div className="flex items-center gap-3">
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                  <div>
                    <h3 className="font-bold text-slate-100 text-sm">
                      Sessão {sess.id} • {sess.agentName}
                    </h3>
                    <div className="text-xs text-slate-400">
                      Chamador: <strong className="text-slate-200 font-mono">{sess.caller}</strong> • Canal:{' '}
                      <span className="font-mono text-slate-300">{sess.channel}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 text-xs font-mono">
                  <span className="px-2.5 py-1 rounded bg-slate-800 text-slate-300">
                    Latência: {sess.latencyAverageMs}ms
                  </span>
                  <span className="px-2.5 py-1 rounded bg-emerald-950 text-emerald-300 border border-emerald-800">
                    {sess.durationSeconds}s
                  </span>
                </div>
              </div>

              {/* Transcript Preview */}
              <div>
                <label className="text-[10px] uppercase font-bold text-slate-500 tracking-wider block mb-2">
                  Histórico da Interação em Tempo Real:
                </label>
                <div className="space-y-2 bg-slate-950 p-3 rounded-xl border border-slate-800 max-h-48 overflow-y-auto">
                  {sess.transcript.map((t, idx) => (
                    <div
                      key={idx}
                      className={`text-xs p-2 rounded-lg ${
                        t.role === 'user'
                          ? 'bg-slate-900 text-emerald-300 border border-slate-800'
                          : 'bg-slate-900/40 text-slate-200'
                      }`}
                    >
                      <div className="flex items-center justify-between text-[10px] text-slate-500 mb-0.5 font-mono">
                        <span className="capitalize font-bold">{t.role}</span>
                        <span>{t.timestamp}</span>
                      </div>
                      <p>{t.text}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
