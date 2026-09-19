import { db, Extension, Trunk, Route } from './db.js';
import { asteriskAdapter, AsteriskChannelInfo } from './infrastructure/asterisk/AsteriskAdapter.js';

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
  qos?: {
    latencyMs: number;
    jitterMs: number;
    packetLossPercent: number;
  };
}

export class AsteriskService {
  private activeChannelsCache: AsteriskChannel[] = [];
  private lastFetchTime: number = 0;

  constructor() {
    this.refreshChannelsReal();
  }

  /**
   * Atualiza cache de canais reais consultando o Asterisk Core.
   */
  public async refreshChannelsReal(): Promise<AsteriskChannel[]> {
    try {
      const realChannels = await asteriskAdapter.getChannels();
      this.activeChannelsCache = realChannels.map((c) => ({
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
        qos: c.qos,
      }));
      this.lastFetchTime = Date.now();
      return this.activeChannelsCache;
    } catch {
      this.activeChannelsCache = [];
      return [];
    }
  }

  /**
   * Retorna os canais ativos reais do Asterisk.
   * Não gera NUNCA chamadas sintéticas com Math.random.
   */
  getActiveChannels(): AsteriskChannel[] {
    // Se o cache tiver mais de 2 segundos, dispara atualização em segundo plano
    if (Date.now() - this.lastFetchTime > 2000) {
      this.refreshChannelsReal().catch(() => {});
    }
    return this.activeChannelsCache;
  }

  /**
   * Origina chamada real através do AsteriskAdapter.
   */
  async originateCall(caller: string, callee: string, isAi: boolean = false): Promise<AsteriskChannel> {
    const chan = await asteriskAdapter.originateCall(caller, callee, isAi);
    const mapped: AsteriskChannel = {
      id: chan.id,
      name: chan.name,
      state: chan.state,
      callerNumber: chan.callerNumber,
      connectedLine: chan.connectedLine,
      context: chan.context,
      exten: chan.exten,
      application: chan.application,
      durationSeconds: chan.durationSeconds,
      aiBridgeActive: chan.aiBridgeActive,
    };
    this.activeChannelsCache.push(mapped);
    return mapped;
  }

  /**
   * Encerra um canal real no Asterisk.
   */
  async hangupChannel(channelId: string): Promise<boolean> {
    const success = await asteriskAdapter.hangup(channelId);
    this.activeChannelsCache = this.activeChannelsCache.filter(
      (c) => c.id !== channelId && c.name !== channelId
    );
    return success;
  }

  /**
   * Transfere chamada real no Asterisk.
   */
  async transferChannel(channelId: string, destination: string): Promise<AsteriskChannel | null> {
    await asteriskAdapter.transfer(channelId, destination);
    const chan = this.activeChannelsCache.find(
      (c) => c.id === channelId || c.name === channelId
    );
    if (chan) {
      chan.connectedLine = destination;
      chan.exten = destination;
      chan.application = `Dial(PJSIP/${destination})`;
      chan.aiBridgeActive = destination === '9001' || destination.toLowerCase().includes('maia');
      return chan;
    }
    return null;
  }

  /**
   * Escuta supervisora (ChanSpy) real.
   */
  async spyChannel(channelId: string, supervisorExt: string = '4101'): Promise<boolean> {
    const res = await asteriskAdapter.executeCli(
      `originate PJSIP/${supervisorExt} application ChanSpy ${channelId},qb`
    );
    return res.success;
  }

