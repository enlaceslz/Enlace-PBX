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
  Volume2,
  VolumeX,
  User,
  Headphones,
  Sliders,
  Layers,
  Radio,
  Mic,
} from 'lucide-react';
import {
  AiAgent,
  AiProvider,
  AiTool,
  AiKnowledgeSource,
  AiSession,
} from '../../types/pbx';
import { speakHumanized, stopSpeaking } from '../../utils/speechVoiceHelper';

export interface VoiceOptionMetadata {
  name: string;
  gender: 'male' | 'female';
  title: string;
  tone: string;
  description: string;
  pitch: string;
  rate: string;
}

export const VOICE_PROFILES_METADATA: VoiceOptionMetadata[] = [
  {
    name: 'Fenrir',
    gender: 'male',
    title: 'Fenrir (Barítono Encorpado)',
    tone: 'Barítono Firme & Acolhedor',
    description: 'Voz masculina encorpada, grave e segura. Entonação técnica recomendada para Roberto Mendes e NOC.',
    pitch: '0.88x (Grave natural acústico)',
    rate: '0.95x (Cadência deliberada anti-robótica)',
  },
  {
    name: 'Puck',
    gender: 'male',
    title: 'Puck (Tenor Dinâmico)',
    tone: 'Tenor Ágil & Moderno',
    description: 'Voz masculina jovem, ágil e assertiva. Ideal para diagnóstico rápido, pré-vendas e SDR.',
    pitch: '0.94x (Natural conversacional)',
    rate: '0.97x (Fluido e dinâmico)',
  },
  {
    name: 'Charon',
    gender: 'male',
    title: 'Charon (Institucional Sóbrio)',
    tone: 'Barítono Sóbrio & Maduro',
    description: 'Voz masculina madura, institucional e serena. Ideal para compliance e finanças.',
    pitch: '0.86x (Solene e calmo)',
    rate: '0.93x (Pausado e seguro)',
  },
  {
    name: 'Zephyr',
    gender: 'female',
    title: 'Zephyr (Soprano Equilibrado)',
    tone: 'Soprano Suave & Expressivo',
    description: 'Voz feminina equilibrada, expressiva e acolhedora. Perfil oficial da MaIA para triagem 24/7.',
    pitch: '1.04x (Suave e caloroso)',
    rate: '0.98x (Ritmo humano natural)',
  },
  {
    name: 'Kore',
    gender: 'female',
    title: 'Kore (Mezzo-Soprano Empático)',
    tone: 'Mezzo Paciente & Caloroso',
    description: 'Voz feminina doce, paciente e atenciosa. Perfil ideal para ouvidoria, SAC e negociação amigável.',
    pitch: '1.02x (Articulação cristalina)',
    rate: '0.96x (Escuta ativa atenta)',
  },
  {
    name: 'Aoede',
    gender: 'female',
    title: 'Aoede (Melódico Comercial)',
    tone: 'Soprano Brilhante & Persuasivo',
    description: 'Voz feminina melódica, calorosa e engajadora. Excelente para vendas e planos de telefonia.',
    pitch: '1.06x (Entonação convidativa)',
    rate: '0.99x (Ritmo comercial ativo)',
  },
];

