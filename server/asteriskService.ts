import {ariConfiguration,rtpConfiguration} from './infrastructure/asterisk/AuxiliaryConfig.js';
import {managedTrunk,trunkPatch} from './infrastructure/asterisk/TrunkMutation.js';
import {pjsipInfrastructure} from './infrastructure/asterisk/PjsipInfrastructure.js';
import {managedExtension} from './infrastructure/asterisk/ExtensionMutation.js';
import {managedIvr,renderIvr} from './infrastructure/asterisk/IvrMutation.js';
import {managedCollection,assertInternalNumbers} from './infrastructure/asterisk/CollectionMutation.js';
import {managedRoutePlan} from './infrastructure/asterisk/RouteMutation.js';
import {managedDidDestination} from './infrastructure/asterisk/DidDialplan.js';
import { callExtension, callDestination, channelReference, endpointFromChannel } from './infrastructure/asterisk/CallControl.js';
import { OutboundHttpError } from './infrastructure/security/OutboundHttp.js';
import { postgresClient } from './infrastructure/postgres/client.js';
import { outboundGuardDialplan } from './infrastructure/asterisk/OutboundPolicy.js';
import { assertSingleLineConfig } from './infrastructure/asterisk/configValidation.js';
import { Extension, Trunk, Route } from '../src/types/pbx.js';
import {
  ExtensionRepository,
  TrunkRepository,
  RouteRepository,
  QueueRepository,
  RingGroupRepository,
  IvrRepository,
  DidRepository,
  SystemRepository,
} from './infrastructure/postgres/repositories/index.js';
import { asteriskAdapter, AsteriskChannelInfo } from './infrastructure/asterisk/AsteriskAdapter.js';
import { AsteriskCommandService } from './infrastructure/asterisk/AsteriskCommandService.js';

export interface AsteriskChannel {
  id: string;
  name: string;
  state: 'Ring' | 'Up' | 'Ringing' | 'Dialing';
  callerNumber: string;
  connectedLine: string;
  context: string;
  exten: string;
  application: string;
  durationSeconds: number;
  aiBridgeActive: boolean;
  tenantId?: string;
  qos?: {
    latencyMs: number;
    jitterMs: number;
    packetLossPercent: number;
  };
}

export class AsteriskService {
  private realLiveChannels: AsteriskChannel[] = [];
  private lastFetchTime: number = 0;

  constructor() {
    this.refreshChannelsReal().catch(() => {});
  }

  /**
   * Resolução explícita e determinística do Tenant de um canal telefônico Asterisk.
   * Não confia em string match simples no contexto.
   * Mapeia: canal -> endpoint -> ramal/tronco no PostgreSQL -> tenantId real.
   */
  public async resolveChannelTenant(channel: AsteriskChannel | AsteriskChannelInfo): Promise<string | null> {
    const endpoint = endpointFromChannel(channel.name);
    if (!endpoint) return null;
    return postgresClient.executeGlobalScoped(async client => {
      const owners = await client.query(`SELECT tenant_id FROM extensions WHERE number=$1
        UNION ALL SELECT tenant_id FROM trunks WHERE 'trunk-' || id=$1`, [endpoint]);
      // Números duplicados entre empresas não têm namespace SIP homologado.
      return owners.rows.length === 1 ? owners.rows[0].tenant_id : null;
    });
  }

  /**
   * Atualiza canais reais consultando o Asterisk Core via AMI.
   * Não gera canais sintéticos ou inventados.
   */
  public async refreshChannelsReal(): Promise<AsteriskChannel[]> {
    try {
      const realChannels = await asteriskAdapter.getChannels();
      this.realLiveChannels = realChannels.map((c) => ({
        id: c.id,
        name: c.name,
        state: c.state,
        callerNumber: c.callerNumber,
        connectedLine: c.connectedLine,
        context: c.context,
        exten: c.exten,
        application: c.application,
        durationSeconds: c.durationSeconds,
        aiBridgeActive: c.aiBridgeActive,
        tenantId: c.tenantId,
        qos: c.qos,
      }));
      this.lastFetchTime = Date.now();
      return this.realLiveChannels;
    } catch {
      this.realLiveChannels = [];
      return [];
    }
  }