  // Pure Asterisk 20+ PJSIP configuration generator (pjsip.conf)
  generatePjsipConf(tenantId: string = 'tenant-enlace-matriz'): string {
    const extensions = db.extensions.filter((e) => e.tenantId === tenantId);
    const trunks = db.trunks.filter((t) => t.tenantId === tenantId);

    const infra = db.infraConfig;
    let output = `; ====================================================================
; Enlace-PBX — Configuração Automática PJSIP (pjsip.conf)
; Asterisk 20 LTS Puro — Enlace Telecom (Brasil)
; Hostname: ${infra.hostname} | Domínio: ${infra.domain}
; IP Público (WAN): ${infra.publicIp} | Rede Local (LAN): ${infra.lanSubnet}
; Certificado SSL: ${infra.sslCertificate.certPath}
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
local_net=${infra.lanSubnet}
external_media_address=${infra.publicIp}
external_signaling_address=${infra.publicIp}

; --- Transporte TLS Seguro (SIP Seguro) ---
[transport-tls]
type=transport
protocol=tls
bind=0.0.0.0:${infra.ports.sipTls}
cert_file=${infra.sslCertificate.certPath}
priv_key_file=${infra.sslCertificate.keyPath}
method=tlsv1_2
local_net=${infra.lanSubnet}
external_media_address=${infra.publicIp}
external_signaling_address=${infra.publicIp}

; --- Transporte WebRTC WebSocket Seguro (WSS / Webphone) ---
[transport-wss]
type=transport
protocol=wss
bind=0.0.0.0:${infra.ports.webrtcWss}
cert_file=${infra.sslCertificate.certPath}
priv_key_file=${infra.sslCertificate.keyPath}
local_net=${infra.lanSubnet}
external_media_address=${infra.publicIp}
external_signaling_address=${infra.publicIp}

`;

    // Extensions
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
dtls_cert_file=/etc/asterisk/keys/asterisk.crt
dtls_private_key_file=/etc/asterisk/keys/asterisk.key
dtls_setup=actpass` : ''}

[${ext.number}-auth]
type=auth
auth_type=userpass
password=${ext.sipSecret}
username=${ext.number}

[${ext.number}-aor]
type=aor
max_contacts=5
remove_existing=yes
qualify_frequency=30

`;
    }

