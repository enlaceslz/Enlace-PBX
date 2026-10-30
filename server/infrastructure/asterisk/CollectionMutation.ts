import {OutboundHttpError} from '../security/OutboundHttp.js';
export type CollectionKind='queue'|'group';
export const collectionColumns={name:'name',number:'number',strategy:'strategy',timeoutSeconds:'timeout_seconds',members:'members',wrapUpTimeSeconds:'wrap_up_time_seconds',mohSound:'moh_sound',failoverDestination:'fallback_target'} as const;
export function collectionPatch(kind:CollectionKind,input:unknown,create=false):Record<string,any>{
 if(!input||typeof input!=='object'||Array.isArray(input)||!Object.keys(input).length)throw new OutboundHttpError('Cadastro inválido.',400);
 const patch:Record<string,any>={};
 for(const [key,value] of Object.entries(input)){
  if(!Object.hasOwn(collectionColumns,key)||kind==='queue'&&key==='failoverDestination'||kind==='group'&&['wrapUpTimeSeconds','mohSound'].includes(key))throw new OutboundHttpError('Campo não editável neste cadastro.',400);
  if(key==='members'){if(!Array.isArray(value)||value.length<1||value.length>64||value.some(number=>typeof number!=='string'||!/^[1-9][0-9]{1,7}$/.test(number))||new Set(value).size!==value.length)throw new OutboundHttpError('Informe de 1 a 64 ramais distintos.',400);}
  else if(key==='timeoutSeconds'||key==='wrapUpTimeSeconds'){if(typeof value!=='number'||!Number.isInteger(value)||value<(key==='timeoutSeconds'?1:0)||value>(key==='timeoutSeconds'?300:3600))throw new OutboundHttpError('Tempo fora do limite permitido.',400);}
  else{
   if(typeof value!=='string'||value.length>128||/[\x00-\x1f\x7f;\\\[\]#]/.test(value))throw new OutboundHttpError('Campo textual inválido.',400);
   if(key==='name'&&!value.trim())throw new OutboundHttpError('Nome obrigatório.',400);
   if(key==='number'&&!/^[1-9][0-9]{3,7}$/.test(value))throw new OutboundHttpError('Número interno deve ter de 4 a 8 dígitos.',400);
   if(key==='strategy'&&!(kind==='group'?['ringall']:['ringall','rrmemory','leastrecent','fewestcalls','random','linear']).includes(value))throw new OutboundHttpError('Estratégia ainda não suportada neste gerador.',501);
   if(key==='mohSound'&&value!=='default')throw new OutboundHttpError('Classes de música personalizadas exigem provisionamento e homologação.',501);
   if(key==='failoverDestination'&&value!=='')throw new OutboundHttpError('Fallback de grupo ainda não implementado. Sem fallback, a chamada é encerrada.',501);
  }
  patch[key]=key==='name'?(value as string).trim():value;
 }
 if(create&&(!patch.name||!patch.number||!patch.members))throw new OutboundHttpError('Nome, número interno e ramais explícitos são obrigatórios.',400);
 return patch;
}
export function managedCollection(kind:CollectionKind,value:any,extensions:{number:string}[]){
 const patch=collectionPatch(kind,{name:value.name,number:value.number,strategy:value.strategy,timeoutSeconds:value.timeoutSeconds,members:value.members,...(kind==='queue'?{wrapUpTimeSeconds:value.wrapUpTimeSeconds,mohSound:value.mohSound}:{failoverDestination:value.failoverDestination??''})},true);
 if(kind==='group'&&value.fallbackType&&!['hangup'].includes(value.fallbackType))throw new OutboundHttpError('Fallback legado exige revisão antes de aplicar.',501);
 if(patch.members.some((member:string)=>!extensions.some(extension=>extension.number===member)))throw new OutboundHttpError('Membro não pertence à empresa.',400);
 if(value.id&&!/^[-a-z0-9_]{1,64}$/i.test(value.id))throw new OutboundHttpError('Identificador legado inválido.',400);
 return patch;
}
export function assertInternalNumbers(extensions:{number:string}[],groups:{number:string}[],queues:{number:string}[],ivrs:{number:string}[]){
 const seen=new Set<string>();for(const item of [...extensions,...groups,...queues,...ivrs]){if(seen.has(item.number))throw new OutboundHttpError('Números internos conflitantes exigem revisão antes de aplicar.',409);seen.add(item.number);}
}
export const queueDto=(value:any)=>({...value,callsWaiting:null,avgWaitTimeSeconds:null,abandonedToday:null,answeredToday:null,telemetryStatus:'NOT_MEASURED'});
