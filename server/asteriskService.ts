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
      state: 'Up',
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
      state: 'Up',
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
    return this.activeChannels;
  }

  addSimulationChannel(caller: string, callee: string, isAi: boolean): AsteriskChannel {
    const id = `chan-${Date.now()}.${Math.floor(Math.random() * 1000)}`;
    const chan: AsteriskChannel = {
      id,
      name: `PJSIP/${caller.replace(/\D/g, '') || '4101'}-${Math.floor(Math.random() * 90000 + 10000).toString(16)}`,
      state: 'Up',
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

  // Pure Asterisk 20+ PJSIP configuration generator (pjsip.conf)
  generatePjsipConf(tenantId: string = 'tenant-enlace-matriz'): string {
    const extensions = db.extensions.filter((e) => e.tenantId === tenantId);
    const trunks = db.trunks.filter((t) => t.tenantId === tenantId);

    let output = `; ====================================================================
; Enlace-PBX — Configuração Automática PJSIP (pjsip.conf)
; Asterisk 20 LTS Puro — Enlace Telecom (Brasil)
; Data de geração: ${new Date().toISOString()}
; ====================================================================

[global]
type=global
user_agent=Enlace-PBX 20.17 / Asterisk Pure Brazilian Stack
default_outbound_endpoint=default

; --- Transporte UDP Geral ---
[transport-udp]
type=transport
protocol=udp
bind=0.0.0.0:5060

; --- Transporte WebRTC WebSocket Seguro (WSS) ---
[transport-wss]
type=transport
protocol=wss
bind=0.0.0.0:8089

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
from_user=${trk.username}
from_domain=${trk.host}
callerid=${trk.callerId}
direct_media=no
rtp_symmetric=yes
force_rport=yes
rewrite_contact=yes

[trunk-${trk.id}-auth]
type=auth
auth_type=userpass
username=${trk.username}
password=DEFINIR_SENHA_TRONCO_NO_ENV

[trunk-${trk.id}-aor]
type=aor
contact=sip:${trk.host}:${trk.port}
qualify_frequency=60

${trk.register ? `[trunk-${trk.id}-reg]
type=registration
outbound_auth=trunk-${trk.id}-auth
server_uri=sip:${trk.host}:${trk.port}
client_uri=sip:${trk.username}@${trk.host}:${trk.port}
retry_interval=30
max_retries=10
` : ''}
`;
    }

    return output;
  }

  // Pure Asterisk 20+ Dialplan generator (extensions.conf)
  generateExtensionsConf(tenantId: string = 'tenant-enlace-matriz'): string {
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

; Discagem direta para ramais de 4 dígitos (ex: 4101 a 4999)
[internal-extensions]
exten => _4XXX,1,NoOp(Enlace-PBX: Chamada Interna para Ramal \${EXTEN})
 same => n,Set(CDR(tenant_id)=${tenantId})
 same => n,Set(CALLFILENAME=rec-\${EPOCH}-\${CALLERID(num)}-\${EXTEN})
 same => n,MixMonitor(\${ENLACE_RECORDINGS_PATH}/\${CALLFILENAME}.wav,b)
 same => n,Dial(PJSIP/\${EXTEN},30,tT)
 same => n,GotoIf($["\${DIALSTATUS}" = "BUSY"]?busy:unavail)
 same => n(busy),VoiceMail(\${EXTEN}@default,b)
 same => n,Hangup()
 same => n(unavail),VoiceMail(\${EXTEN}@default,u)
 same => n,Hangup()

; Grupos de Toque
[ring-groups]
${groups
  .map(
    (g) => `exten => ${g.number},1,NoOp(Grupo de Toque: ${g.name})
 same => n,Dial(${g.members.map((m) => `PJSIP/${m}`).join('&')},${g.timeoutSeconds},tT)
 same => n,Hangup()`
  )
  .join('\n\n')}

; Filas de Atendimento
[call-queues]
${queues
  .map(
    (q) => `exten => ${q.number},1,NoOp(Fila: ${q.name})
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
; Conforme PRD Seção 43:
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
; Rotas de Saída (Regras brasileiras de discagem)
; ====================================================================
[outbound-routes]
${routes
  .filter((r) => r.type === 'outbound')
  .map(
    (r) => `exten => _${r.pattern},1,NoOp(Rota de Saida: ${r.name})
 same => n,Set(CALLFILENAME=rec-out-\${EPOCH}-\${EXTEN})
 same => n,MixMonitor(\${ENLACE_RECORDINGS_PATH}/\${CALLFILENAME}.wav,b)
 same => n,Dial(\${TRUNK_VIVO}/\${EXTEN:${r.prefixRemove ? r.prefixRemove.length : 0}},60,tT)
 same => n,Hangup()`
  )
  .join('\n\n')}

; ====================================================================
; Rotas de Entrada (Operadoras Brasileiras)
; ====================================================================
[from-trunk]
exten => 08007702020,1,NoOp(Entrada Claro 0800 -> Agente Gemini MaIA)
 same => n,Goto(from-gemini,s,1)

exten => 1130900100,1,NoOp(Entrada Vivo SP -> URA Principal)
 same => n,Goto(ivr-menus,6001,1)

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
    libogg-dev libvorbis-dev libopus-dev libsndfile1-dev libneon27-dev \\
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

echo "[4/7] Configurando compilação com suporte a PJSIP, ARI, WebRTC e AudioSocket..."
./configure --with-jansson --with-ssl --with-opus --with-pjproject-bundled

make menuselect.makeopts
menuselect/menuselect \\
    --enable res_pjsip \\
    --enable res_pjsip_transport_websocket \\
    --enable res_http_websocket \\
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
