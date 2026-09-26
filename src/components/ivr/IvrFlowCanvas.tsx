import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Volume2,
  Phone,
  Bot,
  Users,
  Clock,
  PhoneOff,
  Layers,
  Plus,
  Trash2,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Sparkles,
  Settings,
  HelpCircle,
  Play,
  ArrowRight,
  GripHorizontal,
} from 'lucide-react';
import {
  IvrFlowNode,
  IvrFlowNodeType,
  IvrFlowConnection,
  IvrVisualFlow,
} from '../../types/pbx';

interface IvrFlowCanvasProps {
  flow: IvrVisualFlow;
  onChangeFlow: (newFlow: IvrVisualFlow) => void;
  selectedNodeId: string | null;
  onSelectNode: (nodeId: string | null) => void;
  activeSimulatedNodeId: string | null;
}

const PALETTE_ITEMS: Array<{
  type: IvrFlowNodeType;
  label: string;
  desc: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
}> = [
  {
    type: 'audio',
    label: 'Áudio / TTS',
    desc: 'Reproduz mensagem de voz ou gravação WAV',
    icon: Volume2,
    color: 'border-blue-500/40 text-blue-600 bg-blue-50',
  },
  {
    type: 'dtmf',
    label: 'Menu DTMF',
    desc: 'Captura dígitos do teclado numérico',
    icon: Layers,
    color: 'border-amber-500/40 text-amber-600 bg-amber-50',
  },
  {
    type: 'ai_agent',
    label: 'Agente de IA (MaIA)',
    desc: 'Encaminha para assistente virtual Gemini',
    icon: Bot,
    color: 'border-purple-500/40 text-purple-600 bg-purple-50',
  },
  {
    type: 'queue',
    label: 'Fila ACD',
    desc: 'Distribui para grupo de operadores humanos',
    icon: Users,
    color: 'border-indigo-500/40 text-indigo-600 bg-indigo-50',
  },
  {
    type: 'extension',
    label: 'Ramal SIP',
    desc: 'Transfere direto para um ramal interno',
    icon: Phone,
    color: 'border-teal-500/40 text-teal-600 bg-teal-50',
  },
  {
    type: 'time_condition',
    label: 'Horário Comercial',
    desc: 'Verifica expediente e desvia fora de hora',
    icon: Clock,
    color: 'border-orange-500/40 text-orange-600 bg-orange-50',
  },
  {
    type: 'hangup',
    label: 'Encerrar Ligação',
    desc: 'Finaliza a chamada telefônica',
    icon: PhoneOff,
    color: 'border-rose-500/40 text-rose-600 bg-rose-50',
  },
];

