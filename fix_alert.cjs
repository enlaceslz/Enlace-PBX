const fs = require('fs');

let content = fs.readFileSync('src/components/views/CdrAndRecordingsView.tsx', 'utf-8');

// I need to add state for isGeneratingAi and a function handleGenerateAi
if (!content.includes('const [isGeneratingAi, setIsGeneratingAi] = useState(false);')) {
  content = content.replace(
    'const [selectedCdrForModal, setSelectedCdrForModal] = useState<CdrRecord | null>(null);',
    'const [selectedCdrForModal, setSelectedCdrForModal] = useState<CdrRecord | null>(null);\n  const [isGeneratingAi, setIsGeneratingAi] = useState(false);'
  );
}

const handleGenerateAi = `
  const handleGenerateAi = async () => {
    if (!selectedCdrForModal) return;
    setIsGeneratingAi(true);
    
    // Simular chamada de API do Gemini via backend
    setTimeout(() => {
      setSelectedCdrForModal({
        ...selectedCdrForModal,
        transcription: "Operador: Olá, suporte técnico.\\nCliente: Minha internet caiu.\\nOperador: Vou verificar seu modem remotamente.\\n[Pausa de 5s]\\nOperador: Reiniciei seu equipamento. Pode testar?\\nCliente: Sim, voltou. Obrigado.\\nOperador: Agradecemos o contato.",
        summary: "Cliente relatou queda de internet. O operador realizou reset remoto do modem com sucesso e restabeleceu o serviço sem necessidade de transbordo.",
        sentiment: "positive",
        isAiHandled: true,
      });
      setIsGeneratingAi(false);
    }, 2500);
  };
`;

if (!content.includes('handleGenerateAi = async')) {
  content = content.replace(
    'const handlePlayRecording = (cdr: CdrRecord) => {',
    handleGenerateAi + '\n  const handlePlayRecording = (cdr: CdrRecord) => {'
  );
}

// Update the alert button
content = content.replace(
  "onClick={() => alert('Integração com Gemini API será chamada aqui.')}",
  "onClick={handleGenerateAi}\n                      disabled={isGeneratingAi}"
);

content = content.replace(
  "<Sparkles className=\"w-4 h-4\" />\n                      Gerar Transcrição com IA",
  "{isGeneratingAi ? <RefreshCw className=\"w-4 h-4 animate-spin\" /> : <Sparkles className=\"w-4 h-4\" />}\n                      {isGeneratingAi ? 'Processando (Gemini 1.5 Flash)...' : 'Gerar Transcrição com IA'}"
);

fs.writeFileSync('src/components/views/CdrAndRecordingsView.tsx', content);
