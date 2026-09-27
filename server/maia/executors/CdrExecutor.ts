import { IMaiaExecutor, ToolExecutionContext, ToolExecutionOutput } from './MaiaToolExecutor.js';
import { CdrRepository } from '../../infrastructure/postgres/repositories/CdrRepository.js';

export class CdrExecutor implements IMaiaExecutor {
  async execute(args: Record<string, unknown>, context: ToolExecutionContext): Promise<ToolExecutionOutput> {
    try {
      const cdrs = await CdrRepository.listByTenant(context.tenantId, { limit: 5 });

      return {
        status: 'success',
        data: {
          total: cdrs.length,
          registros: cdrs.map((c) => ({
            data: c.startTime,
            origem: c.caller,
            destino: c.callee,
            duracao: c.duration,
            disposicao: c.disposition,
          })),
        },
        message: `Localizei os últimos ${cdrs.length} registros de chamadas do seu tenant.`,
      };
    } catch (err: any) {
      return {
        status: 'failed',
        data: {
          error: err.message || 'Erro ao consultar CDR',
        },
        message: 'Não foi possível consultar os registros de chamadas no momento.',
      };
    }
  }
}