    // Trunks
    for (const trk of trunks) {
      const isIpAuth = trk.authMode === 'ip';
      const authorizedIpsList = (trk.authorizedIps && trk.authorizedIps.length > 0)
        ? trk.authorizedIps
        : [trk.host];

      output += `; ----------------------------------------------------
; Tronco SIP: ${trk.name} (${trk.providerName})
; Modo: ${isIpAuth ? 'AUTENTICAÇÃO POR IP (Sem REGISTER / Sem Usuário e Senha)' : 'Credenciais SIP'}
; ----------------------------------------------------
[trunk-${trk.id}]
type=endpoint
context=${trk.inboundContext || trk.context || 'from-trunk'}
disallow=all
${trk.codecs.map((c) => `allow=${c}`).join('\n')}
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
qualify_frequency=${trk.qualifyFrequency || 60}
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
password=DEFINIR_SENHA_TRONCO_NO_ENV

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

  // Pure Asterisk 20+ Dialplan generator (extensions.conf)
  generateExtensionsConf(tenantId: string = 'tenant-enlace-matriz'): string {
    const extensions = db.extensions.filter((e) => e.tenantId === tenantId);
    const routes = db.routes.filter((r) => r.tenantId === tenantId);
    const groups = db.ringGroups.filter((g) => g.tenantId === tenantId);
    const queues = db.queues.filter((q) => q.tenantId === tenantId);
    const ivrs = db.ivrs.filter((i) => i.tenantId === tenantId);
    const dids = db.dids.filter((d) => d.tenantId === tenantId && d.status === 'active');

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
TRUNK_VIVO=PJSIP/trunk-vivo-e1
TRUNK_CLARO=PJSIP/trunk-claro-0800
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
    (ext) => `exten => ${ext.number},1,NoOp(Enlace-PBX: Chamada Interna para Ramal ${ext.number} - ${ext.name})
 same => n,Set(CDR(tenant_id)=${tenantId})
 same => n,Set(CALLFILENAME=rec-\${EPOCH}-\${CALLERID(num)}-\${EXTEN})
 ${ext.recording === 'always' ? `same => n,MixMonitor(\${ENLACE_RECORDINGS_PATH}/\${CALLFILENAME}.wav,b)` : ''}
 same => n,Dial(PJSIP/\${EXTEN},30,tT)
 same => n,GotoIf($["\${DIALSTATUS}" = "BUSY"]?busy:unavail)
 ${
   ext.voicemail
     ? `same => n(busy),VoiceMail(\${EXTEN}@default,b)
 same => n,Hangup()
 same => n(unavail),VoiceMail(\${EXTEN}@default,u)
 same => n,Hangup()`
     : `same => n(busy),Busy(10)
 same => n,Hangup()
 same => n(unavail),Congestion(10)
 same => n,Hangup()`
 }`
  )
  .join('\n\n')}

; Padrão fallback para ramais de 3 a 5 dígitos
exten => _[1-9]XX,1,Dial(PJSIP/\${EXTEN},30,tT)
 same => n,Hangup()
exten => _[1-9]XXX,1,Dial(PJSIP/\${EXTEN},30,tT)
 same => n,Hangup()
exten => _[1-9]XXXX,1,Dial(PJSIP/\${EXTEN},30,tT)
 same => n,Hangup()

; Grupos de Toque
[ring-groups]
${groups
  .map(
    (g) => `exten => ${g.number},1,NoOp(Grupo de Toque: ${g.name})
 same => n,Set(CDR(tenant_id)=${tenantId})
 same => n,Dial(${g.members.map((m) => `PJSIP/${m}`).join('&')},${g.timeoutSeconds},tT)
 same => n,Hangup()`
  )
  .join('\n\n')}

; Filas de Atendimento
[call-queues]
${queues
  .map(
    (q) => `exten => ${q.number},1,NoOp(Fila: ${q.name})
 same => n,Set(CDR(tenant_id)=${tenantId})
 same => n,Answer()
 same => n,Queue(${q.id},t,,,${q.timeoutSeconds})
 same => n,Hangup()`
  )
  .join('\n\n')}

; URAs / IVR
[ivr-menus]
${ivrs
  .map(
    (ivr) => `exten => ${ivr.number},1,NoOp(URA: ${ivr.name})
 same => n,Set(CDR(tenant_id)=${tenantId})
 same => n,Answer()
 same => n,Wait(1)
 same => n(menu),Background(enlace/prompts/${ivr.id})
 same => n,WaitExten(${ivr.timeoutSeconds})
${ivr.options
  .map(
    (opt) => `exten => ${opt.digit},1,NoOp(URA Opção ${opt.digit}: ${opt.label})
${
  opt.destinationType === 'extension'
    ? ` same => n,Goto(from-internal,${opt.destinationTarget},1)`
    : opt.destinationType === 'queue'
    ? ` same => n,Goto(call-queues,${opt.destinationTarget},1)`
    : opt.destinationType === 'ai_agent'
    ? ` same => n,Goto(from-gemini,s,1)`
    : ` same => n,Hangup()`
}`
  )
  .join('\n')}
exten => t,1,Goto(menu)
exten => i,1,Playback(pbx-invalid)
 same => n,Goto(menu)`
  )
  .join('\n\n')}

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
[outbound-routes]
${routes
  .filter((r) => r.type === 'outbound')
  .map((r) => {
    const pat = r.pattern.startsWith('_') ? r.pattern : `_${r.pattern}`;
    const stripDigits = r.prefixRemove ? r.prefixRemove.length : 0;
    const prependStr = r.prepend || '';
    const dialedExten = prependStr ? `${prependStr}\${EXTEN:${stripDigits}}` : `\${EXTEN:${stripDigits}}`;
    const targetTrunk = r.trunkId ? `PJSIP/trunk-${r.trunkId}` : `\${TRUNK_VIVO}`;
    const safeRouteTag = r.id.replace(/[^a-zA-Z0-9_]/g, '_');

    let lines = `exten => ${pat},1,NoOp(Rota de Saida: ${r.name}${r.isCliItx ? ' [MODO CLI/ITX - BINA DINAMICA]' : ''})
 same => n,Set(CDR(tenant_id)=${tenantId})
 same => n,Set(CALLFILENAME=rec-out-\${EPOCH}-\${EXTEN})
 same => n,MixMonitor(\${ENLACE_RECORDINGS_PATH}/\${CALLFILENAME}.wav,b)`;

    if (r.isCliItx) {
      lines += `\n ; --- Tratamento Especial CLI/ITX: Identificacao de Ramal para BINA Aberta ---
 same => n,Set(CALLING_EXT=\${CALLERID(num)})
 same => n,Set(TARGET_CLI=)`;

      // 1. Prioridade 1: Overrides específicos definidos na própria rota
      if (r.extensionOverrides && r.extensionOverrides.length > 0) {
        for (const ov of r.extensionOverrides) {
          if (ov.extensionNumber && ov.callerId) {
            lines += `\n same => n,ExecIf($["\${CALLING_EXT}" = "${ov.extensionNumber}"]?Set(TARGET_CLI=${ov.callerId}))`;
          }
        }
      }

      // 2. Prioridade 2: cliCallerId configurado no cadastro do Ramal (Extension.cliCallerId)
      for (const ext of extensions) {
        if (ext.cliCallerId) {
          lines += `\n same => n,ExecIf($["\${CALLING_EXT}" = "${ext.number}" & $[${'${LEN(${TARGET_CLI})}'} = 0]]?Set(TARGET_CLI=${ext.cliCallerId}))`;
        }
      }

      // 3. Prioridade 3: Fallback para callerIdOverride da Rota
      if (r.callerIdOverride) {
        lines += `\n same => n,ExecIf($[$[${'${LEN(${TARGET_CLI})}'} = 0]]?Set(TARGET_CLI=${r.callerIdOverride}))`;
      }

      // 4. Aplica no Asterisk PJSIP (CallerID num, name e P-Asserted-Identity)
      lines += `\n same => n,GotoIf($[$[${'${LEN(${TARGET_CLI})}'} > 0]?apply_cli_${safeRouteTag}:continue_dial_${safeRouteTag})
 same => n(apply_cli_${safeRouteTag}),NoOp(=== Enlace-PBX CLI/ITX: Ramal \${CALLING_EXT} binando com sucesso \${TARGET_CLI} ===)
 same => n,Set(CALLERID(num)=\${TARGET_CLI})
 same => n,Set(CALLERID(name)=\${TARGET_CLI})
 same => n,Set(PJSIP_HEADER(add,P-Asserted-Identity)=<sip:\${TARGET_CLI}@\${CHANNEL(pjsip,remote_addr)}>)
 same => n(continue_dial_${safeRouteTag}),NoOp(Prosseguindo discagem via tronco)`;
    } else if (r.callerIdOverride) {
      lines += `\n same => n,Set(CALLERID(num)=${r.callerIdOverride})
 same => n,Set(CALLERID(name)=${r.callerIdOverride})`;
    }

    lines += `\n same => n,Dial(${targetTrunk}/${dialedExten},60,tT)`;

    if (r.failoverTrunkId) {
      const failoverTrunk = `PJSIP/trunk-${r.failoverTrunkId}`;
      lines += `\n same => n,GotoIf($["\${DIALSTATUS}" = "CHANUNAVAIL" | "\${DIALSTATUS}" = "CONGESTION" | "\${DIALSTATUS}" = "BUSY"]?failover_${safeRouteTag}:hangup_normal)
 same => n(failover_${safeRouteTag}),NoOp(=== CONTINGENCIA LCR: Tronco primario indisponivel (\${DIALSTATUS}). Acionando ${failoverTrunk} ===)
 same => n,Dial(${failoverTrunk}/${dialedExten},60,tT)
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
    let dest = 'Goto(from-internal,4101,1)';
    if (d.destinationType === 'extension') dest = `Goto(from-internal,${d.destinationId},1)`;
    else if (d.destinationType === 'queue') dest = `Goto(call-queues,${d.destinationId},1)`;
    else if (d.destinationType === 'ivr') dest = `Goto(ivr-menus,${d.destinationId},1)`;
    else if (d.destinationType === 'ai_agent') dest = `Goto(from-gemini,s,1)`;
    else if (d.destinationType === 'ring_group') dest = `Goto(ring-groups,${d.destinationId},1)`;

    const cleanNumber = d.did.replace(/\D/g, '');
    const cleanNational = cleanNumber.startsWith('55') ? cleanNumber.slice(2) : cleanNumber;
    const cleanE164 = `55${cleanNational}`;

    let lines = `; DID: ${d.presentedNumber} (${d.operatorName} - ${d.description})
exten => ${cleanNational},1,NoOp(DID: ${d.presentedNumber} [${d.operatorName}])
 same => n,Set(CDR(tenant_id)=${tenantId})
 same => n,Set(CDR(did)=${d.did})
 same => n,Set(CALLFILENAME=rec-did-\${EPOCH}-${cleanNational})
 same => n,MixMonitor(\${ENLACE_RECORDINGS_PATH}/\${CALLFILENAME}.wav,b)
 same => n,${dest}

exten => ${cleanE164},1,Goto(${cleanNational},1)`;

    return lines;
  })
  .join('\n\n')}

