import React, { useState, useEffect } from 'react';
import { MessageSquare, PhoneCall, Bot, User, CheckCircle2, Search, Filter, Send, Clock, PhoneForwarded, UserCheck, Tag, MoreVertical, FileText, Smartphone } from 'lucide-react';

interface Conversation {
  id: string;
  tenantId: string;
  contactId: string;
  channel: 'whatsapp' | 'voice' | 'webrtc' | 'sms';
  status: 'active' | 'closed' | 'queued' | 'bot_handling';
  createdAt: string;
  messages: Array<{
    id: string;
    sender: 'user' | 'bot' | 'agent';
    text: string;
    timestamp: string;
  }>;
}

export const OmnichannelView: React.FC = () => {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConv, setSelectedConv] = useState<Conversation | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [replyText, setReplyText] = useState('');


  const [showConfig, setShowConfig] = useState(false);
  const [whatsappConfig, setWhatsappConfig] = useState({ phoneNumberId: '', accessToken: '', verifyToken: '', isActive: false });

  const fetchConversations = async () => {
    try {
      const res = await fetch('/api/v1/omnichannel/conversations');
      const data = await res.json();
      setConversations(data);
      // Update selected conv seamlessly
      setSelectedConv(prev => {
        if (!prev && data.length > 0) return data[0];
        const match = data.find((c: any) => c.id === prev?.id);
        return match || prev;
      });
    } catch (e) {
      console.error('Failed to fetch conversations', e);
    }
  };

  const fetchConfig = async () => {
    try {
      const res = await fetch('/api/v1/whatsapp/config');
      const data = await res.json();
      setWhatsappConfig(data);
    } catch (e) {
      console.error('Failed to fetch config', e);
    }
  };

  useEffect(() => {
    fetchConversations();
    fetchConfig();
    setIsLoading(false);
    
    // Poll every 3s for new WhatsApp messages
    const interval = setInterval(fetchConversations, 3000);
    return () => clearInterval(interval);
  }, []);

  const handleSaveConfig = async () => {
    try {
      await fetch('/api/v1/whatsapp/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(whatsappConfig)
      });
      setShowConfig(false);
      alert('Configurações salvas com sucesso!');
    } catch (e) {
      alert('Erro ao salvar as configurações.');
    }
  };

  const handleSend = async () => {
    if (!replyText.trim() || !selectedConv) return;
    
    try {
      const res = await fetch(`/api/v1/whatsapp/conversations/${selectedConv.id}/reply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: replyText })
      });
      
      if (res.ok) {
        const updatedConv = await res.json();
        const newConvs = conversations.map(c => c.id === updatedConv.id ? updatedConv : c);
        setConversations(newConvs);
        setSelectedConv(updatedConv);
        setReplyText('');
      }
    } catch (e) {
      console.error('Failed to send reply', e);
      alert('Erro ao enviar mensagem.');
    }
  };

  const getStatusColor = (status: string) => {
    switch(status) {
      case 'active': return 'bg-emerald-100 text-emerald-700 border-emerald-200';
      case 'bot_handling': return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'queued': return 'bg-amber-100 text-amber-700 border-amber-200';
      default: return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  const getStatusLabel = (status: string) => {
    switch(status) {
      case 'active': return 'Em Atendimento';
      case 'bot_handling': return 'MaIA (Bot) Atendendo';
      case 'queued': return 'Na Fila (Humano)';
      case 'closed': return 'Finalizado';
      default: return status;
    }
  };

  const getChannelIcon = (channel: string) => {
    switch(channel) {
      case 'whatsapp': return <MessageSquare className="w-4 h-4 text-emerald-500" />;
      case 'voice': return <PhoneCall className="w-4 h-4 text-blue-500" />;
      case 'webrtc': return <Smartphone className="w-4 h-4 text-indigo-500" />;
      default: return <MessageSquare className="w-4 h-4 text-slate-500" />;
    }
  };

  return (
    <div className="max-w-[1400px] mx-auto space-y-6 flex flex-col h-full pb-8">
      {/* Premium Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-6">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
            <MessageSquare className="w-8 h-8 text-blue-600 fill-blue-600" />
            Unified Inbox (Omnichannel)
          </h1>
          <p className="text-sm font-medium text-slate-500 mt-1">
            Gestão unificada de chamadas SIP (RAG em Tempo Real) e sessões de WhatsApp Business API.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button className="px-4 py-2.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold rounded-xl text-xs uppercase tracking-wider transition flex items-center gap-2 shadow-sm">
            <Filter className="w-4 h-4" /> Configurar Filtros
          </button>
          <button onClick={() => setShowConfig(true)} className="px-4 py-2.5 bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 font-bold rounded-xl text-xs uppercase tracking-wider transition flex items-center gap-2 shadow-sm">
            <Smartphone className="w-4 h-4" /> Configurar WhatsApp API
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1 min-h-[600px]">
        
        {/* Painel de Conversas (Esquerda) */}
        <div className="col-span-1 bg-white border border-slate-200 rounded-2xl shadow-sm flex flex-col overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 bg-slate-50/50">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input 
                type="text" 
                placeholder="Buscar cliente, número..." 
                className="w-full bg-white border border-slate-200 rounded-lg pl-9 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
          
          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {isLoading ? (
              <div className="animate-pulse space-y-3">
                <div className="h-20 bg-slate-100 rounded-xl"></div>
                <div className="h-20 bg-slate-100 rounded-xl"></div>
                <div className="h-20 bg-slate-100 rounded-xl"></div>
              </div>
            ) : (
              conversations.map(conv => (
                <div 
                  key={conv.id} 
                  onClick={() => setSelectedConv(conv)}
                  className={`p-4 border rounded-xl cursor-pointer transition-all ${
                    selectedConv?.id === conv.id 
                      ? 'bg-blue-50/50 border-blue-200 shadow-sm' 
                      : 'bg-white border-slate-100 hover:border-blue-300'
                  }`}
                >
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex items-center gap-2">
                      {getChannelIcon(conv.channel)}
                      <span className="font-bold text-sm text-slate-800">{conv.contactId}</span>
                    </div>
                    <span className="text-[10px] text-slate-400 font-medium">
                      {new Date(conv.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <div className="mb-2">
                    <p className="text-xs text-slate-500 line-clamp-1">
                      {conv.messages[conv.messages.length - 1]?.text}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-0.5 text-[10px] font-bold rounded-md border ${getStatusColor(conv.status)}`}>
                      {getStatusLabel(conv.status)}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Customer 360 & Chat (Direita) */}
        <div className="col-span-1 lg:col-span-2 bg-white border border-slate-200 rounded-2xl shadow-sm flex flex-col relative overflow-hidden">
          {!selectedConv ? (
            <div className="absolute inset-0 bg-slate-50 flex items-center justify-center">
              <div className="text-center max-w-sm px-6">
                <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center mx-auto mb-4 text-blue-600">
                  <MessageSquare className="w-8 h-8" />
                </div>
                <h3 className="text-lg font-bold text-slate-800 mb-2">Caixa de Entrada Unificada</h3>
                <p className="text-sm text-slate-500">Selecione uma interação à esquerda para visualizar o histórico de conversas via Voz, WebRTC e WhatsApp.</p>
              </div>
            </div>
          ) : (
            <>
              {/* Chat Header */}
              <div className="px-6 py-4 border-b border-slate-100 bg-white flex justify-between items-center z-10 shadow-sm">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center text-slate-600 font-bold">
                    {selectedConv.contactId.charAt(0)}
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-800">{selectedConv.contactId}</h3>
                    <div className="flex items-center gap-2 text-xs text-slate-500">
                      <span className="capitalize flex items-center gap-1">
                        {getChannelIcon(selectedConv.channel)} {selectedConv.channel}
                      </span>
                      <span>•</span>
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase ${getStatusColor(selectedConv.status)}`}>
                        {getStatusLabel(selectedConv.status)}
                      </span>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  {selectedConv.status === 'bot_handling' && (
                    <button className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-bold hover:bg-blue-700 transition flex items-center gap-1.5">
                      <UserCheck className="w-3.5 h-3.5" /> Assumir (Barge-in)
                    </button>
                  )}
                  <button className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition">
                    <MoreVertical className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Layout Dividido: Chat e CRM 360 */}
              <div className="flex-1 flex overflow-hidden">
                
                {/* Área de Mensagens */}
                <div className="flex-1 flex flex-col bg-[#f0f2f5] relative">
                  <div className="flex-1 overflow-y-auto p-6 space-y-4">
                    
                    <div className="text-center mb-6">
                      <span className="px-3 py-1 bg-white border border-slate-200 text-slate-400 text-[10px] font-bold rounded-full uppercase tracking-wide">
                        Início da Interação
                      </span>
                    </div>

                    {selectedConv.messages.map((msg, i) => (
                      <div key={msg.id} className={`flex flex-col max-w-[75%] ${msg.sender === 'user' ? 'self-start' : 'self-end items-end'}`}>
                        {msg.sender === 'bot' && (
                          <div className="flex items-center gap-1 mb-1 text-[10px] font-bold text-blue-600 uppercase ml-1">
                            <Bot className="w-3 h-3" /> MaIA (Agent IA)
                          </div>
                        )}
                        {msg.sender === 'agent' && (
                          <div className="flex items-center gap-1 mb-1 text-[10px] font-bold text-emerald-600 uppercase mr-1">
                            <User className="w-3 h-3" /> Atendente Humano
                          </div>
                        )}
                        
                        <div className={`p-3 rounded-2xl shadow-sm text-sm ${
                          msg.sender === 'user' 
                            ? 'bg-white text-slate-700 rounded-tl-none border border-slate-200' 
                            : msg.sender === 'bot'
                              ? 'bg-blue-50 text-blue-800 rounded-tr-none border border-blue-200'
                              : 'bg-emerald-500 text-white rounded-tr-none'
                        }`}>
                          {msg.text}
                        </div>
                        <span className="text-[10px] text-slate-400 mt-1 px-1">
                          {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* Input Box */}
                  <div className="p-4 bg-white border-t border-slate-200">
                    <div className="flex items-center gap-3">
                      <input 
                        type="text" 
                        value={replyText}
                        onChange={(e) => setReplyText(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                        placeholder="Digite sua mensagem para o cliente..." 
                        className="flex-1 bg-slate-100 border-none rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        disabled={selectedConv.status === 'closed'}
                      />
                      <button 
                        onClick={handleSend}
                        disabled={!replyText.trim() || selectedConv.status === 'closed'}
                        className="w-12 h-12 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl flex items-center justify-center transition disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                      >
                        <Send className="w-5 h-5" />
                      </button>
                    </div>
                    {selectedConv.status === 'bot_handling' && (
                      <p className="text-[10px] text-center text-slate-400 mt-2">
                        Ao enviar uma mensagem, o sistema realizará o <strong>Barge-in</strong> e você assumirá o atendimento da Inteligência Artificial.
                      </p>
                    )}
                  </div>
                </div>

                {/* CRM 360 / Painel Lateral */}
                <div className="w-64 border-l border-slate-200 bg-white p-5 overflow-y-auto hidden md:block">
                  <h4 className="font-bold text-slate-800 text-sm mb-4 flex items-center gap-2">
                    <UserCheck className="w-4 h-4 text-blue-600" /> Visão 360º (CRM)
                  </h4>
                  
                  <div className="space-y-4">
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                      <div className="text-xs text-slate-400 mb-1">Status no CRM (SuiteCRM)</div>
                      <div className="font-semibold text-slate-700 text-sm">Lead Qualificado</div>
                    </div>
                    
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                      <div className="text-xs text-slate-400 mb-1">Última Compra</div>
                      <div className="font-semibold text-slate-700 text-sm">N/A (Prospect)</div>
                    </div>

                    <div className="pt-4 border-t border-slate-100">
                      <h5 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Tags Inteligentes (IA)</h5>
                      <div className="flex flex-wrap gap-2">
                        <span className="px-2 py-1 bg-blue-50 text-blue-600 text-[10px] font-bold rounded flex items-center gap-1">
                          <Tag className="w-3 h-3" /> Dúvida Operacional
                        </span>
                        <span className="px-2 py-1 bg-amber-50 text-amber-600 text-[10px] font-bold rounded flex items-center gap-1">
                          <Clock className="w-3 h-3" /> Urgente
                        </span>
                      </div>
                    </div>

                    <div className="pt-4 border-t border-slate-100">
                      <h5 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Jornada (Timeline)</h5>
                      <div className="relative pl-3 border-l-2 border-slate-200 space-y-4">
                        <div className="relative">
                          <div className="absolute w-2 h-2 bg-slate-400 rounded-full -left-[17px] top-1"></div>
                          <div className="text-xs text-slate-500">Hoje, 09:12</div>
                          <div className="text-sm font-medium text-slate-700">Chamou no WhatsApp</div>
                        </div>
                        <div className="relative">
                          <div className="absolute w-2 h-2 bg-blue-500 rounded-full -left-[17px] top-1 shadow-[0_0_0_2px_white]"></div>
                          <div className="text-xs text-slate-500">Hoje, 09:15</div>
                          <div className="text-sm font-medium text-slate-700">Triagem via MaIA concluída</div>
                        </div>
                      </div>
                    </div>
                  </div>

                </div>
              </div>
            </>
          )}
        </div>
      </div>

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
