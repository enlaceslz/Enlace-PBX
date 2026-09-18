import { db, Extension, Trunk, Route } from './db.js';

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
}

export class AsteriskService {
  private activeChannels: AsteriskChannel[] = [
    {
      id: 'chan-1725969600.104',
      name: 'PJSIP/trunk-claro-0800-0000021c',
      state: 'Up' as 'Up',
      callerNumber: '08007702020',
      connectedLine: 'Stasis/enlace-gemini',
      context: 'from-gemini',
      exten: 's',
      application: 'Stasis(enlace-gemini)',
      durationSeconds: 45,
      aiBridgeActive: true,
    },
    {
      id: 'chan-1725969601.105',
      name: 'PJSIP/4101-0000021d',
      state: 'Up' as 'Up',
      callerNumber: '4101',
      connectedLine: '4102',
      context: 'from-internal',
      exten: '4102',
      application: 'Dial(PJSIP/4102,30)',
      durationSeconds: 112,
      aiBridgeActive: false,
    },
  ];

  getActiveChannels(): AsteriskChannel[] {
    // Dynamic mock for active channels to make the dashboard blink
    const now = Date.now();
    
    // Clear out old random channels periodically to simulate hangup
    this.activeChannels = this.activeChannels.filter(c => {
       const created = parseInt(c.id.split('-')[1].split('.')[0]) || now;
       return (now - created) < 180000; // max 3 mins alive
    });

    // Randomly spawn new channels if we have fewer than 5
    if (this.activeChannels.length < 5 && Math.random() > 0.4) {
      const isAi = Math.random() > 0.3;
      const caller = `119${Math.floor(Math.random() * 90000000 + 10000000)}`;
      const callee = isAi ? '9001' : '5002';
      
      const id = `chan-${now}.${Math.floor(Math.random() * 1000)}`;
      const chan = {
        id,
        name: `PJSIP/${caller}-${Math.floor(Math.random() * 90000 + 10000).toString(16)}`,
        state: 'Up' as 'Up',
        callerNumber: caller,
        connectedLine: callee,
        durationSeconds: 0,
        exten: callee,
        aiBridgeActive: isAi,
        application: isAi ? 'Stasis' : 'Dial',
        context: 'enlace-inbound',
        format: 'ulaw'
      };
      this.activeChannels.push(chan);
    }

    // Update durations and QoS
    return this.activeChannels.map(c => {
       const created = parseInt(c.id.split('-')[1].split('.')[0]) || now;
       const durationSeconds = Math.floor((now - created) / 1000);
       
       // Generate RTCP QoS metrics
       const jitterMs = Math.max(1, Math.round(Math.random() * 5) + (Math.random() > 0.9 ? 15 : 0));
       const latencyMs = Math.max(10, Math.round(Math.random() * 10 + 20) + (Math.random() > 0.95 ? 50 : 0));
       const packetLossPercent = Math.random() > 0.95 ? parseFloat((Math.random() * 2).toFixed(2)) : 0;
       
       return {
         ...c,
         durationSeconds,
         qos: { latencyMs, jitterMs, packetLossPercent }
       };
    });
  }

  addSimulationChannel(caller: string, callee: string, isAi: boolean): AsteriskChannel {
    const id = `chan-${Date.now()}.${Math.floor(Math.random() * 1000)}`;
    const chan: AsteriskChannel = {
      id,
      name: `PJSIP/${caller.replace(/\D/g, '') || '4101'}-${Math.floor(Math.random() * 90000 + 10000).toString(16)}`,
      state: 'Up' as 'Up',
      callerNumber: caller,
      connectedLine: isAi ? 'MaIA (Gemini Live)' : callee,
      context: isAi ? 'from-gemini' : 'from-internal',
      exten: isAi ? 's' : callee,
      application: isAi ? 'Stasis(enlace-gemini)' : `Dial(PJSIP/${callee})`,
      durationSeconds: 1,
      aiBridgeActive: isAi,
    };
    this.activeChannels.push(chan);
    return chan;
  }

  terminateSimulationChannel(channelId: string) {
    this.activeChannels = this.activeChannels.filter((c) => c.id !== channelId);
  }

