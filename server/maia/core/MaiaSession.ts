import crypto from 'crypto';
import { MaiaSession, MaiaSessionState, MaiaRoutingProfile } from '../types.js';

/**
 * MaiaSessionEntity — Entidade e Máquina de Estados da Sessão de Voz da MaIA
 * Garante que estados sejam estritamente controlados e nunca inventados
 */
export class MaiaSessionEntity implements MaiaSession {
  public readonly id: string;
  public readonly tenantId: string;
  public readonly agentId: string;
  public asteriskChannelId?: string;
  public asteriskUniqueId?: string;
  public linkedId?: string;
  public callerNumber: string;
  public provider: string;
  public model: string;
  public routingProfile: MaiaRoutingProfile;
  public status: MaiaSessionState;
  public readonly startedAt: string;
  public lastActivityAt: string;
  public endedAt?: string;
  public durationSeconds: number;
  public userTurns: number;
  public toolCalls: number;
  public tokensInput: number;
  public tokensOutput: number;
  public csatScore?: number;
  public sentiment?: string;
  public summary?: string;
  public transferReason?: string;
  public transferDestination?: string;
  public meta: Record<string, unknown>;

  // Transições válidas de estado (State Machine)
  private static readonly VALID_TRANSITIONS: Record<MaiaSessionState, MaiaSessionState[]> = {
    created: ['connecting', 'connected', 'failed', 'terminating'],
    connecting: ['connected', 'failed', 'terminating'],
    connected: ['processing', 'listening', 'speaking', 'transferring', 'terminating', 'completed', 'failed'],
    listening: ['processing', 'transferring', 'terminating', 'completed', 'failed'],
    processing: ['speaking', 'listening', 'transferring', 'terminating', 'completed', 'failed'],
    speaking: ['listening', 'processing', 'transferring', 'terminating', 'completed', 'failed'],
    transferring: ['completed', 'failed', 'terminating'],
    terminating: ['completed', 'failed'],
    completed: [], // Terminal
    failed: [],    // Terminal
  };

  constructor(params: {
    id?: string;
    tenantId: string;
    agentId: string;
    asteriskChannelId?: string;
    asteriskUniqueId?: string;
    linkedId?: string;
    callerNumber: string;
    provider?: string;
    model?: string;
    routingProfile?: MaiaRoutingProfile;
    status?: MaiaSessionState;
    startedAt?: string;
    lastActivityAt?: string;
    durationSeconds?: number;
    userTurns?: number;
    toolCalls?: number;
    tokensInput?: number;
    tokensOutput?: number;
    meta?: Record<string, unknown>;
  }) {
    // Nunca usa Date.now() nem Math.random() para ID; sempre UUID v4 determinístico e persistível
    this.id = params.id || crypto.randomUUID();
    this.tenantId = params.tenantId;
    this.agentId = params.agentId;
    this.asteriskChannelId = params.asteriskChannelId;
    this.asteriskUniqueId = params.asteriskUniqueId;
    this.linkedId = params.linkedId;
    this.callerNumber = params.callerNumber || 'Desconhecido';
    this.provider = params.provider || 'gemini';
    this.model = params.model || 'gemini-flash-latest';
    this.routingProfile = params.routingProfile || 'BALANCEADO';
    this.status = params.status || 'created';
    this.startedAt = params.startedAt || new Date().toISOString();
    this.lastActivityAt = params.lastActivityAt || this.startedAt;
    this.durationSeconds = params.durationSeconds || 0;
    this.userTurns = params.userTurns || 0;
    this.toolCalls = params.toolCalls || 0;
    this.tokensInput = params.tokensInput || 0;
    this.tokensOutput = params.tokensOutput || 0;
    this.meta = params.meta || {};
  }

  /**
   * Executa transição segura de estado na máquina de estados
   */
  public transitionTo(newStatus: MaiaSessionState): { success: boolean; from: MaiaSessionState; to: MaiaSessionState; error?: string } {
    const from = this.status;
    if (from === newStatus) {
      return { success: true, from, to: newStatus };
    }

    const allowed = MaiaSessionEntity.VALID_TRANSITIONS[from];
    if (!allowed || !allowed.includes(newStatus)) {
      return {
        success: false,
        from,
        to: newStatus,
        error: `Transição inválida de estado: de '${from}' para '${newStatus}'.`,
      };
    }

    this.status = newStatus;
    this.lastActivityAt = new Date().toISOString();

    if (newStatus === 'completed' || newStatus === 'failed') {
      this.endedAt = this.lastActivityAt;
      const startMs = new Date(this.startedAt).getTime();
      const endMs = new Date(this.endedAt).getTime();
      if (!isNaN(startMs) && !isNaN(endMs)) {
        this.durationSeconds = Math.max(0, Math.round((endMs - startMs) / 1000));
      }
    }

    return { success: true, from, to: newStatus };
  }

  public registerTurn(tokensIn: number, tokensOut: number, latencyMs: number) {
    this.userTurns += 1;
    this.tokensInput += tokensIn;
    this.tokensOutput += tokensOut;
    this.lastActivityAt = new Date().toISOString();
    this.durationSeconds += Math.round(latencyMs / 1000) + 2;
  }

  public registerToolCall() {
    this.toolCalls += 1;
    this.lastActivityAt = new Date().toISOString();
  }

  public toJSON(): MaiaSession {
    return {
      id: this.id,
      tenantId: this.tenantId,
      agentId: this.agentId,
      asteriskChannelId: this.asteriskChannelId,
      asteriskUniqueId: this.asteriskUniqueId,
      linkedId: this.linkedId,
      callerNumber: this.callerNumber,
      provider: this.provider,
      model: this.model,
      routingProfile: this.routingProfile,
      status: this.status,
      startedAt: this.startedAt,
      lastActivityAt: this.lastActivityAt,
      endedAt: this.endedAt,
      durationSeconds: this.durationSeconds,
      userTurns: this.userTurns,
      toolCalls: this.toolCalls,
      tokensInput: this.tokensInput,
      tokensOutput: this.tokensOutput,
      csatScore: this.csatScore,
      sentiment: this.sentiment,
      summary: this.summary,
      transferReason: this.transferReason,
      transferDestination: this.transferDestination,
      meta: this.meta,
    };
  }
}
