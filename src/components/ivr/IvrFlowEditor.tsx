import React, { useState, useEffect } from 'react';
import {
  Save,
  Play,
  FileCode,
  ArrowLeft,
  Check,
  Sparkles,
  Phone,
  RefreshCw,
  Plus,
  Volume2,
  Layers,
  HelpCircle,
} from 'lucide-react';
import {
  Ivr,
  IvrVisualFlow,
  IvrFlowNode,
  IvrOption,
} from '../../types/pbx';
import { IvrFlowCanvas } from './IvrFlowCanvas';
import { IvrNodePropertiesPanel } from './IvrNodePropertiesPanel';
import { IvrFlowSimulator } from './IvrFlowSimulator';
import { IvrDialplanModal } from './IvrDialplanModal';

interface IvrFlowEditorProps {
  initialIvr: Ivr;
  allIvrs: Ivr[];
  onSelectIvr: (ivr: Ivr) => void;
  onBackToList: () => void;
  onSaveIvr: (updatedIvr: Ivr) => Promise<void>;
}

export const IvrFlowEditor: React.FC<IvrFlowEditorProps> = ({
  initialIvr,
  allIvrs,
  onSelectIvr,
  onBackToList,
  onSaveIvr,
}) => {
  const [currentIvr, setCurrentIvr] = useState<Ivr>(initialIvr);
  const [flow, setFlow] = useState<IvrVisualFlow>(
    initialIvr.flow || {
      nodes: [
        {
          id: 'node-start',
          type: 'start',
          title: `Entrada da Chamada (${initialIvr.number})`,
          position: { x: 40, y: 160 },
          data: {},
        },
        {
          id: 'node-audio-welcome',
          type: 'audio',
          title: 'Mensagem de Boas-Vindas',
          position: { x: 380, y: 160 },
          data: {
            audioSource: 'tts',
            audioText: initialIvr.audioPrompt || 'Olá! Bem-vindo à nossa central telefônica.',
            allowInterrupt: true,
          },
        },
        {
          id: 'node-dtmf-menu',
          type: 'dtmf',
          title: 'Menu de Dígitos DTMF',
          position: { x: 720, y: 160 },
          data: {
            digits: initialIvr.options?.map((o) => ({ digit: o.digit, label: o.label })) || [
              { digit: '1', label: 'Suporte Técnico' },
              { digit: '9', label: 'Atendente IA MaIA' },
            ],
            timeoutSeconds: initialIvr.timeoutSeconds || 8,
            invalidRetries: initialIvr.invalidRetries || 3,
          },
        },
      ],
      connections: [
        { id: 'c1', fromNodeId: 'node-start', fromPort: 'out', toNodeId: 'node-audio-welcome' },
        { id: 'c2', fromNodeId: 'node-audio-welcome', fromPort: 'out', toNodeId: 'node-dtmf-menu' },
      ],
    }
  );

  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [activeSimulatedNodeId, setActiveSimulatedNodeId] = useState<string | null>(null);
  const [isSimulatorOpen, setIsSimulatorOpen] = useState(false);
  const [isDialplanModalOpen, setIsDialplanModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Available entities for properties panel
  const [availableAiAgents, setAvailableAiAgents] = useState<Array<{ id: string; name: string }>>([
    { id: 'agent-maia-247', name: 'MaIA — Atendimento & Triagem Inteligente 24/7' },
  ]);
  const [availableQueues, setAvailableQueues] = useState<Array<{ id: string; name: string; number?: string }>>([
    { id: 'queue-suporte-n1', name: 'Fila Suporte N1', number: '7001' },
    { id: 'queue-financeiro', name: 'Fila Financeiro & Cobrança', number: '7002' },
  ]);
  const [availableExtensions, setAvailableExtensions] = useState<Array<{ id: string; number: string; name: string }>>([
    { id: 'ext-4101', number: '4101', name: 'Carlos Silva (Operador Central)' },
    { id: 'ext-4102', number: '4102', name: 'Roberto Mendes (Suporte Técnico)' },
    { id: 'ext-4103', number: '4103', name: 'Mariana Costa (Comercial)' },
  ]);

  // Load real available agents, queues and extensions from API
  useEffect(() => {
    fetch('/api/v1/ai/agents')
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) {
          setAvailableAiAgents(data);
        }
      })
      .catch(() => {});

    fetch('/api/v1/queues')
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) {
          setAvailableQueues(data);
        }
      })
      .catch(() => {});

    fetch('/api/v1/extensions')
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) {
          setAvailableExtensions(data);
        }
      })
      .catch(() => {});
  }, []);

  // Update flow when URA changes
  useEffect(() => {
    setCurrentIvr(initialIvr);
    if (initialIvr.flow && initialIvr.flow.nodes?.length > 0) {
      setFlow(initialIvr.flow);
    }
  }, [initialIvr.id]);

  // Synchronize visual flow back to standard IVR options format
  const compileFlowToIvrOptions = (currentFlow: IvrVisualFlow): IvrOption[] => {
    const dtmfNode = currentFlow.nodes.find((n) => n.type === 'dtmf');
    if (!dtmfNode || !dtmfNode.data.digits) {
      return currentIvr.options || [];
    }

    const options: IvrOption[] = [];

    dtmfNode.data.digits.forEach((d) => {
      const conn = currentFlow.connections.find(
        (c) => c.fromNodeId === dtmfNode.id && c.fromPort === d.digit
      );

      let destinationType: IvrOption['destinationType'] = 'extension';
      let destinationTarget = '4101';

      if (conn) {
        const targetNode = currentFlow.nodes.find((n) => n.id === conn.toNodeId);
        if (targetNode) {
          if (targetNode.type === 'ai_agent') {
            destinationType = 'ai_agent';
            destinationTarget = targetNode.data.aiAgentId || 'agent-maia-247';
          } else if (targetNode.type === 'queue') {
            destinationType = 'queue';
            destinationTarget = targetNode.data.queueId || '5001';
          } else if (targetNode.type === 'extension') {
            destinationType = 'extension';
            destinationTarget = targetNode.data.extensionNumber || '4101';
          } else if (targetNode.type === 'hangup') {
            destinationType = 'hangup';
            destinationTarget = 'hangup';
          }
        }
      }

      options.push({
        digit: d.digit,
        label: d.label,
        destinationType,
        destinationTarget,
      });
    });

    return options;
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const updatedOptions = compileFlowToIvrOptions(flow);
      const welcomeAudioNode = flow.nodes.find((n) => n.type === 'audio');
      const welcomeAudio = welcomeAudioNode?.data.audioText || currentIvr.audioPrompt;

      const updatedIvr: Ivr = {
        ...currentIvr,
        audioPrompt: welcomeAudio,
        options: updatedOptions,
        flow,
      };

      await onSaveIvr(updatedIvr);
      setCurrentIvr(updatedIvr);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2500);
    } catch (err) {
      console.error('Erro ao salvar fluxo da URA:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpdateNode = (updatedNode: IvrFlowNode) => {
    const newNodes = flow.nodes.map((n) => (n.id === updatedNode.id ? updatedNode : n));
    setFlow({
      ...flow,
      nodes: newNodes,
    });
  };

  const handleDeleteNode = (nodeId: string) => {
    const newNodes = flow.nodes.filter((n) => n.id !== nodeId);
    const newConnections = flow.connections.filter(
      (c) => c.fromNodeId !== nodeId && c.toNodeId !== nodeId
    );
    setFlow({
      nodes: newNodes,
      connections: newConnections,
    });
    setSelectedNodeId(null);
  };

  const selectedNode = flow.nodes.find((n) => n.id === selectedNodeId) || null;

  return (
    <div className="flex flex-col h-[calc(100vh-115px)] bg-slate-100 rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      {/* Top Header */}
      <div className="h-14 bg-white border-b border-slate-200 px-4 flex items-center justify-between z-20">
        <div className="flex items-center gap-3">
          <button
            onClick={onBackToList}
            className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition flex items-center gap-1 text-xs font-semibold"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Lista de URAs</span>
          </button>

          <div className="h-5 w-px bg-slate-200" />

          {/* Current IVR Selector */}
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-50 border border-blue-200 text-blue-700 font-mono font-bold text-xs flex items-center justify-center shadow-xs">
              {currentIvr.number}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-bold text-sm text-slate-900 leading-tight">
                  {currentIvr.name}
                </h2>
                <span className="text-[10px] bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.2 rounded font-mono font-semibold">
                  Extensão {currentIvr.number}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          {/* Asterisk Dialplan Modal Trigger */}
          <button
            onClick={() => setIsDialplanModalOpen(true)}
            className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition border border-slate-200"
            title="Ver Dialplan Asterisk 20 compilado"
          >
            <FileCode className="w-3.5 h-3.5 text-blue-600" />
            <span className="hidden sm:inline">Ver Dialplan Asterisk</span>
          </button>

          {/* Call Simulator Trigger */}
          <button
            onClick={() => setIsSimulatorOpen(true)}
            className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-300/80 rounded-xl text-xs font-bold flex items-center gap-1.5 transition shadow-xs"
          >
            <Play className="w-3.5 h-3.5 text-emerald-600 fill-emerald-600" />
            <span>Testar URA (Simulador)</span>
          </button>

          {/* Save Button */}
          <button
            onClick={handleSave}
            disabled={isSaving}
            className={`px-4 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition shadow-sm ${
              saveSuccess
                ? 'bg-emerald-600 text-white'
                : 'bg-blue-600 hover:bg-blue-700 text-white'
            }`}
          >
            {saveSuccess ? (
              <>
                <Check className="w-3.5 h-3.5" /> Salvo com Sucesso!
              </>
            ) : isSaving ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Salvando...
              </>
            ) : (
              <>
                <Save className="w-3.5 h-3.5" /> Salvar Fluxo
              </>
            )}
          </button>
        </div>
      </div>

      {/* Center Layout: Canvas + Properties Panel */}
      <div className="flex-1 flex overflow-hidden relative">
        <IvrFlowCanvas
          flow={flow}
          onChangeFlow={setFlow}
          selectedNodeId={selectedNodeId}
          onSelectNode={setSelectedNodeId}
          activeSimulatedNodeId={activeSimulatedNodeId}
        />

        {/* Right Properties Drawer */}
        {selectedNode && (
          <IvrNodePropertiesPanel
            node={selectedNode}
            onUpdateNode={handleUpdateNode}
            onDeleteNode={handleDeleteNode}
            onClose={() => setSelectedNodeId(null)}
            availableAiAgents={availableAiAgents}
            availableQueues={availableQueues}
            availableExtensions={availableExtensions}
          />
        )}
      </div>

      {/* Call Simulator Modal */}
      {isSimulatorOpen && (
        <IvrFlowSimulator
          ivrName={currentIvr.name}
          ivrNumber={currentIvr.number}
          flow={flow}
          activeNodeId={activeSimulatedNodeId}
          onActiveNodeChange={setActiveSimulatedNodeId}
          onClose={() => {
            setIsSimulatorOpen(false);
            setActiveSimulatedNodeId(null);
          }}
        />
      )}

      {/* Asterisk Dialplan Modal */}
      {isDialplanModalOpen && (
        <IvrDialplanModal
          ivr={currentIvr}
          onClose={() => setIsDialplanModalOpen(false)}
        />
      )}
    </div>
  );
};
