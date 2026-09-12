export interface TenantAntiFraud {
  maxConcurrentCalls: number;
  maxInternationalPerDay: number;
  blockInternational: boolean;
  blockExpensiveDestinations: boolean;
  maxCallDurationMinutes: number;
  alertEmail: string;
  autoSuspendOnAnomaly: boolean;
}

export interface Tenant {
  id: string;
  name: string;
  cnpj: string;
  plan: string;
  maxExtensions: number;
  maxTrunks: number;
  aiCreditsUsd: number;
  createdAt: string;
  antiFraud?: TenantAntiFraud;
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
  videoEnabled?: boolean;
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
  destinationType: 'trunk' | 'extension' | 'queue' | 'ivr' | 'ai_agent' | 'ring_group';
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

export type IvrFlowNodeType =
  | 'start'
  | 'audio'
  | 'dtmf'
  | 'ai_agent'
  | 'queue'
  | 'extension'
  | 'time_condition'
  | 'hangup';

export interface IvrFlowNode {
  id: string;
  type: IvrFlowNodeType;
  title: string;
  position: { x: number; y: number };
  data: {
    // Audio / TTS
    audioSource?: 'tts' | 'file' | 'library';
    audioText?: string;
    audioFile?: string;
    voiceName?: string;
    allowInterrupt?: boolean; // Barge-in

    // DTMF Input
    digits?: Array<{ digit: string; label: string }>;
    timeoutSeconds?: number;
    invalidRetries?: number;
    repeatAudioOnInvalid?: boolean;

    // AI Agent Destination
    aiAgentId?: string;
    aiAgentName?: string;
    aiPromptContext?: string;
    aiVoiceModel?: string;

    // Queue Destination
    queueId?: string;
    queueName?: string;
    queueStrategy?: string;

    // Extension Destination
    extensionNumber?: string;
    extensionName?: string;

    // Time Condition
    timeCondition?: {
      openTime: string;
      closeTime: string;
      daysOfWeek: number[]; // 1 = Seg, 5 = Sex
    };

    // Hangup
    hangupCause?: 'normal' | 'busy' | 'rejected' | 'timeout';
    farewellAudio?: string;
  };
}

export interface IvrFlowConnection {
  id: string;
  fromNodeId: string;
  fromPort: string; // 'out' | '1' | '2' | '3' | '9' | '0' | 'timeout' | 'invalid' | 'open' | 'closed'
  toNodeId: string;
}

export interface IvrVisualFlow {
  nodes: IvrFlowNode[];
  connections: IvrFlowConnection[];
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
  flow?: IvrVisualFlow;
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
  fileName?: string;
  fileType?: string;
  fileSizeBytes?: number;
}

export interface AiAgent {
  id: string;
  tenantId: string;
  name: string;
  description: string;
  providerId: string;
  model: string;
  voice: string;
  voiceGender?: 'male' | 'female';
  avatarType?: 'female_ai' | 'male_tech' | 'female_sales' | 'male_attendant' | 'female_billing' | string;
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
  
