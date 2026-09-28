import { IMaiaExecutor, ToolExecutionContext, ToolExecutionOutput } from './MaiaToolExecutor.js';
import { asteriskAdapter } from '../../infrastructure/asterisk/AsteriskAdapter.js';

export class AsteriskTransferExecutor implements IMaiaExecutor {
  async execute(args: Record<string, unknown>, context: ToolExecutionContext): Promise<ToolExecutionOutput> {
    const destino = (args.destino as string || '').trim();
    const motivo = (args.motivo as string || 'Transferência solicitada pelo chamador').trim();

    if (!destino) {
      return {
        status: 'failed',
        data: {
          motivo,
          erro: 'Destino de transferência não informado.',
        },
        message: 'Por favor, indique para qual ramal ou setor deseja que eu transfira a ligação.',
      };
    }

    // Validação estrita de segurança do formato do destino
    if (!/^[a-zA-Z0-9_\-]+$/.test(destino) || destino.length > 30) {
      return {
        status: 'failed',
        data: {
          motivo,
          erro: 'Formato de ramal ou destino inválido.',
        },
        message: 'O número de ramal informado é inválido. Por favor, confirme o número do ramal.',
      };
    }

    if (!context.tenantId) {
      return {
        status: 'failed',
        data: { erro: 'Contexto de tenant ausente para transferência.' },
        message: 'Não foi possível validar as permissões corporativas para esta transferência.',
      };
    }

    // Identifica o canal Asterisk real
    const channelId = context.asteriskChannelId;

    if (!channelId) {
      // Se não há canal telefônico ativo (ex: chamada de teste via webchat/preview sem canal Asterisk)
      return {
        status: 'pending',
        action: 'transfer',
        transferDestination: destino,
        data: {
          estado: 'pending',
          destino,
          motivo,
          canal: null,
          observacao: 'Aguardando atribuição de canal telefônico Asterisk.',
        },
        message: `Estou direcionando seu atendimento para o ramal ${destino}. Um momento, por favor.`,
      };
    }

    try {
      const transferRes = await asteriskAdapter.transferCall(channelId, destino);

      if (transferRes.success) {
        return {
          status: 'success',
          action: 'transfer',
          transferDestination: destino,
          data: {
            estado: 'success',
            canal: channelId,
            destino,
            motivo,
            mensagem: transferRes.message,
          },
          message: `Transferindo sua chamada agora para o ramal ${destino}. Por favor, aguarde.`,
        };
      } else {
        return {
          status: 'failed',
          action: 'none',
          data: {
            estado: 'failed',
            canal: channelId,
            destino,
            erro: transferRes.message,
          },
          message: `Não foi possível concluir a transferência para o ramal ${destino} no momento. O destino pode estar ocupado. Como prefere prosseguir?`,
        };
      }
    } catch (err: any) {
      return {
        status: 'failed',
        action: 'none',
        data: {
          estado: 'failed',
          canal: channelId,
          destino,
          erro: err.message || 'Falha na comunicação com o Asterisk',
        },
        message: 'Ocorreu uma falha técnica ao tentar transferir sua ligação. Deseja que eu tente novamente?',
      };
    }
  }
}

export class AsteriskHangupExecutor implements IMaiaExecutor {
  async execute(args: Record<string, unknown>, context: ToolExecutionContext): Promise<ToolExecutionOutput> {
    const motivo = (args.motivo as string || 'Encerramento normal da ligação').trim();
    const channelId = context.asteriskChannelId;

    if (!channelId) {
      return {
        status: 'success',
        action: 'hangup',
        data: {
          estado: 'completed',
          motivo,
          canal: null,
        },
        message: 'Agradecemos seu contato. Tenha um excelente dia!',
      };
    }

    try {
      const hangupRes = await asteriskAdapter.hangupCall(channelId);

      if (hangupRes.success) {
        return {
          status: 'success',
          action: 'hangup',
          data: {
            estado: 'completed',
            canal: channelId,
            motivo,
          },
          message: 'Ligação encerrada. Agradecemos pelo contato!',
        };
      } else {
        return {
          status: 'failed',
          action: 'none',
          data: {
            estado: 'failed',
            canal: channelId,
            erro: hangupRes.message,
          },
          message: 'Não foi possível desconectar o canal no Asterisk.',
        };
      }
    } catch (err: any) {
      return {
        status: 'failed',
        action: 'none',
        data: {
          estado: 'failed',
          canal: channelId,
          erro: err.message || 'Erro ao comunicar desligamento ao Asterisk',
        },
        message: 'Erro ao registrar término de chamada no Asterisk.',
      };
    }
  }
}
