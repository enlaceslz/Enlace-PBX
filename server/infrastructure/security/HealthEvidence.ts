type Probe={status?:string;amiConnected?:boolean;latencyMs?:number};
/** Sonda de processo/banco não certifica interfaces de mídia nem serviços externos. */
export function healthEvidence(asterisk:Probe,postgres:Probe){
 const checkedAt=new Date().toISOString();
 const components:Record<string,{status:string;details:string;latencyMs?:number}>={
  asterisk:{status:asterisk.status==='UP'?'UP':asterisk.status==='NOT_INSTALLED'?'UNAVAILABLE':'DOWN',details:'Consulta ao núcleo via CLI ou AMI; não certifica chamadas ou áudio.'},
  ami:{status:asterisk.amiConnected===true?'UP':'DOWN',details:'Consulta AMI CoreStatus autenticada.'},
  postgresql:{status:postgres.status==='UP'?'UP':postgres.status==='NOT_CONFIGURED'?'NOT_CONFIGURED':'DOWN',details:'Consulta de conexão e privilégios do banco.',...(postgres.status==='UP'&&Number.isFinite(postgres.latencyMs)&&Number(postgres.latencyMs)>=0?{latencyMs:postgres.latencyMs}:{})},
 };
 for(const [key,label] of Object.entries({ari:'ARI/Stasis',pjsip:'Registro PJSIP e troncos',webrtc:'WebRTC/DTLS-SRTP',audioSocket:'AudioSocket',redis:'Redis',aiGateway:'Gateway de IA/9router',geminiApi:'Provedor de IA',whatsapp:'WhatsApp',wireguard:'WireGuard',zerotier:'ZeroTier'}))components[key]={status:'NOT_TESTED',details:`${label}: não verificado nesta consulta. Configuração não comprova disponibilidade.`};
 return {status:components.asterisk.status==='UP'&&components.ami.status==='UP'&&components.postgresql.status==='UP'?'PARTIAL':'DEGRADED',timestamp:checkedAt,platform:'Enlace-PBX',version:'20.17.0',components,
  scopeNote:'Verificação parcial do núcleo, AMI e banco. Registro SIP, chamadas, mídia e integrações externas exigem homologação própria.'};
}
export function diagnosticEvidence(health:ReturnType<typeof healthEvidence>){
 return {timestamp:health.timestamp,testedBy:'Sondas do servidor',overallHealth:health.status,scopeNote:health.scopeNote,
  diagnostics:Object.entries(health.components).map(([name,item])=>({name,status:item.status,details:item.details,pingMs:item.latencyMs??null}))};
}
