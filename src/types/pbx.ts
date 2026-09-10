export interface Tenant {
  id: string;
  name: string;
  cnpj: string;
  plan: string;
  maxExtensions: number;
  maxTrunks: number;
  aiCreditsUsd: number;
  createdAt: string;
}

export interface User {
  id: string;
  tenantId: string;
  name: string;
  email: string;
  role: 'super_admin' | 'admin' | 'supervisor' | 'operador' | 'usuario' | 'auditor';
  extension?: string;
  isActive: boolean;
  lastLogin: string;
}

export interface Extension {
  id: string;
  tenantId: string;
  number: string;
  name: string;
  sipSecret: string;
  context: string;
  callerId: string;
  codecs: string[];
  nat: boolean;
  webrtc: boolean;
  recording: 'always' | 'on_demand' | 'never';
  voicemail: boolean;
  dnd: boolean;
  status: 'online' | 'offline' | 'busy' | 'ringing';
  ipAddress?: string;
  allowAiTransfer: boolean;
}

export interface Trunk {
  id: string;
  tenantId: string;
  name: string;
  providerName: string;
  host: string;
  port: number;
  username: string;
  secretMasked: string;
  transport: 'UDP' | 'TCP' | 'TLS';
  callerId: string;
  codecs: string[];
  context: string;
  register: boolean;
  status: 'registered' | 'unregistered' | 'error';
  channelsMax: number;
  channelsInUse: number;
}

export interface Route {
  id: string;
  tenantId: string;
  name: string;
  type: 'outbound' | 'inbound';
  pattern: string;
  prefixRemove?: string;
  trunkId?: string;
  destinationType: 'trunk' | 'extension' | 'queue' | 'ivr' | 'ai_agent';
  destinationId: string;
  priority: number;
  timeSchedule?: string;
  fallbackType?: 'human' | 'ivr' | 'voicemail' | 'queue';
  fallbackTarget?: string;
}

export interface RingGroup {
  id: string;
  tenantId: string;
  name: string;
  number: string;
  strategy: 'ringall' | 'roundrobin' | 'linear' | 'random' | 'fewestcalls';
  timeoutSeconds: number;
  members: string[];
  failoverDestination: string;
}

export interface Queue {
  id: string;
  tenantId: string;
  name: string;
  number: string;
  strategy: 'ringall' | 'roundrobin' | 'leastrecent' | 'fewestcalls' | 'random';
  timeoutSeconds: number;
  wrapUpTimeSeconds: number;
  mohSound: string;
  slaTargetSeconds: number;
  members: string[];
  callsWaiting: number;
  avgWaitTimeSeconds: number;
  abandonedToday: number;
  answeredToday: number;
}

export interface IvrOption {
  digit: string;
  label: string;
  destinationType: 'extension' | 'queue' | 'ai_agent' | 'ivr' | 'hangup';
  destinationTarget: string;
}

export interface Ivr {
  id: string;
  tenantId: string;
  name: string;
  number: string;
  audioPrompt: string;
  timeoutSeconds: number;
  invalidRetries: number;
  options: IvrOption[];
}

export interface AiProvider {
  id: string;
  tenantId: string;
  name: string;
  providerType: 'gemini_api' | 'gemini_live' | 'vertex_ai' | '9router' | 'custom';
  baseUrl?: string;
  apiKeyMasked: string;
  googleProjectId?: string;
  googleLocation?: string;
  defaultModel: string;
  defaultVoice: string;
  defaultTemperature: number;
  isActive: boolean;
  updatedAt: string;
}

export interface AiTool {
  id: string;
  tenantId: string;
  name: string;
  description: string;
  endpoint: string;
  method: 'GET' | 'POST';
  requiresConfirmation: boolean;
  schemaJson: Record<string, unknown>;
  mockResponse: Record<string, unknown>;
}

export interface AiKnowledgeSource {
  id: string;
  tenantId: string;
  title: string;
  category: string;
  content: string;
  updatedAt: string;
}