  hangupChannel(channelId: string): boolean {
    const prevCount = this.activeChannels.length;
    this.activeChannels = this.activeChannels.filter((c) => c.id !== channelId && c.name !== channelId);
    return this.activeChannels.length < prevCount;
  }

  transferChannel(channelId: string, destination: string): AsteriskChannel | null {
    const chan = this.activeChannels.find((c) => c.id === channelId || c.name === channelId);
    if (!chan) return null;
    chan.connectedLine = destination;
    chan.exten = destination;
    chan.application = `Dial(PJSIP/${destination})`;
    chan.aiBridgeActive = destination === '9001' || destination.toLowerCase().includes('maia');
    return chan;
  }

  spyChannel(channelId: string, supervisorExt: string = '4101'): AsteriskChannel {
    const targetChan = this.activeChannels.find((c) => c.id === channelId || c.name === channelId);
    const targetName = targetChan ? targetChan.name : channelId;
    const spyId = `chan-spy-${Date.now()}`;
    const spyChan: AsteriskChannel = {
      id: spyId,
      name: `PJSIP/${supervisorExt}-spy`,
      state: 'Up' as 'Up',
      callerNumber: supervisorExt,
      connectedLine: `ChanSpy(${targetName})`,
      context: 'from-internal',
      exten: supervisorExt,
      application: `ChanSpy(${targetName},qb)`,
      durationSeconds: 1,
      aiBridgeActive: false,
    };
    this.activeChannels.push(spyChan);
    return spyChan;
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
      output += `; ----------------------------------------------------
; Tronco SIP: ${trk.name} (${trk.providerName})
; ----------------------------------------------------
[trunk-${trk.id}]
type=endpoint
context=${trk.context}
disallow=all
${trk.codecs.map((c) => `allow=${c}`).join('\n')}
aors=trunk-${trk.id}-aor
outbound_auth=trunk-${trk.id}-auth
from_user=${trk.fromUser || trk.username}
from_domain=${trk.fromDomain || trk.host}
callerid=${trk.callerId}
dtmf_mode=${trk.dtmfMode || 'rfc4733'}
direct_media=${trk.directMedia ? 'yes' : 'no'}
rtp_symmetric=yes
force_rport=yes
rewrite_contact=yes
${trk.callerIdMode === 'pai' ? 'send_pai=yes\ntrust_id_inbound=yes' : trk.callerIdMode === 'rpid' ? 'send_rpid=yes\ntrust_id_inbound=yes' : ''}
${trk.outboundProxy ? `outbound_proxy=${trk.outboundProxy}` : ''}

[trunk-${trk.id}-auth]
type=auth
auth_type=userpass
username=${trk.username}
password=DEFINIR_SENHA_TRONCO_NO_ENV

[trunk-${trk.id}-aor]
type=aor
contact=sip:${trk.host}:${trk.port}
qualify_frequency=${trk.qualifyFrequency || 60}
${trk.outboundProxy ? `outbound_proxy=${trk.outboundProxy}` : ''}

${trk.register ? `[trunk-${trk.id}-reg]
type=registration
outbound_auth=trunk-${trk.id}-auth
server_uri=sip:${trk.host}:${trk.port}
client_uri=sip:${trk.username}@${trk.host}:${trk.port}
retry_interval=30
max_retries=10
${trk.outboundProxy ? `outbound_proxy=${trk.outboundProxy}` : ''}
` : ''}
`;
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

    let lines = `exten => ${pat},1,NoOp(Rota de Saida: ${r.name})
 same => n,Set(CDR(tenant_id)=${tenantId})
 same => n,Set(CALLFILENAME=rec-out-\${EPOCH}-\${EXTEN})
 same => n,MixMonitor(\${ENLACE_RECORDINGS_PATH}/\${CALLFILENAME}.wav,b)`;

    if (r.callerIdOverride) {
      lines += `\n same => n,Set(CALLERID(num)=${r.callerIdOverride})`;
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
      const chans = this.activeChannels;
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
Channels subscribed: ${this.activeChannels.filter(c => c.aiBridgeActive).length}
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
}

export const asteriskService = new AsteriskService();
