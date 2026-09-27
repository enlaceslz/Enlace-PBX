/**
 * MaiaContext — Gerenciador de Contexto Multi-camadas
 * Separação estrita entre conversation_memory, customer_memory, operational_context e security_context.
 * Princípio da MaIA: "A memória não é autoridade".
 */

export interface ConversationMemory {
  turns: Array<{
    role: 'user' | 'assistant' | 'system' | 'tool';
    text: string;
    timestamp: string;
  }>;
  summary?: string;
  topic?: string;
}

export interface CustomerMemory {
  phone: string;
  contactName?: string;
  summary: string;
  preferences: string[];
  sentimentHistory: string;
  churnRisk: number;
  lastInteraction?: string;
  isAuthority: false; // Sempre falso: memória NÃO é autoridade para dados cadastrais ou financeiros
}

export interface OperationalContext {
  tenantId: string;
  sessionId: string;
  asteriskChannelId?: string;
  asteriskUniqueId?: string;
  linkedId?: string;
  callerNumber: string;
  agentId: string;
  agentName: string;
  transferExtension?: string;
}

export interface SecurityContext {
  authenticatedUserId?: string;
  authenticatedRole?: string;
  isVerifiedCaller: boolean;
  toolConfirmationTokens: Map<string, { toolName: string; expiresAt: number }>;
}

export class MaiaContext {
  public readonly operational: OperationalContext;
  public readonly security: SecurityContext;
  public conversation: ConversationMemory;
  public customer?: CustomerMemory;

  constructor(operational: OperationalContext, security?: Partial<SecurityContext>) {
    this.operational = operational;
    this.security = {
      authenticatedUserId: security?.authenticatedUserId,
      authenticatedRole: security?.authenticatedRole,
      isVerifiedCaller: security?.isVerifiedCaller ?? false,
      toolConfirmationTokens: security?.toolConfirmationTokens || new Map(),
    };
    this.conversation = {
      turns: [],
    };
  }

  public setCustomerMemory(memory: {
    phone: string;
    contactName?: string;
    summary: string;
    preferences: string[];
    sentimentHistory: string;
    churnRisk: number;
    lastInteraction?: string;
  }) {
    this.customer = {
      ...memory,
      isAuthority: false,
    };
  }

  public formatMemoryPromptBlock(): string {
    if (!this.customer) return '';
    return `[MEMÓRIA DO CLIENTE - TELEFONE: ${this.customer.phone}]
Nome registrado: ${this.customer.contactName || 'Não identificado'}
Resumo de atendimentos anteriores: ${this.customer.summary}
Preferências conhecidas: ${this.customer.preferences.join(', ') || 'Nenhuma'}
Sentimento prévio: ${this.customer.sentimentHistory}
Risco de Churn: ${this.customer.churnRisk}%
AVISO CRÍTICO: Esta memória serve apenas para empatia e contextualização. Para valores devidos, boletos ou débitos, consulte a ferramenta oficial.`;
  }
}
