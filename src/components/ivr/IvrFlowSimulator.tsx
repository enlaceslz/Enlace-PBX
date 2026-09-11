import React, { useState, useEffect, useRef } from 'react';
import {
  Phone,
  PhoneOff,
  Volume2,
  Bot,
  Users,
  RotateCcw,
  Sparkles,
  Layers,
  X,
  Radio,
  Clock,
  VolumeX,
} from 'lucide-react';
import { IvrFlowNode, IvrVisualFlow } from '../../types/pbx';
import { playDtmfTone, speakText, stopSpeaking } from '../../utils/dtmfAudio';

interface IvrFlowSimulatorProps {
  ivrName: string;
  ivrNumber: string;
  flow: IvrVisualFlow;
  activeNodeId: string | null;
  onActiveNodeChange: (nodeId: string | null) => void;
  onClose: () => void;
}

export const IvrFlowSimulator: React.FC<IvrFlowSimulatorProps> = ({
  ivrName,
  ivrNumber,
  flow,
  activeNodeId,
  onActiveNodeChange,
  onClose,
}) => {
  const [callState, setCallState] = useState<'idle' | 'calling' | 'connected' | 'ended'>('connected');
  const [callDuration, setCallDuration] = useState(0);
  const [isAudioPlaying, setIsAudioPlaying] = useState(false);
  const [currentPromptText, setCurrentPromptText] = useState<string>('');
  const [enteredDigits, setEnteredDigits] = useState<string>('');
  const [eventLogs, setEventLogs] = useState<Array<{ time: string; text: string; type: 'info' | 'dtmf' | 'dest' | 'warn' }>>([]);
  const [isMuted, setIsMuted] = useState(false);

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const dtmfTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Call timer
  useEffect(() => {
    if (callState === 'connected') {
      timerRef.current = setInterval(() => {
        setCallDuration((prev) => prev + 1);
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [callState]);

  const addLog = (text: string, type: 'info' | 'dtmf' | 'dest' | 'warn' = 'info') => {
    const time = new Date().toLocaleTimeString();
    setEventLogs((prev) => [{ time, text, type }, ...prev.slice(0, 19)]);
  };

  // Find start node and begin simulation
  const startSimulation = () => {
    stopSpeaking();
    setCallDuration(0);
    setEnteredDigits('');
    setCallState('connected');
    addLog(`Ligação originada para URA ${ivrNumber} (${ivrName})`, 'info');

    const startNode = flow.nodes.find((n) => n.type === 'start') || flow.nodes[0];
    if (startNode) {
      processNode(startNode);
    } else {
      addLog('Nenhum nó inicial configurado no fluxo', 'warn');
    }
  };

  useEffect(() => {
    startSimulation();
    return () => {
      stopSpeaking();
      if (dtmfTimeoutRef.current) clearTimeout(dtmfTimeoutRef.current);
      onActiveNodeChange(null);
    };
  }, []);

  // Process node transitions
  const processNode = (node: IvrFlowNode) => {
    onActiveNodeChange(node.id);

    if (node.type === 'start') {
      addLog(`[Entrada] Canal SIP atendido com sucesso (Answer)`, 'info');
      // Follow output connection
      const nextConn = flow.connections.find((c) => c.fromNodeId === node.id);
      if (nextConn) {
        const nextNode = flow.nodes.find((n) => n.id === nextConn.toNodeId);
        if (nextNode) {
          setTimeout(() => processNode(nextNode), 600);
        }
      }
    } else if (node.type === 'time_condition') {
      addLog(`[Expediente] Verificando condição de horário comercial...`, 'info');
      const now = new Date();
      const currentHour = now.getHours();
      // Assume open if between 8h and 18h
      const isOpen = currentHour >= 8 && currentHour < 18;
      const portToFind = isOpen ? 'open' : 'closed';
      addLog(
        `[Expediente] Horário avaliado: ${isOpen ? 'Aberto (Em atendimento)' : 'Fechado (Fora de expediente)'}`,
        isOpen ? 'info' : 'warn'
      );

      const conn = flow.connections.find(
        (c) => c.fromNodeId === node.id && (c.fromPort === portToFind || c.fromPort === 'out')
      );
      if (conn) {
        const nextNode = flow.nodes.find((n) => n.id === conn.toNodeId);
        if (nextNode) {
          setTimeout(() => processNode(nextNode), 800);
        }
      }
    } else if (node.type === 'audio') {
      const text =
        node.data.audioText ||
        'Olá! Bem-vindo à nossa central de atendimento. Por favor, ouça as opções a seguir.';
      setCurrentPromptText(text);
      setIsAudioPlaying(true);
      addLog(`[Áudio] Reproduzindo mensagem: "${text.substring(0, 45)}..."`, 'info');

      if (!isMuted) {
        speakText(text, () => {
          setIsAudioPlaying(false);
          const conn = flow.connections.find((c) => c.fromNodeId === node.id);
          if (conn) {
            const nextNode = flow.nodes.find((n) => n.id === conn.toNodeId);
            if (nextNode) {
              processNode(nextNode);
            }
          }
        });
      } else {
        setTimeout(() => {
          setIsAudioPlaying(false);
          const conn = flow.connections.find((c) => c.fromNodeId === node.id);
          if (conn) {
            const nextNode = flow.nodes.find((n) => n.id === conn.toNodeId);
            if (nextNode) {
              processNode(nextNode);
            }
          }
        }, 3000);
      }
    } else if (node.type === 'dtmf') {
      const timeoutSec = node.data.timeoutSeconds || 8;
      addLog(
        `[Menu DTMF] Aguardando dígito do usuário (Timeout: ${timeoutSec}s)...`,
        'dtmf'
      );

      if (dtmfTimeoutRef.current) clearTimeout(dtmfTimeoutRef.current);
      dtmfTimeoutRef.current = setTimeout(() => {
        addLog(`[Menu DTMF] Timeout de resposta atingido sem dígito`, 'warn');
        const timeoutConn = flow.connections.find(
          (c) => c.fromNodeId === node.id && c.fromPort === 'timeout'
        );
        if (timeoutConn) {
          const nextNode = flow.nodes.find((n) => n.id === timeoutConn.toNodeId);
          if (nextNode) processNode(nextNode);
        }
      }, timeoutSec * 1000);
    } else if (node.type === 'ai_agent') {
      stopSpeaking();
      const agentName = node.data.aiAgentName || 'MaIA — Agente IA Gemini';
      addLog(`[Transbordo IA] Chamada conectada a "${agentName}" via ARI / AudioSocket`, 'dest');
      if (!isMuted) {
        speakText(`Olá! Eu sou a ${agentName}. Como posso ajudar você hoje?`);
      }
    } else if (node.type === 'queue') {
      stopSpeaking();
      const qName = node.data.queueName || node.title;
      addLog(`[Fila ACD] Chamada inserida na ${qName}. Posição: 1º. Música de espera ativada.`, 'dest');
    } else if (node.type === 'extension') {
      stopSpeaking();
      const ext = node.data.extensionNumber || '4101';
      addLog(`[Ramal SIP] Chamando ramal PJSIP/${ext} (${node.title})...`, 'dest');
    } else if (node.type === 'hangup') {
      stopSpeaking();
      addLog(`[Desligar] Chamada encerrada pela URA (Hangup)`, 'warn');
      setCallState('ended');
    }
  };

  // Handle DTMF keypad press
  const handlePressDigit = (digit: string) => {
    if (callState !== 'connected') return;

    playDtmfTone(digit);
    setEnteredDigits((prev) => prev + digit);
    addLog(`[DTMF] Tecla [${digit}] pressionada`, 'dtmf');

    // Interrupt speech if playing
    if (isAudioPlaying) {
      stopSpeaking();
      setIsAudioPlaying(false);
    }

    if (dtmfTimeoutRef.current) {
      clearTimeout(dtmfTimeoutRef.current);
    }

    const currentNode = flow.nodes.find((n) => n.id === activeNodeId);
    if (currentNode && currentNode.type === 'dtmf') {
      // Look for a connection matching this digit
      const matchingConn = flow.connections.find(
        (c) => c.fromNodeId === currentNode.id && c.fromPort === digit
      );

      if (matchingConn) {
        const nextNode = flow.nodes.find((n) => n.id === matchingConn.toNodeId);
        if (nextNode) {
          addLog(`[Menu DTMF] Roteando opção ${digit} -> ${nextNode.title}`, 'dest');
          setTimeout(() => processNode(nextNode), 400);
          return;
        }
      }

      // Check invalid port
      const invalidConn = flow.connections.find(
        (c) => c.fromNodeId === currentNode.id && c.fromPort === 'invalid'
      );
      if (invalidConn) {
        const nextNode = flow.nodes.find((n) => n.id === invalidConn.toNodeId);
        if (nextNode) {
          addLog(`[Menu DTMF] Opção inválida digitada (${digit})`, 'warn');
          setTimeout(() => processNode(nextNode), 400);
          return;
        }
      }

      addLog(`[Menu DTMF] Nenhuma ação mapeada para a tecla [${digit}]`, 'warn');
    }
  };

  const handleHangup = () => {
    stopSpeaking();
    if (dtmfTimeoutRef.current) clearTimeout(dtmfTimeoutRef.current);
    setCallState('ended');
    addLog('Chamada desligada pelo usuário', 'warn');
    onActiveNodeChange(null);
  };

  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const remainingSecs = secs % 60;
    return `${mins.toString().padStart(2, '0')}:${remainingSecs.toString().padStart(2, '0')}`;
  };

  const dialPadDigits = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '*', '0', '#'];

  const currentNode = flow.nodes.find((n) => n.id === activeNodeId);

  return (
    <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-3xl shadow-2xl max-w-xl w-full overflow-hidden text-slate-100 flex flex-col">
        {/* Simulator Header */}
        <div className="p-4 bg-slate-950/90 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <Phone className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-sm text-white">Simulador de Chamada URA</h3>
                <span className="flex items-center gap-1 text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded-full font-mono">
                  <Radio className="w-3 h-3 animate-pulse text-emerald-400" />
                  Tempo Real
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Teste o fluxo da URA <span className="font-semibold text-white">{ivrName} ({ivrNumber})</span> com áudio real e DTMF
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              stopSpeaking();
              onClose();
            }}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg transition hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Status Screen */}
        <div className="p-5 bg-gradient-to-b from-slate-900 to-slate-950 border-b border-slate-800">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span
                className={`w-2.5 h-2.5 rounded-full ${
                  callState === 'connected'
                    ? 'bg-emerald-400 animate-ping'
                    : callState === 'calling'
                    ? 'bg-amber-400 animate-pulse'
                    : 'bg-rose-500'
                }`}
              />
              <span className="text-xs font-semibold text-slate-300 capitalize">
                {callState === 'connected' ? 'Em Chamada' : callState === 'calling' ? 'Chamando...' : 'Desconectado'}
              </span>
            </div>

            <div className="flex items-center gap-1.5 text-xs font-mono text-emerald-400 bg-slate-800/80 px-2.5 py-1 rounded-lg border border-slate-700">
              <Clock className="w-3.5 h-3.5" />
              {formatTime(callDuration)}
            </div>
          </div>

          {/* Active Node Card in Simulator */}
          <div className="p-3.5 rounded-2xl bg-slate-800/60 border border-slate-700/80 mb-3">
            <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-1 flex items-center justify-between">
              <span>Nó Ativo no Fluxo:</span>
              <span className="text-blue-400 font-mono">
                {currentNode?.type.toUpperCase() || 'IDLE'}
              </span>
            </div>
            <div className="font-bold text-sm text-white flex items-center gap-2">
              <Layers className="w-4 h-4 text-blue-400" />
              {currentNode?.title || 'Aguardando inicialização...'}
            </div>
            {currentPromptText && isAudioPlaying && (
              <div className="mt-2 text-xs text-slate-300 bg-slate-950/80 p-2 rounded-xl border border-slate-800 flex items-start gap-2">
                <Volume2 className="w-4 h-4 text-blue-400 shrink-0 mt-0.5 animate-pulse" />
                <span className="italic">"{currentPromptText}"</span>
              </div>
            )}
          </div>

          {/* Entered DTMF Display */}
          <div className="flex items-center justify-between bg-slate-950/90 px-4 py-2.5 rounded-xl border border-slate-800">
            <span className="text-xs text-slate-400 font-medium">Dígitos Digitados:</span>
            <span className="text-sm font-black font-mono tracking-widest text-emerald-400">
              {enteredDigits || '—'}
            </span>
          </div>
        </div>

        {/* Dialpad and Logs Grid */}
        <div className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-5">
          {/* DTMF Keypad */}
          <div>
            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
              Teclado Numérico (DTMF):
            </div>
            <div className="grid grid-cols-3 gap-2">
              {dialPadDigits.map((digit) => (
                <button
                  key={digit}
                  onClick={() => handlePressDigit(digit)}
                  disabled={callState !== 'connected'}
                  className="py-3 bg-slate-800/90 hover:bg-slate-700 active:bg-blue-600 text-white font-bold text-base rounded-xl border border-slate-700 transition disabled:opacity-40 shadow-sm flex flex-col items-center justify-center group"
                >
                  <span>{digit}</span>
                </button>
              ))}
            </div>

            {/* Controls */}
            <div className="flex items-center gap-2 mt-3">
              <button
                onClick={() => setIsMuted(!isMuted)}
                className={`flex-1 py-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition border ${
                  isMuted
                    ? 'bg-rose-500/20 text-rose-300 border-rose-500/30'
                    : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
                }`}
              >
                {isMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
                {isMuted ? 'Mudo' : 'Voz Ativa'}
              </button>

              {callState === 'connected' ? (
                <button
                  onClick={handleHangup}
                  className="flex-1 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition shadow-sm"
                >
                  <PhoneOff className="w-3.5 h-3.5" /> Desligar
                </button>
              ) : (
                <button
                  onClick={startSimulation}
                  className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition shadow-sm"
                >
                  <RotateCcw className="w-3.5 h-3.5" /> Reiniciar
                </button>
              )}
            </div>
          </div>

          {/* Trace Event Logs */}
          <div className="flex flex-col">
            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 flex items-center justify-between">
              <span>Trilha de Eventos (Call Trace):</span>
              <span className="text-[10px] text-slate-500 font-mono">{eventLogs.length} eventos</span>
            </div>
            <div className="flex-1 bg-slate-950 rounded-xl p-2.5 border border-slate-800 overflow-y-auto max-h-56 space-y-1.5 font-mono text-[11px]">
              {eventLogs.length === 0 ? (
                <div className="text-slate-600 text-center py-8 text-xs">Aguardando eventos...</div>
              ) : (
                eventLogs.map((log, index) => (
                  <div
                    key={index}
                    className={`p-1.5 rounded border leading-tight ${
                      log.type === 'dtmf'
                        ? 'bg-amber-500/10 border-amber-500/30 text-amber-300'
                        : log.type === 'dest'
                        ? 'bg-purple-500/10 border-purple-500/30 text-purple-300'
                        : log.type === 'warn'
                        ? 'bg-rose-500/10 border-rose-500/30 text-rose-300'
                        : 'bg-slate-900 border-slate-800 text-slate-300'
                    }`}
                  >
                    <span className="text-slate-500 text-[10px] mr-1.5">[{log.time}]</span>
                    {log.text}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-3 bg-slate-950/80 border-t border-slate-800 text-center text-slate-400 text-xs flex items-center justify-center gap-2">
          <Sparkles className="w-3.5 h-3.5 text-amber-400" />
          <span>O nó correspondente no Canvas é destacado em tempo real conforme a chamada progride</span>
        </div>
      </div>
    </div>
  );
};
