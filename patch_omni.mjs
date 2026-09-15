import fs from 'fs';
const file = 'src/components/views/OmnichannelView.tsx';
let content = fs.readFileSync(file, 'utf8');

const target1 = `  return (
    <div className="space-y-6 flex flex-col h-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <MessageSquare className="w-6 h-6 text-emerald-600" />
            Inbox Omnichannel
          </h2>
          <p className="text-sm text-slate-500 mt-1">Gestão centralizada de atendimentos via Voz, WhatsApp Oficial e Transcrições IA em tempo real.</p>
        </div>
        <div className="flex items-center gap-3">
          <button className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg text-sm transition flex items-center gap-2">
            <Filter className="w-4 h-4" /> Filtros
          </button>
        </div>
      </div>`;

const replacement1 = `  return (
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
        </div>
      </div>`;

content = content.replace(target1, replacement1);


const target2 = `        {/* Painel de Conversas (Esquerda) */}
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
                  className={\`p-4 border rounded-xl cursor-pointer transition-all \${
                    selectedConv?.id === conv.id 
                      ? 'bg-blue-50/50 border-blue-200 shadow-sm' 
                      : 'bg-white border-slate-100 hover:border-blue-300'
                  }\`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className={\`w-8 h-8 rounded-full flex items-center justify-center \${
                        conv.channel === 'whatsapp' ? 'bg-emerald-100 text-emerald-600' : 'bg-blue-100 text-blue-600'
                      }\`}>
                        {conv.channel === 'whatsapp' ? <MessageSquare className="w-4 h-4" /> : <Phone className="w-4 h-4" />}
                      </div>
                      <div>
                        <h4 className="font-bold text-sm text-slate-800">{conv.contactName}</h4>
                        <p className="text-[10px] text-slate-500 font-mono">{conv.contactNumber}</p>
                      </div>
                    </div>
                    <span className="text-[10px] font-semibold text-slate-400">
                      {new Date(conv.lastActivity).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  
                  <div className="flex items-center justify-between mt-3">
                     <span className={\`text-[10px] font-bold px-2 py-0.5 rounded-full \${
                       conv.status === 'active' ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'
                     }\`}>
                       {conv.status === 'active' ? 'Em atendimento' : 'Resolvido'}
                     </span>
                     {conv.aiAgentInvolved && (
                       <span className="text-[10px] text-purple-600 flex items-center gap-1 font-semibold">
                         <Bot className="w-3 h-3" /> IA
                       </span>
                     )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>`;

const replacement2 = `        {/* Painel de Conversas (Esquerda) */}
        <div className="col-span-1 bg-white border border-slate-200 rounded-3xl shadow-sm flex flex-col overflow-hidden">
          <div className="px-5 py-5 border-b border-slate-100 bg-slate-50/50">
            <div className="relative">
              <Search className="w-5 h-5 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
              <input 
                type="text" 
                placeholder="Busca por CID ou Contato..." 
                className="w-full bg-white border border-slate-200 rounded-xl pl-11 pr-4 py-3 text-sm font-bold text-slate-700 shadow-sm focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all"
              />
            </div>
          </div>
          
          <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50">
            {isLoading ? (
              <div className="animate-pulse space-y-3">
                <div className="h-24 bg-white border border-slate-200 rounded-2xl"></div>
                <div className="h-24 bg-white border border-slate-200 rounded-2xl"></div>
                <div className="h-24 bg-white border border-slate-200 rounded-2xl"></div>
              </div>
            ) : (
              conversations.map(conv => (
                <div 
                  key={conv.id} 
                  onClick={() => setSelectedConv(conv)}
                  className={\`p-4 border rounded-2xl cursor-pointer transition-all duration-300 group \${
                    selectedConv?.id === conv.id 
                      ? 'bg-blue-600 border-blue-600 shadow-md shadow-blue-600/20' 
                      : 'bg-white border-slate-200 hover:border-blue-300 hover:shadow-sm'
                  }\`}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className={\`w-10 h-10 rounded-xl flex items-center justify-center shadow-sm \${
                        selectedConv?.id === conv.id 
                          ? 'bg-blue-500 border border-blue-400 text-white'
                          : conv.channel === 'whatsapp' ? 'bg-emerald-50 border border-emerald-100 text-emerald-600' : 'bg-slate-50 border border-slate-200 text-slate-600'
                      }\`}>
                        {conv.channel === 'whatsapp' ? <MessageSquare className="w-5 h-5" /> : <Phone className="w-5 h-5" />}
                      </div>
                      <div>
                        <h4 className={\`font-black text-sm \${selectedConv?.id === conv.id ? 'text-white' : 'text-slate-900'}\`}>{conv.contactName}</h4>
                        <p className={\`text-[10px] font-mono mt-0.5 \${selectedConv?.id === conv.id ? 'text-blue-100' : 'text-slate-500'}\`}>{conv.contactNumber}</p>
                      </div>
                    </div>
                    <span className={\`text-[10px] font-bold \${selectedConv?.id === conv.id ? 'text-blue-200' : 'text-slate-400'}\`}>
                      {new Date(conv.lastActivity).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  
                  <div className="flex items-center justify-between pt-3 border-t border-slate-100/20">
                     <span className={\`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-lg \${
                       selectedConv?.id === conv.id
                         ? 'bg-white/20 text-white'
                         : conv.status === 'active' ? 'bg-amber-10 text-amber-700 border border-amber-200' : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                     }\`}>
                       {conv.status === 'active' ? 'Ativo' : 'Resolvido'}
                     </span>
                     {conv.aiAgentInvolved && (
                       <span className={\`text-[10px] flex items-center gap-1 font-black uppercase tracking-wider \${
                         selectedConv?.id === conv.id ? 'text-blue-200' : 'text-purple-600'
                       }\`}>
                         <Bot className="w-3.5 h-3.5" /> Handled by IA
                       </span>
                     )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>`;

