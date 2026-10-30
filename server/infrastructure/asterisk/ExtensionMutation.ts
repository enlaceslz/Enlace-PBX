import {OutboundHttpError} from '../security/OutboundHttp.js';
export const extensionColumns={number:'number',name:'name',sipSecret:'sip_secret',context:'context',callerId:'caller_id',cliCallerId:'cli_caller_id',codecs:'codecs',nat:'nat',webrtc:'webrtc',recording:'recording',voicemail:'voicemail',dnd:'dnd',allowAiTransfer:'allow_ai_transfer'} as const;
export function extensionPatch(input:unknown,create=false):Record<string,any>{
 if(!input||typeof input!=='object'||Array.isArray(input)||!Object.keys(input).length)throw new OutboundHttpError('Cadastro de ramal inválido.',400);
 const patch:Record<string,any>={};
 for(const [key,value] of Object.entries(input)){
  if(!Object.hasOwn(extensionColumns,key))throw new OutboundHttpError('Campo não editável no ramal.',400);
  if(['nat','webrtc','voicemail','dnd','allowAiTransfer'].includes(key)){
   if(typeof value!=='boolean')throw new OutboundHttpError('Informe um valor booleano.',400);
   if(key==='nat'&&!value||['voicemail','dnd'].includes(key)&&value)throw new OutboundHttpError('NAT desativado, correio de voz e DND exigem implementação e homologação.',501);
  }else if(key==='codecs'){
   if(!Array.isArray(value)||!value.length||value.length>4||new Set(value).size!==value.length||value.some(codec=>!['opus','alaw','ulaw','g722'].includes(codec)))throw new OutboundHttpError('Codecs permitidos: opus, alaw, ulaw e g722.',400);
  }else{
   if(typeof value!=='string'||value.length>256||/[\x00-\x1f\x7f;\\]/.test(value))throw new OutboundHttpError('Campo textual inválido.',400);
   if(key==='number'&&!/^[1-9][0-9]{1,7}$/.test(value))throw new OutboundHttpError('Ramal deve ter de 2 a 8 dígitos, sem zero inicial.',400);
   if(key==='name'&&(!value.trim()||value.length>128))throw new OutboundHttpError('Nome obrigatório, até 128 caracteres.',400);
   if(key==='sipSecret'&&value!==''&&(value.length<12||value.length>128))throw new OutboundHttpError('Senha SIP deve ter de 12 a 128 caracteres; vazio preserva a senha na edição.',400);
   if(key==='context'&&value!=='from-internal')throw new OutboundHttpError('Contexto permitido: from-internal.',400);
   if(key==='callerId'&&value!==''&&!/^[1-9][0-9]{1,7}$/.test(value)&&!/^[A-Za-zÀ-ÿ0-9 _.-]{1,64} <[1-9][0-9]{1,7}>$/.test(value)&&!/^"[A-Za-zÀ-ÿ0-9 _.-]{1,64}" <[1-9][0-9]{1,7}>$/.test(value))throw new OutboundHttpError('Identificação deve conter nome simples e número entre sinais < >.',400);
   if(key==='cliCallerId'&&value!=='')throw new OutboundHttpError('CLI de saída individual ainda não implementado.',501);
   if(key==='recording'&&!['always','never'].includes(value))throw new OutboundHttpError('Gravação permitida: sempre ou nunca.',400);
  }
  if(key!=='sipSecret'||value!=='')patch[key]=key==='name'?(value as string).trim():value;
 }
 if(create&&(!patch.name||!patch.number))throw new OutboundHttpError('Nome e número são obrigatórios.',400);
 if(!create&&!Object.keys(patch).length)throw new OutboundHttpError('Nenhuma alteração informada.',400);
 return patch;
}

/** Valida dados persistidos antes de qualquer interpolação na configuração. */
export function managedExtension(value:any,requireSecret=false){
 const fields=Object.fromEntries(Object.keys(extensionColumns).filter(key=>key!=='sipSecret').map(key=>[key,key==='cliCallerId'?(value[key]??''):value[key]]));
 const checked=extensionPatch(fields,true);
 if(requireSecret){
  if(typeof value.sipSecret!=='string'||!value.sipSecret.trim())throw new OutboundHttpError('Ramal sem senha SIP válida; revise o cadastro antes de aplicar.',400);
  extensionPatch({sipSecret:value.sipSecret});
 }
 return {...value,...checked};
}
