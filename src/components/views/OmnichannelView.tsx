import React, { useState, useEffect } from 'react';
import { MessageSquare, PhoneCall, Bot, User, CheckCircle2 } from 'lucide-react';

interface Conversation {
  id: string;
  tenantId: string;
  contactId: string;
  channel: 'whatsapp' | 'voice' | 'webrtc';
  status: 'active' | 'closed' | 'queued';
  createdAt: string;
}

export const OmnichannelView: React.FC = () => {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetch('/api/v1/omnichannel/conversations')
      .then(r => r.json())
      .then(data => {
        setConversations(data);
        setIsLoading(false);
      })
      .catch(console.error);
  }, []);

  return (
    <div className="space-y-6 flex flex-col h-full">
      <div>
        <h2 className="text-2xl font-bold text-slate-800">Contact Center Omnichannel</h2>
        <p className="text-sm text-slate-500 mt-1">Gestão centralizada de atendimentos via Voz, WhatsApp e Inteligência Artificial.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 flex-1 min-h-0">
        
        {/* Painel de Conversas Ativas */}
        <div className="col-span-1 bg-white border border-slate-200 rounded-xl shadow-sm flex flex-col">
          <div className="px-5 py-4 border-b border-slate-200 flex justify-between items-center bg-slate-50 rounded-t-xl">
            <h3 className="font-semibold text-slate-800 flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-blue-600" /> Conversas Ativas
            </h3>
            <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs font-bold rounded-full">
              {conversations.length}
            </span>
          </div>
          
          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {isLoading ? (
              <div className="animate-pulse space-y-3">
                <div className="h-16 bg-slate-100 rounded-lg"></div>
                <div className="h-16 bg-slate-100 rounded-lg"></div>
              </div>
            ) : conversations.length === 0 ? (
              <div className="text-center py-10 text-slate-400 text-sm">
                Nenhuma conversa ativa no momento.
              </div>
            ) : (
              conversations.map(conv => (
                <div key={conv.id} className="p-3 border border-slate-200 rounded-lg hover:border-blue-400 cursor-pointer transition-colors bg-white shadow-sm flex items-start gap-3">
                  <div className={`p-2 rounded-full ${conv.channel === 'whatsapp' ? 'bg-emerald-100 text-emerald-600' : 'bg-blue-100 text-blue-600'}`}>
                    {conv.channel === 'whatsapp' ? <MessageSquare className="w-4 h-4" /> : <PhoneCall className="w-4 h-4" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-center mb-1">
                      <span className="font-semibold text-sm text-slate-800 truncate">{conv.contactId}</span>
                      <span className="text-[10px] text-slate-400">{new Date(conv.createdAt).toLocaleTimeString()}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 bg-slate-100 text-slate-600 text-[10px] font-medium rounded capitalize">{conv.channel}</span>
                      <span className="px-2 py-0.5 bg-emerald-50 text-emerald-600 text-[10px] font-medium rounded capitalize">{conv.status}</span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Customer 360 / Área de Chat Simulado */}
        <div className="col-span-1 md:col-span-2 bg-white border border-slate-200 rounded-xl shadow-sm flex flex-col relative overflow-hidden">
          <div className="absolute inset-0 bg-slate-50/50 backdrop-blur-[2px] z-10 flex items-center justify-center">
            <div className="text-center">
              <Bot className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-500 font-medium">Selecione uma conversa para iniciar o atendimento</p>
              <p className="text-xs text-slate-400 mt-1">Customer 360 e Timeline de interações aparecerão aqui.</p>
            </div>
          </div>
          
          <div className="px-6 py-4 border-b border-slate-200 bg-white">
            <h3 className="font-semibold text-slate-800">Customer 360</h3>
          </div>
          <div className="flex-1 p-6">
            {/* Espaço reservado para o detalhe do cliente */}
          </div>
        </div>

      </div>
    </div>
  );
};