content = content.replace(target2, replacement2);


const target3 = `        {/* Área de Visualização/Chat (Direita) */}
        <div className="col-span-1 lg:col-span-2 flex flex-col bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
          {selectedConv ? (
            <>
              <div className="px-6 py-4 border-b border-slate-100 bg-white flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className={\`w-10 h-10 rounded-full flex items-center justify-center \${
                    selectedConv.channel === 'whatsapp' ? 'bg-emerald-100 text-emerald-600' : 'bg-blue-100 text-blue-600'
                  }\`}>
                    {selectedConv.channel === 'whatsapp' ? <MessageSquare className="w-5 h-5" /> : <Phone className="w-5 h-5" />}
                  </div>
                  <div>
                    <h3 className="font-bold text-lg text-slate-800">{selectedConv.contactName}</h3>
                    <p className="text-xs text-slate-500 font-mono">{selectedConv.contactNumber}</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <button className="px-3 py-1.5 border border-slate-200 text-slate-600 hover:bg-slate-50 rounded-lg text-xs font-semibold flex items-center gap-2 transition">
                     <User className="w-4 h-4" /> Ver Perfil CRM
                  </button>
                </div>
              </div>`;

const replacement3 = `        {/* Área de Visualização/Chat (Direita) */}
        <div className="col-span-1 lg:col-span-2 flex flex-col bg-white border border-slate-200 rounded-3xl shadow-sm overflow-hidden">
          {selectedConv ? (
            <>
              <div className="px-6 py-6 border-b border-slate-100 bg-white flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className={\`w-14 h-14 rounded-2xl flex items-center justify-center shadow-inner border \${
                    selectedConv.channel === 'whatsapp' ? 'bg-emerald-50 border-emerald-100 text-emerald-600' : 'bg-slate-50 border-slate-200 text-slate-600'
                  }\`}>
                    {selectedConv.channel === 'whatsapp' ? <MessageSquare className="w-6 h-6" /> : <Phone className="w-6 h-6" />}
                  </div>
                  <div>
                    <h3 className="font-black text-2xl text-slate-900 tracking-tight">{selectedConv.contactName}</h3>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs text-slate-500 font-mono font-bold bg-slate-100 px-2 py-0.5 rounded">{selectedConv.contactNumber}</span>
                      <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">UUID: {selectedConv.id.split('-')[0]}</span>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-3">
                  <button className="px-4 py-2 border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-2 transition shadow-sm">
                     <User className="w-4 h-4" /> Perfil CRM
                  </button>
                </div>
              </div>`;

content = content.replace(target3, replacement3);

fs.writeFileSync(file, content);
console.log('Patched OmnichannelView');
