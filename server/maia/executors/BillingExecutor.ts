import { IMaiaExecutor, ToolExecutionContext, ToolExecutionOutput } from './MaiaToolExecutor.js';
import { BillingRepository } from '../../infrastructure/postgres/repositories/BillingRepository.js';

/**
 * BillingExecutor — Consulta real de faturas e status financeiro
 * Retornos estritos: FOUND | NOT_FOUND | AMBIGUOUS | UNAVAILABLE
 * Regra: NUNCA inventar valores (como R$ 249,00), boletos, PIX ou datas fictícias.
 */
export class BillingExecutor implements IMaiaExecutor {
  async execute(args: Record<string, unknown>, context: ToolExecutionContext): Promise<ToolExecutionOutput> {
    const rawDoc = (args.cpf_cnpj as string || args.documento as string || '').trim().replace(/\D/g, '');

    try {
      const billing = await BillingRepository.getByTenantId(context.tenantId);

      if (!billing) {
        return {
          status: 'failed',
          data: {
            result: 'UNAVAILABLE',
            message: 'Módulo de faturamento indisponível para este tenant.',
          },
          message: 'O serviço de consulta financeira está temporariamente indisponível. Posso transferir para o setor financeiro?',
        };
      }

      const invoices = billing.recentInvoices || [];

      // Filtra faturas pendentes ou abertas
      const pendingInvoices = invoices.filter(
        (inv) => inv.status === 'pending' || inv.status === 'overdue'
      );

      if (pendingInvoices.length === 0) {
        if (invoices.length === 0) {
          return {
            status: 'success',
            data: {
              result: 'NOT_FOUND',
              mensagem: 'Nenhuma fatura registrada para esta conta.',
            },
            message: 'Não localizei faturas registradas para sua conta no momento. Seu cadastro está sem pendências ativas.',
          };
        }

        const lastPaid = invoices[0];
        return {
          status: 'success',
          data: {
            result: 'FOUND',
            statusConta: 'em_dia',
            ultimaFatura: {
              valor: lastPaid.amount,
              status: lastPaid.status,
              vencimento: lastPaid.dueDate,
              pagoEm: lastPaid.paidAt || null,
            },
          },
          message: 'Consta aqui que sua conta está totalmente em dia! Não há faturas em aberto no momento.',
        };
      }

      if (pendingInvoices.length === 1) {
        const inv = pendingInvoices[0];
        const formattedVal = inv.amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
        const dueDateFormatted = inv.dueDate ? new Date(inv.dueDate).toLocaleDateString('pt-BR') : 'não informada';

        return {
          status: 'success',
          data: {
            result: 'FOUND',
            fatura: {
              id: inv.id,
              valor: inv.amount,
              valorFormatado: formattedVal,
              vencimento: dueDateFormatted,
              status: inv.status === 'overdue' ? 'vencida' : 'pendente',
            },
          },
          message: `Localizei uma fatura em aberto no valor de ${formattedVal}, com vencimento em ${dueDateFormatted}. Deseja que eu envie a 2ª via ou código de pagamento?`,
        };
      }

      // Mais de uma fatura em aberto
      const totalAmount = pendingInvoices.reduce((acc, cur) => acc + cur.amount, 0);
      const totalFormatted = totalAmount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

      return {
        status: 'success',
        data: {
          result: 'AMBIGUOUS',
          quantidadeFaturas: pendingInvoices.length,
          valorTotal: totalAmount,
          valorTotalFormatado: totalFormatted,
        },
        message: `Identifiquei ${pendingInvoices.length} faturas em aberto no sistema, somando ${totalFormatted}. Gostaria de transferir para nosso setor financeiro para detalhamento?`,
      };
    } catch (err: any) {
      return {
        status: 'failed',
        data: {
          result: 'UNAVAILABLE',
          error: err.message || 'Erro ao conectar ao módulo financeiro',
        },
        message: 'Não foi possível consultar os dados da sua fatura no momento devido a uma indisponibilidade no gateway financeiro.',
      };
    }
  }
}
