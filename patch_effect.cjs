const fs = require('fs');
let code = fs.readFileSync('src/components/views/OmnichannelView.tsx', 'utf8');

const startIdx = code.indexOf('  useEffect(() => {');
const endIdx = code.indexOf('  }, []);\n') + '  }, []);\n'.length;

const newEffect = `
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
`;

code = code.slice(0, startIdx) + newEffect + code.slice(endIdx);
fs.writeFileSync('src/components/views/OmnichannelView.tsx', code);
console.log('Effect patched');
