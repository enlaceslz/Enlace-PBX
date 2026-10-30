import net from 'node:net';
import {OutboundHttpError} from '../security/OutboundHttp.js';
const invalid=()=>new OutboundHttpError('Infraestrutura PJSIP ausente ou inválida. Revise endereços, rede local, portas e caminhos TLS antes de gerar.',400);
const ipv4=(value:unknown):value is string=>typeof value==='string'&&net.isIP(value)===4;
const host=(value:unknown)=>typeof value==='string'&&value.length<=253&&value.split('.').every(part=>/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/i.test(part));
const port=(value:unknown)=>typeof value==='number'&&Number.isInteger(value)&&value>=1&&value<=65535;
const certPath=(value:unknown)=>typeof value==='string'&&value.length<=512&&/^\/(?:[-a-zA-Z0-9_.]+\/)*[-a-zA-Z0-9_.]+$/.test(value)&&!value.split('/').some(part=>part==='.'||part==='..');
export function pjsipInfrastructure(value:any){
 if(!value||typeof value!=='object'||!host(value.hostname)||!host(value.domain)||!ipv4(value.publicIp)||!port(value.ports?.sipUdp)||!port(value.ports?.sipTls)||value.ports.sipUdp===value.ports.sipTls)throw invalid();
 let localNet:string;
 if(typeof value.lanSubnet==='string'&&value.lanSubnet.includes('/')){
  const [network,prefix,...extra]=value.lanSubnet.split('/');if(extra.length||!ipv4(network)||!/^\d{1,2}$/.test(prefix)||Number(prefix)<1||Number(prefix)>32)throw invalid();
  localNet=canonicalNetwork(network,Number(prefix));
 }else{
  if(!ipv4(value.lanSubnet)||!ipv4(value.lanIp))throw invalid();
  const bits=value.lanSubnet.split('.').map((octet:string)=>Number(octet).toString(2).padStart(8,'0')).join('');
  if(!/^1+0*$/.test(bits))throw invalid();
  localNet=canonicalNetwork(value.lanIp,bits.replace(/0/g,'').length);
 }
 const certificate=value.sslCertificate;
 if(!certificate||!['valid','pending','expired','invalid','not_configured'].includes(certificate.status))throw invalid();
 if(certificate.status==='valid'&&(!certPath(certificate.certPath)||!certPath(certificate.keyPath)||certificate.certPath===certificate.keyPath))throw invalid();
 return {...value,localNet};
}
function canonicalNetwork(address:string,prefix:number){
 const bytes=address.split('.').map(Number);
 return bytes.map((byte,index)=>{
  const bits=Math.max(0,Math.min(8,prefix-index*8));
  const mask=bits===0?0:(255<<(8-bits))&255;
  return byte&mask;
 }).join('.')+'/'+prefix;
}
