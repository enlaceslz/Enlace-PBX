import net from 'node:net';
import {OutboundHttpError} from '../security/OutboundHttp.js';
export const trunkColumns={name:'name',providerName:'provider_name',host:'host',port:'port',transport:'transport',username:'username',callerId:'caller_id',codecs:'codecs',context:'context',register:'register',channelsMax:'channels_max',authMode:'auth_mode',authorizedIps:'authorized_ips',inboundContext:'inbound_context',sendPai:'send_pai',sendRpid:'send_rpid',directMedia:'direct_media',dtmfMode:'dtmf_mode',fromDomain:'from_domain',fromUser:'from_user',qualifyFrequency:'qualify_frequency',callerIdMode:'caller_id_mode',failoverTrunkId:'failover_trunk_id'} as const;
const invalid=()=>new OutboundHttpError('Parâmetros de cadastro do tronco inválidos. Confira campos, tipos e limites.',400);
const host=(value:string)=>(!/^\d+\.\d+\.\d+\.\d+$/.test(value)&&value.length<=253&&!net.isIP(value)&&value.split('.').every(part=>/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/i.test(part)))||net.isIP(value)===4;
export function trunkPatch(input:unknown,create=false):Record<string,any>{
 if(!input||typeof input!=='object'||Array.isArray(input)||Object.keys(input).length===0)throw invalid();
 const patch:Record<string,any>={};
 for(const [key,value] of Object.entries(input)){
  if(!Object.hasOwn(trunkColumns,key)&&key!=='secret')throw invalid();
  if(typeof value==='string'&&(/[\x00-\x1f\x7f;\\]/.test(value)||(key!=='secret'&&/[\[\]#]/.test(value))||value.length>256))throw invalid();
  if(['register','sendPai','sendRpid','directMedia'].includes(key)){if(typeof value!=='boolean')throw invalid();}
  else if(['port','channelsMax','qualifyFrequency'].includes(key)){const bounds=key==='port'?[1,65535]:key==='channelsMax'?[1,1000]:[0,3600];if(typeof value!=='number'||!Number.isInteger(value)||value<bounds[0]||value>bounds[1])throw invalid();}
  else if(key==='codecs'){if(!Array.isArray(value)||value.length<1||value.length>8||value.some(c=>typeof c!=='string'||!['alaw','ulaw','g722','opus','g729','gsm'].includes(c))||new Set(value).size!==value.length)throw invalid();}
  else if(key==='authorizedIps'){if(!Array.isArray(value)||value.length>32||value.some(ip=>typeof ip!=='string'||ip.length>253||!validAddress(ip))||new Set(value).size!==value.length)throw invalid();}
  else{
   if(typeof value!=='string')throw invalid();
   if(['name','providerName'].includes(key)&&value.trim().length>128)throw invalid();
   if(key==='name'&&!value.trim())throw invalid();
   if(key==='host'&&(!value||!host(value)))throw invalid();
   if(['context','inboundContext'].includes(key)&&value!=='from-trunk')throw new OutboundHttpError('Contexto de entrada permitido: from-trunk.',400);
   const enums:Record<string,string[]>={transport:['UDP','TCP','TLS'],authMode:['ip','credentials'],dtmfMode:['rfc4733','info','inband','auto'],callerIdMode:['from','pai','rpid']};
   if(enums[key]&&!enums[key].includes(value))throw invalid();
   if(['username','fromUser'].includes(key)&&!/^[-a-z0-9_.+@]{0,128}$/i.test(value))throw invalid();
   if(key==='callerId'&&!/^\+?[0-9]{0,20}$/.test(value))throw invalid();
   if(key==='fromDomain'&&value&&!host(value))throw invalid();
   if(key==='failoverTrunkId'&&value&&!/^[-a-z0-9_]{1,64}$/i.test(value))throw invalid();
  }
  patch[key]=['name','providerName'].includes(key)?(value as string).trim():value;
 }
 if(create&&(!patch.name||!patch.host))throw invalid();
 return patch;
}
function validAddress(value:string){
 const parts=value.split('/');if(parts.length>2)return false;
 if(parts.length===1)return host(value);
 return net.isIP(parts[0])===4&&/^\d{1,2}$/.test(parts[1])&&Number(parts[1])>=1&&Number(parts[1])<=32;
}