export interface AiAgent {
  id: string;
  tenantId: string;
  name: string;
  description: string;
  providerId: string;
  model: string;
  voice: string;
  language: string;
  systemInstruction: string;
  initialGreeting: string;
  temperature: number;
  tools: string[];
  knowledgeSources: string[];
  allowBargeIn: boolean;
  silenceTimeoutSeconds: number;
  maxSessionMinutes: number;
  transferExtension: string;
  fallbackAction: 'transfer_human' | 'transfer_queue' | 'hangup';
  isActive: boolean;
}

export interface AiSession {
  id: string;
  tenantId: string;
  agentId: string;
  agentName: string;
  callId: string;
  caller: string;
  channel: string;
  sessionType: 'voice_live' | 'audio_stream' | 'chat_turn';
  startedAt: string;
  endedAt?: string;
  durationSeconds: number;
  status: 'active' | 'completed' | 'transferred' | 'fallback';
  transcript: Array<{ role: 'user' | 'model' | 'system' | 'tool'; text: string; timestamp: string }>;
  tokensInput: number;
  tokensOutput: number;
  audioSeconds: number;
  latencyAverageMs: number;
  transferReason?: string;
  costEstimateBrl: number;
}

export interface CdrRecord {
  id: string;
  tenantId: string;
  uniqueId: string;
  caller: string;
  callee: string;
  direction: 'inbound' | 'outbound' | 'internal';
  startTime: string;
  answerTime?: string;
  endTime: string;
  duration: number;
  billsec: number;
  disposition: 'ANSWERED' | 'NO ANSWER' | 'BUSY' | 'FAILED';
  recordingUrl?: string;
  trunkName?: string;
  extension?: string;
  aiAgentId?: string;
  aiSessionId?: string;
  isAiHandled?: boolean;
  isTransferred?: boolean;
  transferredTo?: string;
  ivrPath?: string;
  sentiment?: 'positive' | 'neutral' | 'negative';
  transcription?: string;
  summary?: string;
  costBrl: number;
}

export interface AsteriskChannel {
  id: string;
  name: string;
  state: 'Ring' | 'Up' | 'Ringing' | 'Dialing';
  callerNumber: string;
  connectedLine: string;
  context: string;
  exten: string;
  application: string;
  durationSeconds: number;
  aiBridgeActive: boolean;
}

export interface DashboardMetrics {
  callsToday: number;
  callsActive: number;
  callsAnswered: number;
  callsMissed: number;
  avgCallDurationSeconds: number;
  extensionsOnline: number;
  extensionsTotal: number;
  trunksOnline: number;
  trunksTotal: number;
  aiAgentsActive: number;
  aiSessionsCount: number;
  aiLatencyAvgMs: number;
  humanTransferRatePercent: number;
  aiTokensUsedToday: number;
  costEstimateTodayBrl: number;
  hourlyCallDistribution: Array<{ hour: string; total: number; ai: number }>;
}

export interface AuditLog {
  id: string;
  tenantId: string;
  userId: string;
  userName: string;
  action: string;
  resource: string;
  ip: string;
  timestamp: string;
  details: string;
}

export interface WebhookConfig {
  id: string;
  tenantId: string;
  name: string;
  url: string;
  events: string[];
  secretToken: string;
  isActive: boolean;
  lastTriggered?: string;
}

export interface HealthStatus {
  status: string;
  timestamp: string;
  platform: string;
  version: string;
  components: {
    asterisk: { status: string; version: string; uptime: string };
    postgresql: { status: string; latencyMs: number; pool: string };
    redis: { status: string; memoryUsedMb: number };
    ari: { status: string; port: number; apps: string[] };
    pjsip: { status: string; endpointsOnline: number; trunksRegistered: number };
    audioSocket: { status: string; activeStreams: number; bufferLatencyMs: number };
    aiGateway: { status: string; activeSessions: number };
    geminiApi: {
      status: string;
      model: string;
      liveVoiceModel: string;
      defaultVoice: string;
    };
  };
}