  // VoIP QoS Metrics (Quality of Service)
  mos?: number; // Mean Opinion Score (1.0 to 4.5)
  jitter?: number; // In milliseconds
  packetLoss?: number; // Percentage (0.0 to 100.0)
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

// ---------------------------------------------------------------------------
// Redes, VPN & Segurança (WireGuard, ZeroTier, Fail2ban)
// ---------------------------------------------------------------------------

export interface WireGuardPeer {
  id: string;
  name: string;
  publicKey: string;
  presharedKey?: string;
  allowedIps: string;
  endpoint?: string;
  latestHandshake: string;
  transferRx: number; // bytes
  transferTx: number; // bytes
  persistentKeepalive: number;
  status: 'connected' | 'idle' | 'offline';
  assignedExtension?: string;
  location?: string;
  createdAt: string;
  enabled: boolean;
}

export interface WireGuardConfig {
  interfaceName: string;
  status: 'active' | 'inactive';
  listenPort: number;
  address: string;
  publicKey: string;
  peersCount: number;
  activePeersCount: number;
  bytesTx: number;
  bytesRx: number;
  dns: string;
  peers: WireGuardPeer[];
}

export interface ZeroTierPeer {
  nodeId: string;
  role: 'LEAF' | 'PLANET' | 'MOON';
  latencyMs: number;
  physicalAddress: string;
  linkType: 'DIRECT' | 'RELAY';
  version: string;
}

export interface ZeroTierNetwork {
  id: string;
  name: string;
  status: 'OK' | 'ACCESS_DENIED' | 'NOT_FOUND' | 'PORT_ERROR';
  type: 'PRIVATE' | 'PUBLIC';
  assignedIp: string;
  mac: string;
  mtu: number;
  broadcastEnabled: boolean;
  bridge: boolean;
  routes: string[];
}

export interface ZeroTierConfig {
  nodeId: string;
  status: 'online' | 'offline' | 'connecting';
  version: string;
  networks: ZeroTierNetwork[];
  peers: ZeroTierPeer[];
}

export interface Fail2banJail {
  name: string;
  title: string;
  description: string;
  status: 'active' | 'disabled';
  filter: string;
  port: string;
  protocol: string;
  currentlyFailed: number;
  totalFailed: number;
  currentlyBanned: number;
  totalBanned: number;
  maxRetry: number;
  findTime: number; // seconds
  banTime: number; // seconds
}

export interface BannedIp {
  id: string;
  ip: string;
  jail: string;
  country: string;
  countryCode: string;
  failures: number;
  bannedAt: string;
  expiresAt: string;
  reason: string;
  reverseDns?: string;
}

export interface Fail2banRules {
  maxRetry: number;
  findTimeSeconds: number;
  banTimeSeconds: number;
  destEmail: string;
  action: string;
  logPathAsterisk: string;
  sipRateLimitPps: number;
  blockUdpFlood: boolean;
  autoSyncIptables: boolean;
}

export interface Fail2banStatus {
  daemonStatus: 'active' | 'inactive' | 'reloading';
  version: string;
  uptime: string;
  totalJails: number;
  totalBanned: number;
  jails: Fail2banJail[];
  bannedIps: BannedIp[];
  whitelist: string[];
  globalRules: Fail2banRules;
}

// ---------------------------------------------------------------------------
// Telemetria & Monitoramento em Tempo Real de Túneis VPN
// ---------------------------------------------------------------------------

export type TunnelMode = 'wireguard' | 'zerotier' | 'failover_auto';

export interface VpnRoutingConfig {
  primaryTunnel: TunnelMode;
  autoFailover: boolean;
  activeTunnel: 'wireguard' | 'zerotier';
  healthCheckIntervalSec: number;
  wireguardHealthy: boolean;
  zerotierHealthy: boolean;
  lastSwitch: string;
  sipPriorityQoS: boolean;
  mtuOptimization: boolean;
}

export interface VpnTelemetryPoint {
  time: string;
  wgRxKbps: number;
  wgTxKbps: number;
  ztRxKbps: number;
  ztTxKbps: number;
  totalKbps: number;
  latencyMs: number;
  jitterMs: number;
  pps: number;
}

export interface VpnNodeMonitoringItem {
  id: string;
  name: string;
  tunnelType: 'wireguard' | 'zerotier';
  virtualIp: string;
  endpoint: string;
  status: 'connected' | 'idle' | 'offline';
  latencyMs: number;
  jitterMs: number;
  packetLossPercent: number;
  bytesRx: number;
  bytesTx: number;
  latestHandshake: string;
  roleOrExtension?: string;
  location?: string;
  enabled: boolean;
  isPrimaryRoute?: boolean;
}

export interface VpnTelemetryResponse {
  routing: VpnRoutingConfig;
  currentRates: {
    wgRxKbps: number;
    wgTxKbps: number;
    ztRxKbps: number;
    ztTxKbps: number;
    totalKbps: number;
    pps: number;
    latencyAvgMs: number;
    jitterAvgMs: number;
    packetLossPercent: number;
  };
  history: VpnTelemetryPoint[];
  nodes: VpnNodeMonitoringItem[];
}

// ---------------------------------------------------------------------------
// Logs de Sistema em Tempo Real (Syslog & Infraestrutura)
// ---------------------------------------------------------------------------

export type SystemLogLevel = 'DEBUG' | 'INFO' | 'NOTICE' | 'WARNING' | 'ERROR' | 'CRITICAL';

export type SystemLogService =
  | 'asterisk'
  | 'nginx'
  | 'wireguard'
  | 'zerotier'
  | 'fail2ban'
  | 'postgresql'
  | 'redis'
  | 'gemini-gateway'
  | 'audiosocket';

export interface SystemLogEntry {
  id: string;
  timestamp: string;
  service: SystemLogService;
  serviceLabel: string;
  level: SystemLogLevel;
  component?: string;
  message: string;
  metadata?: Record<string, string | number | boolean>;
}

export interface SystemLogStats {
  total: number;
  byLevel: {
    DEBUG: number;
    INFO: number;
    NOTICE: number;
    WARNING: number;
    ERROR: number;
    CRITICAL: number;
  };
  byService: Record<string, number>;
  eventsPerMinute: number;
  lastTimestamp: string;
}