${routes
  .filter((r) => r.type === 'inbound')
  .map((r) => {
    const pat = r.pattern.startsWith('_')
      ? r.pattern
      : (r.pattern.includes('X') || r.pattern.includes('N') || r.pattern.includes('.') ? `_${r.pattern}` : r.pattern);
    const safeRouteTag = r.id.replace(/[^a-zA-Z0-9_]/g, '_');

    let dest = 'Goto(from-internal,4101,1)';
    if (r.destinationType === 'extension') dest = `Goto(from-internal,${r.destinationId},1)`;
    else if (r.destinationType === 'queue') dest = `Goto(call-queues,${r.destinationId},1)`;
    else if (r.destinationType === 'ivr') dest = `Goto(ivr-menus,${r.destinationId},1)`;
    else if (r.destinationType === 'ai_agent') dest = `Goto(from-gemini,s,1)`;
    else if (r.destinationType === 'ring_group') dest = `Goto(ring-groups,${r.destinationId},1)`;

    let lines = `exten => ${pat},1,NoOp(Rota de Entrada: ${r.name})
 same => n,Set(CDR(tenant_id)=${tenantId})
 same => n,Set(CALLFILENAME=rec-in-\${EPOCH}-\${CALLERID(num)}-\${EXTEN})
 same => n,MixMonitor(\${ENLACE_RECORDINGS_PATH}/\${CALLFILENAME}.wav,b)`;

    if (r.timeConditionEnabled) {
      let timeStr = '08:00-18:00,mon-fri,*,*';
      if (r.timeSchedule && typeof r.timeSchedule === 'object') {
        const weekdays = r.timeSchedule.weekdays?.length ? r.timeSchedule.weekdays.join('-') : 'mon-fri';
        timeStr = `${r.timeSchedule.startHour || '08:00'}-${r.timeSchedule.endHour || '18:00'},${weekdays},*,*`;
      }

      let afterHoursDest = 'Goto(from-gemini,s,1)'; // Default 24/7 AI MaIA
      if (r.afterHoursDestType === 'ivr') afterHoursDest = `Goto(ivr-menus,${r.afterHoursDestId || 'ivr-principal'},1)`;
      else if (r.afterHoursDestType === 'queue') afterHoursDest = `Goto(call-queues,${r.afterHoursDestId || 'queue-suporte-n1'},1)`;
      else if (r.afterHoursDestType === 'extension') afterHoursDest = `Goto(from-internal,${r.afterHoursDestId || '4101'},1)`;
      else if (r.afterHoursDestType === 'voicemail') afterHoursDest = `VoiceMail(${r.afterHoursDestId || '4101'}@default,u)`;

      lines += `\n same => n,GotoIfTime(${timeStr}?open_${safeRouteTag}:closed_${safeRouteTag})
 same => n(closed_${safeRouteTag}),NoOp(=== FORA DO EXPEDIENTE (${timeStr}): Direcionando para destino alternativo ===)
 same => n,${afterHoursDest}
 same => n(open_${safeRouteTag}),NoOp(=== EXPEDIENTE NORMAL: Direcionando para destino principal ===)
 same => n,${dest}`;
    } else {
      lines += `\n same => n,${dest}`;
    }

    return lines;
  })
  .join('\n\n')}

