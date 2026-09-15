const fs = require('fs');

let webphone = fs.readFileSync('src/components/WebphoneModal.tsx', 'utf-8');

const replacement = `      {!isMinimized && (
        <div className="flex-1 flex flex-col sm:flex-row min-h-0 bg-white/95">
          {/* Softphone Section (Left side when expanded) */}
          <div className={\`flex flex-col min-h-0 transition-all \${showOmnichannel ? 'w-full sm:w-80 border-r border-slate-200' : 'w-full'}\`}>`;

webphone = webphone.replace(
  /\{\!isMinimized && \(\s*<div className="flex-1 flex flex-col min-h-0 bg-white\/95">/,
  replacement
);

const splitEndReplacement = `            )}
          </div>
        </div>

        {/* Omnichannel Section (Right side when expanded) */}
        {showOmnichannel && (
          <div className="hidden sm:flex flex-1 flex-col min-h-0 bg-slate-50/50">
            <div className="p-4 border-b border-slate-200 bg-white flex justify-between items-center">
              <div>
                <h3 className="font-bold text-slate-800 flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-emerald-600" />
                  Hub Omnichannel
                </h3>
                <p className="text-[10px] text-slate-500">Conversas ativas no WhatsApp Webhook</p>
              </div>
            </div>
            
            <div className="flex-1 flex min-h-0">
              {/* Chat List */}
              <div className="w-1/3 border-r border-slate-200 bg-slate-50 overflow-y-auto p-2 space-y-1">
                {omniConversations.length === 0 ? (
                  <div className="text-center p-4 text-slate-400 text-xs">Nenhum chat ativo.</div>
                ) : (
                  omniConversations.map(conv => (
                    <button 
                      key={conv.id}
                      onClick={() => setSelectedOmniConv(conv)}
                      className={\`w-full text-left p-3 rounded-xl transition border \${selectedOmniConv?.id === conv.id ? 'bg-white border-emerald-200 shadow-sm' : 'border-transparent hover:bg-slate-200/50'}\`}
                    >
                      <div className="flex justify-between items-start mb-1">
                        <span className="font-bold text-xs text-slate-800 truncate">{conv.contactId}</span>
                        <span className={\`text-[9px] px-1.5 py-0.5 rounded-md font-bold \${conv.status === 'active' ? 'bg-emerald-100 text-emerald-700' : conv.status === 'queued' ? 'bg-amber-100 text-amber-700' : conv.status === 'bot_handling' ? 'bg-purple-100 text-purple-700' : 'bg-slate-200 text-slate-600'}\`}>
                          {conv.status === 'bot_handling' ? 'MaIA (IA)' : conv.status}
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-500 truncate">
                        {conv.messages[conv.messages.length - 1]?.text || 'Nova conversa'}
                      </p>
                    </button>
                  ))
                )}
              </div>
              
              {/* Chat View */}
              <div className="flex-1 flex flex-col bg-white">
                {selectedOmniConv ? (
                  <>
                    <div className="flex-1 overflow-y-auto p-4 space-y-4">
                      {selectedOmniConv.messages.map((m: any) => (
                        <div key={m.id} className={\`flex flex-col \${m.sender === 'user' ? 'items-start' : 'items-end'}\`}>
                          <div className={\`max-w-[85%] rounded-2xl px-4 py-2 text-sm \${m.sender === 'user' ? 'bg-slate-100 text-slate-800 rounded-tl-sm' : m.sender === 'bot' ? 'bg-purple-100 text-purple-800 rounded-tr-sm border border-purple-200' : 'bg-emerald-100 text-emerald-800 rounded-tr-sm border border-emerald-200'}\`}>
                            {m.text}
                          </div>
                          <span className="text-[9px] text-slate-400 mt-1 font-mono">{new Date(m.timestamp).toLocaleTimeString('pt-BR')}</span>
                        </div>
                      ))}
                    </div>
                    <div className="p-3 border-t border-slate-200 bg-slate-50">
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={omniReply}
                          onChange={(e) => setOmniReply(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && handleSendOmni()}
                          placeholder="Digite a resposta..."
                          className="flex-1 bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-emerald-500"
                        />
                        <button
                          onClick={handleSendOmni}
                          disabled={!omniReply.trim()}
                          className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white p-2 rounded-xl transition"
                        >
                          <Send className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="flex-1 flex flex-col items-center justify-center text-slate-400 p-6 text-center space-y-3">
                    <div className="w-16 h-16 rounded-full bg-slate-50 flex items-center justify-center border border-slate-100">
                      <MessageSquare className="w-8 h-8 text-slate-300" />
                    </div>
                    <p className="text-sm">Selecione uma conversa ao lado para visualizar e interagir com o cliente via WhatsApp.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};`;

webphone = webphone.replace(
  /            \)}\n          <\/div>\n        <\/div>\n      \)}\n    <\/div>\n  \);\n};\n?$/,
  splitEndReplacement
);

fs.writeFileSync('src/components/WebphoneModal.tsx', webphone);
console.log('WebphoneModal patched');