  /**
   * Retorna os canais ativos reais com filtro estrito de autorização por tenant.
   * Fail-Closed: se tenantId não informado e não for super_admin, retorna array vazio.
   * Proibido qualquer string match permissivo.
   */
  async getActiveChannels(tenantId?: string, isSuperAdmin: boolean = false): Promise<AsteriskChannel[]> {
    if (Date.now() - this.lastFetchTime > 2000) {
      await this.refreshChannelsReal().catch(() => {});
    }

    // Resolve deterministicamente o tenantId de cada canal ativo
    for (const c of this.realLiveChannels) {
      c.tenantId = await this.resolveChannelTenant(c) || undefined;
    }

    // Super Admin com visão global explícita de todos os canais do sistema
    if (isSuperAdmin && (!tenantId || tenantId === 'all')) {
      return this.realLiveChannels;
    }

    // Filtragem rigorosa por tenantId: somente canais que comprovadamente pertencem ao tenant
    if (tenantId && tenantId.trim() !== '') {
      return this.realLiveChannels.filter((c) => c.tenantId === tenantId.trim());
    }

    // Sem autorização explícita: Fail-Closed rigoroso
    return [];
  }

  /**
   * Obtém um canal ativo garantindo validação de posse do tenant
   */
  async getChannel(channelId: string, tenantId?: string, isSuperAdmin: boolean = false): Promise<AsteriskChannel | null> {
    const channels = await this.getActiveChannels(tenantId, isSuperAdmin);
    return channels.find((c) => c.id === channelId || c.name === channelId) || null;
  }

  /**
   * Origina chamada real através do AsteriskAdapter com validação de Tenant.
   */
  private async ownedExtension(number: string, tenantId: string) {
    const extension = await ExtensionRepository.findByNumber(tenantId, number);
    if (!extension) throw new Error('ACCESS_DENIED: Ramal fora da empresa.');
    const owner = await this.resolveChannelTenant({ name: `PJSIP/${number}-00000000` } as AsteriskChannel);
    if (owner !== tenantId) throw new OutboundHttpError('Endpoint SIP ausente ou ambíguo entre empresas.',409);
    return extension;
  }

  async originateCall(caller: string, callee: string, tenantId: string, isAi = false, _isSuperAdmin = false) {
    caller=callExtension(caller);callee=callDestination(callee);
    if (!tenantId || tenantId==='all') throw new Error('ACCESS_DENIED: Selecione a empresa.');
    if (isAi) throw new OutboundHttpError('Originação com ponte IA ainda não homologada.',501);
    await this.ownedExtension(caller,tenantId);
    // Este controle administrativo só origina para ramais internos comprovados.
    // Saída para operadora requer fluxo próprio de autorização e homologação.
    await this.ownedExtension(callExtension(callee),tenantId);
    return asteriskAdapter.originateCall(caller,callee,false);
  }

  private async controlledChannel(channelId: string, tenantId?: string, isSuperAdmin = false) {
    channelReference(channelId);
    // A autorização usa uma coleta nova, e o comando recebe o nome real, nunca Uniqueid.
    await this.refreshChannelsReal();
    const channel = await this.getChannel(channelId,tenantId,isSuperAdmin);
    if (!channel) throw new Error('ACCESS_DENIED: Canal ausente ou fora da empresa.');
    channelReference(channel.name);
    return channel;
  }

  async hangupChannel(channelId: string, tenantId?: string, isSuperAdmin = false) {
    const channel = await this.controlledChannel(channelId,tenantId,isSuperAdmin);
    return asteriskAdapter.hangup(channel.name);
  }

  async transferChannel(channelId: string, destination: string, tenantId?: string, isSuperAdmin = false) {
    destination=callExtension(destination);
    const channel = await this.controlledChannel(channelId,tenantId,isSuperAdmin);
    const owner = channel.tenantId;
    if (!owner) throw new Error('ACCESS_DENIED: Empresa do canal não identificada.');
    await this.ownedExtension(destination,owner);
    return asteriskAdapter.transfer(channel.name,destination);
  }

  async redirectChannel(channelId: string, context: string, destination: string, priority=1, tenantId?: string, isSuperAdmin=false) {
    if(context!=='from-internal' || priority!==1) throw new OutboundHttpError('Redirecionamento permitido apenas para from-internal, prioridade 1.',400);
    return this.transferChannel(channelId,destination,tenantId,isSuperAdmin);
  }

