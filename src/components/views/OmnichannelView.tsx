import React, { useState, useEffect, useMemo } from "react";
import {
  MessageSquare,
  PhoneCall,
  Bot,
  User,
  CheckCircle2,
  Search,
  Filter,
  Send,
  Clock,
  PhoneForwarded,
  UserCheck,
  Tag,
  MoreVertical,
  FileText,
  Smartphone,
  AlertCircle,
  RotateCcw,
  Check,
  X,
  Users,
  CornerDownRight,
  ShieldCheck,
  Sparkles,
  StickyNote,
  Briefcase,
  Calendar,
  Zap,
  Building2,
  DollarSign,
  CheckSquare,
  ThumbsUp,
  HelpCircle,
} from "lucide-react";

interface Conversation {
  id: string;
  tenantId: string;
  contactId: string;
  contactName?: string;
  contactPhone?: string;
  companyName?: string;
  channel: "whatsapp" | "voice" | "webrtc" | "sms";
  status: "active" | "closed" | "queued" | "bot_handling";
  sentiment?: "positive" | "neutral" | "negative";
  tags?: string[];
  createdAt: string;
  messages: Array<{
    id: string;
    sender: "user" | "bot" | "agent";
    text: string;
    timestamp: string;
  }>;
  notes?: Array<{
    id: string;
    agentName: string;
    text: string;
    createdAt: string;
  }>;
}

const QUICK_TEMPLATES = [
  {
    label: "📄 Fatura PIX",
    text: "Olá! Segue sua fatura e a chave PIX Copia-e-Cola para baixa imediata: 00020126580014br.gov.bcb.pix0136slzenlace@gmail.com5204000053039865802BR. A compensação ocorre em até 2 minutos!",
  },
  {
    label: "⚙️ Teste Áudio SIP",
    text: "Realizamos a otimização da rota VoIP no tronco PJSIP prioritário com QoS DSCP 46. Poderia fazer uma chamada de teste para verificarmos a estabilidade?",
  },
  {
    label: "⏱️ Protocolo & Fila N2",
    text: "Seu protocolo de atendimento #ENL-2026-9812 foi aberto com prioridade Alta e está sendo tratado diretamente pelo time de Engenharia N2.",
  },
  {
    label: "⭐ Pesquisa CSAT",
    text: "Seu atendimento foi concluído! Em uma escala de 1 a 5, como você avalia nosso suporte de telecom e IA hoje?",
  },
];

