import React, { useState, useEffect } from 'react';
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
  Edit3,
  Save,
  X,
  FileText,
  Check,
  Settings,
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

  useEffect(() => {
    if (activeSubTab) {
      setCurrentTab(activeSubTab);
    }
  }, [activeSubTab]);
  const [selectedAgent, setSelectedAgent] = useState<AiAgent | null>(agents[0] || null);
  const [selectedTool, setSelectedTool] = useState<AiTool | null>(null);
  const [testToolArgs, setTestToolArgs] = useState('{"documento": "12345678900"}');
  const [toolSimResult, setToolSimResult] = useState<any>(null);

  // Edit Selected Agent State
  const [isEditingPrompt, setIsEditingPrompt] = useState(false);
  const [editPrompt, setEditPrompt] = useState('');
  const [editGreeting, setEditGreeting] = useState('');
  const [editVoice, setEditVoice] = useState('');
  const [editModel, setEditModel] = useState('');
  const [editTransferExt, setEditTransferExt] = useState('');
  const [isSavingAgent, setIsSavingAgent] = useState(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);

  // Sync edit states when selectedAgent changes
  useEffect(() => {
    if (selectedAgent) {
      setEditPrompt(selectedAgent.systemInstruction);
      setEditGreeting(selectedAgent.initialGreeting);
      setEditVoice(selectedAgent.voice);
      setEditModel(selectedAgent.model);
      setEditTransferExt(selectedAgent.transferExtension);
      setIsEditingPrompt(false);
    }
  }, [selectedAgent]);

  // Create Agent Modal State
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isCreatingAgent, setIsCreatingAgent] = useState(false);
  const [createFormData, setCreateFormData] = useState({
    name: '',
    description: '',
    model: 'gemini-2.5-flash',
    voice: 'Zephyr',
    initialGreeting: 'Olá! Sou seu assistente virtual da Enlace Telecom. Como posso ajudar hoje?',
    systemInstruction: `Você é um assistente virtual telefônico da Enlace Telecom, atendendo chamadas no Asterisk 20.
Fale em português brasileiro culto, objetivo e empático.
Suas respostas devem ser curtas (1 a 2 frases) para manter o diálogo natural.
Se o chamador solicitar um atendente humano, acione a ferramenta transferir_chamada.`,
    transferExtension: '4101',
    fallbackAction: 'transfer_human' as const,
    tools: ['tool-consultar-cliente', 'tool-transferir-chamada', 'tool-encerrar-chamada'],
    knowledgeSources: knowledge.map((k) => k.id),
    allowBargeIn: true,
    temperature: 0.3,
  });

  const agentPresets = [
    {
      title: 'SAC & Suporte N1',
      desc: 'Atendimento e triagem de problemas técnicos com transbordo.',
      greeting: 'Olá! Sou a assistente virtual de Suporte da Enlace. Como posso ajudar com sua conexão ou ramais?',
      instruction: `Você é a atendente de suporte técnico e SAC N1. Responda em português brasileiro com gentileza e clareza. Use consultar_cliente para identificar a conta e abra ticket ou transfira para o ramal 4102 se não resolver.`,
      voice: 'Zephyr',
      model: 'gemini-2.5-flash',
      transfer: '4102',
    },
    {
      title: 'Cobrança & Acordo Financeiro',
      desc: 'Negociação humanizada e envio de 2ª via / Pix.',
      greeting: 'Olá! Sou da Central Financeira da Enlace Telecom. Gostaria de tratar sobre a regularização de sua fatura.',
      instruction: `Você é uma especialista em negociação financeira amigável. Identifique o chamador com consultar_cliente, informe o status com consultar_fatura e ofereça pagamento via Pix ou código de barras.`,
      voice: 'Charon',
      model: 'gemini-2.5-flash',
      transfer: '4101',
    },
    {
      title: 'Agendamento & Recepção',
      desc: 'Confirmação e marcação de visitas e reuniões.',
      greeting: 'Olá! Estou ligando da Central de Agendamentos da Enlace para confirmar o seu horário.',
      instruction: `Você é a assistente de agendamentos e recepção corporativa. Confirme dados, tire dúvidas sobre horário de funcionamento e transfira para o ramal 4101 se houver pedidos especiais.`,
      voice: 'Aoede',
      model: 'gemini-2.5-flash',
      transfer: '4101',
    },
    {
      title: 'Qualificação SDR Comercial',
      desc: 'Pré-vendas, dimensionamento de troncos/ramais.',
      greeting: 'Olá! Sou o especialista comercial da Enlace Telecom. Como podemos modernizar sua telefonia IP?',
      instruction: `Você é um pré-vendedor corporativo. Entenda quantos ramais a empresa do cliente necessita e se já possuem link dedicado. Em seguida, transfira para o executivo de contas no ramal 4103.`,
      voice: 'Puck',
      model: 'gemini-2.5-flash',
      transfer: '4103',
    },
  ];

  const handleApplyPreset = (p: typeof agentPresets[0]) => {
    setCreateFormData((prev) => ({
      ...prev,
      name: p.title,
      description: p.desc,
      initialGreeting: p.greeting,
      systemInstruction: p.instruction,
      voice: p.voice,
      model: p.model,
      transferExtension: p.transfer,
    }));
  };

  const handleSaveAgentChanges = async () => {
    if (!selectedAgent) return;
    setIsSavingAgent(true);
    try {
      const payload = {
        ...selectedAgent,
        systemInstruction: editPrompt,
        initialGreeting: editGreeting,
        voice: editVoice,
        model: editModel,
        transferExtension: editTransferExt,
      };
      const res = await fetch(`/api/v1/ai/agents/${selectedAgent.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        const updated = await res.json();
        setSelectedAgent(updated);
        setIsEditingPrompt(false);
        setSaveSuccessMsg('Parâmetros e Prompt do Agente atualizados com sucesso no Asterisk Stasis!');
        setTimeout(() => setSaveSuccessMsg(null), 4000);
        onRefresh();
      }
    } catch (err) {
      console.error('Erro ao salvar agente:', err);
    } finally {
      setIsSavingAgent(false);
    }
  };

  const handleCreateAgentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createFormData.name) return;
    setIsCreatingAgent(true);
    try {
      const res = await fetch('/api/v1/ai/agents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: createFormData.name,
          description: createFormData.description,
          providerId: providers[0]?.id || 'provider-gemini-live',
          model: createFormData.model,
          voice: createFormData.voice,
          language: 'pt-BR',
          systemInstruction: createFormData.systemInstruction,
          initialGreeting: createFormData.initialGreeting,
          temperature: createFormData.temperature,
          tools: createFormData.tools,
          knowledgeSources: createFormData.knowledgeSources,
          allowBargeIn: createFormData.allowBargeIn,
          silenceTimeoutSeconds: 5,
          maxSessionMinutes: 15,
          transferExtension: createFormData.transferExtension,
          fallbackAction: createFormData.fallbackAction,
        }),
      });
      if (res.ok) {
        const newAgent = await res.json();
        setIsCreateModalOpen(false);
        onRefresh();
        setSelectedAgent(newAgent);
      }
    } catch (err) {
      console.error('Erro ao criar agente:', err);
    } finally {
      setIsCreatingAgent(false);
    }
  };

  const handleSimulateTool = (tool: AiTool) => {
    setSelectedTool(tool);
    setToolSimResult(tool.mockResponse);
  };

  return (
    <div className="max-w-[1400px] mx-auto space-y-8 pb-12">
      {/* Premium Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-6">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
            <Bot className="w-8 h-8 text-blue-600 fill-blue-600" />
            AI Gateway & Gemini Live
          </h1>
          <p className="text-sm font-medium text-slate-500 mt-1">
            Orquestração de agentes de voz conversacionais e inteligência semântica integrados ao núcleo Asterisk PJSIP.
          </p>
        </div>
        
        <div className="flex items-center gap-3">
            <span className="px-3 py-1.5 bg-blue-50 text-blue-700 border border-blue-200 rounded-lg text-xs font-black uppercase tracking-wider flex items-center gap-2 shadow-sm">
              <Sparkles className="w-4 h-4 text-blue-500" /> Google GenAI SDK
            </span>
            <span className="px-3 py-1.5 bg-purple-50 text-purple-700 border border-purple-200 rounded-lg text-xs font-black uppercase tracking-wider flex items-center gap-2 shadow-sm">
              <Zap className="w-4 h-4 text-purple-500" /> AudioSocket Realtime
            </span>
        </div>
      </div>

      {/* KPI Stats Top Bar */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-slate-900 rounded-2xl p-5 relative overflow-hidden flex items-center gap-4 border border-slate-800 shadow-lg">
          <div className="absolute right-0 top-0 w-24 h-24 bg-blue-500/10 rounded-bl-full -mr-4 -mt-4 z-0" />
          <div className="w-12 h-12 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center relative z-10 border border-blue-500/30">
            <Bot className="w-6 h-6" />
          </div>
          <div className="relative z-10">
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Agentes Ativos</div>
            <div className="text-2xl font-black text-white">{agents.length} <span className="text-[10px] font-mono text-slate-500 font-normal">/ ilimitado</span></div>
          </div>
        </div>
        <div className="bg-slate-900 rounded-2xl p-5 relative overflow-hidden flex items-center gap-4 border border-slate-800 shadow-lg">
          <div className="absolute right-0 top-0 w-24 h-24 bg-emerald-500/10 rounded-bl-full -mr-4 -mt-4 z-0" />
          <div className="w-12 h-12 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center relative z-10 border border-emerald-500/30">
            <Activity className="w-6 h-6" />
          </div>
          <div className="relative z-10">
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Sessões RAG (Live)</div>
            <div className="text-2xl font-black text-white">{sessions.length} <span className="text-[10px] font-mono text-slate-500 font-normal">conexões</span></div>
          </div>
        </div>
        <div className="bg-slate-900 rounded-2xl p-5 relative overflow-hidden flex items-center gap-4 border border-slate-800 shadow-lg">
          <div className="absolute right-0 top-0 w-24 h-24 bg-purple-500/10 rounded-bl-full -mr-4 -mt-4 z-0" />
          <div className="w-12 h-12 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center relative z-10 border border-purple-500/30">
            <Wrench className="w-6 h-6" />
          </div>
          <div className="relative z-10">
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Function Calling</div>
            <div className="text-2xl font-black text-white">{tools.length} <span className="text-[10px] font-mono text-slate-500 font-normal">APIs plugadas</span></div>
          </div>
        </div>
        <div className="bg-slate-900 rounded-2xl p-5 relative overflow-hidden flex items-center gap-4 border border-slate-800 shadow-lg">
          <div className="absolute right-0 top-0 w-24 h-24 bg-rose-500/10 rounded-bl-full -mr-4 -mt-4 z-0" />
          <div className="w-12 h-12 rounded-xl bg-rose-500/20 text-rose-400 flex items-center justify-center relative z-10 border border-rose-500/30">
            <Clock className="w-6 h-6" />
          </div>
          <div className="relative z-10">
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Latência TTY</div>
            <div className="text-2xl font-black text-white">~355<span className="text-[10px] font-mono text-slate-500 font-normal ml-1">ms</span></div>
          </div>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-8">
        
        {/* Sub Navigation Sidebar */}
        <div className="lg:w-64 shrink-0 flex flex-col gap-2">
          <div className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2 px-2">Módulos de Orquestração</div>
          
          <button
            onClick={() => setCurrentTab('agents')}
            className={`px-4 py-3 rounded-xl text-sm font-bold transition flex items-center justify-between group ${
              currentTab === 'agents'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
                : 'bg-white text-slate-600 hover:bg-slate-50 hover:text-blue-600 border border-slate-200'
            }`}
          >
            <div className="flex items-center gap-3">
              <Bot className="w-5 h-5" /> Agentes de Voz
            </div>
            <span className={`text-[10px] px-2 py-0.5 rounded-full font-mono ${currentTab === 'agents' ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500 group-hover:bg-blue-100 group-hover:text-blue-600'}`}>{agents.length}</span>
          </button>
          
          <button
            onClick={() => setCurrentTab('providers')}
            className={`px-4 py-3 rounded-xl text-sm font-bold transition flex items-center justify-between group ${
              currentTab === 'providers'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
                : 'bg-white text-slate-600 hover:bg-slate-50 hover:text-blue-600 border border-slate-200'
            }`}
          >
            <div className="flex items-center gap-3">
              <Sparkles className="w-5 h-5" /> Provedores LLM
            </div>
            <span className={`text-[10px] px-2 py-0.5 rounded-full font-mono ${currentTab === 'providers' ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500 group-hover:bg-blue-100 group-hover:text-blue-600'}`}>{providers.length}</span>
          </button>

          <button
            onClick={() => setCurrentTab('tools')}
            className={`px-4 py-3 rounded-xl text-sm font-bold transition flex items-center justify-between group ${
              currentTab === 'tools'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
                : 'bg-white text-slate-600 hover:bg-slate-50 hover:text-blue-600 border border-slate-200'
            }`}
          >
            <div className="flex items-center gap-3">
              <Wrench className="w-5 h-5" /> Funções (Tools)
            </div>
            <span className={`text-[10px] px-2 py-0.5 rounded-full font-mono ${currentTab === 'tools' ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500 group-hover:bg-blue-100 group-hover:text-blue-600'}`}>{tools.length}</span>
          </button>

          <button
            onClick={() => setCurrentTab('knowledge')}
            className={`px-4 py-3 rounded-xl text-sm font-bold transition flex items-center justify-between group ${
              currentTab === 'knowledge'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
                : 'bg-white text-slate-600 hover:bg-slate-50 hover:text-blue-600 border border-slate-200'
            }`}
          >
            <div className="flex items-center gap-3">
              <BookOpen className="w-5 h-5" /> Contextos RAG
            </div>
            <span className={`text-[10px] px-2 py-0.5 rounded-full font-mono ${currentTab === 'knowledge' ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500 group-hover:bg-blue-100 group-hover:text-blue-600'}`}>{knowledge.length}</span>
          </button>

          <button
            onClick={() => setCurrentTab('sessions')}
            className={`px-4 py-3 rounded-xl text-sm font-bold transition flex items-center justify-between group mt-4 ${
              currentTab === 'sessions'
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20'
                : 'bg-white text-slate-600 hover:bg-emerald-50 hover:text-emerald-600 border border-slate-200'
            }`}
          >
            <div className="flex items-center gap-3">
              <Activity className="w-5 h-5" /> Live Monitor
            </div>
            <span className={`text-[10px] px-2 py-0.5 rounded-full font-mono ${currentTab === 'sessions' ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500 group-hover:bg-emerald-100 group-hover:text-emerald-600'}`}>{sessions.length}</span>
          </button>
        </div>
        
        {/* Main Content Area */}
        <div className="flex-1 min-w-0">
          {/* 1. AGENTS TAB */}
          {currentTab === 'agents' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Agents List */}
          <div className="space-y-3">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                Agentes Cadastrados ({agents.length})
              </span>
              <button
                onClick={() => setIsCreateModalOpen(true)}
                className="px-2.5 py-1 text-xs bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg flex items-center gap-1 shadow-sm transition"
                title="Cadastrar Novo Agente"
              >
                <Plus className="w-3.5 h-3.5" />
                Novo Agente
              </button>
            </div>
            {agents.map((agent) => (
              <div
                key={agent.id}
                onClick={() => setSelectedAgent(agent)}
                className={`p-4 rounded-2xl border cursor-pointer transition ${
                  selectedAgent?.id === agent.id
                    ? 'bg-white border-blue-500 shadow-md ring-1 ring-blue-500/20'
                    : 'bg-white border-slate-200 hover:bg-slate-50 shadow-sm'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200 font-bold">
                    Ramal / DID: {agent.transferExtension ? `900${agent.id.slice(-1) || '1'}` : '9001'}
                  </span>
                  <span className="text-[11px] text-green-600 font-semibold flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" /> Ativo
                  </span>
                </div>

                <h3 className="font-bold text-slate-900 text-base">{agent.name}</h3>
                <p className="text-xs text-slate-500 mt-1 line-clamp-2">{agent.description}</p>

                <div className="mt-4 pt-3 border-t border-slate-200 flex items-center justify-between text-xs font-mono text-slate-500">
                  <span>Modelo: {agent.model}</span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onOpenWebphone('9001');
                    }}
                    className="text-blue-600 font-sans font-bold hover:underline"
                  >
                    Testar Voz →
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Agent Configuration Details Panel */}
          {selectedAgent && (
            <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-4">
                <div>
                  <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                    {selectedAgent.name}
                    <span className="text-[10px] bg-green-50 text-green-700 border border-green-200 px-2 py-0.5 rounded-full font-sans font-semibold">
                      Operacional
                    </span>
                  </h2>
                  <p className="text-xs text-slate-500">
                    Configuração detalhada do fluxo de voz com Asterisk Stasis & Gemini Live
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {!isEditingPrompt ? (
                    <button
                      onClick={() => setIsEditingPrompt(true)}
                      className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs flex items-center gap-1.5 transition"
                    >
                      <Edit3 className="w-3.5 h-3.5 text-slate-600" />
                      Editar Agente
                    </button>
                  ) : (
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => setIsEditingPrompt(false)}
                        className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl text-xs transition"
                      >
                        Cancelar
                      </button>
                      <button
                        onClick={handleSaveAgentChanges}
                        disabled={isSavingAgent}
                        className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow transition disabled:opacity-50"
                      >
                        <Save className="w-3.5 h-3.5" />
                        {isSavingAgent ? 'Salvando...' : 'Salvar Alterações'}
                      </button>
                    </div>
                  )}
                  <button
                    onClick={() => onOpenWebphone('9001')}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs flex items-center gap-2 transition shadow-sm"
                  >
                    <Play className="w-3.5 h-3.5 fill-current" />
                    Iniciar Chamada
                  </button>
                </div>
              </div>

              {saveSuccessMsg && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                  <span>{saveSuccessMsg}</span>
                </div>
              )}

              {/* Engine Parameters */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                  <span className="text-slate-500 font-mono text-[10px] block">MODELO GEMINI</span>
                  {!isEditingPrompt ? (
                    <span className="text-slate-700 font-mono font-bold">{selectedAgent.model}</span>
                  ) : (
                    <select
                      value={editModel}
                      onChange={(e) => setEditModel(e.target.value)}
                      className="mt-1 w-full text-xs font-mono bg-white border border-slate-300 rounded px-1.5 py-1 text-slate-800"
                    >
                      <option value="gemini-2.5-flash">gemini-2.5-flash (Baixa Latência)</option>
                      <option value="gemini-2.5-pro">gemini-2.5-pro (Raciocínio Avançado)</option>
                      <option value="gemini-3.1-flash-live-preview">gemini-3.1-flash-live-preview</option>
                    </select>
                  )}
                </div>

                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                  <span className="text-slate-500 font-mono text-[10px] block">VOZ SINTETIZADA</span>
                  {!isEditingPrompt ? (
                    <span className="text-slate-700 font-bold">{selectedAgent.voice} (pt-BR)</span>
                  ) : (
                    <select
                      value={editVoice}
                      onChange={(e) => setEditVoice(e.target.value)}
                      className="mt-1 w-full text-xs bg-white border border-slate-300 rounded px-1.5 py-1 text-slate-800"
                    >
                      <option value="Zephyr">Zephyr (Equilibrada/Profissional)</option>
                      <option value="Puck">Puck (Jovem/Dinâmica)</option>
                      <option value="Charon">Charon (Sóbria/Institucional)</option>
                      <option value="Aoede">Aoede (Acolhedora/Melódica)</option>
                      <option value="Kore">Kore (Calma/Empática)</option>
                      <option value="Fenrir">Fenrir (Firme/Confiante)</option>
                    </select>
                  )}
                </div>

                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                  <span className="text-slate-500 font-mono text-[10px] block">BARGE-IN (INTERRUPÇÃO)</span>
                  <span className="text-blue-600 font-bold">Habilitado</span>
                </div>

                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                  <span className="text-slate-500 font-mono text-[10px] block">TRANSBORDO RAMAL</span>
                  {!isEditingPrompt ? (
                    <span className="text-teal-600 font-mono font-bold">
                      Ramal {selectedAgent.transferExtension}
                    </span>
                  ) : (
                    <input
                      type="text"
                      value={editTransferExt}
                      onChange={(e) => setEditTransferExt(e.target.value)}
                      className="mt-1 w-full text-xs font-mono bg-white border border-slate-300 rounded px-2 py-1 text-slate-800"
                      placeholder="Ex: 4101"
                    />
                  )}
                </div>
              </div>

              {/* System Instruction */}
              <div>
                <label className="text-slate-500 text-[11px] font-bold uppercase tracking-wider block mb-1.5">
                  System Instruction / Prompt do Sistema (pt-BR):
                </label>
                {!isEditingPrompt ? (
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs text-slate-700 font-mono leading-relaxed whitespace-pre-wrap max-h-48 overflow-y-auto">
                    {selectedAgent.systemInstruction}
                  </div>
                ) : (
                  <textarea
                    rows={7}
                    value={editPrompt}
                    onChange={(e) => setEditPrompt(e.target.value)}
                    className="w-full bg-slate-50 p-3 rounded-xl border border-blue-400 text-xs text-slate-800 font-mono focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    placeholder="Defina o comportamento e restrições de fala do agente em português..."
                  />
                )}
              </div>

              {/* Initial Greeting */}
              <div>
                <label className="text-slate-500 text-[11px] font-bold uppercase tracking-wider block mb-1.5">
                  Mensagem de Saudação Inicial:
                </label>
                {!isEditingPrompt ? (
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs text-slate-700">
                    "{selectedAgent.initialGreeting}"
                  </div>
                ) : (
                  <input
                    type="text"
                    value={editGreeting}
                    onChange={(e) => setEditGreeting(e.target.value)}
                    className="w-full bg-slate-50 p-2.5 rounded-xl border border-slate-300 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    placeholder="Primeira frase falada pelo agente após o atendimento"
                  />
                )}
              </div>

              {/* Tools Active */}
              <div>
                <label className="text-slate-500 text-[11px] font-bold uppercase tracking-wider block mb-2">
                  Ferramentas Vinculadas (Function Calling):
                </label>
                <div className="flex flex-wrap gap-2">
                  {selectedAgent.tools.map((tName) => (
                    <span
                      key={tName}
                      className="px-3 py-1 bg-cyan-50 border border-cyan-200 text-cyan-700 rounded-lg text-xs font-mono flex items-center gap-1.5"
                    >
                      <Wrench className="w-3 h-3 text-cyan-600" />
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
              className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-4"
            >
              <div className="flex items-center justify-between">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-cyan-50 text-cyan-700 border border-cyan-200">
                  {prov.providerType}
                </span>
                <span className="text-xs text-blue-600 font-semibold flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Conectado
                </span>
              </div>

              <div>
                <h3 className="font-bold text-slate-900 text-base">{prov.name}</h3>
                {prov.googleLocation && (
                  <p className="text-xs text-slate-500 mt-0.5">
                    Região Cloud: <strong className="text-slate-700 font-mono">{prov.googleLocation}</strong>
                  </p>
                )}
              </div>

              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-2 text-xs font-mono">
                <div className="flex items-center justify-between text-slate-500">
                  <span className="flex items-center gap-1">
                    <Lock className="w-3 h-3 text-blue-600" /> API Key Protegida:
                  </span>
                  <span className="text-slate-700">{prov.apiKeyMasked}</span>
                </div>
                <div className="flex items-center justify-between text-slate-500">
                  <span>Modelo Padrão:</span>
                  <span className="text-teal-600">{prov.defaultModel}</span>
                </div>
                <div className="flex items-center justify-between text-slate-500">
                  <span>Temperatura Padrão:</span>
                  <span className="text-slate-700">{prov.defaultTemperature}</span>
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
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
              Ferramentas de Integração (ERP/CRM)
            </span>
            {tools.map((tool) => (
              <div
                key={tool.id}
                onClick={() => handleSimulateTool(tool)}
                className={`p-4 rounded-2xl border cursor-pointer transition ${
                  selectedTool?.id === tool.id
                    ? 'bg-white border-cyan-500/80'
                    : 'bg-white/60 border-slate-200 shadow-sm hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-bold font-mono text-cyan-700 flex items-center gap-1.5">
                    <Wrench className="w-3.5 h-3.5 text-cyan-600" />
                    {tool.name}
                  </span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                    {tool.method}
                  </span>
                </div>
                <p className="text-xs text-slate-500">{tool.description}</p>
                <div className="text-[10px] text-slate-500 font-mono mt-2">
                  Endpoint: {tool.endpoint}
                </div>
              </div>
            ))}
          </div>

          {/* Schema & Simulator View */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                <Code className="w-4 h-4 text-teal-600" />
                Schema OpenAPI & Simulador de Resposta
              </h3>
              <span className="text-xs font-mono text-slate-500">
                {selectedTool ? selectedTool.name : 'Selecione uma ferramenta'}
              </span>
            </div>

            {selectedTool ? (
              <div className="space-y-4 text-xs">
                <div>
                  <label className="text-slate-500 font-semibold block mb-1">
                    JSON Schema (Enviado para o Gemini):
                  </label>
                  <pre className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-[11px] font-mono text-slate-700 max-h-48 overflow-y-auto">
                    {JSON.stringify(selectedTool.schemaJson, null, 2)}
                  </pre>
                </div>

                <div>
                  <label className="text-slate-500 font-semibold block mb-1">
                    Simulação de Resposta Retornada pela API:
                  </label>
                  <pre className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-[11px] font-mono text-blue-700 max-h-48 overflow-y-auto">
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
              className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-3 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between text-xs text-slate-500 mb-2">
                  <span className="px-2 py-0.5 rounded bg-slate-100 text-[10px] font-mono">
                    {k.category}
                  </span>
                  <span>{new Date(k.updatedAt).toLocaleDateString('pt-BR')}</span>
                </div>
                <h3 className="font-bold text-slate-900 text-sm">{k.title}</h3>
                <p className="text-xs text-slate-500 mt-2 font-mono line-clamp-4 bg-slate-50 p-3 rounded-xl border border-slate-200 shadow-sm">
                  {k.content}
                </p>
              </div>

              <div className="pt-3 border-t border-slate-200 flex items-center justify-between text-[11px] text-blue-600">
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
              className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-4"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 pb-3">
                <div className="flex items-center gap-3">
                  <div className="w-2.5 h-2.5 rounded-full bg-sky-400 animate-pulse" />
                  <div>
                    <h3 className="font-bold text-slate-900 text-sm">
                      Sessão {sess.id} • {sess.agentName}
                    </h3>
                    <div className="text-xs text-slate-500">
                      Chamador: <strong className="text-slate-700 font-mono">{sess.caller}</strong> • Canal:{' '}
                      <span className="font-mono text-slate-700">{sess.channel}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 text-xs font-mono">
                  <span className="px-2.5 py-1 rounded bg-slate-100 text-slate-700">
                    Latência: {sess.latencyAverageMs}ms
                  </span>
                  <span className="px-2.5 py-1 rounded bg-blue-50 text-blue-700 border border-blue-200">
                    {sess.durationSeconds}s
                  </span>
                </div>
              </div>

              {/* Transcript Preview */}
              <div>
                <label className="text-[10px] uppercase font-bold text-slate-500 tracking-wider block mb-2">
                  Histórico da Interação em Tempo Real:
                </label>
                <div className="space-y-2 bg-slate-50 p-3 rounded-xl border border-slate-200 max-h-48 overflow-y-auto">
                  {sess.transcript.map((t, idx) => (
                    <div
                      key={idx}
                      className={`text-xs p-2 rounded-lg ${
                        t.role === 'user'
                          ? 'bg-white text-blue-700 border border-slate-200'
                          : 'bg-white/40 text-slate-700'
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
      </div>
      {/* CREATE AGENT MODAL */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-2xl w-full max-h-[92vh] flex flex-col my-auto">
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600">
                  <Bot className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-slate-900">
                    Cadastrar Novo Agente de Voz Gemini
                  </h3>
                  <p className="text-xs text-slate-500">
                    Agente autônomo com suporte a Barge-in, Function Calling e transbordo Asterisk
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleCreateAgentSubmit} className="p-5 space-y-4 overflow-y-auto">
              {/* Presets */}
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-1.5">
                  Modelos Prontos (Presets Brasileiros):
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {agentPresets.map((p, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleApplyPreset(p)}
                      className="p-2.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-blue-50 hover:border-blue-300 text-left transition group"
                    >
                      <div className="text-xs font-bold text-slate-800 group-hover:text-blue-600">
                        {p.title}
                      </div>
                      <div className="text-[10px] text-slate-500 line-clamp-1 mt-0.5">
                        {p.desc}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Basic Fields */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    Nome do Agente *
                  </label>
                  <input
                    type="text"
                    required
                    value={createFormData.name}
                    onChange={(e) =>
                      setCreateFormData({ ...createFormData, name: e.target.value })
                    }
                    className="w-full text-xs bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    placeholder="Ex: MaIA Cobrança & Negociação"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    Ramal de Transbordo (Humano)
                  </label>
                  <input
                    type="text"
                    value={createFormData.transferExtension}
                    onChange={(e) =>
                      setCreateFormData({
                        ...createFormData,
                        transferExtension: e.target.value,
                      })
                    }
                    className="w-full text-xs font-mono bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    placeholder="Ex: 4101"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Descrição do Agente
                </label>
                <input
                  type="text"
                  value={createFormData.description}
                  onChange={(e) =>
                    setCreateFormData({ ...createFormData, description: e.target.value })
                  }
                  className="w-full text-xs bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  placeholder="Ex: Realiza atendimento receptivo com validação de CPF e envio de Pix"
                />
              </div>

              {/* Model and Voice */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    Modelo Gemini
                  </label>
                  <select
                    value={createFormData.model}
                    onChange={(e) =>
                      setCreateFormData({ ...createFormData, model: e.target.value })
                    }
                    className="w-full text-xs bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-800"
                  >
                    <option value="gemini-2.5-flash">gemini-2.5-flash (Recomendado - Ultra Rápido)</option>
                    <option value="gemini-2.5-pro">gemini-2.5-pro (Raciocínio Complexo)</option>
                    <option value="gemini-3.1-flash-live-preview">gemini-3.1-flash-live-preview (Streaming Direto)</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    Voz Neural (pt-BR)
                  </label>
                  <select
                    value={createFormData.voice}
                    onChange={(e) =>
                      setCreateFormData({ ...createFormData, voice: e.target.value })
                    }
                    className="w-full text-xs bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-800"
                  >
                    <option value="Zephyr">Zephyr (Profissional / Equilibrada)</option>
                    <option value="Puck">Puck (Jovem / Dinâmica)</option>
                    <option value="Charon">Charon (Sóbria / Institucional)</option>
                    <option value="Aoede">Aoede (Acolhedora / Empática)</option>
                    <option value="Kore">Kore (Calma / Cuidadosa)</option>
                    <option value="Fenrir">Fenrir (Firme / Assertiva)</option>
                  </select>
                </div>
              </div>

              {/* Initial Greeting */}
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Mensagem de Saudação Inicial (Áudio de Atendimento)
                </label>
                <input
                  type="text"
                  value={createFormData.initialGreeting}
                  onChange={(e) =>
                    setCreateFormData({
                      ...createFormData,
                      initialGreeting: e.target.value,
                    })
                  }
                  className="w-full text-xs bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  placeholder="Primeira frase falada pelo agente"
                />
              </div>

              {/* System Instruction */}
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  System Instruction / Prompt de Comportamento (pt-BR)
                </label>
                <textarea
                  rows={5}
                  value={createFormData.systemInstruction}
                  onChange={(e) =>
                    setCreateFormData({
                      ...createFormData,
                      systemInstruction: e.target.value,
                    })
                  }
                  className="w-full text-xs font-mono bg-slate-50 border border-slate-300 rounded-xl p-3 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 leading-relaxed"
                  placeholder="Instruções para o modelo Gemini com regras de atendimento telefônico..."
                />
              </div>

              {/* Tools Selection */}
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1.5">
                  Ferramentas Vinculadas (Function Calling)
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {tools.map((tool) => {
                    const isChecked = createFormData.tools.includes(tool.id) || createFormData.tools.includes(tool.name);
                    return (
                      <label
                        key={tool.id}
                        className={`flex items-start gap-2 p-2.5 rounded-xl border text-xs cursor-pointer transition ${
                          isChecked
                            ? 'bg-cyan-50/70 border-cyan-300 text-cyan-900'
                            : 'bg-slate-50 border-slate-200 text-slate-600'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setCreateFormData({
                                ...createFormData,
                                tools: [...createFormData.tools, tool.id],
                              });
                            } else {
                              setCreateFormData({
                                ...createFormData,
                                tools: createFormData.tools.filter(
                                  (t) => t !== tool.id && t !== tool.name
                                ),
                              });
                            }
                          }}
                          className="mt-0.5 rounded text-blue-600"
                        />
                        <div>
                          <div className="font-mono font-bold">{tool.name}</div>
                          <div className="text-[10px] text-slate-500 leading-tight">
                            {tool.description}
                          </div>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Modal Footer */}
              <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isCreatingAgent}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow transition disabled:opacity-50 flex items-center gap-1.5"
                >
                  <Bot className="w-3.5 h-3.5" />
                  {isCreatingAgent ? 'Registrando...' : 'Cadastrar Agente'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