  async spyChannel(channelId: string, supervisorExt: string, tenantId?: string, isSuperAdmin=false) {
    supervisorExt=callExtension(supervisorExt);
    const channel=await this.controlledChannel(channelId,tenantId,isSuperAdmin);
    if(!channel.tenantId)throw new Error('ACCESS_DENIED: Empresa do canal não identificada.');
    await this.ownedExtension(supervisorExt,channel.tenantId);
    return asteriskAdapter.supervise(channel.name,supervisorExt);
  }

  /**
   * Gerador oficial de configuração PJSIP (pjsip.conf) baseado em PostgreSQL.
   * Suporta mascaramento de segredos para exibição segura na API administrativa.
   */
  async generateConfiguration(tenantId:string):Promise<{pjsip:string;dialplan:string;queues:string}>{
    return postgresClient.withReadSnapshot(async()=>({
      pjsip:await this.generatePjsipConf(tenantId),
      dialplan:await this.generateExtensionsConf(tenantId),
      queues:await this.generateQueuesConf(tenantId),
    }));
  }

  async generatePjsipConf(tenantId: string, maskSecrets: boolean = false): Promise<string> {
    const extensions = (await ExtensionRepository.listByTenant(tenantId)).map(extension=>managedExtension(extension,true));
    const trunks = (await TrunkRepository.listByTenant(tenantId)).map(trunk=>managedTrunk(trunk));
    const infra = pjsipInfrastructure(await SystemRepository.getSetting('infra_config'));

    assertSingleLineConfig({ extensions, trunks, infra });
    if (process.env.NODE_ENV === 'production' && !maskSecrets) {
      const owners = new Set([...(await ExtensionRepository.listAll()).map(item => item.tenantId), ...(await TrunkRepository.listAll()).map(item => item.tenantId)]);
      if (owners.size > 1) throw new Error('Provisionamento de telefonia neste host exige uma única empresa até a homologação de namespaces SIP.');
    }
    let output = `; ====================================================================
; Enlace-PBX — Configuração Automática PJSIP (pjsip.conf)
; Asterisk 20 LTS Puro — Enlace Telecom (Brasil)
; Hostname: ${infra.hostname} | Domínio: ${infra.domain}
; IP Público (WAN): ${infra.publicIp} | Rede Local (LAN): ${infra.localNet}
; Certificado SSL: ${infra.sslCertificate.status==='valid'?infra.sslCertificate.certPath:'não configurado para SIP TLS'}
; Data de geração: ${new Date().toISOString()}
; ====================================================================

[global]
type=global
user_agent=Enlace-PBX 20.17 / Asterisk Pure Brazilian Stack
default_outbound_endpoint=default

; --- Transporte UDP Geral (PJSIP Nat Traversal) ---
[transport-udp]
type=transport
protocol=udp
bind=0.0.0.0:${infra.ports.sipUdp}
local_net=${infra.localNet}
external_media_address=${infra.publicIp}
external_signaling_address=${infra.publicIp}

; --- Transporte TCP ---
[transport-tcp]
type=transport
protocol=tcp
bind=0.0.0.0:${infra.ports.sipUdp}

; --- WebSocket interno: TLS termina no NGINX; HTTP Asterisk fica no loopback ---
[transport-ws]
type=transport
protocol=ws
bind=127.0.0.1

${infra.sslCertificate?.status === 'valid' && infra.sslCertificate?.certPath && infra.sslCertificate?.keyPath ? `[transport-tls]
type=transport
protocol=tls
bind=0.0.0.0:${infra.ports.sipTls}
cert_file=${infra.sslCertificate.certPath}
priv_key_file=${infra.sslCertificate.keyPath}
method=tlsv1_2
` : ''}

`;

    // Ramais PJSIP
    for (const ext of extensions) {
      output += `; ----------------------------------------------------
; Ramal Enlace: ${ext.number} - ${ext.name}
; ----------------------------------------------------
[${ext.number}]
type=endpoint
context=${ext.context}
disallow=all
${ext.codecs.map((c) => `allow=${c}`).join('\n')}
auth=${ext.number}-auth
aors=${ext.number}-aor
callerid=${ext.callerId}
direct_media=no
trust_id_inbound=yes
send_pai=yes
rewrite_contact=yes
rtp_symmetric=yes
force_rport=yes
${ext.webrtc ? `webrtc=yes
dtls_verify=fingerprint
dtls_auto_generate_cert=yes
dtls_setup=actpass` : ''}

[${ext.number}-auth]
type=auth
auth_type=userpass
password=${maskSecrets ? '••••••••' : ext.sipSecret}
username=${ext.number}

[${ext.number}-aor]
type=aor
max_contacts=5
remove_existing=yes
qualify_frequency=30

`;
    }

    // Troncos PJSIP
    for (const trk of trunks) {
      const isIpAuth = trk.authMode === 'ip';
      if (trk.transport === 'TLS' && !(infra.sslCertificate?.status === 'valid' && infra.sslCertificate?.certPath && infra.sslCertificate?.keyPath)) throw new Error('Configure certificados SIP TLS válidos antes de aplicar troncos TLS.');
      const trunkSecret = !isIpAuth ? await TrunkRepository.getSecret(trk.id, tenantId) : '';
      if(!isIpAuth){if(!trunkSecret.trim())throw new OutboundHttpError('Tronco sem senha SIP válida. Revise antes de gerar.',400);trunkPatch({secret:trunkSecret});}
      const authorizedIpsList = (trk.authorizedIps && trk.authorizedIps.length > 0)
        ? trk.authorizedIps
        : [trk.host];

      output += `; ----------------------------------------------------
; Tronco SIP: ${trk.name} (${trk.providerName})
; Modo: ${isIpAuth ? 'AUTENTICAÇÃO POR IP (Sem REGISTER / Sem Usuário e Senha)' : 'Credenciais SIP'}
; ----------------------------------------------------
[trunk-${trk.id}]
type=endpoint
transport=transport-${(trk.transport || 'UDP').toLowerCase()}
context=${trk.inboundContext || trk.context || 'from-trunk'}
disallow=all
${(trk.codecs || ['opus', 'alaw', 'ulaw']).map((c) => `allow=${c}`).join('\n')}
aors=trunk-${trk.id}-aor
${!isIpAuth ? `outbound_auth=trunk-${trk.id}-auth\nfrom_user=${trk.fromUser || trk.username}\nfrom_domain=${trk.fromDomain || trk.host}` : `from_domain=${trk.fromDomain || trk.host}`}
callerid=${trk.callerId}
dtmf_mode=${trk.dtmfMode || 'rfc4733'}
direct_media=${trk.directMedia ? 'yes' : 'no'}
rtp_symmetric=yes
force_rport=yes
rewrite_contact=yes
${trk.callerIdMode === 'pai' || trk.sendPai ? 'send_pai=yes\ntrust_id_inbound=yes' : trk.callerIdMode === 'rpid' || trk.sendRpid ? 'send_rpid=yes\ntrust_id_inbound=yes' : ''}
${trk.outboundProxy ? `outbound_proxy=${trk.outboundProxy}` : ''}

[trunk-${trk.id}-aor]
type=aor
contact=sip:${trk.host}:${trk.port || 5060}
qualify_frequency=${trk.qualifyFrequency}
${trk.outboundProxy ? `outbound_proxy=${trk.outboundProxy}` : ''}
`;

      if (isIpAuth) {
        output += `
; Identificação por IP de Origem (SBCs Autorizados da Operadora)
[trunk-${trk.id}-identify]
type=identify
endpoint=trunk-${trk.id}
match=${authorizedIpsList.join(',')}
`;
      } else {
        output += `
[trunk-${trk.id}-auth]
type=auth
auth_type=userpass
username=${trk.username}
password=${maskSecrets ? '••••••••' : trunkSecret}

${trk.register ? `[trunk-${trk.id}-reg]
type=registration
outbound_auth=trunk-${trk.id}-auth
server_uri=sip:${trk.host}:${trk.port || 5060}
client_uri=sip:${trk.username}@${trk.host}:${trk.port || 5060}
retry_interval=30
max_retries=10
${trk.outboundProxy ? `outbound_proxy=${trk.outboundProxy}` : ''}
` : ''}
`;
      }
    }

    return output;
  }

