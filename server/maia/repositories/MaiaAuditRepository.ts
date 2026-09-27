import { MaiaSessionRepository } from './MaiaSessionRepository.js';
import { MaiaToolExecution } from '../types.js';
import { AuditLogRepository } from '../../infrastructure/postgres/repositories/AuditLogRepository.js';

export class MaiaAuditRepository {
  public static async recordToolExecution(exec: MaiaToolExecution): Promise<MaiaToolExecution> {
    // 1. Grava na tabela especializada relacional de execuções de ferramentas
    await MaiaSessionRepository.addToolExecution(exec);

    // 2. Grava na trilha geral de auditoria do PBX
    await AuditLogRepository.create({
      tenantId: exec.tenantId,
      userId: exec.userId,
      userName: `MaIA AI Agent (${exec.agentId || 'Core'})`,
      action: `MAIA_TOOL_${exec.toolName.toUpperCase()}`,
      resource: `ai_tools/${exec.toolId || exec.toolName}`,
      ip: 'internal-ari-voice',
      details: `[Correlation: ${exec.correlationId}] Risco: ${exec.risk} | Decisão: ${exec.policyDecision} | Status: ${exec.resultStatus} | ArgsHash: ${exec.argumentsHash} | Duração: ${exec.durationMs}ms`,
    }).catch((err) => {
      console.warn('[MaiaAuditRepository] Falha ao registrar log de auditoria secundário:', err.message);
    });

    return exec;
  }
}
