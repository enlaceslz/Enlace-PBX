import {OutboundHttpError} from '../security/OutboundHttp.js';
export const didColumns={did:'did',trunkId:'trunk_id',description:'description',status:'status',assignedCompany:'assigned_company',assignedCnpj:'assigned_cnpj',assignedUser:'assigned_user',monthlyFee:'monthly_fee',billingCycleDay:'billing_cycle_day',destinationType:'destination_type',destinationId:'destination_id'} as const;
export function nationalDid(value:unknown){
 if(typeof value!=='string'||value.length>32||!/^\+?[0-9 ().-]+$/.test(value))throw new OutboundHttpError('Número de DID inválido.',400);
 let digits=value.replace(/\D/g,'');if(digits.startsWith('55')&&[12,13].includes(digits.length))digits=digits.slice(2);
 if(!/^(?:[1-9][0-9][2-5][0-9]{7}|[1-9][0-9]9[0-9]{8}|0[38]00[0-9]{7})$/.test(digits))throw new OutboundHttpError('Informe DID nacional válido, com DDD, ou número 0300/0800 de 11 dígitos.',400);
 return digits;
}
export function didPatch(input:unknown,create=false):Record<string,any>{
 if(!input||typeof input!=='object'||Array.isArray(input)||!Object.keys(input).length)throw new OutboundHttpError('Cadastro de DID inválido.',400);
 const patch:Record<string,any>={};
 for(const [key,value] of Object.entries(input)){
  if(!Object.hasOwn(didColumns,key))throw new OutboundHttpError('Campo do DID não editável ou recurso ainda não implementado.',400);
  if(key==='monthlyFee'){if(typeof value!=='number'||!Number.isFinite(value)||value<0||value>99999999.99||Math.abs(value*100-Math.round(value*100))>0.00001)throw new OutboundHttpError('Mensalidade inválida.',400);}
  else if(key==='billingCycleDay'){if(typeof value!=='number'||!Number.isInteger(value)||value<1||value>28)throw new OutboundHttpError('Vencimento deve estar entre 1 e 28.',400);}
  else{
   if(typeof value!=='string'||value.length>(key==='description'?500:key==='assignedCompany'?255:128)||/[\x00-\x1f\x7f;\\\[\]#]/.test(value))throw new OutboundHttpError('Campo textual de DID inválido.',400);
   if(key==='did'){patch.did=nationalDid(value);continue;}
   if(key==='trunkId'&&!/^[-a-z0-9_]{1,64}$/i.test(value))throw new OutboundHttpError('Tronco inválido.',400);
   if(key==='destinationType'&&value!=='extension')throw new OutboundHttpError('Roteamento deste cadastro disponível apenas para ramal explícito. Demais destinos aguardam implementação e homologação.',501);
   if(key==='destinationId'&&!/^[1-9][0-9]{1,7}$/.test(value))throw new OutboundHttpError('Informe número de ramal explícito.',400);
   if(key==='status'&&!['active','inactive','suspended'].includes(value))throw new OutboundHttpError('Estado cadastral inválido.',400);
   if(key==='assignedCnpj'&&(value.length>32||!/^[0-9./ -]*$/.test(value)))throw new OutboundHttpError('Documento cadastral inválido.',400);
  }
  patch[key]=value;
 }
 if(create&&(!patch.did||!patch.trunkId||patch.destinationType!=='extension'||!patch.destinationId))throw new OutboundHttpError('Número, tronco e ramal de destino explícitos são obrigatórios.',400);
 return patch;
}