  /**
   * Gerador oficial de Dialplan (extensions.conf) baseado em PostgreSQL.
   */
  async generateExtensionsConf(tenantId: string): Promise<string> {
    const extensions = (await ExtensionRepository.listByTenant(tenantId)).map(extension=>managedExtension(extension));
    const routes = (await RouteRepository.listByTenant(tenantId)).filter(route=>route.isActive!==false);
    const groups = await RingGroupRepository.listByTenant(tenantId);
    const queues = await QueueRepository.listByTenant(tenantId);
    const ivrs = await IvrRepository.listByTenant(tenantId);
    const dids = (await DidRepository.listByTenant(tenantId)).filter((d) => d.status === 'active');
    const trunks = await TrunkRepository.listByTenant(tenantId);
    assertSingleLineConfig({ extensions, routes, groups, queues, ivrs, dids, trunks });
    for(const route of routes)managedRoutePlan(route,trunks);
    assertInternalNumbers(extensions,groups,queues,ivrs);
    for(const ivr of ivrs)managedIvr(ivr,extensions,queues);
    for(const group of groups)managedCollection('group',group,extensions);
    for(const queue of queues)managedCollection('queue',queue,extensions);

    return `; ====================================================================
; Enlace-PBX — Dialplan Oficial Asterisk 20 LTS (extensions.conf)
; Telefonia Inteligente. Simples, aberta e brasileira.
; Enlace Telecom
; ====================================================================

[general]
static=yes
writeprotect=yes
clearglobalvars=no

[globals]
CONSOLE=Console/dsp
ENLACE_RECORDINGS_PATH=/var/spool/asterisk/recording

; ====================================================================
; Contexto Interno: Ramal -> Ramal, Filas, URA, Serviços
; ====================================================================
[from-internal]
include => internal-extensions
include => ring-groups
include => call-queues
include => ivr-menus
include => ai-agents-direct
include => outbound-routes

; Discagem direta para ramais cadastrados no PBX
[internal-extensions]
${extensions
  .map(
    (ext) => `exten => ${ext.number},1,NoOp(Chamada interna para ramal gerenciado)
 same => n,Set(CDR(tenant_id)=${tenantId})
 same => n,Set(CALLFILENAME=rec-\${FILTER(0-9A-Za-z,\${UNIQUEID})})
 ${ext.recording === 'always' ? `same => n,MixMonitor(\${ENLACE_RECORDINGS_PATH}/\${CALLFILENAME}.wav,b)` : ''}
 same => n,Dial(PJSIP/\${EXTEN},30,tT)
 same => n,GotoIf($["\${DIALSTATUS}" = "BUSY"]?busy:unavail)
 same => n(busy),Busy(10)
 same => n,Hangup()
 same => n(unavail),Congestion(10)
 same => n,Hangup()`
  )
  .join('\n\n')}

; Grupos de Toque
[ring-groups]
${groups
  .map(
    (g) => `exten => ${g.number},1,NoOp(Grupo de toque gerenciado)
 same => n,Set(CDR(tenant_id)=${tenantId})
 same => n,Dial(${g.members.map((m) => `PJSIP/${m}`).join('&')},${g.timeoutSeconds},tT)
 same => n,Hangup()`
  )
  .join('\n\n')}

; Filas de Atendimento
[call-queues]
${queues
  .map(
    (q) => `exten => ${q.number},1,NoOp(Fila gerenciada)
 same => n,Set(CDR(tenant_id)=${tenantId})
 same => n,Answer()
 same => n,Queue(${q.id},t,,,${q.timeoutSeconds})
 same => n,Hangup()`
  )
  .join('\n\n')}

; URAs / IVR
[ivr-menus]
${ivrs.map(ivr=>`exten => ${ivr.number},1,Set(CDR(tenant_id)=${tenantId})
 same => n,Goto(ivr-${ivr.id},s,1)`).join('\n')}

${ivrs.map(ivr=>renderIvr(ivr)).join('\n\n')}

; ====================================================================
; Contexto do Agente de Voz Google Gemini (ARI / AudioSocket / Stasis)
; ====================================================================
[from-gemini]
exten => s,1,NoOp(Enlace-PBX Gemini Agent Voice Gateway)
 same => n,Answer()
 same => n,Set(CDR(ai_agent)=MaIA-247)
 same => n,Stasis(enlace-gemini)
 same => n,Hangup()

[ai-agents-direct]
exten => 9001,1,Goto(from-gemini,s,1) ; Discagem direta interna para MaIA

; ====================================================================
; Rotas de Saída (Regras brasileiras de discagem com LCR & Contingência)
; ====================================================================
${outboundGuardDialplan()}
[outbound-routes]
${routes
  .filter((r) => r.type === 'outbound')
  .map((r) => {
    const validated=managedRoutePlan(r,trunks);
    const pat=validated.pattern;
    const stripDigits=validated.stripDigits;
    const prependStr=validated.prepend;
    const dialedExten = prependStr ? `${prependStr}\${EXTEN:${stripDigits}}` : `\${EXTEN:${stripDigits}}`;
    const targetTrunk = `PJSIP/trunk-${r.trunkId}`;
    const safeRouteTag = r.id.replace(/[^a-zA-Z0-9_]/g, '_');

    let lines = `exten => ${pat},1,NoOp(Rota de saida gerenciada)
 same => n,Set(CDR(tenant_id)=${tenantId})
 same => n,Set(CALLFILENAME=rec-out-\${EPOCH}-\${EXTEN})
 same => n,MixMonitor(\${ENLACE_RECORDINGS_PATH}/\${CALLFILENAME}.wav,b)`;

    lines += `\n same => n,Gosub(enlace-outbound-guard,s,1(${dialedExten}))\n same => n,Dial(${targetTrunk}/\${ENLACE_DEST},60,tT)`;

    if (r.failoverTrunkId) {
      const failoverTrunk = `PJSIP/trunk-${r.failoverTrunkId}`;
      lines += `\n same => n,GotoIf($["\${DIALSTATUS}" = "CHANUNAVAIL" | "\${DIALSTATUS}" = "CONGESTION" | "\${DIALSTATUS}" = "BUSY"]?failover_${safeRouteTag}:hangup_normal)
 same => n(failover_${safeRouteTag}),NoOp(=== CONTINGENCIA LCR: Tronco primario indisponivel (\${DIALSTATUS}). Acionando ${failoverTrunk} ===)
 same => n,Dial(${failoverTrunk}/\${ENLACE_DEST},60,tT)
 same => n(hangup_normal),Hangup()`;
    } else {
      lines += `\n same => n,Hangup()`;
    }

    return lines;
  })
  .join('\n\n')}

; ====================================================================
; Rotas de Entrada (DIDs das Operadoras Brasileiras & Horários)
; ====================================================================
[from-trunk]
${dids
  .map((d) => {
    const managed=managedDidDestination(d,extensions,trunks);
    const dest=`Goto(from-internal,${managed.extension},1)`;
    const cleanNational=managed.national;
    const cleanE164=`55${cleanNational}`;

    let lines = `; DID: ${cleanNational}
exten => ${cleanNational},1,NoOp(DID ${cleanNational})
 same => n,Set(CDR(tenant_id)=${tenantId})
 same => n,Set(CDR(did)=${d.did})
 same => n,Set(CALLFILENAME=rec-did-\${EPOCH}-${cleanNational})
 same => n,MixMonitor(\${ENLACE_RECORDINGS_PATH}/\${CALLFILENAME}.wav,b)
 same => n,${dest}

exten => ${cleanE164},1,Goto(${cleanNational},1)`;

    return lines;
  })
  .join('\n\n')}

exten => _X.,1,NoOp(Chamada de tronco sem rota definida: \${EXTEN})
 same => n,Hangup(1)
exten => i,1,Hangup(1)
`;
  }

