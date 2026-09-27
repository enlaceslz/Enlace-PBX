import crypto from 'crypto';

export interface ConfirmationTokenRecord {
  token: string;
  sessionId: string;
  tenantId: string;
  toolName: string;
  argumentsHash: string;
  expiresAt: number;
  used: boolean;
}

/**
 * MaiaConfirmationManager — Gerenciador de Confirmações Criptográficas
 * Garante que ações HIGH ou CRITICAL exijam confirmação não-reutilizável vinculada à sessão
 */
export class MaiaConfirmationManager {
  private static tokens = new Map<string, ConfirmationTokenRecord>();

  /**
   * Cria um token de confirmação de uso único para a sessão
   * TTL padrão: 60 segundos
   */
  public static createToken(params: {
    sessionId: string;
    tenantId: string;
    toolName: string;
    argumentsHash: string;
    ttlSeconds?: number;
  }): string {
    const token = `conf-${crypto.randomBytes(16).toString('hex')}`;
    const ttl = (params.ttlSeconds || 60) * 1000;

    this.tokens.set(token, {
      token,
      sessionId: params.sessionId,
      tenantId: params.tenantId,
      toolName: params.toolName,
      argumentsHash: params.argumentsHash,
      expiresAt: Date.now() + ttl,
      used: false,
    });

    return token;
  }

  /**
   * Valida e consome o token de confirmação (Single-Use Token)
   */
  public static validateAndConsume(params: {
    token?: string;
    sessionId: string;
    tenantId: string;
    toolName: string;
    argumentsHash: string;
  }): { valid: boolean; reason?: string } {
    if (!params.token) {
      return { valid: false, reason: 'Token de confirmação não fornecido.' };
    }

    const record = this.tokens.get(params.token);
    if (!record) {
      return { valid: false, reason: 'Token de confirmação inexistente ou expirado.' };
    }

    if (record.used) {
      return { valid: false, reason: 'Token de confirmação já utilizado (uso único violado).' };
    }

    if (Date.now() > record.expiresAt) {
      this.tokens.delete(params.token);
      return { valid: false, reason: 'Token de confirmação expirou por tempo limite.' };
    }

    if (record.sessionId !== params.sessionId) {
      return { valid: false, reason: 'Token de confirmação não pertence a esta sessão de chamada.' };
    }

    if (record.tenantId !== params.tenantId) {
      return { valid: false, reason: 'Violação de isolamento multi-tenant no token de confirmação.' };
    }

    if (record.toolName !== params.toolName) {
      return { valid: false, reason: 'Token de confirmação emitido para ferramenta diferente.' };
    }

    // Marca como consumido
    record.used = true;
    this.tokens.delete(params.token);

    return { valid: true };
  }

  /**
   * Limpa tokens expirados periodicamente
   */
  public static pruneExpired() {
    const now = Date.now();
    for (const [key, val] of this.tokens.entries()) {
      if (val.used || val.expiresAt < now) {
        this.tokens.delete(key);
      }
    }
  }
}