export const AVATAR_OPTIONS = [
  {
    id: 'male_tech',
    gender: 'male' as const,
    label: 'Roberto (Técnico NOC)',
    role: 'Suporte Técnico N1/N2 Especializado',
    badge: 'Headset & Diagnóstico',
  },
  {
    id: 'male_attendant',
    gender: 'male' as const,
    label: 'Carlos (Atendente Central)',
    role: 'Operador PBX & Triagem',
    badge: 'Central Telefônica',
  },
  {
    id: 'female_ai',
    gender: 'female' as const,
    label: 'MaIA (Assistente Virtual)',
    role: 'Inteligência Artificial Receptiva 24/7',
    badge: 'Atendimento Geral & URA',
  },
  {
    id: 'female_billing',
    gender: 'female' as const,
    label: 'Renata (Financeiro)',
    role: 'Faturamento, Pix & Cobrança',
    badge: 'Negociação Humanizada',
  },
  {
    id: 'female_sales',
    gender: 'female' as const,
    label: 'Mariana (Comercial)',
    role: 'Vendas Corporativas & Planos',
    badge: 'SDR & Expansão',
  },
];

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
  const [editName, setEditName] = useState('');
  const [editPrompt, setEditPrompt] = useState('');
  const [editGreeting, setEditGreeting] = useState('');
  const [editVoice, setEditVoice] = useState('Zephyr');
  const [editVoiceGender, setEditVoiceGender] = useState<'male' | 'female'>('female');
  const [editAvatarType, setEditAvatarType] = useState<string>('female_ai');
  const [editModel, setEditModel] = useState('');
  const [editTransferExt, setEditTransferExt] = useState('');
  const [isSavingAgent, setIsSavingAgent] = useState(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);

  // Sync edit states when selectedAgent changes
  useEffect(() => {
    if (selectedAgent) {
      setEditName(selectedAgent.name);
      setEditPrompt(selectedAgent.systemInstruction);
      setEditGreeting(selectedAgent.initialGreeting);
      const isMale =
        selectedAgent.voiceGender === 'male' ||
        selectedAgent.name.toLowerCase().includes('roberto') ||
        selectedAgent.name.toLowerCase().includes('carlos') ||
        selectedAgent.voice === 'Fenrir' ||
        selectedAgent.voice === 'Puck' ||
        selectedAgent.voice === 'Charon';
      const resolvedGender = isMale ? 'male' : 'female';
      setEditVoiceGender(resolvedGender);
      setEditVoice(selectedAgent.voice || (isMale ? 'Fenrir' : 'Zephyr'));
      setEditAvatarType(
        selectedAgent.avatarType || (isMale ? 'male_tech' : 'female_ai')
      );
      setEditModel(selectedAgent.model);
      setEditTransferExt(selectedAgent.transferExtension);
      setIsEditingPrompt(false);
      stopSpeaking();
      setIsPlayingVoiceSample(false);
    }
  }, [selectedAgent]);

  // Handler for dynamically switching voice gender
  const handleSelectVoiceGender = (gender: 'male' | 'female') => {
    setEditVoiceGender(gender);
    if (gender === 'male') {
      const maleVoices = ['Fenrir', 'Puck', 'Charon'];
      if (!maleVoices.includes(editVoice)) {
        setEditVoice('Fenrir');
      }
      if (!editAvatarType.startsWith('male')) {
        setEditAvatarType('male_tech');
      }
    } else {
      const femaleVoices = ['Zephyr', 'Kore', 'Aoede'];
      if (!femaleVoices.includes(editVoice)) {
        setEditVoice('Zephyr');
      }
      if (!editAvatarType.startsWith('female')) {
        setEditAvatarType('female_ai');
      }
    }
  };

  const [isPlayingVoiceSample, setIsPlayingVoiceSample] = useState(false);

  const handleToggleVoiceSample = (
    textToSpeak: string,
    voiceName: string,
    genderOverride?: 'male' | 'female'
  ) => {
    if (isPlayingVoiceSample) {
      stopSpeaking();
      setIsPlayingVoiceSample(false);
      return;
    }

    const isMale =
      genderOverride !== undefined
        ? genderOverride === 'male'
        : editVoiceGender === 'male' ||
          voiceName === 'Fenrir' ||
          voiceName === 'Charon' ||
          voiceName === 'Puck' ||
          selectedAgent?.name.toLowerCase().includes('roberto') ||
          selectedAgent?.name.toLowerCase().includes('carlos');

    const persona =
      selectedAgent?.name.toLowerCase().includes('roberto') || editAvatarType === 'male_tech'
        ? 'roberto'
        : isMale
        ? 'carlos'
        : 'maia';

    speakHumanized(textToSpeak, {
      gender: isMale ? 'male' : 'female',
      persona,
      onStart: () => setIsPlayingVoiceSample(true),
      onEnd: () => setIsPlayingVoiceSample(false),
      onError: () => setIsPlayingVoiceSample(false),
    });
  };

  // Create Agent Modal State
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isCreatingAgent, setIsCreatingAgent] = useState(false);
  const [createFormData, setCreateFormData] = useState({
    name: '',
    description: '',
    model: 'gemini-flash-latest',
    voice: 'Zephyr',
    voiceGender: 'female' as 'male' | 'female',
    avatarType: 'female_ai',
    initialGreeting: 'Olá! Sou a assistente virtual da Enlace Telecom. Como posso ajudar você hoje?',
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
      title: 'Suporte Especialista N1/N2 (Roberto Mendes)',
      desc: 'Atendimento técnico com voz masculina firme e barítona, diagnóstico e transbordo para NOC.',
      greeting: 'Olá! Aqui é o Roberto do Suporte Técnico da Enlace Telecom. Como posso ajudar com sua conexão ou ramal?',
      instruction: `Você é o Roberto Mendes, especialista de suporte técnico N1/N2 da Enlace Telecom. Responda em português brasileiro com tom seguro, acolhedor, profissional e paciente. Se for falha física ou o cliente solicitar suporte presencial, abra chamado ou transfira para o ramal 4102.`,
      voice: 'Fenrir',
      voiceGender: 'male' as const,
      avatarType: 'male_tech',
      model: 'gemini-flash-latest',
      transfer: '4102',
    },
    {
      title: 'MaIA — Atendimento & Triagem Geral 24/7',
      desc: 'Assistente virtual oficial com voz feminina suave, validação de CPF e roteamento inteligente.',
      greeting: 'Olá! Sou a MaIA, assistente virtual da Enlace Telecom. Como posso ajudar você com seus serviços de telefonia ou internet?',
      instruction: `Você é a MaIA, assistente virtual receptiva da Enlace Telecom. Fale com tom amigável, acolhedor e claro. Identifique o cliente via consultar_cliente e encaminhe as solicitações com agilidade.`,
      voice: 'Zephyr',
      voiceGender: 'female' as const,
      avatarType: 'female_ai',
      model: 'gemini-flash-latest',
      transfer: '4101',
    },
    {
      title: 'Cobrança & Regularização (Renata Lima)',
      desc: 'Negociação financeira humanizada com voz feminina empática e envio de Pix/código.',
      greeting: 'Olá! Sou a Renata da Central Financeira da Enlace Telecom. Gostaria de te ajudar a consultar ou regularizar sua fatura de forma simples.',
      instruction: `Você é uma especialista em negociação financeira amigável. Identifique o chamador com consultar_cliente, informe o status com consultar_fatura e ofereça pagamento via Pix ou código de barras com respeito e presteza.`,
      voice: 'Kore',
      voiceGender: 'female' as const,
      avatarType: 'female_billing',
      model: 'gemini-flash-latest',
      transfer: '4201',
    },
    {
      title: 'Qualificação SDR Comercial (Carlos Silva)',
      desc: 'Pré-vendas com voz masculina dinâmica, dimensionamento de troncos SIP e planos de fibra.',
      greeting: 'Olá! Aqui é o Carlos do setor de Soluções Corporativas da Enlace Telecom. Como posso ajudar a modernizar a telefonia da sua empresa?',
      instruction: `Você é um consultor comercial corporativo da Enlace Telecom. Converse com entusiasmo e clareza sobre troncos SIP Asterisk, links dedicados e planos empresariais. Transfira para o executivo de contas no ramal 4103.`,
      voice: 'Puck',
      voiceGender: 'male' as const,
      avatarType: 'male_attendant',
      model: 'gemini-flash-latest',
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
      voiceGender: p.voiceGender,
      avatarType: p.avatarType,
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
        name: editName || selectedAgent.name,
        systemInstruction: editPrompt,
        initialGreeting: editGreeting,
        voice: editVoice,
        voiceGender: editVoiceGender,
        avatarType: editAvatarType,
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
        setSaveSuccessMsg(
          `Perfil de voz (${editVoiceGender === 'male' ? 'Masculina • ' + editVoice : 'Feminina • ' + editVoice}) e parâmetros salvos com sucesso!`
        );
        setTimeout(() => setSaveSuccessMsg(null), 4500);
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
            {agents.map((agent) => {
              const isMale =
                agent.voiceGender === 'male' ||
                agent.name.toLowerCase().includes('roberto') ||
                agent.name.toLowerCase().includes('carlos') ||
                agent.voice === 'Fenrir' ||
                agent.voice === 'Puck' ||
                agent.voice === 'Charon';
              const agentGender = isMale ? 'male' : 'female';
              const voiceMeta = VOICE_PROFILES_METADATA.find((v) => v.name === agent.voice);

              return (
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
                    <span
                      className={`text-[11px] font-semibold px-2 py-0.5 rounded-full flex items-center gap-1 ${
                        agentGender === 'male'
                          ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                          : 'bg-rose-50 text-rose-700 border border-rose-200'
                      }`}
                    >
                      {agentGender === 'male' ? (
                        <>
                          <User className="w-3 h-3 text-indigo-600" />
                          Voz Masculina
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-3 h-3 text-rose-600" />
                          Voz Feminina
                        </>
                      )}
                    </span>
                  </div>

                  <div className="flex items-start gap-3">
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 text-white font-bold shadow-sm ${
                        agentGender === 'male'
                          ? 'bg-gradient-to-br from-indigo-500 to-blue-700'
                          : 'bg-gradient-to-br from-purple-500 to-rose-600'
                      }`}
                    >
                      {agentGender === 'male' ? (
                        <Headphones className="w-5 h-5 text-white" />
                      ) : (
                        <Bot className="w-5 h-5 text-white" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-slate-900 text-sm truncate">{agent.name}</h3>
                      <p className="text-xs text-slate-500 line-clamp-1 mt-0.5">{agent.description}</p>
                      <div className="mt-1 flex items-center gap-2">
                        <span className="text-[10px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded font-mono font-bold">
                          {agent.voice || (agentGender === 'male' ? 'Fenrir' : 'Zephyr')}
                        </span>
                        <span className="text-[10px] text-slate-400">
                          {voiceMeta ? voiceMeta.tone : 'Natural'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-3 pt-2.5 border-t border-slate-200 flex items-center justify-between text-xs font-mono text-slate-500">
                    <span className="truncate max-w-[140px] text-[11px]">{agent.model}</span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onOpenWebphone('9001');
                      }}
                      className="text-blue-600 font-sans font-bold hover:underline flex items-center gap-1"
                    >
                      Testar Voz →
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Agent Configuration Details Panel */}
          {selectedAgent && (
            <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-5">
              {/* Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-4">
                <div className="flex items-center gap-3">
                  <div
                    className={`w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 text-white font-bold shadow-md ${
                      editVoiceGender === 'male'
                        ? 'bg-gradient-to-br from-indigo-500 to-blue-700'
                        : 'bg-gradient-to-br from-purple-500 to-rose-600'
                    }`}
                  >
                    {editVoiceGender === 'male' ? (
                      <Headphones className="w-6 h-6 text-white" />
                    ) : (
                      <Bot className="w-6 h-6 text-white" />
                    )}
                  </div>
                  <div>
                    {!isEditingPrompt ? (
                      <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                        {selectedAgent.name}
                        <span className="text-[10px] bg-green-50 text-green-700 border border-green-200 px-2 py-0.5 rounded-full font-sans font-semibold">
                          Operacional
                        </span>
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded-full font-sans font-semibold ${
                            editVoiceGender === 'male'
                              ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                              : 'bg-rose-50 text-rose-700 border border-rose-200'
                          }`}
                        >
                          {editVoiceGender === 'male' ? 'Voz Masculina' : 'Voz Feminina'}
                        </span>
                      </h2>
                    ) : (
                      <div className="flex items-center gap-2 mb-1">
                        <input
                          type="text"
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          className="text-base font-bold text-slate-900 bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                          placeholder="Nome do Agente"
                        />
                      </div>
                    )}
                    <p className="text-xs text-slate-500">
                      Configuração de voz humanizada, gênero e transbordo Asterisk Stasis
                    </p>
                  </div>
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

              {/* VOICE PROFILE SELECTOR: MASCULINE VS FEMININE */}
              <div className="p-4 rounded-2xl bg-slate-50/80 border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Sliders className="w-4 h-4 text-blue-600" />
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
                      Perfil de Voz & Humanização (Eliminação de Voz Robótica)
                    </span>
                  </div>
                  <span className="text-[11px] text-slate-500 font-mono">
                    {editVoiceGender === 'male' ? 'Entonação Masculina' : 'Entonação Feminina'}
                  </span>
                </div>

                {!isEditingPrompt ? (
                  /* Display Mode */
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                    <div className="p-3 rounded-xl bg-white border border-slate-200">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                        Gênero da Voz
                      </span>
                      <div className="flex items-center gap-2 font-bold text-slate-800">
                        {editVoiceGender === 'male' ? (
                          <>
                            <User className="w-4 h-4 text-indigo-600" />
                            <span>Voz Masculina (Roberto / Carlos)</span>
                          </>
                        ) : (
                          <>
                            <Sparkles className="w-4 h-4 text-rose-600" />
                            <span>Voz Feminina (MaIA / Renata)</span>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="p-3 rounded-xl bg-white border border-slate-200">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                        Voz Neural Gemini
                      </span>
                      <div className="font-bold text-blue-700 flex items-center justify-between">
                        <span>{editVoice} (pt-BR)</span>
                        <span className="text-[10px] text-slate-500 font-normal">
                          {VOICE_PROFILES_METADATA.find((v) => v.name === editVoice)?.tone || 'Humanizada'}
                        </span>
                      </div>
                    </div>

                    <div className="p-3 rounded-xl bg-white border border-slate-200">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                        Avatar Associado
                      </span>
                      <div className="font-bold text-slate-700">
                        {AVATAR_OPTIONS.find((a) => a.id === editAvatarType)?.label ||
                          (editVoiceGender === 'male' ? 'Roberto (Técnico NOC)' : 'MaIA (Assistente Virtual)')}
                      </div>
                    </div>
                  </div>
                ) : (
                  /* Edit Mode - Interactive Gender & Voice Selector */
                  <div className="space-y-4">
                    {/* Gender Selector Cards */}
                    <div>
                      <label className="text-xs font-semibold text-slate-700 block mb-2">
                        Selecione o Gênero do Agente de IA:
                      </label>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <button
                          type="button"
                          onClick={() => handleSelectVoiceGender('male')}
                          className={`p-3.5 rounded-xl border text-left transition flex items-start gap-3 ${
                            editVoiceGender === 'male'
                              ? 'bg-indigo-50/80 border-indigo-400 shadow-sm ring-2 ring-indigo-500/20'
                              : 'bg-white border-slate-200 hover:bg-slate-100/60'
                          }`}
                        >
                          <div
                            className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 font-bold ${
                              editVoiceGender === 'male'
                                ? 'bg-indigo-600 text-white'
                                : 'bg-slate-100 text-slate-500'
                            }`}
                          >
                            <User className="w-5 h-5" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-bold text-slate-900">
                                Perfil Masculino (Voz Masculina)
                              </span>
                              {editVoiceGender === 'male' && (
                                <span className="text-[10px] bg-indigo-600 text-white font-bold px-1.5 py-0.5 rounded">
                                  Ativo
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] text-slate-600 mt-0.5 leading-tight">
                              Timbre barítono encorpado, entonação técnica e segura.
                            </p>
                            <span className="text-[10px] text-indigo-700 font-semibold block mt-1">
                              Indicado para: Roberto Mendes (Suporte N1/N2), NOC e Diagnóstico
                            </span>
                          </div>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleSelectVoiceGender('female')}
                          className={`p-3.5 rounded-xl border text-left transition flex items-start gap-3 ${
                            editVoiceGender === 'female'
                              ? 'bg-rose-50/80 border-rose-400 shadow-sm ring-2 ring-rose-500/20'
                              : 'bg-white border-slate-200 hover:bg-slate-100/60'
                          }`}
                        >
                          <div
                            className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 font-bold ${
                              editVoiceGender === 'female'
                                ? 'bg-rose-600 text-white'
                                : 'bg-slate-100 text-slate-500'
                            }`}
                          >
                            <Sparkles className="w-5 h-5" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-bold text-slate-900">
                                Perfil Feminino (Voz Feminina)
                              </span>
                              {editVoiceGender === 'female' && (
                                <span className="text-[10px] bg-rose-600 text-white font-bold px-1.5 py-0.5 rounded">
                                  Ativo
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] text-slate-600 mt-0.5 leading-tight">
                              Timbre soprano equilibrado, acolhedora e expressiva.
                            </p>
                            <span className="text-[10px] text-rose-700 font-semibold block mt-1">
                              Indicado para: MaIA (Triagem 24/7), Renata (Cobrança) e Comercial
                            </span>
                          </div>
                        </button>
                      </div>
                    </div>

                    {/* Dynamic Voice Selection Matching Chosen Gender */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs font-semibold text-slate-700 block mb-1">
                          Voz Gemini Correspondente ({editVoiceGender === 'male' ? 'Masculina' : 'Feminina'}):
                        </label>
                        <select
                          value={editVoice}
                          onChange={(e) => setEditVoice(e.target.value)}
                          className="w-full text-xs bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                        >
                          {VOICE_PROFILES_METADATA.filter((v) => v.gender === editVoiceGender).map((v) => (
                            <option key={v.name} value={v.name}>
                              {v.title}
                            </option>
                          ))}
                        </select>
                        <p className="text-[11px] text-slate-500 mt-1">
                          {VOICE_PROFILES_METADATA.find((v) => v.name === editVoice)?.description}
                        </p>
                      </div>

                      <div>
                        <label className="text-xs font-semibold text-slate-700 block mb-1">
                          Avatar do Agente (Identidade Visual):
                        </label>
                        <select
                          value={editAvatarType}
                          onChange={(e) => setEditAvatarType(e.target.value)}
                          className="w-full text-xs bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                        >
                          {AVATAR_OPTIONS.filter((a) => a.gender === editVoiceGender).map((a) => (
                            <option key={a.id} value={a.id}>
                              {a.label} — {a.role}
                            </option>
                          ))}
                        </select>
                        <p className="text-[11px] text-slate-500 mt-1">
                          Garante que o avatar na tela corresponda ao gênero da voz em chamadas.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Acoustic modulation badges */}
                <div className="pt-2 border-t border-slate-200/80 flex flex-wrap items-center justify-between text-[11px] text-slate-600 gap-2">
                  <div className="flex items-center gap-2">
                    <span className="font-mono bg-white px-2 py-0.5 rounded border border-slate-200">
                      Pitch:{' '}
                      <strong className="text-slate-800">
                        {VOICE_PROFILES_METADATA.find((v) => v.name === editVoice)?.pitch || 'Natural'}
                      </strong>
                    </span>
                    <span className="font-mono bg-white px-2 py-0.5 rounded border border-slate-200">
                      Cadência:{' '}
                      <strong className="text-slate-800">
                        {VOICE_PROFILES_METADATA.find((v) => v.name === editVoice)?.rate || '0.98x'}
                      </strong>
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      handleToggleVoiceSample(
                        isEditingPrompt ? editGreeting : selectedAgent.initialGreeting,
                        isEditingPrompt ? editVoice : selectedAgent.voice,
                        editVoiceGender
                      )
                    }
                    className={`px-3 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition ${
                      isPlayingVoiceSample
                        ? 'bg-rose-100 text-rose-800 border border-rose-200'
                        : 'bg-blue-100 text-blue-800 hover:bg-blue-200 border border-blue-200'
                    }`}
                  >
                    {isPlayingVoiceSample ? (
                      <>
                        <VolumeX className="w-3.5 h-3.5 text-rose-600" />
                        <span>Parar Amostra</span>
                      </>
                    ) : (
                      <>
                        <Volume2 className="w-3.5 h-3.5 text-blue-600" />
                        <span>Ouvir Prévia ({editVoiceGender === 'male' ? 'Masculina' : 'Feminina'})</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

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
                      <option value="gemini-flash-latest">gemini-flash-latest (Baixa Latência)</option>
                      <option value="gemini-2.5-flash">gemini-2.5-flash</option>
                      <option value="gemini-2.5-pro">gemini-2.5-pro (Raciocínio Avançado)</option>
                    </select>
                  )}
                </div>

                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                  <span className="text-slate-500 font-mono text-[10px] block">PERFIL ACÚSTICO</span>
                  <span className="text-slate-700 font-bold">
                    {editVoiceGender === 'male' ? 'Masculino' : 'Feminino'} • {editVoice}
                  </span>
                </div>

                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                  <span className="text-slate-500 font-mono text-[10px] block">BARGE-IN (INTERRUPÇÃO)</span>
                  <span className="text-blue-600 font-bold">Habilitado (Stasis)</span>
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
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-slate-500 text-[11px] font-bold uppercase tracking-wider">
                    Mensagem de Saudação Inicial:
                  </label>
                </div>
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

              {/* Profile Voice Gender & Humanization Selection */}
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
                <label className="text-xs font-semibold text-slate-700 block">
                  Perfil de Voz do Agente (Gênero & Entonação):
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={() => {
                      setCreateFormData({
                        ...createFormData,
                        voiceGender: 'male',
                        voice: 'Fenrir',
                        avatarType: 'male_tech',
                      });
                    }}
                    className={`p-2.5 rounded-xl border text-left transition flex items-center gap-2.5 ${
                      createFormData.voiceGender === 'male'
                        ? 'bg-indigo-50 border-indigo-400 ring-2 ring-indigo-500/20 shadow-sm'
                        : 'bg-white border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <div
                      className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold ${
                        createFormData.voiceGender === 'male'
                          ? 'bg-indigo-600 text-white'
                          : 'bg-slate-100 text-slate-500'
                      }`}
                    >
                      <User className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-bold text-slate-900 flex items-center justify-between">
                        <span>Voz Masculina</span>
                        {createFormData.voiceGender === 'male' && (
                          <span className="text-[9px] bg-indigo-600 text-white px-1.5 py-0.2 rounded font-semibold">
                            Ativo
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] text-slate-500">
                        Barítono encorpado (Roberto / NOC)
                      </div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setCreateFormData({
                        ...createFormData,
                        voiceGender: 'female',
                        voice: 'Zephyr',
                        avatarType: 'female_ai',
                      });
                    }}
                    className={`p-2.5 rounded-xl border text-left transition flex items-center gap-2.5 ${
                      createFormData.voiceGender === 'female'
                        ? 'bg-rose-50 border-rose-400 ring-2 ring-rose-500/20 shadow-sm'
                        : 'bg-white border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <div
                      className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold ${
                        createFormData.voiceGender === 'female'
                          ? 'bg-rose-600 text-white'
                          : 'bg-slate-100 text-slate-500'
                      }`}
                    >
                      <Sparkles className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-bold text-slate-900 flex items-center justify-between">
                        <span>Voz Feminina</span>
                        {createFormData.voiceGender === 'female' && (
                          <span className="text-[9px] bg-rose-600 text-white px-1.5 py-0.2 rounded font-semibold">
                            Ativo
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] text-slate-500">
                        Soprano acolhedor (MaIA / SAC)
                      </div>
                    </div>
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <div>
                    <label className="text-[11px] font-semibold text-slate-700 block mb-1">
                      Voz Gemini Neural Correspondente ({createFormData.voiceGender === 'male' ? 'Masculina' : 'Feminina'}):
                    </label>
                    <select
                      value={createFormData.voice}
                      onChange={(e) =>
                        setCreateFormData({ ...createFormData, voice: e.target.value })
                      }
                      className="w-full text-xs bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    >
                      {VOICE_PROFILES_METADATA.filter(
                        (v) => v.gender === createFormData.voiceGender
                      ).map((v) => (
                        <option key={v.name} value={v.name}>
                          {v.title}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-slate-700 block mb-1">
                      Avatar do Agente (Identidade Visual):
                    </label>
                    <select
                      value={createFormData.avatarType}
                      onChange={(e) =>
                        setCreateFormData({ ...createFormData, avatarType: e.target.value })
                      }
                      className="w-full text-xs bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    >
                      {AVATAR_OPTIONS.filter(
                        (a) => a.gender === createFormData.voiceGender
                      ).map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.label} — {a.role}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Model and Settings */}
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
                    <option value="gemini-flash-latest">gemini-flash-latest (Baixa Latência)</option>
                    <option value="gemini-2.5-flash">gemini-2.5-flash</option>
                    <option value="gemini-2.5-pro">gemini-2.5-pro (Raciocínio Complexo)</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    Barge-In (Interrupção por Voz)
                  </label>
                  <div className="text-xs bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-700 flex items-center justify-between">
                    <span>Habilitado via Asterisk ARI</span>
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  </div>
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