  generateInstallScript(): string {
    throw new OutboundHttpError('Instalador legado retirado. Use install-enlace-pbx.sh e o procedimento revisado do repositório.',501);
  }

  generateAriConf(maskSecrets:boolean=false):string {
    return ariConfiguration(process.env,maskSecrets);
  }

  async generateQueuesConf(tenantId: string): Promise<string> {
    const queues = await QueueRepository.listByTenant(tenantId);
    const extensions=await ExtensionRepository.listByTenant(tenantId);
    assertInternalNumbers(extensions,await RingGroupRepository.listByTenant(tenantId),queues,await IvrRepository.listByTenant(tenantId));
    for(const queue of queues)managedCollection('queue',queue,extensions);

    let output = `; ====================================================================
; Enlace-PBX — Configuração de Filas de Atendimento ACD (queues.conf)
; Asterisk 20 LTS — Enlace Telecom
; Gerado automaticamente: ${new Date().toISOString()}
; ====================================================================

[general]
persistentmembers = yes
autofill = yes
monitor-type = MixMonitor
shared_lastcall = yes

`;

    queues.forEach((q) => {
      output += `[${q.id}]
musicclass = ${q.mohSound}
strategy = ${q.strategy}
timeout = ${q.timeoutSeconds}
retry = 5
wrapuptime = ${q.wrapUpTimeSeconds}
maxlen = 50
joinempty = no
leavewhenempty = yes
ringinuse = no
announce-frequency = 30
announce-holdtime = yes
announce-position = yes
`;
      (q.members || []).forEach((member) => {
        output += `member => PJSIP/${member},0,Ramal ${member}\n`;
      });
      output += '\n';
    });

    return output;
  }

