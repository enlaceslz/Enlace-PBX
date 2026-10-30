import {reviewedKnowledge} from '../../infrastructure/ai/AiConfiguration.js';
import {logOperational} from '../../infrastructure/security/OperationalLog.js';
import { persistedDialogue, voiceMessage } from '../core/MaiaHistory.js';
import { OutboundHttpError } from '../../infrastructure/security/OutboundHttp.js';
import crypto from 'crypto';
import { MaiaRouter } from './MaiaRouter.js';
import { MaiaVoiceGateway } from './MaiaVoiceGateway.js';
import { TenantProfileResolver } from '../core/TenantProfile.js';
import { MaiaSessionEntity } from '../core/MaiaSession.js';
import { MaiaPromptGuard } from '../core/MaiaPromptGuard.js';
import { MaiaPersona } from '../core/MaiaPersona.js';
import { MaiaKnowledge, KnowledgeItem } from '../core/MaiaKnowledge.js';
import { MaiaPolicyEngine } from '../policy/MaiaPolicyEngine.js';
import { MaiaSessionRepository } from '../repositories/MaiaSessionRepository.js';
import { MaiaAuditRepository } from '../repositories/MaiaAuditRepository.js';
import { IMaiaExecutor, ToolExecutionOutput } from '../executors/MaiaToolExecutor.js';
import { AsteriskTransferExecutor, AsteriskHangupExecutor } from '../executors/AsteriskExecutor.js';
import { CustomerExecutor } from '../executors/CustomerExecutor.js';
import { BillingExecutor } from '../executors/BillingExecutor.js';
import { CdrExecutor } from '../executors/CdrExecutor.js';
import { TicketExecutor } from '../executors/TicketExecutor.js';
import {
  AiAgentRepository,
  AiKnowledgeRepository,
  AiToolRepository,
  CrmRepository,
} from '../../infrastructure/postgres/repositories/index.js';
import {
  MaiaRoutingProfile,
  MaiaToolExecution,
} from '../types.js';

export interface ProcessVoiceTurnParams {
  agentId?: string;
  userMessage: string;
  history?: Array<{ role: 'user' | 'model' | 'system' | 'assistant'; text: string }>;
  callerNumber?: string;
  tenantId: string;
  sessionId?: string;
  asteriskChannelId?: string;
  asteriskUniqueId?: string;
  linkedId?: string;
  routingProfile?: MaiaRoutingProfile;
  authenticatedUserId?: string;
  authenticatedRole?: string;
  confirmationToken?: string;
}

export interface VoiceTurnResult {
  sessionId: string;
  replyText: string;
  toolCallExecuted?: {
    name: string;
    args: Record<string, unknown>;
    result: Record<string, unknown>;
    status: 'success' | 'failed' | 'pending';
  };
  action: 'none' | 'transfer' | 'hangup';
  transferDestination?: string;
  audioBase64?: string;
  latencyMs: number;
  tokensUsed: { input: number; output: number };
  sessionState: string;
  voiceConfig: {
    voiceName: string;
    gender: 'male' | 'female';
    avatarType: string;
    pitchMultiplier: number;
    rateMultiplier: number;
    timbre: string;
  };
}

export class MaiaAIGateway {
  private router: MaiaRouter;
  private voiceGateway: MaiaVoiceGateway;
  private executors: Map<string, IMaiaExecutor> = new Map();

  constructor() {
    this.router = new MaiaRouter();
    this.voiceGateway = new MaiaVoiceGateway(this.router);

    // Registro dos Executores Reais
    const transferExec = new AsteriskTransferExecutor();
    const hangupExec = new AsteriskHangupExecutor();
    const customerExec = new CustomerExecutor();
    const billingExec = new BillingExecutor();
    const cdrExec = new CdrExecutor();
    const ticketExec = new TicketExecutor();

    this.executors.set('transferir_chamada', transferExec);
    this.executors.set('encerrar_chamada', hangupExec);
    this.executors.set('consultar_cliente', customerExec);
    this.executors.set('consultar_fatura', billingExec);
    this.executors.set('consultar_cdr', cdrExec);
    this.executors.set('abrir_ticket', ticketExec);
  }

  public getRouter(): MaiaRouter {
    return this.router;
  }

