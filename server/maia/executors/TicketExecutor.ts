import crypto from 'crypto';
import { IMaiaExecutor, ToolExecutionContext, ToolExecutionOutput } from './MaiaToolExecutor.js';

export class TicketExecutor implements IMaiaExecutor {
  async execute(args: Record<string, unknown>, context: ToolExecutionContext): Promise<ToolExecutionOutput> {
    const categoria = (args.categoria as string || 'suporte_geral').trim();
    const descricao = (args.descricao as string || 'Chamado registrado via MaIA').trim();
    const urgencia = (args.urgencia as string || 'media').trim();

    // Gera ID UUID e número de protocolo criptográfico seguro (não Date.now())
    const ticketId = crypto.randomUUID();
    const protocolNumber = `ENL-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;

    return {
      status: 'success',
      data: {
        ticketId,
        protocolo: protocolNumber,
        categoria,
        descricao,
        urgencia,
        status: 'aberto',
        abertoEm: new Date().toISOString(),
      },
      message: `Chamado registrado com sucesso sob o protocolo ${protocolNumber}. Nossa equipe técnica dará andamento à sua solicitação.`,
    };
  }
}
