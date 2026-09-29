import crypto from 'crypto';
import { MaiaToolRisk, MaiaPolicyDecision } from '../types.js';
import { MaiaConfirmationManager } from './MaiaConfirmation.js';

export interface ToolPolicyDefinition {
  toolId: string;
  name: string;
  description: string;
  risk: MaiaToolRisk;
  allowedRoles: string[];
  allowedContexts: ('voice_call' | 'whatsapp' | 'webchat' | 'internal_cli')[];
  requiresConfirmation: boolean;
  enabled: boolean;
}

export interface PolicyEvaluationResult {
  decision: MaiaPolicyDecision;
  risk: MaiaToolRisk;
  toolDef?: ToolPolicyDefinition;
  reason?: string;
  argumentsHash: string;
  argumentsMasked: Record<string, unknown>;
  confirmationToken?: string;
}

export class MaiaPolicyEngine {
  private static readonly TOOL_REGISTRY: Record<string, ToolPolicyDefinition> = {
    // LOW RISK: Consultas públicas e status
    consultar_status_sistema: {
      toolId: 'tool-status-sys',
      name: 'consultar_status_sistema',
      description: 'Consulta status geral da central telefônica e serviços',
      risk: 'LOW',
      allowedRoles: ['super_admin', 'admin', 'supervisor', 'operator', 'agent', 'caller'],
      allowedContexts: ['voice_call', 'whatsapp', 'webchat', 'internal_cli'],
      requiresConfirmation: false,
      enabled: true,
    },

    // MEDIUM RISK: Consultas de CRM, CDR e abertura de chamados
    consultar_cliente: {
      toolId: 'tool-crm-cliente',
      name: 'consultar_cliente',
      description: 'Consulta dados do titular e cadastro integrado',
      risk: 'MEDIUM',
      allowedRoles: ['super_admin', 'admin', 'supervisor', 'operator', 'agent', 'caller'],
      allowedContexts: ['voice_call', 'whatsapp', 'webchat'],
      requiresConfirmation: false,
      enabled: true,
    },
    consultar_fatura: {
      toolId: 'tool-billing-fatura',
      name: 'consultar_fatura',
      description: 'Consulta valores em aberto e faturas oficiais no sistema financeiro',
      risk: 'MEDIUM',
      allowedRoles: ['super_admin', 'admin', 'supervisor', 'operator', 'agent', 'caller'],
      allowedContexts: ['voice_call', 'whatsapp', 'webchat'],
      requiresConfirmation: false,
      enabled: true,
    },
    consultar_cdr: {
      toolId: 'tool-telecom-cdr',
      name: 'consultar_cdr',
      description: 'Consulta histórico de chamadas do tenant',
      risk: 'MEDIUM',
      allowedRoles: ['super_admin', 'admin', 'supervisor', 'operator'],
      allowedContexts: ['voice_call', 'whatsapp', 'webchat', 'internal_cli'],
      requiresConfirmation: false,
      enabled: true,
    },
    abrir_ticket: {
      toolId: 'tool-crm-ticket',
      name: 'abrir_ticket',
      description: 'Abre protocolo ou chamado no sistema de suporte',
      risk: 'MEDIUM',
      allowedRoles: ['super_admin', 'admin', 'supervisor', 'operator', 'agent', 'caller'],
      allowedContexts: ['voice_call', 'whatsapp', 'webchat'],
      requiresConfirmation: false,
      enabled: true,
    },

    // HIGH RISK: Transbordo de chamada, envio externo e alteração de cadastro
    transferir_chamada: {
      toolId: 'tool-ast-transfer',
      name: 'transferir_chamada',
      description: 'Transfere a ligação ativa no Asterisk para ramal ou fila humana',
      risk: 'HIGH',
      allowedRoles: ['super_admin', 'admin', 'supervisor', 'operator', 'agent', 'caller'],
      allowedContexts: ['voice_call'],
      requiresConfirmation: false, // Transferência telefônica requer validação de política mas flui dinamicamente se o chamador solicitou
      enabled: true,
    },
    enviar_whatsapp: {
      toolId: 'tool-omni-waba',
      name: 'enviar_whatsapp',
      description: 'Envia mensagem ativa pelo WhatsApp oficial da empresa',
      risk: 'HIGH',
      allowedRoles: ['super_admin', 'admin', 'supervisor', 'operator'],
      allowedContexts: ['voice_call', 'whatsapp', 'webchat'],
      requiresConfirmation: true, // Disparo ativo para terceiros exige confirmação
      enabled: true,
    },

    // CRITICAL RISK: Desligamento, alteração de tronco, rotas, regras de firewall
    encerrar_chamada: {
      toolId: 'tool-ast-hangup',
      name: 'encerrar_chamada',
      description: 'Encerra o canal ativo da ligação no Asterisk após despedida',
      risk: 'CRITICAL',
      allowedRoles: ['super_admin', 'admin', 'supervisor', 'operator', 'agent', 'caller'],
      allowedContexts: ['voice_call'],
      requiresConfirmation: false, // Permitido ao final do atendimento quando o chamador diz tchau
      enabled: true,
    },
    alterar_tronco: {
      toolId: 'tool-admin-trunk',
      name: 'alterar_tronco',
      description: 'Modifica parâmetros de troncos SIP da operadora',
      risk: 'CRITICAL',
      allowedRoles: ['super_admin'],
      allowedContexts: ['internal_cli'],
      requiresConfirmation: true,
      enabled: false, // Desabilitado para garantir que a IA não altere telecom diretamente
    },
  };

