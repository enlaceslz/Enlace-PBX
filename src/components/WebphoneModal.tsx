import React, { useState, useEffect, useRef } from 'react';
import {
  Phone,
  PhoneOff,
  Mic,
  MicOff,
  Pause,
  Play,
  RotateCcw,
  Volume2,
  Sparkles,
  Bot,
  Send,
  X,
  Minimize2,
  Maximize2,
  Clock,
  ShieldCheck,
  Radio,
  ArrowRight,
  GitFork,
  Users,
  CheckCircle2,
  Headphones,
  Forward,
  Video,
  VideoOff,
} from 'lucide-react';
import { playDtmfTone, playRingbackTone, playCallEndBeep } from '../utils/audio';
import { speakHumanized, stopSpeaking, detectVoiceGender, VoicePersona } from '../utils/speechVoiceHelper';

interface WebphoneProps {
  isOpen: boolean;
  onClose: () => void;
  defaultNumber?: string;
  onCallEnded?: () => void;
}

export const WebphoneModal: React.FC<WebphoneProps> = ({
  isOpen,
  onClose,
  defaultNumber = '',
  onCallEnded,
}) => {
  const [dialNumber, setDialNumber] = useState(defaultNumber);
  const [callState, setCallState] = useState<'idle' | 'calling' | 'connected'>('idle');
  const [callDuration, setCallDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [isOnHold, setIsOnHold] = useState(false);
  const [isVideoCall, setIsVideoCall] = useState(false);
  const [isVideoCamOn, setIsVideoCamOn] = useState(true);
  const [activeTab, setActiveTab] = useState<'keypad' | 'ai_live' | 'ivr' | 'queue' | 'extension'>('keypad');
  const [isMinimized, setIsMinimized] = useState(false);

  // Call classification & target states
  const [callType, setCallType] = useState<'idle' | 'ai' | 'ivr' | 'queue' | 'extension' | 'external'>('idle');
  const [connectedDestination, setConnectedDestination] = useState<string>('');
  const [ivrAnnouncement, setIvrAnnouncement] = useState<string>('');
  const [queueInfo, setQueueInfo] = useState<{ name: string; position: number; agentName?: string } | null>(null);
  const [extInfo, setExtInfo] = useState<{ name: string; number: string; dept: string } | null>(null);
  const [showTransferDialog, setShowTransferDialog] = useState(false);
  const [transferDestination, setTransferDestination] = useState('4102');
  const [transferStatusMsg, setTransferStatusMsg] = useState<string | null>(null);

  // AI Voice conversation state
  const [isAiCall, setIsAiCall] = useState(false);
  const [aiHistory, setAiHistory] = useState<Array<{ role: 'user' | 'model' | 'system' | 'tool'; text: string; timestamp: string }>>([]);
  const [userInputText, setUserInputText] = useState('');
  const [isAiSpeaking, setIsAiSpeaking] = useState(false);
  const [isProcessingTurn, setIsProcessingTurn] = useState(false);
  const [lastExecutedTool, setLastExecutedTool] = useState<string | null>(null);
  const [currentVoiceGender, setCurrentVoiceGender] = useState<'male' | 'female'>('female');
  const [currentVoiceSpeaker, setCurrentVoiceSpeaker] = useState<string>('MaIA (Voz Feminina • IA)');

  // Speech Recognition state
  const [isListening, setIsListening] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(true);
  const recognitionRef = useRef<any>(null);

  const stopRingbackRef = useRef<(() => void) | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const SpeechRec = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRec) {
      const recog = new SpeechRec();
      recog.lang = 'pt-BR';
      recog.continuous = false;
      recog.interimResults = false;
      recog.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        if (transcript) {
          handleSendVoiceTurn(transcript);
        }
        setIsListening(false);
      };
      recog.onerror = (e: any) => {
        console.warn('Speech recognition error:', e);
        setIsListening(false);
      };
      recog.onend = () => {
        setIsListening(false);
      };
      recognitionRef.current = recog;
    } else {
      setSpeechSupported(false);
    }
    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch {
          // Ignored
        }
      }
    };
  }, []);

  const toggleSpeechRecognition = () => {
    if (!recognitionRef.current) return;
    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      window.speechSynthesis?.cancel();
      setIsAiSpeaking(false);
      try {
        recognitionRef.current.start();
        setIsListening(true);
      } catch (e) {
        console.warn('Could not start recognition:', e);
      }
    }
  };

  useEffect(() => {
    if (defaultNumber) {
      setDialNumber(defaultNumber);
    }
  }, [defaultNumber]);

  useEffect(() => {
    if (callState === 'connected') {
      timerRef.current = setInterval(() => {
        setCallDuration((prev) => prev + 1);
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
      setCallDuration(0);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [callState]);

  const processIvrSelection = (digit: string) => {
    playDtmfTone(digit);
    if (digit === '1') {
      // Comercial (Ramal 4103 - Mariana Costa)
      setIvrAnnouncement('Opção 1 selecionada: Transferindo para Comercial (4103)...');
      speakText('Opção um. Transferindo para o departamento Comercial. Por favor, aguarde.', 'female', 'ura');
      setTimeout(() => {
        setCallType('extension');
        setActiveTab('extension');
        setConnectedDestination('4103 (Comercial)');
        setExtInfo({ name: 'Mariana Costa', number: '4103', dept: 'Comercial & Vendas' });
        setTimeout(() => {
          speakText('Comercial Enlace Telecom, boa tarde! Mariana falando, como posso ajudar?', 'female', 'mariana');
        }, 1200);
      }, 2200);
    } else if (digit === '2') {
      // Suporte Técnico (Roberto Mendes - Ramal 4102 / Suporte N1)
      setIvrAnnouncement('Opção 2 selecionada: Encaminhando para Suporte Técnico com Roberto Mendes...');
      speakText('Opção dois. Encaminhando para o Suporte Técnico com Roberto Mendes. Por favor, aguarde.', 'female', 'ura');
      setTimeout(() => {
        setCallType('extension');
        setActiveTab('extension');
        setConnectedDestination('4102 (Suporte - Roberto Mendes)');
        setExtInfo({ name: 'Roberto Mendes', number: '4102', dept: 'NOC / Suporte Técnico N1' });
        setTimeout(() => {
          speakText('Suporte Técnico Enlace, boa tarde! Roberto falando. Como posso ajudar com a sua conexão hoje?', 'male', 'roberto');
        }, 1400);
      }, 2200);
    } else if (digit === '3') {
      // Financeiro (Fila 7002 - Renata Lima)
      setIvrAnnouncement('Opção 3 selecionada: Encaminhando para o Financeiro...');
      speakText('Opção três. Encaminhando para a Fila Financeira.', 'female', 'ura');
      setTimeout(() => {
        setCallType('queue');
        setActiveTab('queue');
        setConnectedDestination('Fila Financeiro (7002)');
        setQueueInfo({ name: 'Financeiro & Faturamento', position: 1, agentName: 'Renata Lima' });
        setTimeout(() => {
          speakText('Financeiro Enlace Telecom, boa tarde! Renata falando, em que posso ajudar?', 'female', 'renata');
        }, 1800);
      }, 2000);
    } else if (digit === '9') {
      // MaIA IA
      setIvrAnnouncement('Opção 9 selecionada: Conectando com Inteligência Artificial MaIA...');
      speakText('Opção nove. Transferindo para MaIA, nossa assistente virtual.', 'female', 'ura');
      setTimeout(() => {
        setCallType('ai');
        setIsAiCall(true);
        setActiveTab('ai_live');
        setConnectedDestination('MaIA (Gemini Live)');
        const greeting = 'Olá! Sou a MaIA, assistente virtual da Enlace Telecom. Como posso ajudar você hoje?';
        setAiHistory([
          {
            role: 'system',
            text: 'Conexão estabelecida com Asterisk 20 [from-gemini] via AudioSocket e Google Gemini Live API.',
            timestamp: new Date().toLocaleTimeString('pt-BR'),
          },
          {
            role: 'model',
            text: greeting,
            timestamp: new Date().toLocaleTimeString('pt-BR'),
          },
        ]);
        speakText(greeting, 'female', 'maia');
      }, 2200);
    } else if (digit === '0') {
      // Operador (Carlos Silva - Ramal 4101)
      setIvrAnnouncement('Opção 0 selecionada: Transferindo para Telefonista...');
      speakText('Opção zero. Transferindo para o operador humano no ramal 4101.', 'female', 'ura');
      setTimeout(() => {
        setCallType('extension');
        setActiveTab('extension');
        setConnectedDestination('4101 (Operador)');
        setExtInfo({ name: 'Carlos Henrique Silva', number: '4101', dept: 'Central Telefônica' });
        speakText('Central Enlace Telecom, boa tarde! Carlos falando, em que posso ser útil?', 'male', 'carlos');
      }, 2000);
    }
  };

  const handleKeypadPress = (digit: string) => {
    playDtmfTone(digit);
    if (callState === 'idle') {
      setDialNumber((prev) => prev + digit);
    } else if (callState === 'connected') {
      if (callType === 'ivr') {
        processIvrSelection(digit);
      }
    }
  };

  const handleBackspace = () => {
    setDialNumber((prev) => prev.slice(0, -1));
  };

  const executeInlineTransfer = async () => {
    if (!transferDestination.trim()) return;
    const dest = transferDestination.trim();
    speakText(`Transferindo chamada para o destino ${dest}. Por favor, aguarde.`, 'female', 'ura');
    setTransferStatusMsg(`Transferência para ${dest} iniciada...`);

    try {
      await fetch('/api/v1/asterisk/channels/transfer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ destination: dest }),
      });
    } catch {
      // simulated fallback
    }

    setTimeout(() => {
      setConnectedDestination(dest);
      setShowTransferDialog(false);
      setTransferStatusMsg(null);
      if (dest === '9001') {
        setCallType('ai');
        setIsAiCall(true);
        setActiveTab('ai_live');
        speakText('Olá! Sou a MaIA, fui conectada à sua chamada transferida. Como posso ajudar?', 'female', 'maia');
      } else if (dest === '4102') {
        setCallType('extension');
        setIsAiCall(false);
        setActiveTab('extension');
        setExtInfo({
          name: 'Roberto Mendes',
          number: '4102',
          dept: 'NOC / Suporte Técnico N1',
        });
        speakText('Alô! Suporte Técnico Enlace, Roberto falando. Recebi a sua transferência, em que posso ajudar?', 'male', 'roberto');
      } else if (dest === '7001' || dest === '7002') {
        setCallType('queue');
        setIsAiCall(false);
        setActiveTab('queue');
        const isSupport = dest === '7001';
        setQueueInfo({
          name: isSupport ? 'Fila Suporte N1 (Roberto Mendes)' : 'Fila Financeiro (Renata)',
          position: 1,
          agentName: isSupport ? 'Roberto Mendes (Atendendo)' : 'Renata Lima',
        });
        const greeting = isSupport
          ? 'Suporte Técnico Enlace, Roberto falando. Recebi sua transferência da fila.'
          : 'Financeiro Enlace Telecom, Renata falando.';
        speakText(greeting, isSupport ? 'male' : 'female', isSupport ? 'roberto' : 'renata');
      } else {
        setCallType('extension');
        setIsAiCall(false);
        setActiveTab('extension');
        setExtInfo({
          name: dest === '4103' ? 'Mariana Costa' : `Ramal ${dest}`,
          number: dest,
          dept: dest === '4103' ? 'Comercial' : 'Atendimento Interno',
        });
        const greeting = dest === '4103'
          ? 'Comercial Enlace, Mariana falando. Como posso ajudar?'
          : `Alô, ramal ${dest}!`;
        speakText(greeting, dest === '4103' ? 'female' : 'male', dest === '4103' ? 'mariana' : 'carlos');
      }
    }, 2000);
  };

  const startCall = async (targetNumber?: string) => {
    const num = (targetNumber || dialNumber).trim();
    if (!num) return;

    setCallState('calling');
    setConnectedDestination(num);
    const isTargetAi = num === '9001' || num.includes('0800') || num.toLowerCase().includes('maia');
    const isIvr = num === '6001';
    const isQueue = num === '7001' || num === '7002';
    const isExt = num === '4101' || num === '4102' || num === '4103';

    setIsAiCall(isTargetAi);
    if (isTargetAi) {
      setCallType('ai');
      setActiveTab('ai_live');
    } else if (isIvr) {
      setCallType('ivr');
      setActiveTab('ivr');
      setIvrAnnouncement('URA Principal — Digite a opção no teclado');
    } else if (isQueue) {
      setCallType('queue');
      setActiveTab('queue');
      setQueueInfo({
        name: num === '7001' ? 'Suporte Técnico N1 (Roberto Mendes)' : 'Financeiro & Faturamento',
        position: 1,
      });
    } else if (isExt) {
      setCallType('extension');
      setActiveTab('extension');
      setExtInfo({
        name: num === '4102' ? 'Roberto Mendes' : num === '4103' ? 'Mariana Costa' : 'Carlos Silva',
        number: num,
        dept: num === '4102' ? 'NOC / Suporte Técnico N1' : num === '4103' ? 'Comercial & Vendas' : 'Central Telefônica',
      });
    } else {
      setCallType('external');
      setActiveTab('keypad');
    }

    // Play ringing tone
    stopRingbackRef.current = playRingbackTone();

    // Add simulation channel in Asterisk
    try {
      await fetch('/api/v1/asterisk/channels', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          caller: '4101',
          callee: num,
          isAi: isTargetAi,
        }),
      });
    } catch (e) {
      console.warn('Channel sim error:', e);
    }

    // Answer call after 1.8s
    setTimeout(() => {
      if (stopRingbackRef.current) stopRingbackRef.current();
      setCallState('connected');

      if (isTargetAi) {
        const initialGreeting = 'Olá! Sou a MaIA, assistente virtual da Enlace Telecom. Como posso ajudar você hoje?';
        setAiHistory([
          {
            role: 'system',
            text: 'Conexão estabelecida com Asterisk 20 [from-gemini] via AudioSocket e Google Gemini Live API.',
            timestamp: new Date().toLocaleTimeString('pt-BR'),
          },
          {
            role: 'model',
            text: initialGreeting,
            timestamp: new Date().toLocaleTimeString('pt-BR'),
          },
        ]);
        speakText(initialGreeting, 'female', 'maia');
      } else if (isIvr) {
        const ivrPrompt = 'Olá! Você ligou para a Enlace Telecom. Para Comercial digite 1. Para Suporte Técnico com Roberto digite 2. Para Financeiro digite 3. Ou digite 9 para falar com a MaIA.';
        speakText(ivrPrompt, 'female', 'ura');
      } else if (isQueue) {
        speakText('Você ligou para a Fila de Atendimento da Enlace Telecom. Conectando com o suporte.', 'female', 'ura');
        setTimeout(() => {
          const isSupport = num === '7001';
          const agentGreeting = isSupport
            ? 'Suporte Técnico Enlace, boa tarde! Roberto falando. Em que posso ajudar com a sua conexão hoje?'
            : 'Financeiro Enlace Telecom, boa tarde! Renata falando, como posso ajudar?';
          const agentGender = isSupport ? 'male' : 'female';
          const agentPersona = isSupport ? 'roberto' : 'renata';
          speakText(agentGreeting, agentGender, agentPersona);
          setQueueInfo((prev) => prev ? { ...prev, agentName: isSupport ? 'Roberto Mendes (Atendendo)' : 'Renata Lima (Atendendo)' } : null);
        }, 3000);
      } else if (isExt) {
        if (num === '4102') {
          speakText('Alô! Suporte Técnico Enlace, Roberto falando. Como posso ajudar com seu chamado ou conexão?', 'male', 'roberto');
        } else if (num === '4103') {
          speakText('Comercial Enlace, boa tarde! Mariana falando, em que posso ajudar?', 'female', 'mariana');
        } else {
          speakText('Central Enlace Telecom, boa tarde! Carlos falando, como posso direcionar sua ligação?', 'male', 'carlos');
        }
      }
    }, 1800);
  };

  const endCall = async () => {
    if (stopRingbackRef.current) stopRingbackRef.current();
    playCallEndBeep();
    setCallState('idle');
    setIsVideoCall(false);
    setCallType('idle');
    setShowTransferDialog(false);
    setIvrAnnouncement('');
    setQueueInfo(null);
    setExtInfo(null);

    // Save CDR record
    try {
      await fetch('/api/v1/cdr', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          caller: '4101',
          callee: connectedDestination || dialNumber || '9001',
          direction: 'outbound',
          duration: callDuration || 12,
          billsec: callDuration || 12,
          aiAgentId: isAiCall ? 'agent-maia-247' : undefined,
          isAiHandled: isAiCall,
          isTransferred: Boolean(transferDestination),
          transferredTo: transferDestination ? `Ramal/Fila ${transferDestination}` : undefined,
          ivrPath: callType === 'ivr' ? 'URA Principal [6001]' : undefined,
          sentiment: isAiCall ? 'positive' : 'neutral',
          transcription: aiHistory.map((h) => `${h.role}: ${h.text}`).join('\n'),
        }),
      });
      if (onCallEnded) onCallEnded();
    } catch {
      // Ignored
    }

    setTransferDestination('');
    setAiHistory([]);
    setLastExecutedTool(null);
    stopSpeaking();
    setIsAiSpeaking(false);
  };

  const speakText = (text: string, explicitGender?: 'male' | 'female', persona?: VoicePersona) => {
    let gender = explicitGender;
    if (!gender) {
      if (persona === 'roberto' || persona === 'carlos') {
        gender = 'male';
      } else if (persona === 'maia' || persona === 'mariana' || persona === 'renata' || persona === 'ura') {
        gender = 'female';
      } else if (
        connectedDestination.includes('4102') ||
        connectedDestination.toLowerCase().includes('roberto') ||
        extInfo?.name.toLowerCase().includes('roberto') ||
        queueInfo?.agentName?.toLowerCase().includes('roberto')
      ) {
        gender = 'male';
      } else {
        gender = detectVoiceGender(text, persona, 'female');
      }
    }

    setCurrentVoiceGender(gender);
    const speakerLabel =
      persona === 'roberto' || (gender === 'male' && (connectedDestination.includes('4102') || text.toLowerCase().includes('roberto')))
        ? 'Roberto Mendes (Voz Masculina • Suporte N1)'
        : persona === 'carlos' || (gender === 'male' && connectedDestination.includes('4101'))
        ? 'Carlos Silva (Voz Masculina • Central)'
        : persona === 'mariana'
        ? 'Mariana Costa (Voz Feminina • Comercial)'
        : persona === 'renata'
        ? 'Renata Lima (Voz Feminina • Financeiro)'
        : gender === 'male'
        ? 'Voz Masculina Humanizada'
        : 'MaIA (Voz Feminina • IA Enlace)';
    setCurrentVoiceSpeaker(speakerLabel);

    speakHumanized(text, {
      gender,
      persona: persona || (gender === 'male' ? 'roberto' : 'maia'),
      onStart: () => setIsAiSpeaking(true),
      onEnd: () => setIsAiSpeaking(false),
      onError: () => setIsAiSpeaking(false),
    });
  };

  const handleSendVoiceTurn = async (messageText: string) => {
    if (!messageText.trim() || isProcessingTurn) return;

    // Barge-in: interrupt AI if speaking
    stopSpeaking();
    setIsAiSpeaking(false);

    const userEntry = {
      role: 'user' as const,
      text: messageText,
      timestamp: new Date().toLocaleTimeString('pt-BR'),
    };
    setAiHistory((prev) => [...prev, userEntry]);
    setUserInputText('');
    setIsProcessingTurn(true);

    try {
      const isSupportTarget =
        connectedDestination.includes('4102') ||
        connectedDestination.toLowerCase().includes('roberto') ||
        connectedDestination.toLowerCase().includes('suporte');

      const targetAgentId = isSupportTarget ? 'agent-suporte-n1' : 'agent-maia-247';

      const res = await fetch('/api/v1/ai/voice-turn', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agentId: targetAgentId,
          userMessage: messageText,
          history: aiHistory,
          callerNumber: '4101',
        }),
      });

      const data = await res.json();

      if (data.toolCallExecuted) {
        setLastExecutedTool(`${data.toolCallExecuted.name}`);
        setAiHistory((prev) => [
          ...prev,
          {
            role: 'tool',
            text: `[Ferramenta Acionada: ${data.toolCallExecuted.name}] => ${JSON.stringify(data.toolCallExecuted.args)}`,
            timestamp: new Date().toLocaleTimeString('pt-BR'),
          },
        ]);
      }

      const modelReply = data.replyText || 'Entendido. Em que mais posso ajudar?';
      setAiHistory((prev) => [
        ...prev,
        {
          role: 'model',
          text: modelReply,
          timestamp: new Date().toLocaleTimeString('pt-BR'),
        },
      ]);

      const resolvedGender = (data.voiceConfig?.gender as 'male' | 'female') || (isSupportTarget ? 'male' : 'female');
      const resolvedPersona = resolvedGender === 'male' ? 'roberto' : 'maia';

      if (data.audioBase64) {
        try {
          const audio = new Audio(`data:audio/wav;base64,${data.audioBase64}`);
          setIsAiSpeaking(true);
          setCurrentVoiceGender(resolvedGender);
          setCurrentVoiceSpeaker(
            resolvedGender === 'male'
              ? 'Roberto Mendes (Voz Masculina • Gemini TTS)'
              : 'MaIA (Voz Feminina • Gemini TTS)'
          );
          audio.onended = () => setIsAiSpeaking(false);
          audio.onerror = () => {
            speakText(modelReply, resolvedGender, resolvedPersona);
          };
          audio.play().catch(() => {
            speakText(modelReply, resolvedGender, resolvedPersona);
          });
        } catch {
          speakText(modelReply, resolvedGender, resolvedPersona);
        }
      } else {
        speakText(modelReply, resolvedGender, resolvedPersona);
      }

      if (data.action === 'transfer') {
        const transferTarget = data.transferDestination || '4102';
        setTimeout(() => {
          setAiHistory((prev) => [
            ...prev,
            {
              role: 'system',
              text: `🔄 Asterisk Bridge ARI: Chamada transferida com sucesso para o Ramal ${transferTarget}.`,
              timestamp: new Date().toLocaleTimeString('pt-BR'),
            },
          ]);
          if (transferTarget === '4102' || transferTarget.includes('4102')) {
            setCallType('extension');
            setActiveTab('extension');
            setConnectedDestination('4102 (Suporte - Roberto Mendes)');
            setExtInfo({ name: 'Roberto Mendes', number: '4102', dept: 'NOC / Suporte Técnico N1' });
            speakText('Alô! Aqui é o Roberto do Suporte Técnico. Recebi a sua transferência da MaIA, como posso ajudar?', 'male', 'roberto');
          }
        }, 3000);
      } else if (data.action === 'hangup') {
        setTimeout(() => {
          endCall();
        }, 3500);
      }
    } catch (err) {
      console.error('Turn error:', err);
      const fallbackText = 'Desculpe, tive uma instabilidade momentânea na conexão. Como posso te orientar?';
      setAiHistory((prev) => [
        ...prev,
        { role: 'model', text: fallbackText, timestamp: new Date().toLocaleTimeString('pt-BR') },
      ]);
      speakText(fallbackText);
    } finally {
      setIsProcessingTurn(false);
    }
  };

  const formatSeconds = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const s = sec % 60;
    return `${mins.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  if (!isOpen) return null;

  return (
    <div
      id="enlace-webphone-modal"
      className={`fixed z-50 transition-all duration-200 shadow-2xl rounded-2xl border border-slate-200 bg-white text-slate-900 flex flex-col overflow-hidden ${
        isMinimized
          ? 'bottom-2 right-2 left-2 sm:left-auto sm:right-6 sm:bottom-6 sm:w-80 h-14 sm:h-16 cursor-pointer'
          : 'bottom-2 right-2 left-2 sm:left-auto sm:right-6 sm:bottom-6 sm:w-96 h-[580px] sm:h-[640px] max-h-[calc(100dvh-1rem)] sm:max-h-[90vh]'
      }`}
    >
      {/* Softphone Header */}
      <div className="bg-slate-50/90 px-4 py-3 border-b border-slate-200 flex items-center justify-between select-none">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-blue-600 animate-pulse" />
          <div>
            <div className="text-xs font-bold tracking-wide text-blue-600 uppercase flex items-center gap-1.5">
              <span>Webphone PJSIP</span>
              <span className="text-[10px] bg-sky-950 text-blue-700 px-1.5 py-0.2 rounded border border-sky-800/60">
                Ramal 4101
              </span>
            </div>
            <p className="text-[10px] text-slate-500">Enlace-PBX • WebRTC Opus</p>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={() => setIsMinimized(!isMinimized)}
            className="p-1.5 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition"
            title={isMinimized ? 'Expandir' : 'Minimizar'}
          >
            {isMinimized ? <Maximize2 className="w-3.5 h-3.5" /> : <Minimize2 className="w-3.5 h-3.5" />}
          </button>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-slate-100 rounded-lg transition"
            title="Fechar"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {isMinimized && (
        <div
          onClick={() => setIsMinimized(false)}
          className="flex-1 flex items-center justify-between px-4 text-xs font-medium text-slate-700"
        >
          <span>{callState === 'connected' ? `Em chamada (${formatSeconds(callDuration)})` : 'Ramal 4101 Pronto'}</span>
          <span className="text-blue-600 font-semibold">Clique para abrir</span>
        </div>
      )}

      {!isMinimized && (
        <div className="flex-1 flex flex-col min-h-0 bg-white/95">
          {/* Status Bar / Active Call Display */}
          <div className="bg-slate-50/60 p-4 border-b border-slate-200 shadow-sm">
            {callState === 'idle' ? (
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[11px] text-slate-500 font-mono">DISCADOR BRASILEIRO</span>
                  <span className="text-[10px] text-blue-600 flex items-center gap-1">
                    <ShieldCheck className="w-3 h-3" /> PJSIP Registrado
                  </span>
                </div>
                <div className="relative flex items-center">
                  <input
                    type="text"
                    value={dialNumber}
                    onChange={(e) => setDialNumber(e.target.value)}
                    placeholder="Ramal ou Telefone..."
                    className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-lg font-mono text-slate-900 placeholder-slate-500 focus:outline-none focus:border-sky-500 tracking-wider"
                  />
                  {dialNumber && (
                    <button
                      onClick={handleBackspace}
                      className="absolute right-3 text-slate-500 hover:text-slate-700 text-xs px-1.5 py-0.5"
                    >
                      ⌫
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <div className="text-center py-2">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-600/10 border border-sky-500/30 text-blue-600 text-xs font-semibold mb-2">
                  <Radio className="w-3.5 h-3.5 animate-pulse text-blue-600" />
                  {callState === 'calling' ? 'Chamando...' : `Em chamada: ${formatSeconds(callDuration)}`}
                </div>
                <h3 className="text-base font-bold text-slate-900">
                  {callType === 'ai'
                    ? 'MaIA — Agente de Voz IA (9001)'
                    : callType === 'ivr'
                    ? 'URA de Autoatendimento (6001)'
                    : callType === 'queue'
                    ? `${queueInfo?.name || 'Fila de Atendimento'} (${connectedDestination || '7001'})`
                    : callType === 'extension'
                    ? `${extInfo?.name || 'Ramal'} (${connectedDestination || 'Ramal'})`
                    : (connectedDestination || dialNumber || 'Chamada Externa')}
                </h3>
                <p className="text-[11px] text-slate-500 font-mono mt-0.5">
                  {callType === 'ai'
                    ? 'Google Gemini Live API • AudioSocket 24kHz'
                    : callType === 'ivr'
                    ? 'Asterisk 20 IVR Menu • DTMF RFC 4733'
                    : callType === 'queue'
                    ? 'Asterisk app_queue • Distribuição ACD'
                    : 'Codec Opus / 48kHz • Criptografado SRTP'}
                </p>

                {/* Animated Waveform when speaking */}
                {callState === 'connected' && (
                  <div className="flex items-center justify-center gap-1 h-6 mt-3">
                    {[40, 75, 100, 60, 90, 45, 80, 50, 70, 30].map((h, idx) => (
                      <div
                        key={idx}
                        className={`w-1 bg-sky-400 rounded-full transition-all duration-150 ${
                          isAiSpeaking ? 'animate-bounce' : 'opacity-40'
                        }`}
                        style={{
                          height: isAiSpeaking ? `${h}%` : '20%',
                          animationDelay: `${idx * 0.1}s`,
                        }}
                      />
                    ))}
                  </div>
                )}

                {/* Voice & Speaker Humanized Indicator */}
                {callState === 'connected' && (
                  <div className="mt-2.5 flex items-center justify-center gap-2">
                    <span
                      className={`text-[10px] px-2.5 py-0.5 rounded-full font-medium border flex items-center gap-1.5 transition shadow-xs ${
                        currentVoiceGender === 'male'
                          ? 'bg-amber-50 text-amber-900 border-amber-300'
                          : 'bg-blue-50 text-blue-900 border-blue-200'
                      }`}
                    >
                      <Volume2 className="w-3 h-3 text-blue-600" />
                      <span>{currentVoiceSpeaker}</span>
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Quick Dial Tags (When Idle) */}
          {callState === 'idle' && (
            <div className="px-4 py-2 border-b border-slate-200 shadow-sm flex items-center gap-1.5 overflow-x-auto text-xs no-scrollbar">
              <span className="text-[10px] uppercase text-slate-500 font-semibold tracking-wider mr-1">Atalhos:</span>
              <button
                onClick={() => {
                  setDialNumber('9001');
                  startCall('9001');
                }}
                className="whitespace-nowrap px-2.5 py-1 rounded-lg bg-blue-600/15 border border-sky-500/40 text-blue-700 hover:bg-blue-600/25 flex items-center gap-1 font-medium transition"
              >
                <Bot className="w-3 h-3 text-blue-600" />
                MaIA IA (9001)
              </button>
              <button
                onClick={() => {
                  setDialNumber('4102');
                  startCall('4102');
                }}
                className="whitespace-nowrap px-2 py-1 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100 transition flex items-center gap-1 font-medium"
              >
                <Headphones className="w-3 h-3 text-emerald-600" />
                Roberto - Suporte (4102)
              </button>
              <button
                onClick={() => {
                  setDialNumber('4103');
                  startCall('4103');
                }}
                className="whitespace-nowrap px-2 py-1 rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 transition"
              >
                Mariana - Vendas (4103)
              </button>
              <button
                onClick={() => {
                  setDialNumber('6001');
                  startCall('6001');
                }}
                className="whitespace-nowrap px-2 py-1 rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 transition"
              >
                URA (6001)
              </button>
            </div>
          )}

          {/* Connected Tabs (Context view vs DTMF Keypad) */}
          {callState === 'connected' && (
            <div className="flex border-b border-slate-200 bg-slate-50/40">
              <button
                onClick={() => {
                  if (callType === 'ai') setActiveTab('ai_live');
                  else if (callType === 'ivr') setActiveTab('ivr');
                  else if (callType === 'queue') setActiveTab('queue');
                  else if (callType === 'extension') setActiveTab('extension');
                }}
                className={`flex-1 py-2 text-xs font-semibold flex items-center justify-center gap-1.5 border-b-2 transition ${
                  activeTab !== 'keypad'
                    ? 'border-sky-500 text-blue-600 bg-blue-600/5'
                    : 'border-transparent text-slate-500 hover:text-slate-700'
                }`}
              >
                {callType === 'ai' ? (
                  <>
                    <Sparkles className="w-3.5 h-3.5" />
                    Interação com MaIA
                  </>
                ) : callType === 'ivr' ? (
                  <>
                    <GitFork className="w-3.5 h-3.5" />
                    Menu da URA
                  </>
                ) : callType === 'queue' ? (
                  <>
                    <Users className="w-3.5 h-3.5" />
                    Fila de Espera
                  </>
                ) : (
                  <>
                    <Headphones className="w-3.5 h-3.5" />
                    Painel do Ramal
                  </>
                )}
              </button>
              <button
                onClick={() => setActiveTab('keypad')}
                className={`flex-1 py-2 text-xs font-semibold flex items-center justify-center gap-1.5 border-b-2 transition ${
                  activeTab === 'keypad'
                    ? 'border-sky-500 text-blue-600 bg-blue-600/5'
                    : 'border-transparent text-slate-500 hover:text-slate-700'
                }`}
              >
                <Clock className="w-3.5 h-3.5" />
                Teclado DTMF
              </button>
            </div>
          )}

          {/* Middle Body */}
          <div className="flex-1 overflow-y-auto p-4 flex flex-col">
            {callState === 'connected' && isAiCall && activeTab === 'ai_live' ? (
              <div className="flex-1 flex flex-col justify-between">
                {/* Transcript feed */}
                <div className="space-y-2.5 overflow-y-auto max-h-40 sm:max-h-60 pr-1 text-xs font-sans">
                  {aiHistory.map((item, i) => (
                    <div
                      key={i}
                      className={`p-2.5 rounded-xl ${
                        item.role === 'user'
                          ? 'bg-blue-50 border border-blue-200 text-blue-900 ml-6'
                          : item.role === 'model'
                          ? 'bg-white border border-slate-200 text-slate-900 mr-6 shadow-sm'
                          : item.role === 'tool'
                          ? 'bg-amber-50 border border-amber-200 text-amber-900 font-mono text-[11px]'
                          : 'bg-white border border-slate-200 text-slate-500 text-[10px] text-center shadow-sm'
                      }`}
                    >
                      <div className="flex items-center justify-between text-[10px] text-slate-500 mb-1">
                        <span className="font-semibold capitalize">
                          {item.role === 'user' ? 'Você (Chamador)' : item.role === 'model' ? 'MaIA (Gemini)' : item.role === 'tool' ? 'Function Calling' : 'Asterisk 20'}
                        </span>
                        <span>{item.timestamp}</span>
                      </div>
                      <p className="leading-relaxed">{item.text}</p>
                    </div>
                  ))}
                  {isProcessingTurn && (
                    <div className="p-2 text-xs text-slate-500 italic flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-sky-400 animate-ping" />
                      MaIA processando turno com Gemini...
                    </div>
                  )}
                </div>

                {/* Quick Prompts & Speech Input */}
                <div className="mt-3 pt-3 border-t border-slate-200">
                  <div className="text-[10px] uppercase text-slate-500 font-semibold tracking-wider mb-1.5 flex items-center justify-between">
                    <span>Falar ou enviar pergunta:</span>
                    <span className="text-blue-600">Barge-in ativo</span>
                  </div>

                  <div className="flex flex-wrap gap-1.5 mb-2">
                    <button
                      onClick={() => handleSendVoiceTurn('Quero consultar a minha fatura em aberto')}
                      className="text-[11px] px-2 py-1 bg-slate-50 hover:bg-slate-200 text-slate-700 rounded-lg transition border border-slate-200 text-left"
                    >
                      "Consultar minha fatura"
                    </button>
                    <button
                      onClick={() => handleSendVoiceTurn('Pode me transferir para o suporte humano?')}
                      className="text-[11px] px-2 py-1 bg-slate-50 hover:bg-slate-200 text-slate-700 rounded-lg transition border border-slate-200 text-left"
                    >
                      "Transferir para suporte"
                    </button>
                    <button
                      onClick={() => handleSendVoiceTurn('Estou sem internet no escritório')}
                      className="text-[11px] px-2 py-1 bg-slate-50 hover:bg-slate-200 text-slate-700 rounded-lg transition border border-slate-200 text-left"
                    >
                      "Estou sem internet"
                    </button>
                  </div>

                  {isListening && (
                    <div className="text-[11px] text-rose-600 bg-rose-50 border border-rose-200 px-3 py-1.5 rounded-xl flex items-center gap-2 mb-2 animate-pulse font-medium">
                      <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
                      <span>Ouvindo sua voz... Fale agora em português (pt-BR).</span>
                    </div>
                  )}

                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      handleSendVoiceTurn(userInputText);
                    }}
                    className="flex gap-2 items-center"
                  >
                    {speechSupported && (
                      <button
                        type="button"
                        onClick={toggleSpeechRecognition}
                        className={`px-3 py-2 rounded-xl border text-xs flex items-center gap-1.5 transition font-semibold ${
                          isListening
                            ? 'bg-rose-600 text-white border-rose-700 shadow-sm'
                            : 'bg-blue-50 hover:bg-blue-100 text-blue-700 border-blue-200'
                        }`}
                        title={isListening ? 'Parar captura de voz' : 'Falar pelo microfone'}
                      >
                        <Mic className={`w-3.5 h-3.5 ${isListening ? 'animate-bounce' : ''}`} />
                        <span className="hidden sm:inline">{isListening ? 'Ouvindo...' : 'Falar'}</span>
                      </button>
                    )}
                    <input
                      type="text"
                      value={userInputText}
                      onChange={(e) => setUserInputText(e.target.value)}
                      placeholder={isListening ? 'Ouvindo sua voz...' : 'Diga ou digite algo para a MaIA...'}
                      className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-500"
                    />
                    <button
                      type="submit"
                      disabled={isProcessingTurn || !userInputText.trim()}
                      className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white font-bold rounded-xl text-xs flex items-center gap-1 transition shadow-sm"
                    >
                      <Send className="w-3.5 h-3.5" />
                    </button>
                  </form>
                </div>
              </div>
            ) : callState === 'connected' && activeTab === 'ivr' ? (
              /* Interactive IVR Menu */
              <div className="flex-1 flex flex-col justify-between">
                <div>
                  <div className="bg-blue-50/90 border border-blue-200 rounded-xl p-3 mb-3 shadow-xs">
                    <div className="flex items-center gap-2 text-blue-800 font-bold text-xs mb-1">
                      <GitFork className="w-4 h-4 text-blue-600" />
                      <span>URA Asterisk 20 — Escolha sua opção:</span>
                    </div>
                    <p className="text-[11px] text-blue-700 leading-relaxed">
                      {ivrAnnouncement || 'Pressione o dígito no teclado DTMF ou clique na opção desejada:'}
                    </p>
                  </div>

                  <div className="space-y-1.5">
                    {[
                      { key: '1', title: 'Comercial & Vendas (Mariana)', dest: 'Ramal 4103', desc: 'Planos corporativos e novos contratos' },
                      { key: '2', title: 'Suporte Técnico (Roberto Mendes)', dest: 'Ramal 4102', desc: 'NOC, roteadores, link de fibra e diagnóstico de rede' },
                      { key: '3', title: 'Financeiro & Faturamento (Renata)', dest: 'Fila 7002', desc: '2ª via, boletos e pagamentos via Pix' },
                      { key: '9', title: 'MaIA — Agente IA Gemini', dest: 'Gemini Live', desc: 'Assistente virtual por voz com IA generativa' },
                      { key: '0', title: 'Atendente Central (Carlos)', dest: 'Ramal 4101', desc: 'Central de telefonistas Enlace' },
                    ].map((opt) => (
                      <button
                        key={opt.key}
                        onClick={() => processIvrSelection(opt.key)}
                        className="w-full text-left p-2.5 rounded-xl border border-slate-200 hover:border-blue-400 hover:bg-blue-50/40 bg-white transition flex items-center justify-between group shadow-xs active:scale-99"
                      >
                        <div className="flex items-center gap-2.5">
                          <span className="w-7 h-7 rounded-lg bg-blue-50 border border-blue-200 text-blue-700 font-mono font-bold flex items-center justify-center text-xs group-hover:bg-blue-600 group-hover:text-white transition">
                            {opt.key}
                          </span>
                          <div>
                            <p className="text-xs font-semibold text-slate-900 group-hover:text-blue-700 transition">
                              {opt.title}
                            </p>
                            <p className="text-[10px] text-slate-500">{opt.desc}</p>
                          </div>
                        </div>
                        <span className="text-[10px] font-mono text-slate-500 bg-slate-100 group-hover:bg-blue-100 group-hover:text-blue-700 px-2 py-0.5 rounded transition">
                          {opt.dest}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
                <div className="text-[10px] text-slate-500 text-center font-mono pt-2 border-t border-slate-200 mt-2">
                  Asterisk 20 dialplan context: [ivr-main-menu]
                </div>
              </div>
            ) : callState === 'connected' && activeTab === 'queue' ? (
              /* Queue Wait Screen */
              <div className="flex-1 flex flex-col items-center justify-center text-center p-4">
                <div className="w-16 h-16 rounded-2xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600 mb-3 shadow-inner">
                  <Users className="w-8 h-8 animate-pulse" />
                </div>
                <h4 className="text-sm font-bold text-slate-900 mb-0.5">
                  {queueInfo?.name || 'Fila de Atendimento'}
                </h4>
                <p className="text-xs text-slate-500 font-mono mb-4">Estratégia ACD: Round-Robin (Toque alternado)</p>

                <div className="grid grid-cols-2 gap-2.5 w-full max-w-xs mb-4">
                  <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200 text-center">
                    <span className="text-[10px] text-slate-500 uppercase tracking-wider block font-medium">Sua Posição</span>
                    <span className="text-xl font-bold font-mono text-blue-600">#{queueInfo?.position || 1}</span>
                  </div>
                  <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200 text-center">
                    <span className="text-[10px] text-slate-500 uppercase tracking-wider block font-medium">SLA de Espera</span>
                    <span className="text-xl font-bold font-mono text-emerald-600">&lt; 20s</span>
                  </div>
                </div>

                <div className="w-full max-w-xs bg-emerald-50/80 border border-emerald-200 rounded-xl p-3 text-xs text-emerald-800 flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                  <span className="font-medium">{queueInfo?.agentName || 'Conectando com o primeiro agente livre...'}</span>
                </div>
              </div>
            ) : callState === 'connected' && activeTab === 'extension' ? (
              /* Connected Extension Screen */
              <div className="flex-1 flex flex-col items-center justify-center text-center p-4">
                {isVideoCall ? (
                  <div className="w-full h-48 bg-slate-900 rounded-2xl mb-4 relative overflow-hidden border-2 border-slate-800 shadow-inner flex items-center justify-center">
                    {/* Simulated Remote Video */}
                    <div className="absolute inset-0 opacity-20 bg-[url('https://images.unsplash.com/photo-1573164713988-8665fc963095?auto=format&fit=crop&q=80&w=800')] bg-cover bg-center" />
                    
                    {!isVideoCamOn && (
                      <div className="absolute inset-0 bg-slate-900/80 flex items-center justify-center z-10 backdrop-blur-sm">
                        <VideoOff className="w-8 h-8 text-slate-500" />
                      </div>
                    )}
                    
                    {/* Simulated Local PIP */}
                    <div className="absolute bottom-2 right-2 w-16 h-24 bg-slate-800 rounded-lg border-2 border-slate-600 overflow-hidden shadow-lg z-20">
                      <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&q=80&w=400')] bg-cover bg-center" />
                      {!isVideoCamOn && (
                        <div className="absolute inset-0 bg-slate-900 flex items-center justify-center backdrop-blur-md">
                           <VideoOff className="w-4 h-4 text-slate-500" />
                        </div>
                      )}
                    </div>
                    
                    <span className="absolute top-2 left-2 bg-slate-900/60 text-white text-[9px] font-mono px-1.5 py-0.5 rounded backdrop-blur-sm z-20">
                      H.264 / VP8 (WebRTC)
                    </span>
                  </div>
                ) : (
                  <div className="w-16 h-16 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600 mb-3 shadow-inner">
                    <Headphones className="w-8 h-8" />
                  </div>
                )}
                
                <h4 className="text-sm font-bold text-slate-900 mb-0.5">
                  {extInfo?.name || `Ramal ${connectedDestination}`}
                </h4>
                <p className="text-xs text-slate-500 mb-4">{extInfo?.dept || 'Departamento'} • Ramal {extInfo?.number || connectedDestination}</p>

                <div className="space-y-2 w-full max-w-xs text-left text-xs bg-slate-50 p-3 rounded-xl border border-slate-200 font-mono">
                  <div className="flex justify-between text-[11px]">
                    <span className="text-slate-500">Protocolo:</span>
                    <span className="text-slate-800 font-semibold">PJSIP SIP/2.0 {isVideoCall ? 'WSS' : 'UDP'}</span>
                  </div>
                  <div className="flex justify-between text-[11px]">
                    <span className="text-slate-500">{isVideoCall ? 'Codecs' : 'Codec de Voz'}:</span>
                    <span className="text-blue-600 font-semibold">{isVideoCall ? 'Opus + VP8' : 'Opus HD'}</span>
                  </div>
                  <div className="flex justify-between text-[11px]">
                    <span className="text-slate-500">Criptografia:</span>
                    <span className="text-emerald-600 font-semibold">SRTP / DTLS</span>
                  </div>
                </div>
              </div>
            ) : (
              /* DTMF Keypad Grid */
              <div className="grid grid-cols-3 gap-2.5 max-w-[280px] mx-auto w-full my-auto">
                {[
                  { d: '1', sub: ' ' },
                  { d: '2', sub: 'ABC' },
                  { d: '3', sub: 'DEF' },
                  { d: '4', sub: 'GHI' },
                  { d: '5', sub: 'JKL' },
                  { d: '6', sub: 'MNO' },
                  { d: '7', sub: 'PQRS' },
                  { d: '8', sub: 'TUV' },
                  { d: '9', sub: 'WXYZ' },
                  { d: '*', sub: ' ' },
                  { d: '0', sub: '+' },
                  { d: '#', sub: ' ' },
                ].map(({ d, sub }) => (
                  <button
                    key={d}
                    onClick={() => handleKeypadPress(d)}
                    className="h-12 bg-slate-50 hover:bg-slate-200 active:bg-sky-600 active:text-white rounded-xl flex flex-col items-center justify-center border border-slate-200 shadow-sm transition active:scale-95 group"
                  >
                    <span className="text-lg font-bold font-mono text-slate-900 group-active:text-white leading-tight">
                      {d}
                    </span>
                    {sub.trim() && (
                      <span className="text-[9px] font-mono text-slate-500 group-active:text-sky-100 -mt-0.5">
                        {sub}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Inline Transfer Box (When open) */}
          {showTransferDialog && callState === 'connected' && (
            <div className="p-3 bg-slate-50 border-t border-slate-200">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <Forward className="w-3.5 h-3.5 text-blue-600" />
                  Transferir Chamada (Asterisk ARI)
                </span>
                <button
                  onClick={() => setShowTransferDialog(false)}
                  className="text-slate-400 hover:text-slate-600 text-xs p-1"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>

              <div className="flex gap-1.5 mb-2">
                {[
                  { label: 'Suporte 4102', dest: '4102' },
                  { label: 'Comercial 4103', dest: '4103' },
                  { label: 'Fila N1 7001', dest: '7001' },
                  { label: 'MaIA 9001', dest: '9001' },
                ].map((sc) => (
                  <button
                    key={sc.dest}
                    onClick={() => setTransferDestination(sc.dest)}
                    className={`text-[10px] px-2 py-1 rounded-lg border font-mono transition ${
                      transferDestination === sc.dest
                        ? 'bg-blue-600 text-white border-blue-700 font-bold'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {sc.label}
                  </button>
                ))}
              </div>

              <div className="flex gap-2">
                <input
                  type="text"
                  value={transferDestination}
                  onChange={(e) => setTransferDestination(e.target.value)}
                  placeholder="Ramal ou fila (ex: 4102)..."
                  className="flex-1 bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-mono text-slate-800 focus:outline-none focus:border-blue-500"
                />
                <button
                  onClick={executeInlineTransfer}
                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition flex items-center gap-1 shadow-sm"
                >
                  <Forward className="w-3.5 h-3.5" />
                  Transferir
                </button>
              </div>

              {transferStatusMsg && (
                <p className="text-[11px] text-blue-700 mt-2 font-medium flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  {transferStatusMsg}
                </p>
              )}
            </div>
          )}

          {/* Call Controls Footer */}
          <div className="bg-slate-50/80 p-4 border-t border-slate-200">
            {callState === 'idle' ? (
              <div className="flex flex-col gap-3">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => { setIsVideoCall(false); startCall(); }}
                    disabled={!dialNumber}
                    className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white font-bold rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-blue-600/30 transition active:scale-98"
                  >
                    <Phone className="w-4 h-4 fill-white" />
                    Ligar {dialNumber ? `(${dialNumber})` : ''}
                  </button>
                  <button
                    onClick={() => { setIsVideoCall(true); startCall(); }}
                    disabled={!dialNumber}
                    className="flex-1 py-3 bg-purple-600 hover:bg-purple-700 disabled:opacity-40 text-white font-bold rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-purple-600/30 transition active:scale-98"
                  >
                    <Video className="w-4 h-4 fill-white" />
                    Vídeo
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between gap-3">
                {isVideoCall && (
                  <button
                    onClick={() => setIsVideoCamOn(!isVideoCamOn)}
                    className={`p-3 rounded-xl border transition flex items-center justify-center ${
                      !isVideoCamOn
                        ? 'bg-rose-500/20 border-rose-500 text-rose-400'
                        : 'bg-purple-100 border-purple-200 text-purple-700 hover:bg-purple-200'
                    }`}
                    title={isVideoCamOn ? 'Desligar Câmera' : 'Ligar Câmera'}
                  >
                    {isVideoCamOn ? <Video className="w-5 h-5" /> : <VideoOff className="w-5 h-5" />}
                  </button>
                )}
                <button
                  onClick={() => setIsMuted(!isMuted)}
                  className={`p-3 rounded-xl border transition flex items-center justify-center ${
                    isMuted
                      ? 'bg-rose-500/20 border-rose-500 text-rose-400'
                      : 'bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200'
                  }`}
                  title={isMuted ? 'Desmutar' : 'Mudar para Mudo'}
                >
                  {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                </button>

                <button
                  onClick={() => setIsOnHold(!isOnHold)}
                  className={`p-3 rounded-xl border transition flex items-center justify-center ${
                    isOnHold
                      ? 'bg-amber-500/20 border-amber-500 text-amber-400'
                      : 'bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200'
                  }`}
                  title={isOnHold ? 'Retomar chamada' : 'Colocar em espera'}
                >
                  {isOnHold ? <Play className="w-5 h-5" /> : <Pause className="w-5 h-5" />}
                </button>

                <button
                  onClick={() => setShowTransferDialog(!showTransferDialog)}
                  className={`p-3 rounded-xl border transition flex items-center justify-center ${
                    showTransferDialog
                      ? 'bg-blue-600 border-blue-700 text-white shadow-sm'
                      : 'bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200'
                  }`}
                  title="Transferir chamada (Asterisk ARI)"
                >
                  <Forward className="w-5 h-5" />
                </button>

                <button
                  onClick={endCall}
                  className="flex-1 py-3 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-rose-950 transition active:scale-98"
                >
                  <PhoneOff className="w-5 h-5" />
                  Desligar
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
