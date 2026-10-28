import { IMaiaExecutor, ToolExecutionContext, ToolExecutionOutput } from './MaiaToolExecutor.js';
import { TicketRepository } from '../../infrastructure/postgres/repositories/TicketRepository.js';

export class TicketExecutor implements IMaiaExecutor {
  async execute(args: Record<string, unknown>, context: ToolExecutionContext): Promise<ToolExecutionOutput> {
    try {
      const ticket = await TicketRepository.create(context.tenantId, {
        requestId: context.correlationId,
        callerNumber: context.callerNumber,
        category: typeof args.categoria === 'string' ? args.categoria.trim() : 'suporte_geral',
        description: typeof args.descricao === 'string' ? args.descricao : '',
        urgency: typeof args.urgencia === 'string' ? args.urgencia : 'media',
      });
      return { status: 'success', data: { ticketId: ticket.id, protocolo: ticket.protocol, categoria: ticket.category,
        descricao: ticket.description, urgencia: ticket.urgency, status: ticket.status, abertoEm: ticket.created_at },
        message: `Chamado registrado sob o protocolo ${ticket.protocol}.` };
    } catch {
      return { status: 'failed', data: { result: 'UNAVAILABLE' }, message: 'Não foi possível confirmar o registro do chamado. Solicite atendimento humano.' };
    }
  }
}