exten => _X.,1,NoOp(Chamada de tronco sem rota definida: \${EXTEN})
 same => n,Goto(from-internal,4101,1)
`;
  }

    // Official Linux Installer Script as specified in PRD Section 40
  generateInstallScript(): string {
    return `#!/usr/bin/env bash
# ====================================================================
# Enlace-PBX — Asterisk 20 LTS Installer Oficial
# Slogan: Telefonia inteligente. Simples, aberta e brasileira.
# Empresa: Enlace Telecom
# Compatibilidade: Debian 12 / Ubuntu Server 24.04 LTS
# ====================================================================

set -e

ASTERISK_VERSION="\${ASTERISK_VERSION:-20.17.0}"
ENLACE_USER="asterisk"
ENLACE_CONF_DIR="/etc/asterisk"
ENLACE_LOG_DIR="/var/log/asterisk"
ENLACE_SPOOL_DIR="/var/spool/asterisk"

echo "======================================================"
echo "      Enlace-PBX — Instalador Oficial Asterisk 20     "
echo "        Telefonia inteligente, aberta e brasileira.   "
echo "======================================================"

if [ "$EUID" -ne 0 ]; then
    echo "ERRO: Por favor, execute como root (sudo)."
    exit 1
fi

echo "[1/7] Atualizando repositórios e instalando dependências do sistema..."
apt-get update
apt-get install -y \\
    build-essential wget curl git subversion pkg-config \\
    libxml2-dev libncurses5-dev uuid-dev libjansson-dev libssl-dev \\
    libsqlite3-dev libedit-dev libcurl4-openssl-dev libspeexdsp-dev \\
    libogg-dev libvorbis-dev libopus-dev libsrtp2-dev libsndfile1-dev libneon27-dev \\
    libnewt-dev libtool autoconf automake postgresql-client ca-certificates