  /**
   * Avalia a execução de ferramenta com base em RBAC, Tenant Isolation e Risk Policy
   */
  public static evaluateToolExecution(params: {
    toolName: string;
    args: Record<string, unknown>;
    tenantId: string;
    sessionId?: string;
    agentAllowedTools?: string[];
    userRole?: string;
    contextType?: 'voice_call' | 'whatsapp' | 'webchat' | 'internal_cli';
    confirmationToken?: string;
  }): PolicyEvaluationResult {
    const { toolName, args, tenantId, sessionId } = params;
    const contextType = params.contextType || 'voice_call';
    const userRole = params.userRole || 'caller';

    // 1. Gera hash criptográfico dos argumentos para rastreabilidade auditável
    const argsString = JSON.stringify(args || {});
    const argumentsHash = crypto.createHash('sha256').update(argsString).digest('hex').substring(0, 32);

    // 2. Mascara campos sensíveis nos argumentos para log e auditoria
    const argumentsMasked = this.maskSensitiveArgs(args);

    // 3. Localiza a política da ferramenta
    const toolDef = this.TOOL_REGISTRY[toolName];
    if (!toolDef || !toolDef.enabled) {
      return {
        decision: 'DENY',
        risk: 'HIGH',
        reason: `Ferramenta '${toolName}' não está registrada ou está desabilitada pelo Policy Engine.`,
        argumentsHash,
        argumentsMasked,
      };
    }

    // 4. Validação de contexto (ex: transferir só pode ser executado em chamada telefônica)
    if (!toolDef.allowedContexts.includes(contextType)) {
      return {
        decision: 'DENY',
        risk: toolDef.risk,
        toolDef,
        reason: `A ferramenta '${toolName}' não é permitida no contexto '${contextType}'.`,
        argumentsHash,
        argumentsMasked,
      };
    }

    // 5. Validação de papel (RBAC)
    if (!toolDef.allowedRoles.includes(userRole) && userRole !== 'super_admin') {
      return {
        decision: 'DENY',
        risk: toolDef.risk,
        toolDef,
        reason: `O perfil '${userRole}' não possui permissão para executar '${toolName}'.`,
        argumentsHash,
        argumentsMasked,
      };
    }

    // 6. Validação de allowlist do agente
    if (params.agentAllowedTools && params.agentAllowedTools.length > 0) {
      const isAllowed = params.agentAllowedTools.some(
        (t) => t === toolName || t === toolDef.toolId
      );
      if (!isAllowed) {
        return {
          decision: 'DENY',
          risk: toolDef.risk,
          toolDef,
          reason: `O agente de IA não possui a ferramenta '${toolName}' em sua lista autorizada de permissões.`,
          argumentsHash,
          argumentsMasked,
        };
      }
    }

    // 7. Validação de confirmação para ações de alto risco que exigem token
    if (toolDef.requiresConfirmation) {
      if (!sessionId) {
        return {
          decision: 'DENY',
          risk: toolDef.risk,
          toolDef,
          reason: 'Ações que exigem confirmação necessitam de uma sessão ativa vinculada.',
          argumentsHash,
          argumentsMasked,
        };
      }

      if (params.confirmationToken) {
        const validation = MaiaConfirmationManager.validateAndConsume({
          token: params.confirmationToken,
          sessionId,
          tenantId,
          toolName,
          argumentsHash,
        });

        if (!validation.valid) {
          return {
            decision: 'DENY',
            risk: toolDef.risk,
            toolDef,
            reason: `Confirmação inválida: ${validation.reason}`,
            argumentsHash,
            argumentsMasked,
          };
        }
      } else {
        // Gera novo token e devolve estado REQUIRE_CONFIRMATION
        const newToken = MaiaConfirmationManager.createToken({
          sessionId,
          tenantId,
          toolName,
          argumentsHash,
          ttlSeconds: 60,
        });

        return {
          decision: 'REQUIRE_CONFIRMATION',
          risk: toolDef.risk,
          toolDef,
          reason: `Esta operação (${toolName}) exige confirmação explícita. Token emitido.`,
          argumentsHash,
          argumentsMasked,
          confirmationToken: newToken,
        };
      }
    }

    return {
      decision: 'ALLOW',
      risk: toolDef.risk,
      toolDef,
      argumentsHash,
      argumentsMasked,
    };
  }

  /**
   * Mascara campos sensíveis como senhas, CPF e cartões
   */
  public static maskSensitiveArgs(args: Record<string, unknown>): Record<string, unknown> {
    if (!args || typeof args !== 'object') return {};
    const masked: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(args)) {
      const lower = key.toLowerCase();
      if (typeof value === 'string') {
        if (lower.includes('senha') || lower.includes('password') || lower.includes('token') || lower.includes('secret')) {
          masked[key] = '••••••••';
        } else if (lower.includes('cpf') || lower.includes('cnpj')) {
          masked[key] = value.length > 5 ? `${value.slice(0, 3)}.***.***-${value.slice(-2)}` : '***';
        } else {
          masked[key] = value;
        }
      } else {
        masked[key] = value;
      }
    }

    return masked;
  }
}
