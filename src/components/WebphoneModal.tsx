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
} from 'lucide-react';
import { playDtmfTone, playRingbackTone, playCallEndBeep } from '../utils/audio';

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
  const [activeTab, setActiveTab] = useState<'keypad' | 'ai_live'>('keypad');
  const [isMinimized, setIsMinimized] = useState(false);

  // AI Voice conversation state
  const [isAiCall, setIsAiCall] = useState(false);
  const [aiHistory, setAiHistory] = useState<Array<{ role: 'user' | 'model' | 'system' | 'tool'; text: string; timestamp: string }>>([]);
  const [userInputText, setUserInputText] = useState('');
  const [isAiSpeaking, setIsAiSpeaking] = useState(false);
  const [isProcessingTurn, setIsProcessingTurn] = useState(false);
  const [lastExecutedTool, setLastExecutedTool] = useState<string | null>(null);

  const stopRingbackRef = useRef<(() => void) | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

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

  const handleKeypadPress = (digit: string) => {
    playDtmfTone(digit);
    setDialNumber((prev) => prev + digit);
  };

  const handleBackspace = () => {
    setDialNumber((prev) => prev.slice(0, -1));
  };

  const startCall = async (targetNumber?: string) => {
    const num = targetNumber || dialNumber;
    if (!num) return;

    setCallState('calling');
    const isTargetAi = num === '9001' || num.includes('0800') || num.toLowerCase().includes('maia') || num === '6001';
    setIsAiCall(isTargetAi);
    if (isTargetAi) {
      setActiveTab('ai_live');
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
        speakText(initialGreeting);
      }
    }, 1800);
  };

  const endCall = async () => {
    if (stopRingbackRef.current) stopRingbackRef.current();
    playCallEndBeep();
    setCallState('idle');

    // Save CDR record
    try {
      await fetch('/api/v1/cdr', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          caller: '4101',
          callee: dialNumber || '9001',
          direction: 'outbound',
          duration: callDuration || 12,
          billsec: callDuration || 12,
          aiAgentId: isAiCall ? 'agent-maia-247' : undefined,
          transcription: aiHistory.map((h) => `${h.role}: ${h.text}`).join('\n'),
        }),
      });
      if (onCallEnded) onCallEnded();
    } catch {
      // Ignored
    }

    setAiHistory([]);
    setLastExecutedTool(null);
    window.speechSynthesis?.cancel();
  };

  const speakText = (text: string) => {
    if (!window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'pt-BR';
    utterance.rate = 1.05;
    utterance.pitch = 1.0;
    setIsAiSpeaking(true);

    utterance.onend = () => {
      setIsAiSpeaking(false);
    };
    utterance.onerror = () => {
      setIsAiSpeaking(false);
    };

    window.speechSynthesis.speak(utterance);
  };

  const handleSendVoiceTurn = async (messageText: string) => {
    if (!messageText.trim() || isProcessingTurn) return;

    // Barge-in: interrupt AI if speaking
    window.speechSynthesis?.cancel();
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
      const res = await fetch('/api/v1/ai/voice-turn', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agentId: 'agent-maia-247',
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

      speakText(modelReply);

      if (data.action === 'transfer') {
        setTimeout(() => {
          setAiHistory((prev) => [
            ...prev,
            {
              role: 'system',
              text: `🔄 Asterisk Bridge ARI: Chamada transferida com sucesso para o Ramal ${data.transferDestination || '4102'}.`,
              timestamp: new Date().toLocaleTimeString('pt-BR'),
            },
          ]);
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
      className={`fixed z-50 transition-all duration-200 shadow-2xl rounded-2xl border border-slate-200 bg-white text-slate-800 flex flex-col overflow-hidden ${
        isMinimized
          ? 'bottom-6 right-6 w-80 h-16 cursor-pointer'
          : 'bottom-6 right-6 w-96 h-[640px] max-h-[90vh]'
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
            <p className="text-[10px] text-slate-400">Enlace-PBX • WebRTC Opus</p>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={() => setIsMinimized(!isMinimized)}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition"
            title={isMinimized ? 'Expandir' : 'Minimizar'}
          >
            {isMinimized ? <Maximize2 className="w-3.5 h-3.5" /> : <Minimize2 className="w-3.5 h-3.5" />}
          </button>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-100 rounded-lg transition"
            title="Fechar"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {isMinimized && (
        <div
          onClick={() => setIsMinimized(false)}
          className="flex-1 flex items-center justify-between px-4 text-xs font-medium text-slate-600"
        >
          <span>{callState === 'connected' ? `Em chamada (${formatSeconds(callDuration)})` : 'Ramal 4101 Pronto'}</span>
          <span className="text-blue-600 font-semibold">Clique para abrir</span>
        </div>
      )}

      {!isMinimized && (
        <div className="flex-1 flex flex-col min-h-0 bg-white/95">
          {/* Status Bar / Active Call Display */}
          <div className="bg-slate-50/60 p-4 border-b border-slate-100">
            {callState === 'idle' ? (
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[11px] text-slate-400 font-mono">DISCADOR BRASILEIRO</span>
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
                    className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-lg font-mono text-slate-800 placeholder-slate-500 focus:outline-none focus:border-sky-500 tracking-wider"
                  />
                  {dialNumber && (
                    <button
                      onClick={handleBackspace}
                      className="absolute right-3 text-slate-400 hover:text-slate-700 text-xs px-1.5 py-0.5"
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
                <h3 className="text-base font-bold text-slate-800">
                  {dialNumber === '9001' ? 'MaIA — Agente de Voz IA' : dialNumber || 'Chamada Externa'}
                </h3>
                <p className="text-[11px] text-slate-400 font-mono mt-0.5">
                  {isAiCall ? 'Google Gemini Live API • AudioSocket 24kHz' : 'Codec Opus / 48kHz • Criptografado SRTP'}
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
              </div>
            )}
          </div>

          {/* Quick Dial Tags (When Idle) */}
          {callState === 'idle' && (
            <div className="px-4 py-2 border-b border-slate-100 flex items-center gap-1.5 overflow-x-auto text-xs no-scrollbar">
              <span className="text-[10px] uppercase text-slate-400 font-semibold tracking-wider mr-1">Atalhos:</span>
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
                onClick={() => setDialNumber('4102')}
                className="whitespace-nowrap px-2 py-1 rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200 transition"
              >
                Suporte (4102)
              </button>
              <button
                onClick={() => setDialNumber('6001')}
                className="whitespace-nowrap px-2 py-1 rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200 transition"
              >
                URA (6001)
              </button>
            </div>
          )}

          {/* Connected Tabs (Keypad vs Live AI Transcript) */}
          {callState === 'connected' && isAiCall && (
            <div className="flex border-b border-slate-200 bg-slate-50/40">
              <button
                onClick={() => setActiveTab('ai_live')}
                className={`flex-1 py-2 text-xs font-semibold flex items-center justify-center gap-1.5 border-b-2 transition ${
                  activeTab === 'ai_live'
                    ? 'border-sky-500 text-blue-600 bg-blue-600/5'
                    : 'border-transparent text-slate-400 hover:text-slate-700'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5" />
                Interação com MaIA
              </button>
              <button
                onClick={() => setActiveTab('keypad')}
                className={`flex-1 py-2 text-xs font-semibold flex items-center justify-center gap-1.5 border-b-2 transition ${
                  activeTab === 'keypad'
                    ? 'border-sky-500 text-blue-600 bg-blue-600/5'
                    : 'border-transparent text-slate-400 hover:text-slate-700'
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
                <div className="space-y-2.5 overflow-y-auto max-h-60 pr-1 text-xs font-sans">
                  {aiHistory.map((item, i) => (
                    <div
                      key={i}
                      className={`p-2.5 rounded-xl ${
                        item.role === 'user'
                          ? 'bg-sky-950/50 border border-sky-800/50 text-sky-100 ml-6'
                          : item.role === 'model'
                          ? 'bg-slate-50 border border-slate-200 text-slate-800 mr-6'
                          : item.role === 'tool'
                          ? 'bg-amber-950/30 border border-amber-800/40 text-amber-200 font-mono text-[11px]'
                          : 'bg-white border border-slate-200 text-slate-400 text-[10px] text-center'
                      }`}
                    >
                      <div className="flex items-center justify-between text-[10px] text-slate-400 mb-1">
                        <span className="font-semibold capitalize">
                          {item.role === 'user' ? 'Você (Chamador)' : item.role === 'model' ? 'MaIA (Gemini)' : item.role === 'tool' ? 'Function Calling' : 'Asterisk 20'}
                        </span>
                        <span>{item.timestamp}</span>
                      </div>
                      <p className="leading-relaxed">{item.text}</p>
                    </div>
                  ))}
                  {isProcessingTurn && (
                    <div className="p-2 text-xs text-slate-400 italic flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-sky-400 animate-ping" />
                      MaIA processando turno com Gemini...
                    </div>
                  )}
                </div>

                {/* Quick Prompts & Speech Input */}
                <div className="mt-3 pt-3 border-t border-slate-200">
                  <div className="text-[10px] uppercase text-slate-400 font-semibold tracking-wider mb-1.5 flex items-center justify-between">
                    <span>Falar ou enviar pergunta:</span>
                    <span className="text-blue-600">Barge-in ativo</span>
                  </div>

                  <div className="flex flex-wrap gap-1.5 mb-2">
                    <button
                      onClick={() => handleSendVoiceTurn('Quero consultar a minha fatura em aberto')}
                      className="text-[11px] px-2 py-1 bg-slate-50 hover:bg-slate-200 text-slate-600 rounded-lg transition border border-slate-200 text-left"
                    >
                      "Consultar minha fatura"
                    </button>
                    <button
                      onClick={() => handleSendVoiceTurn('Pode me transferir para o suporte humano?')}
                      className="text-[11px] px-2 py-1 bg-slate-50 hover:bg-slate-200 text-slate-600 rounded-lg transition border border-slate-200 text-left"
                    >
                      "Transferir para suporte"
                    </button>
                    <button
                      onClick={() => handleSendVoiceTurn('Estou sem internet no escritório')}
                      className="text-[11px] px-2 py-1 bg-slate-50 hover:bg-slate-200 text-slate-600 rounded-lg transition border border-slate-200 text-left"
                    >
                      "Estou sem internet"
                    </button>
                  </div>

                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      handleSendVoiceTurn(userInputText);
                    }}
                    className="flex gap-2"
                  >
                    <input
                      type="text"
                      value={userInputText}
                      onChange={(e) => setUserInputText(e.target.value)}
                      placeholder="Diga ou digite algo para a MaIA..."
                      className="flex-1 bg-slate-50 border border-slate-300 rounded-xl px-3 py-1.5 text-xs text-slate-800 placeholder-slate-500 focus:outline-none focus:border-sky-500"
                    />
                    <button
                      type="submit"
                      disabled={isProcessingTurn || !userInputText.trim()}
                      className="px-3 py-1.5 bg-sky-600 hover:bg-blue-600 disabled:opacity-50 text-white font-bold rounded-xl text-xs flex items-center gap-1 transition"
                    >
                      <Send className="w-3.5 h-3.5" />
                    </button>
                  </form>
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
                    <span className="text-lg font-bold font-mono text-slate-800 group-active:text-white leading-tight">
                      {d}
                    </span>
                    {sub.trim() && (
                      <span className="text-[9px] font-mono text-slate-400 group-active:text-slate-900 -mt-0.5">
                        {sub}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Call Controls Footer */}
          <div className="bg-slate-50/80 p-4 border-t border-slate-200">
            {callState === 'idle' ? (
              <button
                onClick={() => startCall()}
                disabled={!dialNumber}
                className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 disabled:hover:bg-blue-600 text-white font-bold rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-blue-600/30 transition active:scale-98"
              >
                <Phone className="w-4 h-4 fill-slate-950" />
                Ligar para {dialNumber || '...'}
              </button>
            ) : (
              <div className="flex items-center justify-between gap-3">
                <button
                  onClick={() => setIsMuted(!isMuted)}
                  className={`p-3 rounded-xl border transition flex items-center justify-center ${
                    isMuted
                      ? 'bg-rose-500/20 border-rose-500 text-rose-400'
                      : 'bg-slate-100 border-slate-300 text-slate-600 hover:bg-slate-200'
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
                      : 'bg-slate-100 border-slate-300 text-slate-600 hover:bg-slate-200'
                  }`}
                  title={isOnHold ? 'Retomar chamada' : 'Colocar em espera'}
                >
                  {isOnHold ? <Play className="w-5 h-5" /> : <Pause className="w-5 h-5" />}
                </button>

                <button
                  onClick={() => {
                    const dest = prompt('Número do ramal ou fila para transferência (ex: 4102):', '4102');
                    if (dest) {
                      alert(`Transferência assistida via Asterisk ARI iniciada para o ramal ${dest}.`);
                    }
                  }}
                  className="p-3 bg-slate-100 border border-slate-300 text-slate-600 hover:bg-slate-200 rounded-xl transition flex items-center justify-center"
                  title="Transferir chamada"
                >
                  <ArrowRight className="w-5 h-5" />
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