echo "[2/7] Baixando código-fonte oficial do Asterisk \${ASTERISK_VERSION}..."
cd /usr/src
if [ ! -f "asterisk-\${ASTERISK_VERSION}.tar.gz" ]; then
    wget -q --show-progress "https://downloads.asterisk.org/pub/telephony/asterisk/asterisk-\${ASTERISK_VERSION}.tar.gz"
fi
tar -xzf "asterisk-\${ASTERISK_VERSION}.tar.gz"
cd "asterisk-\${ASTERISK_VERSION}"

echo "[3/7] Instalando pré-requisitos adicionais..."
contrib/scripts/install_prereq install

echo "[4/7] Configurando compilação com suporte a PJSIP, ARI, WebRTC DTLS-SRTP e AudioSocket..."
./configure --with-jansson --with-ssl --with-opus --with-srtp --with-pjproject-bundled

make menuselect.makeopts
menuselect/menuselect \\
    --enable res_pjsip \\
    --enable res_pjsip_transport_websocket \\
    --enable res_http_websocket \\
    --enable res_srtp \\
    --enable res_crypto \\
    --enable res_ari \\
    --enable res_ari_channels \\
    --enable res_ari_bridges \\
    --enable res_ari_playbacks \\
    --enable res_ari_recordings \\
    --enable app_audiosocket \\
    --enable res_audiosocket \\
    --enable codec_opus \\
    --enable format_wav \\
    --enable format_mp3 \\
    menuselect.makeopts

echo "[5/7] Compilando Asterisk em paralelo..."
make -j"$(nproc)"
make install
make samples
make config
ldconfig

echo "[6/7] Criando usuário \${ENLACE_USER} e ajustando permissões..."
id \${ENLACE_USER} >/dev/null 2>&1 || \\
    useradd --system --home /var/lib/asterisk --shell /usr/sbin/nologin \${ENLACE_USER}

mkdir -p \${ENLACE_CONF_DIR} \${ENLACE_LOG_DIR} \${ENLACE_SPOOL_DIR} /var/lib/asterisk /var/run/asterisk
chown -R \${ENLACE_USER}:\${ENLACE_USER} \\
    \${ENLACE_CONF_DIR} \${ENLACE_LOG_DIR} \${ENLACE_SPOOL_DIR} /var/lib/asterisk /var/run/asterisk

echo "[7/7] Configurando systemd e inicializando serviço..."
systemctl daemon-reload
systemctl enable asterisk
systemctl restart asterisk

echo "======================================================"
echo " Enlace-PBX instalado com sucesso no Asterisk Puro!   "
echo "======================================================"
asterisk -rx "core show version"
asterisk -rx "pjsip show transports"
`;
  }

  // ari.conf generator
  generateAriConf(): string {
    return `; ====================================================================
; Enlace-PBX — Configuração ARI (ari.conf)
; Asterisk REST Interface para AI Gateway & Google Gemini Live
; ====================================================================

[general]
enabled = yes
pretty = yes
allowed_origins = *