export const IvrFlowCanvas: React.FC<IvrFlowCanvasProps> = ({
  flow,
  onChangeFlow,
  selectedNodeId,
  onSelectNode,
  activeSimulatedNodeId,
}) => {
  const canvasRef = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState(1);
  const [isConnecting, setIsConnecting] = useState<{
    fromNodeId: string;
    fromPort: string;
  } | null>(null);
  const [connectingMousePos, setConnectingMousePos] = useState<{ x: number; y: number } | null>(null);

  // Dragging existing node on canvas
  const [draggingNodeId, setDraggingNodeId] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  // Handle dropping a new node from palette
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const nodeType = e.dataTransfer.getData('application/ivr-node-type') as IvrFlowNodeType;
    if (!nodeType || !canvasRef.current) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const x = Math.round((e.clientX - rect.left + canvasRef.current.scrollLeft) / zoom);
    const y = Math.round((e.clientY - rect.top + canvasRef.current.scrollTop) / zoom);

    addNodeAtPosition(nodeType, x, y);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  };

  const addNodeAtPosition = (type: IvrFlowNodeType, x: number, y: number) => {
    const newId = `node-${type}-${Date.now()}`;
    let title = 'Novo Bloco';
    const data: IvrFlowNode['data'] = {};

    if (type === 'audio') {
      title = 'Mensagem de Áudio';
      data.audioSource = 'tts';
      data.audioText = 'Obrigado por ligar para nossa central. Por favor aguarde.';
      data.allowInterrupt = true;
    } else if (type === 'dtmf') {
      title = 'Menu DTMF';
      data.digits = [
        { digit: '1', label: 'Opção 1' },
        { digit: '2', label: 'Opção 2' },
      ];
      data.timeoutSeconds = 8;
      data.invalidRetries = 3;
    } else if (type === 'ai_agent') {
      title = 'Agente IA (MaIA)';
      data.aiAgentId = 'agent-maia-247';
      data.aiAgentName = 'MaIA — Atendimento & Triagem Inteligente';
    } else if (type === 'queue') {
      title = 'Fila de Atendimento';
      data.queueId = 'queue-suporte-n1';
      data.queueName = 'Fila Suporte N1';
      data.queueStrategy = 'leastrecent';
    } else if (type === 'extension') {
      title = 'Ramal SIP';
      data.extensionNumber = '4101';
      data.extensionName = 'Carlos Silva (Operador Central)';
    } else if (type === 'time_condition') {
      title = 'Horário Comercial';
      data.timeCondition = {
        openTime: '08:00',
        closeTime: '18:00',
        daysOfWeek: [1, 2, 3, 4, 5],
      };
    } else if (type === 'hangup') {
      title = 'Encerrar Chamada';
      data.hangupCause = 'normal';
    }

    const newNode: IvrFlowNode = {
      id: newId,
      type,
      title,
      position: { x: Math.max(20, x), y: Math.max(20, y) },
      data,
    };

    onChangeFlow({
      ...flow,
      nodes: [...flow.nodes, newNode],
    });
    onSelectNode(newId);
  };

  // Node Dragging inside canvas
  const handleNodeMouseDown = (e: React.MouseEvent, nodeId: string) => {
    e.stopPropagation();
    onSelectNode(nodeId);

    const node = flow.nodes.find((n) => n.id === nodeId);
    if (!node || !canvasRef.current) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const mouseX = (e.clientX - rect.left + canvasRef.current.scrollLeft) / zoom;
    const mouseY = (e.clientY - rect.top + canvasRef.current.scrollTop) / zoom;

    setDraggingNodeId(nodeId);
    setDragOffset({
      x: mouseX - node.position.x,
      y: mouseY - node.position.y,
    });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!canvasRef.current) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const mouseX = (e.clientX - rect.left + canvasRef.current.scrollLeft) / zoom;
    const mouseY = (e.clientY - rect.top + canvasRef.current.scrollTop) / zoom;

    // Update connecting line
    if (isConnecting) {
      setConnectingMousePos({ x: mouseX, y: mouseY });
    }

    // Move dragged node
    if (draggingNodeId) {
      const updatedNodes = flow.nodes.map((node) => {
        if (node.id === draggingNodeId) {
          return {
            ...node,
            position: {
              x: Math.max(10, Math.round(mouseX - dragOffset.x)),
              y: Math.max(10, Math.round(mouseY - dragOffset.y)),
            },
          };
        }
        return node;
      });

      onChangeFlow({
        ...flow,
        nodes: updatedNodes,
      });
    }
  };

  const handleMouseUp = () => {
    setDraggingNodeId(null);
    if (isConnecting) {
      setIsConnecting(null);
      setConnectingMousePos(null);
    }
  };

  // Connect port start
  const handleStartConnection = (e: React.MouseEvent, fromNodeId: string, fromPort: string) => {
    e.stopPropagation();
    setIsConnecting({ fromNodeId, fromPort });
    if (canvasRef.current) {
      const rect = canvasRef.current.getBoundingClientRect();
      setConnectingMousePos({
        x: (e.clientX - rect.left + canvasRef.current.scrollLeft) / zoom,
        y: (e.clientY - rect.top + canvasRef.current.scrollTop) / zoom,
      });
    }
  };

  // Connect port end (drop on target node)
  const handleEndConnection = (e: React.MouseEvent, toNodeId: string) => {
    e.stopPropagation();
    if (!isConnecting) return;

    if (isConnecting.fromNodeId === toNodeId) {
      setIsConnecting(null);
      setConnectingMousePos(null);
      return;
    }

    // Remove any existing connection from this exact same port
    const connections = flow.connections || [];
    const filteredConnections = connections.filter(
      (c) => !(c.fromNodeId === isConnecting.fromNodeId && c.fromPort === isConnecting.fromPort)
    );

    const newConnection: IvrFlowConnection = {
      id: `conn-${Date.now()}-${(connections.length + 1).toString().padStart(4, '0')}`,
      fromNodeId: isConnecting.fromNodeId,
      fromPort: isConnecting.fromPort,
      toNodeId,
    };

    onChangeFlow({
      ...flow,
      connections: [...filteredConnections, newConnection],
    });

    setIsConnecting(null);
    setConnectingMousePos(null);
  };

  // Delete connection
  const handleDeleteConnection = (connId: string) => {
    onChangeFlow({
      ...flow,
      connections: flow.connections.filter((c) => c.id !== connId),
    });
  };

  // Auto layout
  const handleAutoLayout = () => {
    const colWidth = 320;
    const rowHeight = 110;

    // Arrange start first
    const startNode = flow.nodes.find((n) => n.type === 'start') || flow.nodes[0];
    const visited = new Set<string>();
    const positions: Record<string, { x: number; y: number }> = {};

    let currentX = 40;
    let currentY = 140;

    flow.nodes.forEach((n, idx) => {
      if (n.type === 'start') {
        positions[n.id] = { x: 40, y: 180 };
      } else if (n.type === 'time_condition') {
        positions[n.id] = { x: 300, y: 180 };
      } else if (n.type === 'audio') {
        positions[n.id] = { x: 600, y: idx % 2 === 0 ? 120 : 360 };
      } else if (n.type === 'dtmf') {
        positions[n.id] = { x: 920, y: 120 };
      } else if (['ai_agent', 'queue', 'extension'].includes(n.type)) {
        positions[n.id] = { x: 1260, y: 30 + (idx - 3) * 100 };
      } else if (n.type === 'hangup') {
        positions[n.id] = { x: 920, y: 360 };
      } else {
        positions[n.id] = { x: 300 + idx * 80, y: 100 + idx * 80 };
      }
    });

    const updatedNodes = flow.nodes.map((n) => ({
      ...n,
      position: positions[n.id] || n.position,
    }));

    onChangeFlow({
      ...flow,
      nodes: updatedNodes,
    });
  };

  // Helper to calculate connector coordinates
  const getNodeConnectorCoords = (
    nodeId: string,
    portId: string,
    isInput: boolean = false
  ): { x: number; y: number } => {
    const node = flow.nodes.find((n) => n.id === nodeId);
    if (!node) return { x: 0, y: 0 };

    const nodeWidth = 240;

    if (isInput) {
      return {
        x: node.position.x,
        y: node.position.y + 40,
      };
    }

    // Output port
    if (node.type === 'dtmf' && node.data.digits) {
      const digitIndex = node.data.digits.findIndex((d) => d.digit === portId);
      if (digitIndex !== -1) {
        return {
          x: node.position.x + nodeWidth,
          y: node.position.y + 60 + digitIndex * 26,
        };
      }
    }

    if (node.type === 'time_condition') {
      if (portId === 'open') {
        return { x: node.position.x + nodeWidth, y: node.position.y + 35 };
      }
      if (portId === 'closed') {
        return { x: node.position.x + nodeWidth, y: node.position.y + 70 };
      }
    }

    // Default right side center
    return {
      x: node.position.x + nodeWidth,
      y: node.position.y + 40,
    };
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-100 overflow-hidden relative select-none">
      {/* Canvas Top Action Bar */}
      <div className="h-12 border-b border-slate-200 bg-white px-4 flex items-center justify-between text-xs shadow-xs z-10">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-slate-700 font-semibold">
            <Layers className="w-4 h-4 text-blue-600" />
            <span>Fluxo Visual da URA</span>
            <span className="text-[10px] font-mono bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full border border-slate-200">
              {flow.nodes?.length || 0} nós • {flow.connections?.length || 0} conexões
            </span>
          </div>

          <div className="h-4 w-px bg-slate-200" />

          {/* Quick instructions */}
          <div className="hidden md:flex items-center gap-1.5 text-[11px] text-slate-500">
            <span className="w-2 h-2 rounded-full bg-blue-500" />
            Arraste os blocos da barra inferior ou conecte os pontos para desenhar o roteamento
          </div>
        </div>

        {/* Zoom & Canvas controls */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={handleAutoLayout}
            className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium rounded-lg transition flex items-center gap-1 text-[11px]"
            title="Auto-organizar nós em colunas lógicas"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-500" /> Auto-Alinhar
          </button>

          <div className="h-4 w-px bg-slate-200" />

          <button
            onClick={() => setZoom((z) => Math.max(0.6, z - 0.1))}
            className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition"
            title="Diminuir Zoom"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          <span className="font-mono text-[11px] text-slate-600 w-10 text-center font-bold">
            {Math.round(zoom * 100)}%
          </span>
          <button
            onClick={() => setZoom((z) => Math.min(1.4, z + 0.1))}
            className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition"
            title="Aumentar Zoom"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setZoom(1)}
            className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition"
            title="Redefinir Zoom 100%"
          >
            <Maximize2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Main interactive area with Canvas */}
      <div
        ref={canvasRef}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onClick={() => onSelectNode(null)}
        className="flex-1 overflow-auto relative cursor-default"
        style={{
          backgroundImage:
            'radial-gradient(circle, rgba(148, 163, 184, 0.35) 1px, transparent 1px)',
          backgroundSize: `${24 * zoom}px ${24 * zoom}px`,
        }}
      >
        {/* Scalable Container */}
        <div
          className="relative min-w-[2400px] min-h-[1600px] origin-top-left"
          style={{ transform: `scale(${zoom})` }}
        >
          {/* SVG Layer for Bezier Connections */}
          <svg className="absolute inset-0 w-full h-full pointer-events-none z-0">
            <defs>
              <marker
                id="arrowhead-blue"
                markerWidth="8"
                markerHeight="6"
                refX="7"
                refY="3"
                orient="auto"
              >
                <polygon points="0 0, 8 3, 0 6" fill="#3b82f6" />
              </marker>
              <marker
                id="arrowhead-purple"
                markerWidth="8"
                markerHeight="6"
                refX="7"
                refY="3"
                orient="auto"
              >
                <polygon points="0 0, 8 3, 0 6" fill="#a855f7" />
              </marker>
              <marker
                id="arrowhead-emerald"
                markerWidth="8"
                markerHeight="6"
                refX="7"
                refY="3"
                orient="auto"
              >
                <polygon points="0 0, 8 3, 0 6" fill="#10b981" />
              </marker>
              <marker
                id="arrowhead-amber"
                markerWidth="8"
                markerHeight="6"
                refX="7"
                refY="3"
                orient="auto"
              >
                <polygon points="0 0, 8 3, 0 6" fill="#f59e0b" />
              </marker>
              <marker
                id="arrowhead-rose"
                markerWidth="8"
                markerHeight="6"
                refX="7"
                refY="3"
                orient="auto"
              >
                <polygon points="0 0, 8 3, 0 6" fill="#f43f5e" />
              </marker>
            </defs>

            {/* Existing Connections */}
            {flow.connections.map((conn) => {
              const startCoords = getNodeConnectorCoords(conn.fromNodeId, conn.fromPort, false);
              const endCoords = getNodeConnectorCoords(conn.toNodeId, 'in', true);

              // Control points for smooth bezier curve
              const dx = Math.max(60, Math.abs(endCoords.x - startCoords.x) * 0.5);
              const pathD = `M ${startCoords.x} ${startCoords.y} C ${startCoords.x + dx} ${startCoords.y}, ${
                endCoords.x - dx
              } ${endCoords.y}, ${endCoords.x} ${endCoords.y}`;

              const toNode = flow.nodes.find((n) => n.id === conn.toNodeId);
              let strokeColor = '#3b82f6';
              let markerId = 'arrowhead-blue';

              if (toNode?.type === 'ai_agent') {
                strokeColor = '#a855f7';
                markerId = 'arrowhead-purple';
              } else if (toNode?.type === 'queue') {
                strokeColor = '#6366f1';
                markerId = 'arrowhead-purple';
              } else if (toNode?.type === 'extension') {
                strokeColor = '#0d9488';
                markerId = 'arrowhead-emerald';
              } else if (toNode?.type === 'hangup') {
                strokeColor = '#f43f5e';
                markerId = 'arrowhead-rose';
              }

              const midX = (startCoords.x + endCoords.x) / 2;
              const midY = (startCoords.y + endCoords.y) / 2;

              return (
                <g key={conn.id} className="group pointer-events-auto cursor-pointer">
                  {/* Invisible thicker hit-path for easy hover and click */}
                  <path
                    d={pathD}
                    fill="none"
                    stroke="transparent"
                    strokeWidth="16"
                    onClick={() => handleDeleteConnection(conn.id)}
                  />
                  {/* Visible Cable */}
                  <path
                    d={pathD}
                    fill="none"
                    stroke={strokeColor}
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    markerEnd={`url(#${markerId})`}
                    className="transition group-hover:stroke-rose-500 group-hover:stroke-[3.5]"
                  />
                  {/* Delete button indicator on hover */}
                  <g
                    transform={`translate(${midX - 10}, ${midY - 10})`}
                    onClick={() => handleDeleteConnection(conn.id)}
                    className="opacity-0 group-hover:opacity-100 transition cursor-pointer"
                  >
                    <circle r="10" cx="10" cy="10" fill="#f43f5e" />
                    <text
                      x="10"
                      y="14"
                      textAnchor="middle"
                      fill="#ffffff"
                      fontSize="11"
                      fontWeight="bold"
                    >
                      ×
                    </text>
                  </g>
                </g>
              );
            })}

            {/* In-progress connecting line while dragging */}
            {isConnecting && connectingMousePos && (
              <path
                d={`M ${
                  getNodeConnectorCoords(isConnecting.fromNodeId, isConnecting.fromPort, false).x
                } ${
                  getNodeConnectorCoords(isConnecting.fromNodeId, isConnecting.fromPort, false).y
                } Q ${connectingMousePos.x - 40} ${connectingMousePos.y}, ${
                  connectingMousePos.x
                } ${connectingMousePos.y}`}
                fill="none"
                stroke="#3b82f6"
                strokeWidth="2.5"
                strokeDasharray="5,5"
                className="animate-pulse"
              />
            )}
          </svg>

          {/* Render Flow Nodes */}
          {flow.nodes.map((node) => {
            const isSelected = selectedNodeId === node.id;
            const isSimulatedActive = activeSimulatedNodeId === node.id;

            return (
              <div
                key={node.id}
                onMouseDown={(e) => handleNodeMouseDown(e, node.id)}
                onClick={(e) => {
                  e.stopPropagation();
                  onSelectNode(node.id);
                }}
                style={{
                  transform: `translate(${node.position.x}px, ${node.position.y}px)`,
                  width: '240px',
                }}
                className={`absolute rounded-2xl bg-white border transition-shadow duration-150 z-10 group select-none ${
                  isSimulatedActive
                    ? 'ring-4 ring-emerald-500 border-emerald-500 shadow-[0_0_30px_rgba(16,185,129,0.5)] animate-pulse'
                    : isSelected
                    ? 'ring-2 ring-blue-600 border-blue-600 shadow-lg'
                    : 'border-slate-200/90 shadow-sm hover:shadow-md'
                }`}
              >
                {/* Input port handle (Left) */}
                {node.type !== 'start' && (
                  <div
                    onClick={(e) => handleEndConnection(e, node.id)}
                    className="absolute -left-2.5 top-9 w-5 h-5 rounded-full bg-slate-800 border-2 border-white shadow-xs flex items-center justify-center cursor-pointer hover:scale-125 transition hover:bg-blue-600 z-20"
                    title="Solte a conexão aqui para ligar a este bloco"
                  >
                    <div className="w-1.5 h-1.5 rounded-full bg-white" />
                  </div>
                )}

                {/* Node Header */}
                <div
                  className={`p-3 rounded-t-2xl flex items-center justify-between border-b ${
                    node.type === 'start'
                      ? 'bg-emerald-50/80 border-emerald-200/60 text-emerald-800'
                      : node.type === 'audio'
                      ? 'bg-blue-50/80 border-blue-200/60 text-blue-800'
                      : node.type === 'dtmf'
                      ? 'bg-amber-50/80 border-amber-200/60 text-amber-800'
                      : node.type === 'ai_agent'
                      ? 'bg-purple-50/80 border-purple-200/60 text-purple-800'
                      : node.type === 'queue'
                      ? 'bg-indigo-50/80 border-indigo-200/60 text-indigo-800'
                      : node.type === 'extension'
                      ? 'bg-teal-50/80 border-teal-200/60 text-teal-800'
                      : node.type === 'time_condition'
                      ? 'bg-orange-50/80 border-orange-200/60 text-orange-800'
                      : 'bg-rose-50/80 border-rose-200/60 text-rose-800'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    {node.type === 'start' && <Play className="w-4 h-4 text-emerald-600" />}
                    {node.type === 'audio' && <Volume2 className="w-4 h-4 text-blue-600" />}
                    {node.type === 'dtmf' && (
                      <span className="font-mono text-xs font-black text-amber-600">#123</span>
                    )}
                    {node.type === 'ai_agent' && <Bot className="w-4 h-4 text-purple-600" />}
                    {node.type === 'queue' && <Users className="w-4 h-4 text-indigo-600" />}
                    {node.type === 'extension' && <Phone className="w-4 h-4 text-teal-600" />}
                    {node.type === 'time_condition' && <Clock className="w-4 h-4 text-orange-600" />}
                    {node.type === 'hangup' && <PhoneOff className="w-4 h-4 text-rose-600" />}

                    <span className="font-bold text-xs truncate max-w-[140px] text-slate-900">
                      {node.title}
                    </span>
                  </div>

                  <div className="flex items-center gap-1 text-slate-400">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectNode(node.id);
                      }}
                      className="p-1 hover:text-blue-600 rounded transition"
                      title="Configurar bloco"
                    >
                      <Settings className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Node Body Details */}
                <div className="p-3 text-[11px] text-slate-600 space-y-2">
                  {node.type === 'start' && (
                    <div className="text-slate-500 font-medium">
                      Ponto de entrada: Chamada atendida pela URA
                    </div>
                  )}

                  {node.type === 'audio' && (
                    <div className="line-clamp-2 italic text-slate-700 bg-slate-50 p-1.5 rounded-lg border border-slate-100">
                      "{node.data.audioText || 'Áudio padrão de atendimento'}"
                    </div>
                  )}

                  {node.type === 'dtmf' && (
                    <div className="space-y-1">
                      <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
                        Opções e Teclas de Saída:
                      </div>
                      {(node.data.digits || []).map((d) => (
                        <div
                          key={d.digit}
                          className="flex items-center justify-between py-0.5 relative pr-4"
                        >
                          <span className="flex items-center gap-1.5 font-medium text-slate-700">
                            <strong className="w-4 h-4 rounded bg-amber-100 text-amber-800 text-[10px] flex items-center justify-center font-mono font-bold">
                              {d.digit}
                            </strong>
                            <span className="truncate max-w-[120px]">{d.label}</span>
                          </span>

                          {/* Output Port for this specific digit */}
                          <div
                            onMouseDown={(e) => handleStartConnection(e, node.id, d.digit)}
                            className="w-3.5 h-3.5 rounded-full bg-amber-500 border-2 border-white shadow-xs cursor-pointer hover:scale-125 transition absolute -right-4.5"
                            title={`Puxar conexão para quando digitar ${d.digit}`}
                          />
                        </div>
                      ))}

                      <div className="text-[10px] text-slate-400 pt-1">
                        Timeout: {node.data.timeoutSeconds || 8}s • Tentativas: {node.data.invalidRetries || 3}x
                      </div>
                    </div>
                  )}

                  {node.type === 'time_condition' && (
                    <div className="space-y-1.5">
                      <div className="text-[10px] text-slate-500">
                        Horário:{' '}
                        <strong className="text-slate-800 font-mono">
                          {node.data.timeCondition?.openTime || '08:00'} -{' '}
                          {node.data.timeCondition?.closeTime || '18:00'}
                        </strong>
                      </div>
                      <div className="flex items-center justify-between py-0.5 relative pr-4">
                        <span className="text-emerald-700 font-bold text-[10px]">Aberto (Expediente)</span>
                        <div
                          onMouseDown={(e) => handleStartConnection(e, node.id, 'open')}
                          className="w-3.5 h-3.5 rounded-full bg-emerald-500 border-2 border-white shadow-xs cursor-pointer hover:scale-125 transition absolute -right-4.5"
                          title="Saída para dentro do expediente"
                        />
                      </div>
                      <div className="flex items-center justify-between py-0.5 relative pr-4">
                        <span className="text-rose-700 font-bold text-[10px]">Fechado (Fora Horário)</span>
                        <div
                          onMouseDown={(e) => handleStartConnection(e, node.id, 'closed')}
                          className="w-3.5 h-3.5 rounded-full bg-rose-500 border-2 border-white shadow-xs cursor-pointer hover:scale-125 transition absolute -right-4.5"
                          title="Saída para fora do expediente"
                        />
                      </div>
                    </div>
                  )}

                  {node.type === 'ai_agent' && (
                    <div className="space-y-1">
                      <span className="font-bold text-purple-900 block truncate">
                        {node.data.aiAgentName || 'MaIA (Google Gemini)'}
                      </span>
                      <span className="text-[10px] text-purple-600 bg-purple-50 px-1.5 py-0.5 rounded font-mono block">
                        ARI / AudioSocket 16kHz
                      </span>
                    </div>
                  )}

                  {node.type === 'queue' && (
                    <div className="space-y-1">
                      <span className="font-bold text-indigo-900 block truncate">
                        {node.data.queueName || 'Fila ACD'}
                      </span>
                      <span className="text-[10px] text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded font-mono block">
                        Estratégia: {node.data.queueStrategy || 'leastrecent'}
                      </span>
                    </div>
                  )}

                  {node.type === 'extension' && (
                    <div className="space-y-1">
                      <span className="font-bold text-teal-900 block truncate">
                        {node.data.extensionName || 'Ramal SIP'}
                      </span>
                      <span className="text-[10px] text-teal-600 font-mono">
                        PJSIP/{node.data.extensionNumber || '4101'}
                      </span>
                    </div>
                  )}

                  {node.type === 'hangup' && (
                    <div className="text-rose-700 font-medium">
                      Executa Hangup() no Asterisk
                    </div>
                  )}
                </div>

                {/* Default Single Output Port on right side for non-DTMF/non-TimeCondition nodes */}
                {node.type !== 'dtmf' && node.type !== 'time_condition' && node.type !== 'hangup' && (
                  <div
                    onMouseDown={(e) => handleStartConnection(e, node.id, 'out')}
                    className="absolute -right-2.5 top-9 w-5 h-5 rounded-full bg-blue-600 border-2 border-white shadow-xs flex items-center justify-center cursor-pointer hover:scale-125 transition z-20"
                    title="Arraste para conectar ao próximo bloco"
                  >
                    <ArrowRight className="w-2.5 h-2.5 text-white" />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Draggable Blocks Palette at the Bottom */}
      <div className="border-t border-slate-200 bg-white p-3 z-10 shadow-lg">
        <div className="max-w-6xl mx-auto flex items-center gap-3 overflow-x-auto pb-1">
          <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider shrink-0 flex items-center gap-1">
            <GripHorizontal className="w-4 h-4" />
            <span>Blocos:</span>
          </div>

          <div className="flex items-center gap-2">
            {PALETTE_ITEMS.map((item) => {
              const IconComp = item.icon;
              return (
                <div
                  key={item.type}
                  draggable="true"
                  onDragStart={(e) => {
                    e.dataTransfer.setData('application/ivr-node-type', item.type);
                    e.dataTransfer.effectAllowed = 'copy';
                  }}
                  onClick={() => {
                    if (canvasRef.current) {
                      const scrollLeft = canvasRef.current.scrollLeft || 0;
                      const scrollTop = canvasRef.current.scrollTop || 0;
                      const offsetIdx = ((flow.nodes?.length || 0) % 5) * 20;
                      addNodeAtPosition(
                        item.type,
                        scrollLeft + 350 + offsetIdx,
                        scrollTop + 200 + offsetIdx
                      );
                    }
                  }}
                  className={`px-3 py-2 rounded-xl border flex items-center gap-2 cursor-grab active:cursor-grabbing hover:shadow-md transition text-xs font-semibold shrink-0 bg-white hover:bg-slate-50 ${item.color}`}
                  title={`${item.desc} (Arraste para o canvas ou clique para adicionar)`}
                >
                  <IconComp className="w-4 h-4" />
                  <span>{item.label}</span>
                  <Plus className="w-3 h-3 text-slate-400 hover:text-slate-600 ml-1" />
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
