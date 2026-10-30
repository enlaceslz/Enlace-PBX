import { OutboundHttpError } from '../../infrastructure/security/OutboundHttp.js';
export interface WorkflowActor {id:string;name:string;role:string}
export function validateWorkflowInput(status:unknown,version:unknown){
 if(status==='bot_handling')throw new OutboundHttpError('Atendimento automático ainda não está disponível.',501);
 if(!['active','closed','queued'].includes(status as string)||!Number.isInteger(version)||(version as number)<0)throw new OutboundHttpError('Informe estado válido e a versão atual do atendimento.',400);
}
export function assertWorkflowAccess(owner:string|null,actor:WorkflowActor){
 if(owner&&owner!==actor.id&&!['super_admin','admin','supervisor'].includes(actor.role))throw new OutboundHttpError('Atendimento atribuído a outro operador.',403);
}
export function nextWorkflow(current:{status:string;assigned_user_id:string|null;workflow_version:number},status:string,expectedVersion:number,actor:WorkflowActor){
 validateWorkflowInput(status,expectedVersion);
 if(current.workflow_version!==expectedVersion)throw new OutboundHttpError('O atendimento mudou. Atualize a conversa antes de repetir.',409);
 assertWorkflowAccess(current.assigned_user_id,actor);
 if(current.status==='closed'&&status!=='active')throw new OutboundHttpError('Reabra o atendimento antes de alterar este estado.',409);
 return {status,owner:status==='active'?actor.id:null};
}
export function validateInternalNote(text:unknown,requestId:unknown){
 if(typeof text!=='string'||!text.trim()||text.length>4000||typeof requestId!=='string'||!/[a-z0-9]/i.test(requestId)||!/^[a-zA-Z0-9-]{16,64}$/.test(requestId))throw new OutboundHttpError('Informe anotação de até 4000 caracteres e identificador de tentativa válido.',400);
 return {text:text.trim(),requestId};
}