[enlace]
type = user
read_only = no
password = ENLACE_ARI_SEC_TOKEN_PROD
password_format = plain
`;
  }

  // queues.conf generator (ACD Queues)
  generateQueuesConf(tenantId: string = 'tenant-enlace-matriz'): string {
    const queues = db.queues.filter((q) => q.tenantId === tenantId);

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
musicclass = default
strategy = ${q.strategy}
timeout = ${q.timeoutSeconds}
retry = 5
wrapuptime = 15
maxlen = 50
joinempty = no
leavewhenempty = yes
ringinuse = no
announce-frequency = 30
announce-holdtime = yes
announce-position = yes
`;
      q.members.forEach((member) => {
        output += `member => PJSIP/${member},0,Ramal ${member}\n`;
      });
      output += '\n';
    });

    return output;
  }

  // rtp.conf generator (WebRTC, STUN/TURN, RTP Range)
  generateRtpConf(): string {
    return `; ====================================================================
; Enlace-PBX — Configuração RTP & WebRTC ICE/STUN (rtp.conf)
; Asterisk 20 LTS — Enlace Telecom
; ====================================================================

[general]
rtpstart=10000
rtpend=20000
dtmftimeout=3000
strictrtp=yes
probation=8

; Servidores STUN públicos e corporativos para atravessamento NAT WebRTC
icesupport=yes
stunaddr=stun.l.google.com:19302
`;
  }

  // audiosocket.conf generator (Google Gemini Live 24kHz PCM16)
  generateAudioSocketConf(): string {
    return `; ====================================================================
; Enlace-PBX — Configuração AudioSocket para Google Gemini (audiosocket.conf)
; Asterisk 20 LTS — Stasis AI Bridge / app_audiosocket
; Taxa de Amostragem: 24000 Hz Linear PCM16 Bidirecional (Zero Latency)
; ====================================================================

[general]
; Porta do serviço local Node.js / Express AudioSocket Server
bindaddr = 127.0.0.1
port = 9092

[gemini-live]
uuid = e8a7419c-09b3-4f9e-8c34-7164b97d8123
endpoint = 127.0.0.1:9092
timeout = 10
sample_rate = 24000
format = slin24
`;
  }

  // Asterisk CLI Engine Execution (Simulated real Asterisk 20 console)
  executeCliCommand(rawCmd: string): string {
    const cmd = rawCmd.trim().toLowerCase();

    if (cmd === 'core show version' || cmd === 'version') {
      return `Asterisk 20.17.0 LTS built by root @ enlace-core-node-01 on a x86_64 running Linux on 2026-03-01 02:14:10 UTC`;
    }

    if (cmd === 'core show uptime' || cmd === 'uptime') {
      return `System uptime: 4 days, 18 hours, 32 minutes, 14 seconds
Last reload: 1 day, 6 hours, 10 minutes, 2 segundos`;
    }

    if (cmd === 'core show channels' || cmd.startsWith('core show chan')) {
      const chans = this.activeChannelsCache;
      const count = chans.length;
      let out = `Channel              Location             State   Application(Data)\n`;
      out += `--------------------------------------------------------------------------------\n`;
      chans.forEach((c) => {
        out += `${c.name.padEnd(20)} ${c.callerNumber.padEnd(20)} ${c.state.padEnd(7)} ${c.application}\n`;
      });
      out += `--------------------------------------------------------------------------------\n`;
      out += `${count} active channel${count === 1 ? '' : 's'}\n${count} active call${count === 1 ? '' : 's'}\n`;
      return out;
    }

    if (cmd === 'pjsip show endpoints' || cmd === 'pjsip show endpoints' || cmd === 'pjsip endpoints') {
      let out = ` Endpoint:  <Endpoint/CID.....................................>  <State.....>  <Channels.>\n`;
      out += `==========================================================================================\n\n`;
      db.extensions.forEach((ext) => {
        const state = ext.status === 'online' ? 'Available' : ext.status === 'busy' ? 'In use' : 'Unavailable';
        out += ` Endpoint:  ${ext.number}/${ext.callerId.padEnd(35)}  ${state.padEnd(12)} 0 of 5\n`;
        out += `     InAuth:  ${ext.number}-auth/${ext.number}\n`;
        out += `        Aor:  ${ext.number} (Contacts: 1/5, RTT: 12.4ms)\n\n`;
      });
      out += `Objects found: ${db.extensions.length}\n`;
      return out;
    }

    if (cmd === 'pjsip show registrations' || cmd.startsWith('pjsip show reg')) {
      let out = ` <Registration/ServerURI..............................>  <Auth..........>  <Status.......>\n`;
      out += `==========================================================================================\n`;
      db.trunks.forEach((t) => {
        out += ` ${t.id}/sip:${t.host}:${t.port}  ${t.username.padEnd(16)}  Registered\n`;
      });
      out += `\nObjects found: ${db.trunks.length}\n`;
      return out;
    }

    if (cmd === 'queue show' || cmd.startsWith('queue show')) {
      let out = ``;
      db.queues.forEach((q) => {
        out += `${q.name} has 0 calls (timeout ${q.timeoutSeconds}s) in '${q.strategy}' strategy (0s holdtime, 0s talktime), W:0, C:${q.answeredToday || 0}, A:${q.abandonedToday || 0}, SL:98.4% within 20s\n`;
        out += `   Members:\n`;
        q.members.forEach((m) => {
          out += `      PJSIP/${m} (ringinuse enabled) (dynamic) (Not in use) has taken 14 calls (last was 340 secs ago)\n`;
        });
        out += `   No Callers\n\n`;
      });
      return out;
    }

    if (cmd === 'core reload' || cmd === 'reload') {
      return `Module 'res_pjsip.so' reloaded successfully.\nModule 'app_audiosocket.so' reloaded successfully.\nModule 'res_ari.so' reloaded successfully.\nModule 'pbx_config.so' reloaded successfully.\nAsterisk configuration reloaded.`;
    }

    if (cmd === 'pjsip reload') {
      return `PJSIP configuration reloaded successfully.\n- 0 endpoints updated\n- 0 aors updated\n- 0 auths updated`;
    }

    if (cmd.startsWith('stasis show') || cmd.includes('stasis')) {
      return `Application: enlace_ai_bridge
Description: Stasis ARI bridge for Enlace Google Gemini AudioSocket
Channels subscribed: ${this.activeChannelsCache.filter(c => c.aiBridgeActive).length}
Endpoints subscribed: PJSIP/trunk-claro-0800, PJSIP/4101
Bridges subscribed: 1
Device states subscribed: 4`;
    }

    if (cmd.startsWith('audiosocket') || cmd.includes('audiosocket')) {
      return `AudioSocket Subsystem:
Active TCP/WS streams: 1 (Port 9092)
Format: PCM 16-bit linear 24000 Hz
Active latency: 18.2 ms
Packets exchanged: 48,120 (0 lost)`;
    }

    if (cmd === 'dialplan show' || cmd.startsWith('dialplan show')) {
      return `[ Context 'from-internal' ]
  '4101' =>          1. Dial(PJSIP/4101,30)                        [pbx_config]
  '4102' =>          1. Dial(PJSIP/4102,30)                        [pbx_config]
  '4103' =>          1. Dial(PJSIP/4103,30)                        [pbx_config]
  '4104' =>          1. Dial(PJSIP/4104,30)                        [pbx_config]
  '5000' =>          1. Stasis(enlace_ai_bridge,maia)              [pbx_config]
  '5001' =>          1. Queue(fila_suporte_tecnico)                [pbx_config]
  '_0[1-9]XXXXXXXXX' => 1. Set(CALLERID(num)=1140030000)           [pbx_config]
                     2. Dial(PJSIP/\${EXTEN}@trunk-claro-0800)       [pbx_config]

-= 1 context, 7 extensions, 8 priors =-`;
    }

    if (cmd === 'help' || cmd === '?') {
      return `Available Commands:
  core show channels        - List active channels and calls
  core show version         - Display Asterisk core release
  core show uptime          - Display uptime and reload history
  pjsip show endpoints      - List PJSIP endpoints (extensions)
  pjsip show registrations  - List SIP trunk registrations
  queue show                - ACD queues and agent status
  dialplan show             - Inspect generated dialplan contexts
  stasis show app           - Inspect active Stasis ARI application
  audiosocket show          - Inspect 24kHz AudioSocket stream
  core reload               - Reload all PBX modules
  pjsip reload              - Reload PJSIP transport and endpoints`;
    }

    return `No such command '${rawCmd}' (type 'help' for Asterisk 20 command list)`;
  }

  /**
   * Simulação e Resolução de CallerID / BINA para chamadas de saída
   * Permite verificar exatamente como o dialplan Asterisk e os troncos CLI/ITX
   * resolverão o número binado para qualquer ramal discando em qualquer rota.
   */
  resolveCallerIdForOutboundCall(tenantId: string, extensionNumber: string, routeId: string) {
    const ext = db.extensions.find((e) => e.tenantId === tenantId && e.number === extensionNumber);
    const route = db.routes.find((r) => r.tenantId === tenantId && r.id === routeId);

    if (!ext || !route) {
      return null;
    }

    let resolvedCallerId = ext.number;
    let source: 'route_extension_override' | 'extension_cli_setting' | 'route_default' | 'original_extension' = 'original_extension';
    let explanation = `O ramal binaria seu identificador padrão interno (${ext.callerId || ext.number}).`;

    if (route.isCliItx) {
      // 1. Prioridade 1: Sobrescrita explícita na própria rota
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

    const trunk = db.trunks.find((t) => t.id === route.trunkId);
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
