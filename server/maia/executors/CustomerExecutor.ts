import { IMaiaExecutor, ToolExecutionContext, ToolExecutionOutput } from './MaiaToolExecutor.js';
import { CrmRepository } from '../../infrastructure/postgres/repositories/CrmRepository.js';

/**
 * CustomerExecutor — Consulta real de clientes no CRM/ERP
 * Retornos padronizados estritos: FOUND | NOT_FOUND | AMBIGUOUS | UNAVAILABLE
 * Regra: NUNCA inventar cliente.
 */
export class CustomerExecutor implements IMaiaExecutor {
  async execute(args: Record<string, unknown>, context: ToolExecutionContext): Promise<ToolExecutionOutput> {
    const rawDoc = (args.cpf_cnpj as string || args.documento as string || '').trim().replace(/\D/g, '');
    const rawPhone = (args.telefone as string || context.callerNumber || '').trim().replace(/\D/g, '');

    try {
      const contacts = await CrmRepository.listContacts(context.tenantId);

      if (!contacts) {
        return {
          status: 'failed',
          data: {
            result: 'UNAVAILABLE',
            message: 'Módulo de CRM temporariamente indisponível para este tenant.',
          },
          message: 'O sistema de cadastro de clientes está temporariamente indisponível para consulta automática.',
        };
      }

      // Filtra por telefone ou documento
      const matched = contacts.filter((c) => {
        const cleanCPhone = (c.phone || '').replace(/\D/g, '');
        if (rawPhone && cleanCPhone && (cleanCPhone.endsWith(rawPhone) || rawPhone.endsWith(cleanCPhone))) {
          return true;
        }
        if (rawDoc && c.crmId && c.crmId.replace(/\D/g, '').includes(rawDoc)) {
          return true;
        }
        return false;
      });

      if (matched.length === 0) {
        return {
          status: 'success',
          data: {
            result: 'NOT_FOUND',
            documentoConsultado: rawDoc || null,
            telefoneConsultado: rawPhone || null,
          },
          message: 'Não localizei nenhum cadastro com os dados informados em nossa base ativa.',
        };
      }

      if (matched.length > 1) {
        return {
          status: 'success',
          data: {
            result: 'AMBIGUOUS',
            count: matched.length,
          },
          message: 'Localizei mais de um cadastro associado a este número. Poderia me confirmar o seu nome completo ou CPF?',
        };
      }

      const client = matched[0];
      return {
        status: 'success',
        data: {
          result: 'FOUND',
          cliente: {
            id: client.id,
            nome: client.name,
            telefone: client.phone,
            email: client.email || null,
            ultimaInteracao: client.lastInteraction || null,
          },
        },
        message: `Cadastro localizado: ${client.name}. Como posso ajudar com seu contrato hoje?`,
      };
    } catch (err: any) {
      return {
        status: 'failed',
        data: {
          result: 'UNAVAILABLE',
          error: err.message || 'Erro ao conectar à base de CRM',
        },
        message: 'Não foi possível consultar os dados cadastrais no momento devido a uma instabilidade no CRM.',
      };
    }
  }
}
