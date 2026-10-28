import { IMaiaExecutor, ToolExecutionContext, ToolExecutionOutput } from './MaiaToolExecutor.js';
import { asteriskService } from '../../asteriskService.js';
import { callExtension, channelReference } from '../../infrastructure/asterisk/CallControl.js';
import { ExtensionRepository } from '../../infrastructure/postgres/repositories/ExtensionRepository.js';
import { AuditLogRepository } from '../../infrastructure/postgres/repositories/AuditLogRepository.js';

function rejected(message: string, uncertain = false): ToolExecutionOutput {
  return {status:'failed',action:'none',data:{estado:uncertain ? 'UNKNOWN' : 'NOT_EXECUTED',erro:message},message};
}
async function attempt(context: ToolExecutionContext, action: string) {
  await AuditLogRepository.logStrict({tenantId:context.tenantId,userId:context.agentId || 'maia-voice-bot',
    userName:'MaIA Voice Gateway',action,resource:'asterisk/channels',ip:'127.0.0.1',
    details:'Tentativa de controle de canal pela MaIA. Aceite AMI não confirma conclusão.',
    payload:{correlationId:context.correlationId,sessionId:context.sessionId}});
}

export class AsteriskTransferExecutor implements IMaiaExecutor {
  async execute(args: Record<string,unknown>,context: ToolExecutionContext): Promise<ToolExecutionOutput> {
    if(!context.tenantId || !context.asteriskChannelId)return rejected('Não há canal telefônico validado para transferir. Nenhuma transferência foi executada.');
    let dispatched=false;
    try {
      const destination=callExtension(args.destino);channelReference(context.asteriskChannelId);
      const extension=await ExtensionRepository.findByNumber(context.tenantId,destination);
      if(!extension || extension.allowAiTransfer===false)return rejected('O ramal não pertence a esta empresa ou não permite transferência automática.');
      // Falha de auditoria impede o envio ao Asterisk.
      await attempt(context,'AI_CALL_TRANSFER_ATTEMPT');
      dispatched=true;
      const accepted=await asteriskService.transferChannel(context.asteriskChannelId,destination,context.tenantId,false);
      return {status:'pending',action:'none',data:{estado:'ACCEPTED',operationId:accepted.operationId},
        message:'O Asterisk aceitou a solicitação de transferência. A conexão com o destino ainda não foi confirmada.'};
    }catch {
      return rejected('Transferência sem confirmação. Verifique o estado da chamada antes de solicitar novamente.',dispatched);
    }
  }
}

export class AsteriskHangupExecutor implements IMaiaExecutor {
  async execute(_args: Record<string,unknown>,context: ToolExecutionContext): Promise<ToolExecutionOutput> {
    if(!context.tenantId || !context.asteriskChannelId)return rejected('Não há canal telefônico validado para encerrar. Nenhum encerramento foi executado.');
    let dispatched=false;
    try {
      channelReference(context.asteriskChannelId);
      await attempt(context,'AI_CALL_HANGUP_ATTEMPT');
      dispatched=true;
      const accepted=await asteriskService.hangupChannel(context.asteriskChannelId,context.tenantId,false);
      return {status:'pending',action:'none',data:{estado:'ACCEPTED',operationId:accepted.operationId},
        message:'O Asterisk aceitou a solicitação de encerramento. O término da chamada ainda precisa ser verificado.'};
    }catch {
      return rejected('Encerramento sem confirmação. Verifique o estado da chamada antes de solicitar novamente.',dispatched);
    }
  }
}
