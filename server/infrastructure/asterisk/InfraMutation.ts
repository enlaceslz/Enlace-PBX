import net from 'node:net';
import {OutboundHttpError} from '../security/OutboundHttp.js';
import {pjsipInfrastructure} from './PjsipInfrastructure.js';
export const infraFields=['hostname','domain','publicIp','lanIp','lanSubnet','lanGateway','lanInterface','natMode','stunServer'] as const;
export const infraPorts=['sipUdp','sipTls','webrtcWss','http','https','rtpRange','ariPort','amiPort'] as const;
const invalid=()=>new OutboundHttpError('Campos de infraestrutura inválidos. Revise tipos, nomes, endereços e limites.',400);
const object=(value:any)=>!!value&&typeof value==='object'&&!Array.isArray(value);
const host=(value:string)=>value.length<=253&&value.split('.').every(part=>/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/i.test(part));
const path=(value:string)=>value===''||value.length<=512&&/^\/(?:[-a-zA-Z0-9_.]+\/)*[-a-zA-Z0-9_.]+$/.test(value)&&!value.split('/').some(part=>part==='.'||part==='..');
export function infraPatch(input:unknown){
 if(!object(input))throw invalid();const body=input as Record<string,any>;
 if(!Number.isSafeInteger(body.expectedRevision)||body.expectedRevision<0)throw new OutboundHttpError('Revisão da infraestrutura obrigatória. Recarregue o formulário.',400);
 const patch:Record<string,any>={};
 for(const [key,value] of Object.entries(body)){
  if(key==='expectedRevision')continue;
  if((infraFields as readonly string[]).includes(key)){
   if(typeof value!=='string'||value.length>253||/[\x00-\x1f\x7f;\\\[\]$()]/.test(value))throw invalid();
   if(['hostname','domain'].includes(key)&&!host(value))throw invalid();
   if(['publicIp','lanIp','lanGateway'].includes(key)&&!(key==='lanGateway'&&value==='')&&net.isIP(value)!==4)throw invalid();
   if(key==='lanInterface'&&!/^[a-zA-Z0-9_.:-]{1,32}$/.test(value))throw invalid();
   if(key==='natMode'&&value!=='force_rport')throw new OutboundHttpError('Somente NAT force_rport está implementado neste gerador.',501);
   if(key==='stunServer'&&value){const target=value.replace(/^stun:/,'');const parts=target.split(':');if(parts.length>2||!host(parts[0])||parts[1]&&(!/^\d{1,5}$/.test(parts[1])||Number(parts[1])<1||Number(parts[1])>65535))throw invalid();}
   patch[key]=value;
  }else if(key==='ports'){
   if(!object(value)||!Object.keys(value).length)throw invalid();patch.ports={};
   for(const [name,port] of Object.entries(value)){
    if(!(infraPorts as readonly string[]).includes(name))throw invalid();
    if(name==='rtpRange'){if(typeof port!=='string'||!/^\d{4,5}-\d{4,5}$/.test(port))throw invalid();const [start,end]=port.split('-').map(Number);if(start<1024||end>65535||start>=end)throw invalid();}
    else if(typeof port!=='number'||!Number.isInteger(port)||port<1||port>65535)throw invalid();
    patch.ports[name]=port;
   }
  }else if(key==='sslCertificate'){
   if(!object(value)||!Object.keys(value).length)throw invalid();patch.sslCertificate={};
   for(const [name,setting] of Object.entries(value)){
    if(!['provider','certPath','keyPath'].includes(name)||typeof setting!=='string')throw invalid();
    if(name==='provider'?!['custom','letsencrypt'].includes(setting):!path(setting))throw invalid();
    patch.sslCertificate[name]=setting;
   }
  }else throw invalid();
 }
 if(!Object.keys(patch).length)throw invalid();return {expectedRevision:body.expectedRevision as number,patch};
}
export function mergeInfra(previous:any,patch:Record<string,any>){
 const next={...previous,...patch,ports:{...previous?.ports,...patch.ports},sslCertificate:{...previous?.sslCertificate,...patch.sslCertificate}};
 if(!!next.sslCertificate.certPath!==!!next.sslCertificate.keyPath)throw invalid();
 const certificateChanged=patch.sslCertificate&&Object.entries(patch.sslCertificate).some(([key,value])=>value!==previous?.sslCertificate?.[key]);
 if(certificateChanged||!previous?.sslCertificate)next.sslCertificate.status=next.sslCertificate.certPath&&next.sslCertificate.keyPath?'pending':'not_configured';
 const editable=Object.fromEntries(infraFields.filter(key=>next[key]!==undefined).map(key=>[key,next[key]]));
 infraPatch({expectedRevision:0,...editable,ports:next.ports,...(next.sslCertificate.provider?{sslCertificate:Object.fromEntries(['provider','certPath','keyPath'].filter(key=>next.sslCertificate[key]!==undefined).map(key=>[key,next.sslCertificate[key]]))}:{})});
 pjsipInfrastructure(next);
 return next;
}
export function infraDto(value:any){
 const result:Record<string,any>={configured:!!value,revision:value?._revision??0,validationStatus:'NOT_VERIFIED'};
 if(!value)return result;
 for(const key of infraFields)if(value[key]!==undefined)result[key]=value[key];
 result.ports=Object.fromEntries(infraPorts.filter(key=>value.ports?.[key]!==undefined).map(key=>[key,value.ports[key]]));
 result.sslCertificate=Object.fromEntries(['provider','certPath','keyPath'].filter(key=>value.sslCertificate?.[key]!==undefined).map(key=>[key,value.sslCertificate[key]]));
 return result;
}
