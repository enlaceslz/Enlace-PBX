import {OutboundHttpError} from '../security/OutboundHttp.js';
import {infraPatch} from './InfraMutation.js';
export function ariConfiguration(environment:NodeJS.ProcessEnv,maskSecrets=false){
 const username=environment.ASTERISK_ARI_USERNAME||environment.ASTERISK_ARI_USER;
 const password=environment.ASTERISK_ARI_PASSWORD;
 const rawOrigins=environment.ASTERISK_ARI_ALLOWED_ORIGINS||environment.CORS_ALLOWED_ORIGINS;
 if(!username||!/^[-a-zA-Z0-9_]{1,64}$/.test(username)||username.toLowerCase()==='general'||typeof password!=='string'||password.length<12||password.length>128||password!==password.trim()||/[\x00-\x1f\x7f;\\]/.test(password)||!password.trim()||!rawOrigins||rawOrigins.length>4096||rawOrigins.includes('*')||/[\x00-\x1f\x7f]/.test(rawOrigins))throw new OutboundHttpError('Configure usuário, senha e origens ARI explícitos e válidos no ambiente do servidor.',400);
 const origins=rawOrigins.split(',').map(origin=>origin.trim());
 if(origins.length>16||new Set(origins).size!==origins.length||origins.some(origin=>{
  try{const url=new URL(origin);return url.origin!==origin||url.username||url.password||!(url.protocol==='https:'||environment.NODE_ENV!=='production'&&url.protocol==='http:'&&['localhost','127.0.0.1','[::1]'].includes(url.hostname));}catch{return true;}
 }))throw new OutboundHttpError('Origens ARI inválidas: informe origens HTTPS exatas, sem curingas, caminhos ou credenciais.',400);
 return `; Prévia de ARI; não comprova conexão ou execução no host.
[general]
enabled=yes
pretty=no
allowed_origins=${origins.join(',')}

[${username}]
type=user
read_only=no
password=${maskSecrets?'••••••••':password}
password_format=plain
`;
}
export function rtpConfiguration(infra:any){
 if(typeof infra?.ports?.rtpRange!=='string')throw new OutboundHttpError('Cadastre uma faixa RTP explícita antes de gerar rtp.conf.',400);
 const stun=infra.stunServer??'';
 infraPatch({expectedRevision:0,ports:{rtpRange:infra.ports.rtpRange},stunServer:stun});
 const [start,end]=infra.ports.rtpRange.split('-');
 return `; Prévia de RTP; não comprova firewall, ICE, NAT ou mídia.
[general]
rtpstart=${start}
rtpend=${end}
dtmftimeout=3000
strictrtp=yes
probation=8
icesupport=yes
${stun?'stunaddr='+stun.replace(/^stun:/,''):'; STUN não configurado'}
`;
}