  async generateRtpConf():Promise<string> {
    return rtpConfiguration(await SystemRepository.getSetting('infra_config'));
  }

  generateAudioSocketConf():string {
    throw new OutboundHttpError('Arquivo AudioSocket legado retirado. O fluxo de áudio ainda exige implementação e homologação no host.',501);
  }

  /**
   * Executa comando estruturado e seguro no Asterisk Core via AsteriskCommandService.
   * Valida obrigatoriamente a Allowlist para impedir qualquer injeção de comandos.
   */
  async executeCliCommand(
    rawCmd: string,
    context?: { tenantId?: string; userId?: string; ip?: string }
  ): Promise<string> {
    const res = await AsteriskCommandService.executeSafeCli(rawCmd, context);
    if (res.success) {
      return res.output || 'Comando executado com sucesso no Asterisk CLI.';
    }
    return `[ERRO ASTERISK CLI] ${res.error || 'Falha ao executar comando no Asterisk CLI.'}`;
  }

  /**
   * Resolução de CallerID / BINA para chamadas de saída via PostgreSQL.
   */
  async resolveCallerIdForOutboundCall(tenantId: string, extensionNumber: string, routeId: string) {
    const ext = await ExtensionRepository.findByNumber(tenantId, extensionNumber);
    const route = await RouteRepository.findById(routeId);

    if (!ext || !route) {
      return null;
    }

    let resolvedCallerId = ext.number;
    let source: 'route_extension_override' | 'extension_cli_setting' | 'route_default' | 'original_extension' = 'original_extension';
    let explanation = `O ramal binaria seu identificador padrão interno (${ext.callerId || ext.number}).`;

    if (route.isCliItx) {
      const routeOverride = route.extensionOverrides?.find((o) => o.extensionNumber === extensionNumber);
      if (routeOverride && routeOverride.callerId) {
        resolvedCallerId = routeOverride.callerId;
        source = 'route_extension_override';
        explanation = `Sobrescrita prioritária da Rota aplicada para o ramal ${extensionNumber}: ${routeOverride.label ? `${routeOverride.label} (${routeOverride.callerId})` : routeOverride.callerId}.`;
      } else if (ext.cliCallerId) {
        resolvedCallerId = ext.cliCallerId;
        source = 'extension_cli_setting';
        explanation = `BINA CLI/ITX personalizada configurada no cadastro do Ramal ${extensionNumber}: ${ext.cliCallerId}.`;
      } else if (route.callerIdOverride) {
        resolvedCallerId = route.callerIdOverride;
        source = 'route_default';
        explanation = `Ramal sem BINA CLI individual; utilizando CallerID fallback padrão da Rota CLI/ITX: ${route.callerIdOverride}.`;
      }
    } else if (route.callerIdOverride) {
      resolvedCallerId = route.callerIdOverride;
      source = 'route_default';
      explanation = `Rota padrão sem CLI dinâmico com CallerID fixo configurado: ${route.callerIdOverride}.`;
    }

    const trunk = route.trunkId ? await TrunkRepository.findById(route.trunkId) : null;
    const trunkHost = trunk ? trunk.host : 'sip.operadora.com.br';

    return {
      extensionNumber: ext.number,
      extensionName: ext.name,
      originalCallerId: ext.callerId,
      routeId: route.id,
      routeName: route.name,
      pattern: route.pattern,
      isCliItx: !!route.isCliItx,
      resolutionSource: source,
      resolvedCallerId,
      headersAdded: {
        callerIdNum: resolvedCallerId,
        callerIdName: resolvedCallerId,
        pAssertedIdentity: route.isCliItx ? `<sip:${resolvedCallerId}@${trunkHost}>` : undefined,
        remotePartyId: route.isCliItx ? `<sip:${resolvedCallerId}@${trunkHost}>;party=calling;screen=yes;privacy=off` : undefined,
      },
      explanation,
      matchedTrunk: trunk ? { id: trunk.id, name: trunk.name, provider: trunk.providerName, host: trunk.host } : null,
    };
  }
}

export const asteriskService = new AsteriskService();
