import {OutboundHttpError} from '../security/OutboundHttp.js';
export const routeColumns={name:'name',pattern:'pattern',trunkId:'trunk_id',failoverTrunkId:'failover_trunk_id',priority:'priority',stripDigits:'strip_digits',prepend:'prepend_digits',isActive:'is_active'} as const;
export function routePattern(value:unknown){
 if(typeof value!=='string'||value.length<1||value.length>64)throw new OutboundHttpError('Padrão de discagem inválido.',400);
 const pattern=value.startsWith('_')?value.slice(1):value;
 if(!/^(?:[0-9XNZ]|\[[0-9](?:-[0-9])?\]){1,32}\.?$/.test(pattern))throw new OutboundHttpError('Use dígitos, X/N/Z, intervalos de um dígito e ponto apenas no final.',400);
 for(const match of pattern.matchAll(/\[([0-9])-([0-9])\]/g))if(match[1]>match[2])throw new OutboundHttpError('Intervalo de discagem inválido.',400);
 return /[XNZ[.]/.test(pattern)?'_'+pattern:pattern;
}
export function routePatch(input:unknown,create=false):Record<string,any>{
 if(!input||typeof input!=='object'||Array.isArray(input)||!Object.keys(input).length)throw new OutboundHttpError('Cadastro de rota inválido.',400);
 const patch:Record<string,any>={};
 for(const [key,value] of Object.entries(input)){
  if(key==='type'){if(value!=='outbound')throw new OutboundHttpError('Rotas de entrada devem usar o cadastro de DIDs. Outros recursos aguardam implementação.',501);continue;}
  if(!Object.hasOwn(routeColumns,key))throw new OutboundHttpError('Campo não editável ou recurso de rota ainda não implementado.',400);
  if(key==='pattern'){patch.pattern=routePattern(value);continue;}
  if(key==='isActive'){if(typeof value!=='boolean')throw new OutboundHttpError('Estado cadastral deve ser booleano.',400);}
  else if(key==='priority'||key==='stripDigits'){if(typeof value!=='number'||!Number.isInteger(value)||value<(key==='priority'?1:0)||value>(key==='priority'?1000:20))throw new OutboundHttpError('Prioridade ou quantidade de dígitos inválida.',400);}
  else{
   if(typeof value!=='string'||/[\x00-\x1f\x7f;\\\[\]#]/.test(value))throw new OutboundHttpError('Campo textual de rota inválido.',400);
   if(key==='name'&&(!value.trim()||value.length>128))throw new OutboundHttpError('Nome da rota inválido.',400);
   if(['trunkId','failoverTrunkId'].includes(key)&&!(key==='failoverTrunkId'&&value==='')&&!/^[-a-z0-9_]{1,64}$/i.test(value))throw new OutboundHttpError('Tronco inválido.',400);
   if(key==='prepend'&&!/^[0-9]{0,20}$/.test(value))throw new OutboundHttpError('Prefixo adicionado deve conter até 20 dígitos.',400);
  }
  patch[key]=key==='name'?(value as string).trim():value;
 }
 if(!Object.keys(patch).length)throw new OutboundHttpError('Informe campos editáveis.',400);
 if(create&&(!patch.name||!patch.pattern||!patch.trunkId))throw new OutboundHttpError('Nome, padrão e tronco são obrigatórios.',400);
 return patch;
}
export function managedRoutePlan(route:any,trunks:{id:string}[]){
 if(route.type!=='outbound'||route.isCliItx||route.callerIdOverride||(route.extensionOverrides!=null&&(!Array.isArray(route.extensionOverrides)||route.extensionOverrides.length>0))||route.timeConditionEnabled||route.afterHoursDestType||route.fallbackType)throw new OutboundHttpError('Rota legada com recursos não homologados exige revisão antes de aplicar.',501);
 const parsed=routePatch({name:route.name,pattern:route.pattern,trunkId:route.trunkId,failoverTrunkId:route.failoverTrunkId||'',stripDigits:route.stripDigits??Number(route.prefixRemove||0),prepend:route.prepend||'',priority:route.priority??1});
 if(!trunks.some(trunk=>trunk.id===parsed.trunkId)||parsed.failoverTrunkId&&(!trunks.some(trunk=>trunk.id===parsed.failoverTrunkId)||parsed.failoverTrunkId===parsed.trunkId))throw new OutboundHttpError('Rota sem troncos distintos da mesma empresa.',400);
 return parsed;
}