export const OmnichannelView: React.FC = () => {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConv, setSelectedConv] = useState<Conversation | null>(null);
  const [crmContacts, setCrmContacts] = useState<any[]>([]);
  const [activeCrmTab, setActiveCrmTab] = useState<"profile" | "notes">("profile");
  const [newNoteText, setNewNoteText] = useState("");
  const [isSavingNote, setIsSavingNote] = useState(false);
  const [isSuggestingAi, setIsSuggestingAi] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [replyText, setReplyText] = useState("");
  const [showConfig, setShowConfig] = useState(false);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [transferTargetType, setTransferTargetType] = useState<"queue" | "extension">("queue");
  const [transferTargetId, setTransferTargetId] = useState("queue-suporte-n1");
  const [transferNote, setTransferNote] = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  const [statusFeedback, setStatusFeedback] = useState<string | null>(null);

  // Filters and search state
  const [searchTerm, setSearchTerm] = useState("");
  const [channelFilter, setChannelFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const [whatsappConfig, setWhatsappConfig] = useState({
    phoneNumberId: "",
    accessToken: "",
    verifyToken: "",
    isActive: false,
  });

  const fetchConversations = async () => {
    try {
      const res = await fetch("/api/v1/omnichannel/conversations");
      if (!res.ok) return;
      const data: Conversation[] = await res.json();
      setConversations(data);
      // Update selected conversation with fresh messages
      setSelectedConv((prev) => {
        if (!prev && data.length > 0) return data[0];
        if (prev) {
          const match = data.find((c) => c.id === prev.id);
          return match || prev;
        }
        return null;
      });
    } catch (e) {
      console.error("Failed to fetch conversations", e);
    }
  };

  const fetchCrmContacts = async () => {
    try {
      const res = await fetch("/api/v1/crm/contacts");
      if (res.ok) {
        const data = await res.json();
        setCrmContacts(data);
      }
    } catch (e) {
      console.error("Failed to fetch crm contacts", e);
    }
  };

  const handleAiSuggest = async () => {
    if (!selectedConv) return;
    setIsSuggestingAi(true);
    try {
      const res = await fetch("/api/v1/omnichannel/ai-suggest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          conversationId: selectedConv.id,
          history: selectedConv.messages,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.suggestion) {
          setReplyText(data.suggestion);
          setStatusFeedback("Sugestão da IA carregada no campo de resposta!");
          setTimeout(() => setStatusFeedback(null), 3000);
        }
      }
    } catch (err) {
      console.error("Failed to get AI suggestion", err);
    } finally {
      setIsSuggestingAi(false);
    }
  };

  const handleSaveNote = async () => {
    if (!selectedConv || !newNoteText.trim()) return;
    setIsSavingNote(true);
    try {
      const res = await fetch(`/api/v1/omnichannel/conversations/${selectedConv.id}/notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: newNoteText.trim(),
          agentName: "Operador NOC",
        }),
      });
      if (res.ok) {
        const note = await res.json();
        setSelectedConv((prev) =>
          prev
            ? {
                ...prev,
                notes: [note, ...(prev.notes || [])],
              }
            : null
        );
        setNewNoteText("");
        setStatusFeedback("Anotação interna gravada no histórico com sucesso!");
        setTimeout(() => setStatusFeedback(null), 3000);
        fetchConversations();
      }
    } catch (err) {
      console.error("Failed to save note", err);
    } finally {
      setIsSavingNote(false);
    }
  };

  const fetchConfig = async () => {
    try {
      const res = await fetch("/api/v1/whatsapp/config");
      if (res.ok) {
        const data = await res.json();
        setWhatsappConfig(data);
      }
    } catch (e) {
      console.error("Failed to fetch config", e);
    }
  };

  const handleSaveConfig = async () => {
    try {
      const res = await fetch("/api/v1/whatsapp/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(whatsappConfig),
      });
      if (res.ok) {
        setShowConfig(false);
        setStatusFeedback("Configuração do WhatsApp Cloud API salva com sucesso!");
        setTimeout(() => setStatusFeedback(null), 3500);
      }
    } catch (e) {
      console.error("Erro ao salvar config WhatsApp", e);
    }
  };

  useEffect(() => {
    fetchConversations();
    fetchConfig();
    fetchCrmContacts();
    setIsLoading(false);

    const interval = setInterval(() => {
      fetchConversations();
    }, 4000);

    return () => clearInterval(interval);
  }, []);

  const handleUpdateStatus = async (
    status: "active" | "closed" | "queued" | "bot_handling"
  ) => {
    if (!selectedConv) return;
    setActionLoading(true);
    try {
      const res = await fetch(
        `/api/v1/omnichannel/conversations/${selectedConv.id}/status`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status }),
        }
      );
      if (res.ok) {
        const updated: Conversation = await res.json();
        setConversations((prev) =>
          prev.map((c) => (c.id === updated.id ? updated : c))
        );
        setSelectedConv(updated);
        setStatusFeedback(
          status === "active"
            ? "Você assumiu o atendimento com sucesso (Barge-in ativo)!"
            : status === "closed"
            ? "Atendimento finalizado com sucesso."
            : status === "bot_handling"
            ? "Atendimento retornado à IA MaIA."
            : "Conversa colocada na fila de atendimento."
        );
        setTimeout(() => setStatusFeedback(null), 4000);
      }
    } catch (err) {
      console.error("Failed to update status", err);
    } finally {
      setActionLoading(false);
    }
  };

  const handleTransfer = async () => {
    if (!selectedConv) return;
    setActionLoading(true);
    try {
      const res = await fetch(
        `/api/v1/omnichannel/conversations/${selectedConv.id}/transfer`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            targetType: transferTargetType,
            targetId: transferTargetId,
            note: transferNote,
          }),
        }
      );
      if (res.ok) {
        const updated: Conversation = await res.json();
        setConversations((prev) =>
          prev.map((c) => (c.id === updated.id ? updated : c))
        );
        setSelectedConv(updated);
        setShowTransferModal(false);
        setTransferNote("");
        setStatusFeedback(
          `Transferência efetuada para ${
            transferTargetType === "queue" ? "Fila" : "Ramal"
          } ${transferTargetId}`
        );
        setTimeout(() => setStatusFeedback(null), 4000);
      }
    } catch (err) {
      console.error("Failed to transfer", err);
    } finally {
      setActionLoading(false);
    }
  };

  const handleSend = async () => {
    if (!replyText.trim() || !selectedConv) return;

    const textToSend = replyText;
    setReplyText("");

    try {
      const res = await fetch(
        `/api/v1/whatsapp/conversations/${selectedConv.id}/reply`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: textToSend }),
        }
      );

      if (res.ok) {
        const updatedConv = await res.json();
        // If agent replied while conversation was in bot_handling or queued, auto-promote to active
        if (updatedConv.status === "bot_handling" || updatedConv.status === "queued") {
          handleUpdateStatus("active");
        }
        setConversations((prev) =>
          prev.map((c) => (c.id === updatedConv.id ? updatedConv : c))
        );
        setSelectedConv(updatedConv);
      }
    } catch (e) {
      console.error("Failed to send reply", e);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-emerald-100 text-emerald-800 border-emerald-300";
      case "bot_handling":
        return "bg-blue-100 text-blue-800 border-blue-300";
      case "queued":
        return "bg-amber-100 text-amber-800 border-amber-300";
      case "closed":
        return "bg-slate-100 text-slate-700 border-slate-300";
      default:
        return "bg-slate-100 text-slate-700 border-slate-200";
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "active":
        return "Em Atendimento";
      case "bot_handling":
        return "MaIA (IA) Atendendo";
      case "queued":
        return "Na Fila (Aguardando)";
      case "closed":
        return "Finalizado";
      default:
        return status;
    }
  };

  const getChannelIcon = (channel: string) => {
    switch (channel) {
      case "whatsapp":
        return <MessageSquare className="w-4 h-4 text-emerald-500" />;
      case "voice":
        return <PhoneCall className="w-4 h-4 text-blue-500" />;
      case "webrtc":
        return <Smartphone className="w-4 h-4 text-indigo-500" />;
      default:
        return <MessageSquare className="w-4 h-4 text-slate-500" />;
    }
  };

  // Filtered conversations logic
  const filteredConversations = useMemo(() => {
    return conversations.filter((c) => {
      // Channel filter
      if (channelFilter !== "all" && c.channel !== channelFilter) return false;
      // Status filter
      if (statusFilter !== "all" && c.status !== statusFilter) return false;
      // Search term
      if (searchTerm.trim()) {
        const query = searchTerm.toLowerCase();
        const matchesContact = c.contactId.toLowerCase().includes(query);
        const matchesMessage = c.messages.some((m) =>
          m.text.toLowerCase().includes(query)
        );
        if (!matchesContact && !matchesMessage) return false;
      }
      return true;
    });
  }, [conversations, channelFilter, statusFilter, searchTerm]);

  // Statistics counters
  const countBot = conversations.filter((c) => c.status === "bot_handling").length;
  const countQueued = conversations.filter((c) => c.status === "queued").length;
  const countActive = conversations.filter((c) => c.status === "active").length;

  return (
    <div className="max-w-[1400px] mx-auto space-y-6 flex flex-col h-full pb-8">
      {/* Toast Notification */}
      {statusFeedback && (
        <div className="fixed top-20 right-8 z-50 bg-slate-900 text-white px-4 py-3 rounded-xl shadow-2xl flex items-center gap-3 text-xs border border-slate-700 animate-in fade-in slide-in-from-top-4">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{statusFeedback}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-50 border border-blue-200 rounded-xl text-blue-600">
              <MessageSquare className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-slate-900 tracking-tight">
                Unified Inbox & Omnichannel
              </h1>
              <p className="text-xs font-medium text-slate-500 mt-0.5">
                Gestão unificada de chamadas SIP (Asterisk 20), WebRTC e WhatsApp Cloud API com Inteligência Artificial Gemini.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Status badges */}
          <div className="hidden lg:flex items-center gap-2 bg-slate-100 p-1 rounded-xl border border-slate-200 text-[11px] font-semibold">
            <span className="px-2 py-0.5 rounded-lg bg-blue-100 text-blue-800">
              {countBot} com IA
            </span>
            <span className="px-2 py-0.5 rounded-lg bg-amber-100 text-amber-800">
              {countQueued} na Fila
            </span>
            <span className="px-2 py-0.5 rounded-lg bg-emerald-100 text-emerald-800">
              {countActive} Ativos
            </span>
          </div>

          <button
            onClick={() => setShowConfig(true)}
            className="px-3.5 py-2 bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 font-bold rounded-xl text-xs uppercase tracking-wider transition flex items-center gap-2 shadow-sm"
          >
            <Smartphone className="w-4 h-4" /> WhatsApp Cloud API
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1 min-h-[640px]">
        {/* Painel Esquerdo: Lista de Conversas e Filtros */}
        <div className="col-span-1 bg-white border border-slate-200 rounded-2xl shadow-sm flex flex-col overflow-hidden">
          {/* Search Bar */}
          <div className="p-3.5 border-b border-slate-100 bg-slate-50/50 space-y-2">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar por contato ou mensagem..."
                className="w-full bg-white border border-slate-200 rounded-lg pl-9 pr-4 py-2 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Filter Tabs */}
            <div className="flex items-center justify-between gap-1 text-[11px] font-semibold pt-1">
              <div className="flex bg-slate-200/60 p-0.5 rounded-lg w-full">
                <button
                  onClick={() => setStatusFilter("all")}
                  className={`flex-1 py-1 rounded text-center transition ${
                    statusFilter === "all"
                      ? "bg-white text-slate-900 shadow-sm"
                      : "text-slate-500 hover:text-slate-700"
                  }`}
                >
                  Todos
                </button>
                <button
                  onClick={() => setStatusFilter("queued")}
                  className={`flex-1 py-1 rounded text-center transition ${
                    statusFilter === "queued"
                      ? "bg-amber-500 text-white shadow-sm font-bold"
                      : "text-slate-500 hover:text-slate-700"
                  }`}
                >
                  Fila {countQueued > 0 && `(${countQueued})`}
                </button>
                <button
                  onClick={() => setStatusFilter("bot_handling")}
                  className={`flex-1 py-1 rounded text-center transition ${
                    statusFilter === "bot_handling"
                      ? "bg-blue-600 text-white shadow-sm"
                      : "text-slate-500 hover:text-slate-700"
                  }`}
                >
                  IA Bot
                </button>
                <button
                  onClick={() => setStatusFilter("active")}
                  className={`flex-1 py-1 rounded text-center transition ${
                    statusFilter === "active"
                      ? "bg-emerald-600 text-white shadow-sm"
                      : "text-slate-500 hover:text-slate-700"
                  }`}
                >
                  Ativos
                </button>
              </div>
            </div>
          </div>

          {/* Conversations List */}
          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {isLoading ? (
              <div className="animate-pulse space-y-3">
                <div className="h-16 bg-slate-100 rounded-xl"></div>
                <div className="h-16 bg-slate-100 rounded-xl"></div>
                <div className="h-16 bg-slate-100 rounded-xl"></div>
              </div>
            ) : filteredConversations.length === 0 ? (
              <div className="text-center py-12 px-4 text-slate-400">
                <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-40" />
                <p className="text-xs font-semibold text-slate-600">Nenhum atendimento encontrado</p>
                <p className="text-[11px] text-slate-400 mt-1">Ajuste os filtros de status ou busca.</p>
              </div>
            ) : (
              filteredConversations.map((conv) => {
                const isSelected = selectedConv?.id === conv.id;
                const lastMsg = conv.messages[conv.messages.length - 1];
                const matched = crmContacts.find(
                  (c) =>
                    c.phone === conv.contactId ||
                    c.phone === conv.contactPhone ||
                    c.id === conv.contactId
                );
                const displayName = conv.contactName || matched?.name || conv.contactId;

                return (
                  <div
                    key={conv.id}
                    onClick={() => setSelectedConv(conv)}
                    className={`p-3.5 border rounded-xl cursor-pointer transition-all ${
                      isSelected
                        ? "bg-blue-50/60 border-blue-300 shadow-sm"
                        : "bg-white border-slate-200 hover:border-blue-300"
                    }`}
                  >
                    <div className="flex justify-between items-start mb-1.5">
                      <div className="flex items-center gap-2">
                        {getChannelIcon(conv.channel)}
                        <span className="font-bold text-xs text-slate-900 truncate max-w-[150px]">
                          {displayName}
                        </span>
                      </div>
                      <span className="text-[10px] text-slate-400 font-mono">
                        {conv.createdAt
                          ? new Date(conv.createdAt).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })
                          : ""}
                      </span>
                    </div>

                    <div className="mb-2">
                      <p className="text-[11px] text-slate-600 line-clamp-1">
                        {lastMsg ? lastMsg.text : "Início do atendimento"}
                      </p>
                    </div>

                    <div className="flex items-center justify-between gap-1 flex-wrap">
                      <span
                        className={`px-2 py-0.5 text-[10px] font-bold rounded-md border ${getStatusColor(
                          conv.status
                        )}`}
                      >
                        {getStatusLabel(conv.status)}
                      </span>

                      {conv.sentiment && (
                        <span
                          className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${
                            conv.sentiment === "positive"
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                              : conv.sentiment === "negative"
                              ? "bg-rose-50 text-rose-700 border-rose-200"
                              : "bg-slate-50 text-slate-600 border-slate-200"
                          }`}
                        >
                          {conv.sentiment === "positive" ? "Satisfeito" : conv.sentiment === "negative" ? "Risco Churn" : "Neutro"}
                        </span>
                      )}

                      {conv.status === "queued" && (
                        <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200 flex items-center gap-1">
                          <Clock className="w-3 h-3" /> Aguardando
                        </span>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Painel Direito: Chat e CRM 360 */}
        <div className="col-span-1 lg:col-span-2 bg-white border border-slate-200 rounded-2xl shadow-sm flex flex-col relative overflow-hidden">
          {!selectedConv ? (
            <div className="absolute inset-0 bg-slate-50 flex items-center justify-center">
              <div className="text-center max-w-sm px-6">
                <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center mx-auto mb-4 text-blue-600">
                  <MessageSquare className="w-8 h-8" />
                </div>
                <h3 className="text-lg font-bold text-slate-800 mb-1">Caixa de Entrada Unificada</h3>
                <p className="text-xs text-slate-500">
                  Selecione um contato na lista à esquerda para interagir, assumir com Barge-in ou transferir.
                </p>
              </div>
            </div>
          ) : (
            <>
              {/* Chat Header com Ações Rápidas */}
              <div className="px-5 py-3.5 border-b border-slate-200 bg-white flex flex-wrap justify-between items-center gap-3 z-10">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-slate-100 border border-slate-200 rounded-xl flex items-center justify-center text-slate-700 font-bold text-sm">
                    {selectedConv.contactId.charAt(0)}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-sm text-slate-900">{selectedConv.contactId}</h3>
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold border ${getStatusColor(
                          selectedConv.status
                        )}`}
                      >
                        {getStatusLabel(selectedConv.status)}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5 font-mono text-[11px]">
                      <span className="capitalize flex items-center gap-1">
                        {getChannelIcon(selectedConv.channel)} {selectedConv.channel}
                      </span>
                      <span>•</span>
                      <span>ID: {selectedConv.id}</span>
                    </div>
                  </div>
                </div>

                {/* Workflow Action Buttons */}
                <div className="flex items-center gap-2">
                  {/* If BOT or QUEUED: Allow Barge-in */}
                  {(selectedConv.status === "bot_handling" || selectedConv.status === "queued") && (
                    <button
                      onClick={() => handleUpdateStatus("active")}
                      disabled={actionLoading}
                      className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition flex items-center gap-1.5 shadow-sm disabled:opacity-50"
                    >
                      <UserCheck className="w-3.5 h-3.5" />
                      {selectedConv.status === "bot_handling" ? "Assumir (Barge-in)" : "Atender da Fila"}
                    </button>
                  )}

                  {/* If ACTIVE: Allow Transfer, Devolver Bot, or Finalize */}
                  {selectedConv.status === "active" && (
                    <>
                      <button
                        onClick={() => setShowTransferModal(true)}
                        disabled={actionLoading}
                        className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold transition flex items-center gap-1.5 border border-slate-200"
                        title="Transferir para outra fila ou ramal"
                      >
                        <CornerDownRight className="w-3.5 h-3.5 text-blue-600" />
                        Transferir
                      </button>

                      <button
                        onClick={() => handleUpdateStatus("bot_handling")}
                        disabled={actionLoading}
                        className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg text-xs font-bold transition flex items-center gap-1.5 border border-indigo-200"
                        title="Retornar conversa para a IA Gemini MaIA"
                      >
                        <Bot className="w-3.5 h-3.5 text-indigo-600" />
                        Devolver p/ IA
                      </button>

                      <button
                        onClick={() => handleUpdateStatus("closed")}
                        disabled={actionLoading}
                        className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-lg text-xs font-bold transition flex items-center gap-1.5 border border-rose-200"
                        title="Encerrar protocolo de atendimento"
                      >
                        <Check className="w-3.5 h-3.5 text-rose-600" />
                        Finalizar
                      </button>
                    </>
                  )}

                  {/* If CLOSED: Allow Reopen */}
                  {selectedConv.status === "closed" && (
                    <button
                      onClick={() => handleUpdateStatus("active")}
                      disabled={actionLoading}
                      className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold transition flex items-center gap-1.5 border border-slate-200"
                    >
                      <RotateCcw className="w-3.5 h-3.5 text-slate-600" />
                      Reabrir Atendimento
                    </button>
                  )}
                </div>
              </div>

              {/* Chat & CRM 360 Split */}
              <div className="flex-1 flex overflow-hidden">
                {/* Chat Area */}
                <div className="flex-1 flex flex-col bg-[#f8fafc] relative">
                  <div className="flex-1 overflow-y-auto p-5 space-y-3.5">
                    <div className="text-center my-2">
                      <span className="px-3 py-1 bg-white border border-slate-200 text-slate-400 text-[10px] font-bold rounded-full uppercase tracking-wider shadow-2xs">
                        Protocolo Iniciado
                      </span>
                    </div>

                    {selectedConv.messages.map((msg) => (
                      <div
                        key={msg.id}
                        className={`flex flex-col max-w-[80%] ${
                          msg.sender === "user" ? "self-start" : "self-end items-end"
                        }`}
                      >
                        {msg.sender === "bot" && (
                          <div className="flex items-center gap-1 mb-1 text-[10px] font-bold text-blue-700 uppercase ml-1">
                            <Bot className="w-3 h-3 text-blue-600" /> MaIA (Gemini Live IA)
                          </div>
                        )}
                        {msg.sender === "agent" && (
                          <div className="flex items-center gap-1 mb-1 text-[10px] font-bold text-emerald-700 uppercase mr-1">
                            <User className="w-3 h-3 text-emerald-600" /> Atendente Humano
                          </div>
                        )}

                        <div
                          className={`p-3 rounded-2xl shadow-2xs text-xs ${
                            msg.sender === "user"
                              ? "bg-white text-slate-800 rounded-tl-none border border-slate-200"
                              : msg.sender === "bot"
                              ? "bg-blue-50 text-blue-900 rounded-tr-none border border-blue-200"
                              : msg.text.startsWith("[Sistema]") || msg.text.startsWith("[Transferência]")
                              ? "bg-amber-50 text-amber-900 border border-amber-200 font-mono text-[11px]"
                              : "bg-emerald-600 text-white rounded-tr-none"
                          }`}
                        >
                          {msg.text}
                        </div>
                        <span className="text-[10px] text-slate-400 mt-1 px-1 font-mono">
                          {new Date(msg.timestamp).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* Quick Replies Bar */}
                  <div className="px-4 py-2 bg-slate-50 border-t border-slate-200 flex items-center gap-2 overflow-x-auto">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider shrink-0 flex items-center gap-1">
                      <Zap className="w-3 h-3 text-amber-500" /> Respostas Rápidas:
                    </span>
                    {QUICK_TEMPLATES.map((tmpl, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setReplyText(tmpl.text)}
                        className="text-[11px] font-medium px-2.5 py-1 bg-white hover:bg-slate-100 text-slate-700 rounded-lg border border-slate-200 shadow-2xs whitespace-nowrap transition"
                      >
                        {tmpl.label}
                      </button>
                    ))}
                  </div>

                  {/* Input Box */}
                  <div className="p-3.5 bg-white border-t border-slate-200">
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={replyText}
                        onChange={(e) => setReplyText(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && handleSend()}
                        placeholder={
                          selectedConv.status === "closed"
                            ? "Atendimento finalizado. Clique em Reabrir para continuar..."
                            : selectedConv.status === "bot_handling"
                            ? "Digite sua mensagem (o envio acionará Barge-in para atendimento humano)..."
                            : "Digite sua resposta para o cliente..."
                        }
                        className="flex-1 bg-slate-100 border-none rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-800"
                        disabled={selectedConv.status === "closed"}
                      />

                      {/* AI Copilot Suggestion Button */}
                      <button
                        type="button"
                        onClick={handleAiSuggest}
                        disabled={isSuggestingAi || selectedConv.status === "closed"}
                        className="h-10 px-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl flex items-center justify-center transition disabled:opacity-50 text-xs font-bold gap-1.5 shadow-sm shrink-0"
                        title="Gerar sugestão inteligente com Gemini para o contexto do cliente"
                      >
                        <Sparkles className={`w-3.5 h-3.5 ${isSuggestingAi ? 'animate-spin' : ''}`} />
                        {isSuggestingAi ? "Gerando..." : "Sugerir IA"}
                      </button>

                      <button
                        onClick={handleSend}
                        disabled={!replyText.trim() || selectedConv.status === "closed"}
                        className="h-10 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl flex items-center justify-center transition disabled:opacity-50 disabled:cursor-not-allowed shadow-sm text-xs font-bold gap-1.5 shrink-0"
                      >
                        <Send className="w-4 h-4" /> Enviar
                      </button>
                    </div>
                  </div>
                </div>

                {/* CRM 360 / Painel Lateral Avançado */}
                {(() => {
                  const matchedContact = crmContacts.find(
                    (c) =>
                      c.phone === selectedConv.contactId ||
                      c.phone === selectedConv.contactPhone ||
                      c.id === selectedConv.contactId
                  );
                  const clientName = selectedConv.contactName || matchedContact?.name || selectedConv.contactId;
                  const company = selectedConv.companyName || matchedContact?.company || "Empresa Contratante PBX";
                  const notesList = selectedConv.notes || [];

                  return (
                    <div className="w-80 border-l border-slate-200 bg-white flex flex-col hidden md:flex text-xs overflow-hidden">
                      {/* Tabs Header */}
                      <div className="p-3 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
                        <div className="flex bg-slate-200/80 p-0.5 rounded-lg w-full">
                          <button
                            type="button"
                            onClick={() => setActiveCrmTab("profile")}
                            className={`flex-1 py-1 text-[11px] font-bold rounded transition flex items-center justify-center gap-1 ${
                              activeCrmTab === "profile"
                                ? "bg-white text-slate-900 shadow-xs"
                                : "text-slate-600 hover:text-slate-900"
                            }`}
                          >
                            <ShieldCheck className="w-3.5 h-3.5 text-blue-600" /> Perfil & CRM
                          </button>
                          <button
                            type="button"
                            onClick={() => setActiveCrmTab("notes")}
                            className={`flex-1 py-1 text-[11px] font-bold rounded transition flex items-center justify-center gap-1 ${
                              activeCrmTab === "notes"
                                ? "bg-white text-slate-900 shadow-xs"
                                : "text-slate-600 hover:text-slate-900"
                            }`}
                          >
                            <StickyNote className="w-3.5 h-3.5 text-amber-600" /> Notas ({notesList.length})
                          </button>
                        </div>
                      </div>

                      {/* Tab 1: Profile & CRM 360 */}
                      {activeCrmTab === "profile" && (
                        <div className="p-4 overflow-y-auto space-y-4 flex-1">
                          {/* Client Identification Card */}
                          <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200">
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Cliente Identificado</span>
                              <span className="px-1.5 py-0.5 bg-emerald-100 text-emerald-800 text-[9px] font-bold rounded">
                                WhatsApp Ativo
                              </span>
                            </div>
                            <div className="font-bold text-slate-900 text-sm">{clientName}</div>
                            <div className="text-[11px] text-slate-600 flex items-center gap-1 mt-0.5">
                              <Building2 className="w-3 h-3 text-slate-400" /> {company}
                            </div>
                            <div className="text-[10px] font-mono text-slate-400 mt-1">
                              Telefone: {selectedConv.contactPhone || selectedConv.contactId}
                            </div>
                          </div>

                          {/* CRM Association */}
                          <div className="p-3 bg-blue-50/50 rounded-xl border border-blue-200">
                            <div className="flex items-center justify-between text-[10px] uppercase font-bold text-blue-600 mb-1">
                              <span className="flex items-center gap-1"><Briefcase className="w-3 h-3" /> Integração CRM</span>
                              <span className="font-mono text-[9px] bg-blue-100 text-blue-800 px-1 rounded">HubSpot / Pipedrive</span>
                            </div>
                            <div className="font-semibold text-slate-800 text-[11px]">Plano PBX Cloud Corporativo</div>
                            <div className="text-[10px] text-slate-500 mt-0.5">Contrato Anual • SLA Ouro • 20 Ramais WebRTC</div>
                          </div>

                          {/* Sentiment & Tags */}
                          <div>
                            <h5 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1">
                              <Tag className="w-3 h-3 text-purple-500" /> Tags & Análise de Sentimento (IA)
                            </h5>
                            <div className="flex flex-wrap gap-1.5 mb-2">
                              <span className={`px-2 py-0.5 text-[10px] font-bold rounded border ${
                                selectedConv.sentiment === 'positive' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                                selectedConv.sentiment === 'negative' ? 'bg-rose-50 text-rose-700 border-rose-200' :
                                'bg-slate-100 text-slate-700 border-slate-200'
                              }`}>
                                Sentimento: {selectedConv.sentiment === 'positive' ? 'Satisfeito' : selectedConv.sentiment === 'negative' ? 'Crítico / Risco' : 'Neutro'}
                              </span>
                              {(selectedConv.tags || ["Suporte Técnico", "SLA Alto", "Tronco SIP"]).map((t, i) => (
                                <span key={i} className="px-2 py-0.5 bg-blue-50 text-blue-700 border border-blue-200 text-[10px] font-bold rounded">
                                  {t}
                                </span>
                              ))}
                            </div>
                          </div>

                          {/* Unified Timeline */}
                          <div className="pt-2 border-t border-slate-100">
                            <h5 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2.5 flex items-center gap-1">
                              <Calendar className="w-3 h-3 text-slate-500" /> Timeline Unificada do Contato
                            </h5>
                            <div className="space-y-2.5 text-[11px]">
                              <div className="flex items-start gap-2">
                                <span className="w-2 h-2 rounded-full bg-emerald-500 mt-1 shrink-0"></span>
                                <div>
                                  <div className="font-semibold text-slate-800">Mensagem via WhatsApp</div>
                                  <div className="text-[10px] text-slate-400">Hoje às 09:12 • Protocolo aberto</div>
                                </div>
                              </div>
                              <div className="flex items-start gap-2">
                                <span className="w-2 h-2 rounded-full bg-blue-500 mt-1 shrink-0"></span>
                                <div>
                                  <div className="font-semibold text-slate-800">Ligação de Voz Asterisk 20</div>
                                  <div className="text-[10px] text-slate-400">Ontem às 16:45 (03m12s) • Ramal 4101</div>
                                </div>
                              </div>
                              <div className="flex items-start gap-2">
                                <span className="w-2 h-2 rounded-full bg-amber-500 mt-1 shrink-0"></span>
                                <div>
                                  <div className="font-semibold text-slate-800">Fatura Emitida (DID Locado)</div>
                                  <div className="text-[10px] text-slate-400">15/09/2026 • R$ 420,00 • Chave Pix enviada</div>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Tab 2: Internal Operator Notes */}
                      {activeCrmTab === "notes" && (
                        <div className="p-4 flex flex-col flex-1 overflow-hidden">
                          <div className="mb-3">
                            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 block">
                              Nova Anotação Interna (NOC & Atendimento)
                            </label>
                            <textarea
                              rows={3}
                              value={newNoteText}
                              onChange={(e) => setNewNoteText(e.target.value)}
                              placeholder="Adicione detalhes de diagnóstico, preferências ou acordos com o cliente..."
                              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500 resize-none"
                            />
                            <div className="flex justify-end mt-1.5">
                              <button
                                type="button"
                                onClick={handleSaveNote}
                                disabled={isSavingNote || !newNoteText.trim()}
                                className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold transition disabled:opacity-50 flex items-center gap-1 shadow-2xs"
                              >
                                <Check className="w-3.5 h-3.5" />
                                {isSavingNote ? "Gravando..." : "Salvar Nota"}
                              </button>
                            </div>
                          </div>

                          <div className="flex-1 overflow-y-auto space-y-2 pt-2 border-t border-slate-100">
                            {notesList.length === 0 ? (
                              <div className="text-center py-6 text-slate-400">
                                <StickyNote className="w-6 h-6 mx-auto mb-1 opacity-40 text-amber-500" />
                                <p className="text-[11px]">Nenhuma anotação registrada ainda.</p>
                              </div>
                            ) : (
                              notesList.map((note) => (
                                <div key={note.id} className="p-2.5 bg-amber-50/60 border border-amber-200/80 rounded-xl">
                                  <div className="flex justify-between items-center text-[10px] text-amber-900 font-bold mb-1">
                                    <span>{note.agentName}</span>
                                    <span className="font-mono text-slate-400 font-normal">
                                      {new Date(note.createdAt).toLocaleTimeString([], {
                                        hour: "2-digit",
                                        minute: "2-digit",
                                      })}
                                    </span>
                                  </div>
                                  <p className="text-[11px] text-slate-700 leading-relaxed">{note.text}</p>
                                </div>
                              ))
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>
            </>
          )}
        </div>
      </div>

      {/* MODAL: TRANSFERÊNCIA HUMANA */}
      {showTransferModal && selectedConv && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden border border-slate-200">
            <div className="px-5 py-3.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <CornerDownRight className="w-4 h-4 text-blue-600" />
                Transferir Atendimento
              </h3>
              <button
                onClick={() => setShowTransferModal(false)}
                className="text-slate-400 hover:text-slate-600 text-lg font-bold"
              >
                ×
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Destino da Transferência</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setTransferTargetType("queue");
                      setTransferTargetId("queue-suporte-n1");
                    }}
                    className={`py-2 px-3 rounded-xl border text-center font-bold transition ${
                      transferTargetType === "queue"
                        ? "bg-blue-50 border-blue-400 text-blue-700"
                        : "bg-white border-slate-200 text-slate-600"
                    }`}
                  >
                    Fila de Atendimento
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setTransferTargetType("extension");
                      setTransferTargetId("4101");
                    }}
                    className={`py-2 px-3 rounded-xl border text-center font-bold transition ${
                      transferTargetType === "extension"
                        ? "bg-blue-50 border-blue-400 text-blue-700"
                        : "bg-white border-slate-200 text-slate-600"
                    }`}
                  >
                    Ramal Específico
                  </button>
                </div>
              </div>

              {transferTargetType === "queue" ? (
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Selecionar Fila</label>
                  <select
                    value={transferTargetId}
                    onChange={(e) => setTransferTargetId(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="queue-suporte-n1">Suporte Técnico N1 (RAM: 4101, 4102)</option>
                    <option value="queue-vendas">Comercial e Vendas (RAM: 4103)</option>
                    <option value="queue-financeiro">Financeiro / Cobrança</option>
                  </select>
                </div>
              ) : (
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Número do Ramal</label>
                  <input
                    type="text"
                    value={transferTargetId}
                    onChange={(e) => setTransferTargetId(e.target.value)}
                    placeholder="Ex: 4101, 4102..."
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              )}

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Nota Interna de Contexto (Opcional)
                </label>
                <textarea
                  value={transferNote}
                  onChange={(e) => setTransferNote(e.target.value)}
                  placeholder="Ex: Cliente com dúvida sobre configuração SIP Trunk no mikrotik..."
                  rows={2}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowTransferModal(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 font-semibold rounded-lg text-xs"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleTransfer}
                  disabled={actionLoading}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg text-xs transition"
                >
                  Confirmar Transferência
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: CONFIGURAÇÃO WHATSAPP CLOUD API */}
      {showConfig && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden border border-slate-200">
            <div className="px-5 py-3.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <Smartphone className="w-4 h-4 text-emerald-600" />
                Configurar WhatsApp Cloud API (Meta)
              </h3>
              <button
                onClick={() => setShowConfig(false)}
                className="text-slate-400 hover:text-slate-600 text-lg font-bold"
              >
                ×
              </button>
            </div>

            <div className="p-5 space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Phone Number ID</label>
                <input
                  type="text"
                  value={whatsappConfig.phoneNumberId}
                  onChange={(e) =>
                    setWhatsappConfig({ ...whatsappConfig, phoneNumberId: e.target.value })
                  }
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  placeholder="Ex: 104593848573..."
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Permanent Access Token</label>
                <input
                  type="password"
                  value={whatsappConfig.accessToken}
                  onChange={(e) =>
                    setWhatsappConfig({ ...whatsappConfig, accessToken: e.target.value })
                  }
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  placeholder="EAAGm0PX..."
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Webhook Verify Token</label>
                <input
                  type="text"
                  value={whatsappConfig.verifyToken}
                  onChange={(e) =>
                    setWhatsappConfig({ ...whatsappConfig, verifyToken: e.target.value })
                  }
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  placeholder="enlace_whatsapp_token_default"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="activeCheck"
                  checked={whatsappConfig.isActive}
                  onChange={(e) =>
                    setWhatsappConfig({ ...whatsappConfig, isActive: e.target.checked })
                  }
                  className="rounded text-emerald-600 focus:ring-emerald-500"
                />
                <label htmlFor="activeCheck" className="font-bold text-slate-700">
                  Ativar Integração Oficial Meta Graph API
                </label>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-[11px] text-slate-500 space-y-1">
                <div className="font-bold text-slate-700">Webhook URL do Enlace-PBX:</div>
                <div className="font-mono text-blue-600 select-all">
                  https://seudominio.com.br/api/v1/webhooks/whatsapp
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowConfig(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 font-semibold rounded-lg text-xs"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleSaveConfig}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg text-xs transition"
                >
                  Salvar Configuração
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showConfig && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
              <h3 className="font-bold text-slate-800 flex items-center gap-2">
                <Smartphone className="w-5 h-5 text-emerald-600" />
                Configurar WhatsApp Cloud API
              </h3>
              <button onClick={() => setShowConfig(false)} className="text-slate-400 hover:text-slate-600">×</button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Phone Number ID</label>
                <input 
                  type="text" 
                  value={whatsappConfig.phoneNumberId} 
                  onChange={e => setWhatsappConfig({...whatsappConfig, phoneNumberId: e.target.value})}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  placeholder="Ex: 104593848573..."
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Access Token (Permanente)</label>
                <input 
                  type="password" 
                  value={whatsappConfig.accessToken} 
                  onChange={e => setWhatsappConfig({...whatsappConfig, accessToken: e.target.value})}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  placeholder="EAAGX..."
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Verify Token (Para Webhook)</label>
                <input 
                  type="text" 
                  value={whatsappConfig.verifyToken} 
                  onChange={e => setWhatsappConfig({...whatsappConfig, verifyToken: e.target.value})}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  placeholder="Seu token secreto para validar o Webhook"
                />
              </div>
              <div className="flex items-center gap-2 mt-4">
                <input 
                  type="checkbox" 
                  id="waActive"
                  checked={whatsappConfig.isActive} 
                  onChange={e => setWhatsappConfig({...whatsappConfig, isActive: e.target.checked})}
                  className="w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500"
                />
                <label htmlFor="waActive" className="text-sm font-medium text-slate-700">Ativar Integração Oficial</label>
              </div>

              <div className="mt-4 p-3 bg-blue-50 border border-blue-100 rounded-lg text-xs text-blue-800">
                <span className="font-bold block mb-1">Webhook URL:</span>
                <code>https://{'<'}seu-dominio{'>'}/api/v1/webhooks/whatsapp</code>
              </div>
            </div>
            <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-2">
              <button onClick={() => setShowConfig(false)} className="px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-200 rounded-lg transition">Cancelar</button>
              <button onClick={handleSaveConfig} className="px-4 py-2 text-sm font-bold bg-emerald-600 text-white hover:bg-emerald-700 rounded-lg transition">Salvar Credenciais</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
