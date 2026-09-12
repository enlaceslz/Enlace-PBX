const fs = require('fs');
let code = fs.readFileSync('src/components/views/OmnichannelView.tsx', 'utf8');

// Replace useEffect
const oldEffect = `  useEffect(() => {
    // Simulando o carregamento com dados ricos
    setTimeout(() => {
      setConversations([`;

const newEffect = `
  const [showConfig, setShowConfig] = useState(false);
  const [whatsappConfig, setWhatsappConfig] = useState({ phoneNumberId: '', accessToken: '', verifyToken: '', isActive: false });

  const fetchConversations = async () => {
    try {
      const res = await fetch('/api/v1/omnichannel/conversations');
      const data = await res.json();
      setConversations(data);
      if (!selectedConv && data.length > 0) {
        setSelectedConv(data[0]);
      }
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
    
    // Poll every 5s for new WhatsApp messages
    const interval = setInterval(fetchConversations, 5000);
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
`;

code = code.replace(/  useEffect\(\(\) => \{[\s\S]*?\]\);\n      setIsLoading\(false\);\n    \}, 1500\);\n  \}, \[\]\);/, newEffect);

// Replace handleSend
const oldHandleSend = `  const handleSend = () => {
    if (!replyText.trim() || !selectedConv) return;
    
    const updatedConv = { ...selectedConv };
    updatedConv.messages.push({
      id: \`m-new-\${Date.now()}\`,
      sender: 'agent',
      text: replyText,
      timestamp: new Date().toISOString()
    });
    
    // Atualiza o estado
    const newConvs = conversations.map(c => c.id === updatedConv.id ? updatedConv : c);
    setConversations(newConvs);
    setSelectedConv(updatedConv);
    setReplyText('');
  };`;

const newHandleSend = `  const handleSend = async () => {
    if (!replyText.trim() || !selectedConv) return;
    
    try {
      const res = await fetch(\`/api/v1/whatsapp/conversations/\${selectedConv.id}/reply\`, {
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
  };`;

code = code.replace(oldHandleSend, newHandleSend);

// Add settings button to header
const oldHeaderBtn = `<Filter className="w-4 h-4" /> Configurar Filtros
          </button>
        </div>`;

const newHeaderBtn = `<Filter className="w-4 h-4" /> Configurar Filtros
          </button>
          <button onClick={() => setShowConfig(true)} className="px-4 py-2.5 bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 font-bold rounded-xl text-xs uppercase tracking-wider transition flex items-center gap-2 shadow-sm">
            <Smartphone className="w-4 h-4" /> Configurar WhatsApp API
          </button>
        </div>`;
code = code.replace(oldHeaderBtn, newHeaderBtn);

// Add Settings Modal at the end of the return statement
const oldEnd = `    </div>
  );
};`;
const newEnd = `
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
};`;
code = code.replace(oldEnd, newEnd);

fs.writeFileSync('src/components/views/OmnichannelView.tsx', code);
console.log('OmnichannelView patched successfully');
