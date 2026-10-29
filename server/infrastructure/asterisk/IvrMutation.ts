import {OutboundHttpError} from '../security/OutboundHttp.js';
export const ivrColumns={name:'name',number:'number',audioPrompt:'audio_prompt',timeoutSeconds:'timeout_seconds',invalidRetries:'invalid_retries',options:'options',flow:'flow'} as const;
export function ivrPatch(input:unknown,create=false):Record<string,any>{
 if(!input||typeof input!=='object'||Array.isArray(input)||!Object.keys(input).length)throw new OutboundHttpError('Cadastro de URA inválido.',400);
 const patch:Record<string,any>={};
 for(const [key,value] of Object.entries(input)){
  if(!Object.hasOwn(ivrColumns,key))throw new OutboundHttpError('Campo não editável na URA.',400);
  if(key==='flow'){if(value!==null)throw new OutboundHttpError('Execução do fluxo visual ainda não implementada. Use o menu básico.',501);}
  else if(key==='options'){
   if(!Array.isArray(value)||value.length<1||value.length>12)throw new OutboundHttpError('Informe de 1 a 12 opções.',400);
   const digits=new Set();
   for(const option of value){
    if(!option||typeof option!=='object'||Array.isArray(option)||Object.keys(option).some(field=>!['digit','label','destinationType','destinationTarget'].includes(field))||typeof option.digit!=='string'||!/^[0-9*#]$/.test(option.digit)||digits.has(option.digit)||typeof option.label!=='string'||!option.label.trim()||option.label.length>128||/[\x00-\x1f\x7f]/.test(option.label))throw new OutboundHttpError('Opção de URA inválida ou repetida.',400);
    digits.add(option.digit);
    if(!['extension','queue','hangup'].includes(option.destinationType))throw new OutboundHttpError('Destino de URA ainda não suportado neste gerador.',501);
    if(typeof option.destinationTarget!=='string'||(option.destinationType==='hangup'?option.destinationTarget!=='':!/^[1-9][0-9]{1,7}$/.test(option.destinationTarget)))throw new OutboundHttpError('Destino de URA inválido.',400);
   }
  }else if(key==='timeoutSeconds'||key==='invalidRetries'){
   if(typeof value!=='number'||!Number.isInteger(value)||value<(key==='invalidRetries'?0:1)||value>(key==='invalidRetries'?5:60))throw new OutboundHttpError('Tempo ou tentativas fora do limite.',400);
  }else{
   if(typeof value!=='string'||!value.trim()||value.length>128||/[\x00-\x1f\x7f]/.test(value))throw new OutboundHttpError('Texto de URA inválido.',400);
   if(key==='number'&&!/^[1-9][0-9]{3,7}$/.test(value))throw new OutboundHttpError('Número interno deve ter de 4 a 8 dígitos.',400);
   if(key==='audioPrompt'&&(!/^[a-zA-Z0-9_-]+(?:\/[a-zA-Z0-9_-]+)*$/.test(value)||value.length>100))throw new OutboundHttpError('Informe um som instalado no Asterisk, relativo e sem extensão; texto não é convertido em áudio.',400);
  }
  patch[key]=key==='name'?(value as string).trim():value;
 }
 if(create&&['name','number','audioPrompt','timeoutSeconds','invalidRetries','options'].some(key=>patch[key]===undefined))throw new OutboundHttpError('Preencha todos os campos do menu básico.',400);
 return patch;
}
export function managedIvr(ivr:any,extensions:{number:string}[],queues:{id:string;number:string}[]){
 const patch=ivrPatch({name:ivr.name,number:ivr.number,audioPrompt:ivr.audioPrompt,timeoutSeconds:ivr.timeoutSeconds,invalidRetries:ivr.invalidRetries,options:ivr.options,...(ivr.flow?{flow:ivr.flow}:{})},true);
 if(!/^[-a-zA-Z0-9_]{1,64}$/.test(ivr.id))throw new OutboundHttpError('Identificador legado de URA inválido.',400);
 for(const option of patch.options){
  if(option.destinationType==='extension'&&!extensions.some(ext=>ext.number===option.destinationTarget))throw new OutboundHttpError('Ramal de destino não pertence à empresa.',400);
  if(option.destinationType==='queue'&&!queues.some(queue=>queue.number===option.destinationTarget))throw new OutboundHttpError('Informe o número interno de uma fila da empresa.',400);
 }
 return patch;
}
export function renderIvr(ivr:any){
 const context='ivr-'+ivr.id;
 return `[${context}]
exten => s,1,Answer()
 same => n,Set(IVR_INVALID=0)
 same => n(menu),Background(${ivr.audioPrompt})
 same => n,WaitExten(${ivr.timeoutSeconds})
 same => n,Hangup()
${ivr.options.map((option:any)=>`exten => ${option.digit},1,NoOp(Opção de URA)
${option.destinationType==='hangup'?' same => n,Hangup()':` same => n,Goto(${option.destinationType==='queue'?'call-queues':'from-internal'},${option.destinationTarget},1)`}`).join('\n')}
exten => t,1,Hangup()
exten => i,1,Set(IVR_INVALID=$[\${IVR_INVALID}+1])
 same => n,GotoIf($[\${IVR_INVALID}>${ivr.invalidRetries}]?end)
 same => n,Goto(s,menu)
 same => n(end),Hangup()`;
}
