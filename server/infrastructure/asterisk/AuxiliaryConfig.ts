import {ariInputs} from './ariPolicy.mjs';
import {OutboundHttpError} from '../security/OutboundHttp.js';
import {infraPatch} from './InfraMutation.js';
export function ariConfiguration(environment:NodeJS.ProcessEnv,maskSecrets=false){
 let values:ReturnType<typeof ariInputs>;
 try{values=ariInputs(environment);}catch{throw new OutboundHttpError('Credenciais ou origens ARI inválidas. Revise o ambiente do servidor.',400);}
 const {username,password,origins}=values;
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
