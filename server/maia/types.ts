/**
 * Tipos e Interfaces Fundamentais — MaIA V2 Enterprise
 * Arquitetura de IA Nativa desacoplada, auditável e resiliente para o Enlace-PBX
 */

export type MaiaSessionState =
  | 'created'
  | 'connecting'
  | 'connected'
  | 'processing'
  | 'listening'
  | 'speaking'
  | 'transferring'
  | 'terminating'
  | 'completed'
  | 'failed';

export type MaiaRoutingProfile =
  | 'ECONOMICO'
  | 'BALANCEADO'
  | 'ALTA_CAPACIDADE'
  | 'VOICE_REALTIME';

export type MaiaToolRisk = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export type MaiaPolicyDecision = 'ALLOW' | 'DENY' | 'REQUIRE_CONFIRMATION';

export interface MaiaSession {
  id: string;
  tenantId: string;
  agentId: string;
  asteriskChannelId?: string;
  asteriskUniqueId?: string;
  linkedId?: string;
  callerNumber: string;
  provider: string;
  model: string;
  routingProfile: MaiaRoutingProfile;
  status: MaiaSessionState;
  startedAt: string;
  lastActivityAt: string;
  endedAt?: string;
  durationSeconds: number;
  userTurns: number;
  toolCalls: number;
  tokensInput: number;
  tokensOutput: number;
  csatScore?: number;
  sentiment?: string;
  summary?: string;
  transferReason?: string;
  transferDestination?: string;
  meta: Record<string, unknown>;
  createdAt?: string;
}

export interface MaiaSessionTurn {
  id: string;
  sessionId: string;
  tenantId: string;
  turnNumber: number;
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string;
  audioBase64?: string;
  latencyMs: number;
  tokensInput: number;
  tokensOutput: number;
  provider?: string;
  model?: string;
  createdAt: string;
}

export interface MaiaToolExecution {
  id: string;
  sessionId?: string;
  turnId?: string;
  tenantId: string;
  userId: string;
  agentId?: string;
  provider: string;
  model: string;
  toolId?: string;
  toolName: string;
  risk: MaiaToolRisk;
  policyDecision: MaiaPolicyDecision;
  confirmationRequired: boolean;
  confirmationReceived: boolean;
  confirmationToken?: string;
  argumentsHash: string;
  argumentsMasked: Record<string, unknown>;
  resultStatus: 'pending' | 'success' | 'failed';
  resultData: Record<string, unknown>;
  errorMessage?: string;
  durationMs: number;
  correlationId: string;
  createdAt: string;
}

export interface MaiaSessionEvent {
  id: string;
  sessionId: string;
  tenantId: string;
  eventType: string;
  fromStatus?: MaiaSessionState;
  toStatus?: MaiaSessionState;
  payload: Record<string, unknown>;
  createdAt: string;
}

export interface MaiaTextRequest {
  systemPrompt: string;
  prompt: string;
  model?: string;
  temperature?: number;
  routingProfile?: MaiaRoutingProfile;
  tools?: MaiaToolDefinition[];
  correlationId: string;
  tenantId: string;
}

export interface MaiaToolDefinition {
  name: string;
  description: string;
  parameters: {
    type: string;
    properties: Record<string, unknown>;
    required?: string[];
  };
}

export interface MaiaAIResponse {
  text: string;
  toolCalls?: Array<{
    name: string;
    args: Record<string, unknown>;
  }>;
  tokensUsed: {
    input: number;
    output: number;
  };
  modelUsed: string;
  providerId: string;
  latencyMs: number;
}

export interface MaiaVoiceRequest {
  text: string;
  voiceName: string;
  gender: 'male' | 'female';
  correlationId?: string;
}

export interface MaiaVoiceResponse {
  audioBase64: string;
  durationMs?: number;
  format: 'wav' | 'mp3' | 'pcm16';
}

export interface MaiaProviderHealth {
  providerId: string;
  name: string;
  status: 'UP' | 'DOWN' | 'UNKNOWN' | 'NOT_CONFIGURED';
  latencyMs?: number;
  error?: string;
  modelsAvailable: string[];
}