  /**
   * Processamento central do Turno de Voz da MaIA
   */
  public async processVoiceTurn(params: ProcessVoiceTurnParams): Promise<VoiceTurnResult> {
    const startTime = Date.now();
    const correlationId = `corr-${crypto.randomUUID()}`;
    const tenantId = params.tenantId;

    if (!tenantId) {
      throw new Error('Violação de Isolamento: tenantId ausente ou inválido no contexto de voz da MaIA.');
    }

    voiceMessage(params.userMessage);
    const previous=params.sessionId ? await MaiaSessionRepository.findById(params.sessionId,tenantId) : null;
    if(params.sessionId && !previous)throw new OutboundHttpError('Sessão não encontrada nesta empresa.',404);
    if(previous && params.agentId && params.agentId!==previous.agentId)throw new OutboundHttpError('O agente da sessão não pode ser alterado durante o diálogo.',409);
    const selectedAgent=params.agentId || previous?.agentId;
    let agent = selectedAgent ? await AiAgentRepository.findById(selectedAgent, tenantId) : null;
    if(selectedAgent && !agent)throw new OutboundHttpError('Agente não encontrado nesta empresa.',404);
    if (!agent) {
      const tenantAgents = await AiAgentRepository.listByTenant(tenantId);
      agent = tenantAgents.find(candidate=>candidate.isActive===true) || null;
    }

    if (!agent) {
      throw new OutboundHttpError('Nenhum agente de IA ativo configurado nesta empresa.',409);
    }

    if(agent.isActive!==true)throw new OutboundHttpError('Agente de IA desativado nesta empresa.',409);

    // 1. Carrega ou cria a Sessão Persistente no PostgreSQL
    let session: MaiaSessionEntity;
    if (params.sessionId) {
      const existing = await MaiaSessionRepository.findById(params.sessionId, tenantId);
      if (existing) {
        session = new MaiaSessionEntity(existing);
      } else {
        session = new MaiaSessionEntity({
          id: params.sessionId,
          tenantId,
          agentId: agent.id,
          asteriskChannelId: params.asteriskChannelId,
          asteriskUniqueId: params.asteriskUniqueId,
          linkedId: params.linkedId,
          callerNumber: params.callerNumber || 'Desconhecido',
          routingProfile: params.routingProfile || 'VOICE_REALTIME',
        });
        await MaiaSessionRepository.createSession(session.toJSON());
      }
    } else {
      session = new MaiaSessionEntity({
        tenantId,
        agentId: agent.id,
        asteriskChannelId: params.asteriskChannelId,
        asteriskUniqueId: params.asteriskUniqueId,
        linkedId: params.linkedId,
        callerNumber: params.callerNumber || 'Desconhecido',
        routingProfile: params.routingProfile || 'VOICE_REALTIME',
      });
      await MaiaSessionRepository.createSession(session.toJSON());
    }

    const attemptId=crypto.randomUUID();
    session=new MaiaSessionEntity(await MaiaSessionRepository.claimTurn(session.id,tenantId,attemptId));
    try {
    // Atualiza canais se recebidos
    if (params.asteriskChannelId && !session.asteriskChannelId) {
      session.asteriskChannelId = params.asteriskChannelId;
    }
    if (params.asteriskUniqueId && !session.asteriskUniqueId) {
      session.asteriskUniqueId = params.asteriskUniqueId;
    }

    session.transitionTo('processing');



    const voiceConfig = MaiaPersona.resolveVoice(agent);

    // 3. Monta Grounding de Conhecimento RAG oficial
    const allKnowledge = reviewedKnowledge(await AiKnowledgeRepository.listByTenant(tenantId));
    const knowledgeItems: KnowledgeItem[] = (agent.knowledgeSources || [])
      .map((kId) => allKnowledge.find((k) => k.id === kId))
      .filter(Boolean)
      .map((k) => ({
        id: k!.id,
        tenantId: k!.tenantId,
        title: k!.title,
        category: k!.category,
        content: k!.content,
        sourceType: 'official_manual',
        version: '1.0',
        classification: 'OFFICIAL',
        createdAt: (k as any)?.createdAt || k!.updatedAt,
        updatedAt: k!.updatedAt,
      }));

    const knowledgeSnippets = MaiaKnowledge.formatKnowledgeGrounding(knowledgeItems);

    // 4. Recupera Memória Histórica do Cliente (se houver)
    let memoryContext = '';
    if (params.callerNumber && params.callerNumber !== 'Desconhecido') {
      const custMem = await CrmRepository.findMemoryByPhone(params.callerNumber, tenantId);
      if (custMem) {
        memoryContext = `[MEMÓRIA DO CLIENTE - ${custMem.phone}]
Resumo: ${custMem.summary}
Preferências: ${(custMem.preferences || []).join(', ') || 'Nenhuma'}
Sentimento prévio: ${custMem.sentimentHistory}
Risco de Churn: ${custMem.churnRisk}%`;
      }
    }

    // 5. Constrói Prompts Estruturados com MaiaPromptGuard baseado no TenantProfile
    const tenantProfile = await TenantProfileResolver.getProfile(tenantId);

    const systemPrompt = MaiaPromptGuard.buildStructuredSystemPrompt({
      system: agent.systemInstruction || `Você é a MaIA, assistente virtual inteligente da ${tenantProfile.companyName}.`,
      developerPolicy: `Regra de concisão: Cada resposta deve ter no máximo 2 ou 3 frases curtas para áudio natural em tempo real.`,
      tenantPolicy: `Empresa: ${tenantProfile.companyName}. Contato de transbordo: ramal ${agent.transferExtension || tenantProfile.transferExtension}. Regras: ${tenantProfile.rules.join(' ')}`,
      personaTimbre: voiceConfig.guidancePrompt,
    });

    const recentHistory = persistedDialogue(await MaiaSessionRepository.recentDialogue(session.id,tenantId));

    const userPrompt = MaiaPromptGuard.buildStructuredUserPrompt({
      knowledgeSnippets,
      memoryContext,
      recentHistory,
      callerNumber: params.callerNumber,
      userInput: params.userMessage,
    });

    // 6. Lista ferramentas permitidas para este agente
    const allTools = await AiToolRepository.listToolsByTenant(tenantId);
    const agentTools = (agent.tools || [])
      .map((tId) => allTools.find((t) => t.id === tId))
      .filter(Boolean)
      .map((tool) => ({
        name: tool!.name,
        description: tool!.description,
        parameters: {
          type: 'object',
          properties: {
            ...(tool!.name === 'consultar_cliente' && {
              cpf_cnpj: { type: 'string', description: 'CPF ou CNPJ informado pelo chamador' },
              telefone: { type: 'string', description: 'Telefone do chamador' },
            }),
            ...(tool!.name === 'consultar_fatura' && {
              cpf_cnpj: { type: 'string', description: 'CPF ou CNPJ do titular' },
            }),
            ...(tool!.name === 'abrir_ticket' && {
              categoria: { type: 'string', description: 'Categoria do problema (lentidão, sem_conexão, ramal)' },
              descricao: { type: 'string', description: 'Descrição suscinta do problema' },
              urgencia: { type: 'string', description: 'baixa, media ou alta' },
            }),
            ...(tool!.name === 'transferir_chamada' && {
              destino: { type: 'string', description: 'Ramal (ex: 4101, 4102) ou fila (ex: 7001)' },
              motivo: { type: 'string', description: 'Motivo do transbordo' },
            }),
            ...(tool!.name === 'encerrar_chamada' && {
              motivo: { type: 'string', description: 'Motivo do término' },
            }),
          },
        },
      }));

    // 7. Executa inferência via AI Gateway Router
    const routingProfile = params.routingProfile || session.routingProfile || 'VOICE_REALTIME';
    const aiResponse = await this.router.executeWithFallback({
      systemPrompt,
      prompt: userPrompt,
      model: agent.model,
      temperature: agent.temperature || 0.3,
      routingProfile,
      tools: agentTools,
      correlationId,
      tenantId,
    });

    session.provider=aiResponse.providerId;session.model=aiResponse.modelUsed;
    let replyText = aiResponse.text || '';
    let toolCallExecuted: VoiceTurnResult['toolCallExecuted'] = undefined;
    let action: VoiceTurnResult['action'] = 'none';
    let transferDestination: string | undefined = undefined;

    // 8. Se houver chamadas de ferramenta propostas pelo modelo
    if (aiResponse.toolCalls && aiResponse.toolCalls.length > 0) {
      const fc = aiResponse.toolCalls[0];
      const toolStartTime = Date.now();

      // Avaliação obrigatória no MaiaPolicyEngine
      const policyDecision = MaiaPolicyEngine.evaluateToolExecution({
        toolName: fc.name,
        args: fc.args,
        tenantId,
        sessionId: session.id,
        agentAllowedTools: agent.tools,
        userRole: params.authenticatedRole || 'caller',
        contextType: 'voice_call',
        confirmationToken: params.confirmationToken,
      });

      const toolExecRecord: MaiaToolExecution = {
        id: `exec-${crypto.randomUUID()}`,
        sessionId: session.id,
        tenantId,
        userId: params.authenticatedUserId || 'ai-gateway',
        agentId: agent.id,
        provider: aiResponse.providerId,
        model: aiResponse.modelUsed,
        toolName: fc.name,
        risk: policyDecision.risk,
        policyDecision: policyDecision.decision,
        confirmationRequired: policyDecision.toolDef?.requiresConfirmation || false,
        confirmationReceived: !!params.confirmationToken,
        confirmationToken: policyDecision.confirmationToken,
        argumentsHash: policyDecision.argumentsHash,
        argumentsMasked: policyDecision.argumentsMasked,
        resultStatus: 'pending',
        resultData: {},
        durationMs: 0,
        correlationId,
        createdAt: new Date().toISOString(),
      };

      if (policyDecision.decision === 'DENY') {
        toolExecRecord.resultStatus = 'failed';
        toolExecRecord.errorMessage = policyDecision.reason || 'Negado pela política';
        toolExecRecord.durationMs = Date.now() - toolStartTime;
        await MaiaAuditRepository.recordToolExecution(toolExecRecord);

        replyText = `Não tenho autorização para executar esta ação no momento: ${policyDecision.reason}`;
        toolCallExecuted = {
          name: fc.name,
          args: fc.args,
          result: { erro: policyDecision.reason },
          status: 'failed',
        };
      } else if (policyDecision.decision === 'REQUIRE_CONFIRMATION') {
        toolExecRecord.resultStatus = 'pending';
        toolExecRecord.durationMs = Date.now() - toolStartTime;
        await MaiaAuditRepository.recordToolExecution(toolExecRecord);

        replyText = `Esta operação é de alta sensibilidade e necessita de confirmação de segurança.`;
        toolCallExecuted = {
          name: fc.name,
          args: fc.args,
          result: { requerConfirmacao: true, token: policyDecision.confirmationToken },
          status: 'pending',
        };
      } else {
        // ALLOW: Executa via Executor Real
        const executor = this.executors.get(fc.name);
        if (executor) {
          session.registerToolCall();
          const execOutput: ToolExecutionOutput = await executor.execute(fc.args, {
            tenantId,
            sessionId: session.id,
            callerNumber: params.callerNumber || 'Desconhecido',
            asteriskChannelId: session.asteriskChannelId,
            agentId: agent.id,
            userRole: params.authenticatedRole,
            correlationId,
          });

          toolExecRecord.resultStatus = execOutput.status;
          toolExecRecord.resultData = execOutput.data;
          toolExecRecord.durationMs = Date.now() - toolStartTime;
          await MaiaAuditRepository.recordToolExecution(toolExecRecord);

          if (execOutput.action === 'transfer') {
            action = 'transfer';
            transferDestination = execOutput.transferDestination || agent.transferExtension || '4101';
            session.transitionTo('transferring');
            session.transferReason = (fc.args.motivo as string) || 'Transferência solicitada';
            session.transferDestination = transferDestination;
          } else if (execOutput.action === 'hangup') {
            action = 'hangup';
            session.transitionTo('terminating');
          }

          if (execOutput.message && (['transferir_chamada','encerrar_chamada'].includes(fc.name) || !replyText || replyText.trim() === '')) {
            replyText = execOutput.message;
          }

          toolCallExecuted = {
            name: fc.name,
            args: fc.args,
            result: execOutput.data,
            status: execOutput.status,
          };
        } else {
          toolExecRecord.resultStatus = 'failed';
          toolExecRecord.errorMessage = `Nenhum executor configurado para '${fc.name}'.`;
          toolExecRecord.durationMs = Date.now() - toolStartTime;
          await MaiaAuditRepository.recordToolExecution(toolExecRecord);
        }
      }
    }

    if (!replyText) {
      replyText = `Entendido perfeitamente! Como posso te ajudar na ${tenantProfile.companyName}?`;
    }

    // 9. Síntese de voz através do MaiaVoiceGateway desacoplado
    let audioBase64: string | undefined = undefined;
    try {
      const vRes = await this.voiceGateway.synthesize({
        text: replyText,
        voiceName: voiceConfig.voiceName,
        gender: voiceConfig.gender,
        correlationId,
      });
      if (vRes && vRes.audioBase64) {
        audioBase64 = vRes.audioBase64;
      }
    } catch (err: any) {
      logOperational('AI_PROVIDER_FAILURE');
    }

    const latencyMs = Date.now() - startTime;

    // 10. Atualiza estado e registra turnos no PostgreSQL
    session.registerTurn(aiResponse.tokensUsed.input, aiResponse.tokensUsed.output, latencyMs);

    if (action === 'hangup') {
      session.transitionTo('completed');
    } else if (action === 'transfer') {
      session.transitionTo('completed');
    } else {
      session.transitionTo('listening');
    }

    // Grava turno na tabela relacional de turnos
    await MaiaSessionRepository.commitExchange(session.toJSON(),attemptId,params.userMessage,{
      id: `turn-${crypto.randomUUID()}`,
      sessionId: session.id,
      tenantId,
      turnNumber: session.userTurns,
      role: 'assistant',
      content: replyText,
      audioBase64,
      latencyMs,
      tokensInput: aiResponse.tokensUsed.input,
      tokensOutput: aiResponse.tokensUsed.output,
      provider: aiResponse.providerId,
      model: aiResponse.modelUsed,
      createdAt: new Date().toISOString(),
    });

    return {
      sessionId: session.id,
      replyText,
      toolCallExecuted,
      action,
      transferDestination,
      audioBase64,
      latencyMs,
      tokensUsed: aiResponse.tokensUsed,
      sessionState: session.status,
      voiceConfig,
    };
    } finally {
      await MaiaSessionRepository.releaseTurn(session.id,tenantId,attemptId);
    }
  }
}

export const maiaAIGateway = new MaiaAIGateway();
