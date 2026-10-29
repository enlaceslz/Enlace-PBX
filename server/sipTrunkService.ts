import {OutboundHttpError} from './infrastructure/security/OutboundHttp.js';
import { assertSingleLineConfig } from './infrastructure/asterisk/configValidation.js';
import crypto from 'crypto';
import net from 'net';
import dgram from 'dgram';
import tls from 'tls';
import { Trunk, Did } from '../src/types/pbx.js';
import { TrunkRepository, DidRepository, SystemRepository } from './infrastructure/postgres/repositories/index.js';

export interface NormalizedDidResult {
  raw: string;
  e164: string;
  national: string;
  ddd: string;
  number: string;
  presented: string;
  isValid: boolean;
  type: 'landline' | 'mobile' | '0800' | 'special';
}

export interface TrunkDiagnosticCheck {
  id: string;
  name: string;
  category: 'PJSIP_SYNTAX' | 'NETWORK_DNS' | 'SBC_CONNECTIVITY' | 'NAT_CONFIG' | 'RTP_CODEC' | 'SECURITY';
  status: 'passed' | 'warning' | 'failed';
  latencyMs?: number;
  details: string;
  target?: string;
  recommendation?: string;
}

export interface TrunkDiagnosticReport {
  trunkId: string;
  trunkName: string;
  provider: string;
  authMode: 'ip' | 'credentials';
  testedAt: string;
  overallStatus: 'passed' | 'warning' | 'failed';
  score: number; // 0 to 100
  checks: TrunkDiagnosticCheck[];
  ipChecks: {
    ip: string;
    label?: string;
    status: 'active' | 'inactive' | 'unreachable';
    latencyMs: number;
    sipResponse: string;
  }[];
  natDetails: {
    publicIp: string;
    sipPort: number;
    rtpRange: string;
    externalSignalingAddress: string;
    externalMediaAddress: string;
    localNet: string;
  };
  summary: string;
}

export interface CallSimulationStep {
  step: number;
  phase: string;
  asteriskApp: string;
  channel: string;
  action: string;
  result: 'matched' | 'skipped' | 'routed' | 'rejected' | 'info';
  timestamp: string;
}

export interface CallSimulationResult {
  callId: string;
  sourceIp: string;
  callerId: string;
  rawDid: string;
  extractedDid: string;
  normalizedDid: string;
  matchedDid?: Did;
  matchedTrunk?: Trunk;
  destinationType: string;
  destinationTarget: string;
  destinationLabel: string;
  isAuthorizedIp: boolean;
  isKnownDid: boolean;
  routeReason: string;
  steps: CallSimulationStep[];
}

export interface HomologationTestItem {
  id: string;
  code: string;
  title: string;
  description: string;
  category: 'AUTENTICACAO_IP' | 'ROTEAMENTO_DID' | 'MIDIA_CODECS' | 'SEGURANCA' | 'ALTA_DISPONIBILIDADE';
  expectedResult: string;
  status: 'passed' | 'pending' | 'warning' | 'failed';
  executedAt?: string;
  notes?: string;
}

class SipTrunkService {
  /**
   * Normalização de números e DIDs para padrão Nacional e E.164 (RFC 3966)
   * Suporta formatos:
   * - E.164: +551135008000
   * - Nacional com 55: 551135008000
   * - Nacional simples: 1135008000
   * - 0800 / 0300: 08007702020
   * - Formatado: (11) 3500-8000
   */
  normalizeDid(rawInput: string): NormalizedDidResult {
    const raw = String(rawInput || '').trim();
    // Remove tudo que não for dígito
    let digits = raw.replace(/\D/g, '');

    // Se começa com 55 e tem 12 ou 13 dígitos (DDI Brasil), remove o 55 para achar o nacional
    if (digits.startsWith('55') && (digits.length === 12 || digits.length === 13)) {
      digits = digits.slice(2);
    }

    // Caso 0800 / 0300
    if (digits.startsWith('0800') || digits.startsWith('0300')) {
      const e164 = `+55${digits}`;
      const national = digits;
      const formatted = digits.length === 11
        ? `${digits.slice(0, 4)} ${digits.slice(4, 7)} ${digits.slice(7)}`
        : digits;

      return {
        raw,
        e164,
        national,
        ddd: '',
        number: digits,
        presented: formatted,
        isValid: digits.length >= 10,
        type: '0800',
      };
    }

    // Se tiver 10 ou 11 dígitos (DDD + Número fixo ou móvel)
    if (digits.length === 10 || digits.length === 11) {
      const ddd = digits.slice(0, 2);
      const number = digits.slice(2);
      const e164 = `+55${ddd}${number}`;
      const national = `${ddd}${number}`;
      const isMobile = number.length === 9 && number.startsWith('9');

      const formatted = isMobile
        ? `(${ddd}) ${number.slice(0, 5)}-${number.slice(5)}`
        : `(${ddd}) ${number.slice(0, 4)}-${number.slice(4)}`;

      return {
        raw,
        e164,
        national,
        ddd,
        number,
        presented: formatted,
        isValid: true,
        type: isMobile ? 'mobile' : 'landline',
      };
    }

    // Fallback para entradas especiais
    return {
      raw,
      e164: digits ? `+55${digits}` : '',
      national: digits,
      ddd: digits.slice(0, 2),
      number: digits.slice(2),
      presented: raw,
      isValid: digits.length >= 8,
      type: 'special',
    };
  }

  /**
   * Extrai o DID do cabeçalho SIP configurado
   */
  extractDidFromHeaders(
    headers: Record<string, string>,
    headerMode: 'request_uri' | 'to' | 'p_called_party_id' | 'p_asserted_identity' | 'custom',
    customHeaderName?: string
  ): string {
    let raw = '';
    switch (headerMode) {
      case 'to':
        raw = headers['To'] || headers['to'] || '';
        break;
      case 'p_called_party_id':
        raw = headers['P-Called-Party-ID'] || headers['p-called-party-id'] || '';
        break;
      case 'p_asserted_identity':
        raw = headers['P-Asserted-Identity'] || headers['p-asserted-identity'] || '';
        break;
      case 'custom':
        if (customHeaderName) {
          raw = headers[customHeaderName] || '';
        }
        break;
      case 'request_uri':
      default:
        raw = headers['Request-URI'] || headers['request_uri'] || headers['uri'] || '';
        break;
    }

    // Extrai dígitos de SIP URIs como <sip:1135008000@200.80.127.10:5060>
    const match = raw.match(/sip:([0-9+]+)@/i);
    if (match) {
      return match[1].replace('+', '');
    }

    const digitsOnly = raw.replace(/\D/g, '');
    return digitsOnly || raw;
  }

  /**
   * Valida se um IP de origem está autorizado para determinado tronco SIP
   */
  isIpAuthorized(trunk: Trunk, sourceIp: string): boolean {
    const cleanSource = sourceIp.trim();
    if (!cleanSource) return false;

    // Se o host direto do tronco coincidir
    if (trunk.host.trim() === cleanSource) return true;

    // Se o tronco possui lista explícita de IPs autorizados
    if (Array.isArray(trunk.authorizedIps) && trunk.authorizedIps.length > 0) {
      return trunk.authorizedIps.some((authIp) => {
        const cleanAuth = authIp.trim();
        if (cleanAuth === cleanSource) return true;
        // Suporte simples para sub-redes CIDR /24
        if (cleanAuth.endsWith('/24')) {
          const prefix = cleanAuth.split('.').slice(0, 3).join('.');
          return cleanSource.startsWith(prefix + '.');
        }
        return false;
      });
    }

    return false;
  }

  /**
   * Gera a configuração PJSIP específica para um tronco
   * Respeita estritamente a diretiva:
   * Se authMode === 'ip', NÃO gera REGISTER e NÃO gera auth com senha.
   * Cria identificação por IP (type=identify com match de todos os IPs autorizados).
   */
  generatePjsipForTrunk(trunk: Trunk, publicIpOverride?: string): string {
    assertSingleLineConfig({ trunk, publicIpOverride });
    const publicIp = publicIpOverride || process.env.PBX_PUBLIC_IP || process.env.PUBLIC_IP || 'NOT_CONFIGURED';
    const isIpAuth = trunk.authMode === 'ip';
    const transportName = `transport-${trunk.transport.toLowerCase()}`;
    const codecsStr = (trunk.codecs || ['pcma', 'pcmu', 'g729']).join(',');
    const qualifyFreq = trunk.qualifyFrequency || 60;
    const callerIdMode = trunk.callerIdMode || 'pai';

    // Lista de IPs para o identify: todos os IPs autorizados ou o host
    const authorizedList = (trunk.authorizedIps && trunk.authorizedIps.length > 0)
      ? trunk.authorizedIps
      : [trunk.host];
    const matchIps = authorizedList.join(',');

    let conf = `; ====================================================================
; Tronco SIP: ${trunk.name}
; Operadora: ${trunk.providerName}
; Modo de Autenticação: ${isIpAuth ? 'AUTENTICAÇÃO POR IP (Sem SIP REGISTER)' : 'Credenciais Usuário/Senha'}
; ====================================================================

; --- [1] Endpoint Principal ---
[${trunk.id}]
type = endpoint
transport = ${transportName}
context = ${trunk.inboundContext || trunk.context || 'from-trunk'}
disallow = all
allow = ${codecsStr}
rtp_symmetric = yes
force_rport = yes
rewrite_contact = yes
direct_media = ${trunk.directMedia ? 'yes' : 'no'}
ice_support = no
trust_id_inbound = yes
send_pai = ${callerIdMode === 'pai' || trunk.sendPai ? 'yes' : 'no'}
send_rpid = ${callerIdMode === 'rpid' || trunk.sendRpid ? 'yes' : 'no'}
language = pt_BR
aors = ${trunk.id}-aor
`;

    if (!isIpAuth) {
      conf += `outbound_auth = ${trunk.id}-auth\n`;
    }

    conf += `
; --- [2] Address of Record (AOR) ---
[${trunk.id}-aor]
type = aor
contact = sip:${trunk.host}:${trunk.port || 5060}
qualify_frequency = ${qualifyFreq}
qualify_timeout = 3.0
maximum_expiration = 3600
minimum_expiration = 60
`;

    if (isIpAuth) {
      conf += `
; --- [3] Identify por IP de Origem (SBCs Autorizados da Operadora) ---
; Chamadas recebidas destes endereços IP são vinculadas automaticamente ao endpoint
[${trunk.id}-identify]
type = identify
endpoint = ${trunk.id}
match = ${matchIps}
`;
    } else {
      conf += `
; --- [3] Autenticação SIP (Registro com Usuário/Senha) ---
[${trunk.id}-auth]
type = auth
auth_type = userpass
username = ${trunk.username}
password = ••••••••••••
realm = ${trunk.host}

; --- [4] SIP Registration ---
[${trunk.id}-reg]
type = registration
outbound_auth = ${trunk.id}-auth
server_uri = sip:${trunk.host}:${trunk.port || 5060}
client_uri = sip:${trunk.username}@${trunk.host}:${trunk.port || 5060}
retry_interval = 60
forbidden_retry_interval = 300
expiration = 3600
transport = ${transportName}
`;
    }

    return conf;
  }

  /**
   * Gera o contexto [from-trunk] completo no dialplan (extensions.conf)
   * Realiza:
   * 1. Extração do DID
   * 2. Normalização do número
   * 3. Busca no banco de DIDs
   * 4. Verificação de horário de atendimento (time schedule)
   * 5. Roteamento para destino configurado
   * 6. Tratamento de DID desconhecido (404, 486, 503 ou operador)
   */
  async generateDialplanForDids(tenantId: string): Promise<string> {
    const allDids = await DidRepository.listByTenant(tenantId);
    const dids = allDids.filter((d) => d.status === 'active');
    const trunks = await TrunkRepository.listByTenant(tenantId);

    let dp = `; ====================================================================
; Enlace-PBX — Dialplan de Entrada (extensions.conf)
; Contexto [from-trunk]: Roteamento Avançado de DIDs e Numerações
; Gerado automaticamente: ${new Date().toISOString()}
; ====================================================================

[from-trunk]
; Ponto de entrada para todas as chamadas recebidas dos troncos SIP
exten => _.,1,NoOp(--- [ENLACE-PBX] NOVA CHAMADA RECEBIDA DO TRONCO SIP ---)
 same => n,Set(CHANNEL(language)=pt_BR)
 same => n,Set(INCOMING_TRUNK=\${CHANNEL(endpoint)})
 same => n,Set(SOURCE_IP=\${CHANNEL(pjsip,remote_addr)})
 same => n,Set(CALL_START_TIME=\${STRFTIME(\${EPOCH},,%Y-%m-%d %H:%M:%S)})
 same => n,NoOp(CallerID: \${CALLERID(all)} | Source IP: \${SOURCE_IP} | Endpoint: \${INCOMING_TRUNK})
 
 ; Gravação de Segurança e Auditoria
 same => n,Set(CDR(source_ip)=\${SOURCE_IP})
 same => n,Set(CDR(trunk_name)=\${INCOMING_TRUNK})
 
 ; Extração e Normalização do DID
 same => n,Set(RAW_DID=\${EXTEN})
 same => n,NoOp(DID bruto recebido: \${RAW_DID})
 same => n,Goto(route-did,\${RAW_DID},1)

[route-did]
; Mapeamento Dinâmico de DIDs Cadastrados no Enlace-PBX
`;

    dids.forEach((d) => {
      const norm = this.normalizeDid(d.did);
      const patterns = Array.from(new Set([d.did, norm.national, norm.e164.replace('+', '')]));

      patterns.forEach((pat) => {
        dp += `\n; --- DID: ${d.presentedNumber} (${d.description}) ---\n`;
        dp += `exten => ${pat},1,NoOp(Chamada direcionada ao DID ${d.presentedNumber} [${d.operatorName}])\n`;
        dp += ` same => n,Set(CDR(did)=${d.did})\n`;
        dp += ` same => n,Set(CDR(accountcode)=${d.tenantId})\n`;
        dp += ` same => n,MixMonitor(enlace-did-${d.did}-\${UNIQUEID}.wav,b)\n`;

        // Se tiver horário de atendimento configurado
        if (d.timeConditionEnabled && d.timeSchedule) {
          const days = (d.timeSchedule.weekdays || ['mon', 'tue', 'wed', 'thu', 'fri']).join('-');
          dp += ` same => n,GotoIfTime(${d.timeSchedule.startHour}-${d.timeSchedule.endHour},${days},*,*?open-${d.id}:afterhours-${d.id})\n`;
          dp += ` same => n(open-${d.id}),NoOp(Horário Comercial Ativo para ${d.did})\n`;
        }

        // Destino principal
        switch (d.destinationType) {
          case 'extension':
            dp += ` same => n,Dial(PJSIP/${d.destinationId},30,tT)\n`;
            break;
          case 'queue':
            dp += ` same => n,Answer()\n`;
            dp += ` same => n,Queue(${d.destinationId},t,,,60)\n`;
            break;
          case 'ivr':
            dp += ` same => n,Answer()\n`;
            dp += ` same => n,Goto(ivr-${d.destinationId},s,1)\n`;
            break;
          case 'ring_group':
            dp += ` same => n,Goto(ringgroup-${d.destinationId},s,1)\n`;
            break;
          case 'ai_agent':
            dp += ` same => n,Answer()\n`;
            dp += ` same => n,Stasis(enlace_ai_bridge,${d.destinationId})\n`;
            break;
        }

        // Fallback se não atender
        dp += ` same => n,NoOp(Destino principal ocupado ou sem resposta. Acionando Fallback: ${d.fallbackType || 'default'})\n`;
        if (d.fallbackType === 'queue' && d.fallbackTarget) {
          dp += ` same => n,Queue(${d.fallbackTarget},t,,,30)\n`;
        } else if (d.fallbackType === 'ivr' && d.fallbackTarget) {
          dp += ` same => n,Goto(ivr-${d.fallbackTarget},s,1)\n`;
        } else if (d.fallbackType === 'human' && d.fallbackTarget) {
          dp += ` same => n,Dial(PJSIP/${d.fallbackTarget},25,tT)\n`;
        } else {
          dp += ` same => n,Hangup()\n`;
        }

        // Se tiver horário de atendimento, gera o label de afterhours
        if (d.timeConditionEnabled && d.timeSchedule) {
          dp += ` same => n(afterhours-${d.id}),NoOp(Fora do Horário Comercial para ${d.did})\n`;
          if (d.afterHoursDestType === 'ai_agent') {
            dp += ` same => n,Answer()\n`;
            dp += ` same => n,Stasis(enlace_ai_bridge,${d.afterHoursDestId || 'agent-maia-247'})\n`;
          } else if (d.afterHoursDestType === 'ivr' && d.afterHoursDestId) {
            dp += ` same => n,Answer()\n`;
            dp += ` same => n,Goto(ivr-${d.afterHoursDestId},s,1)\n`;
          } else if (d.afterHoursDestType === 'queue' && d.afterHoursDestId) {
            dp += ` same => n,Answer()\n`;
            dp += ` same => n,Queue(${d.afterHoursDestId},t,,,30)\n`;
          } else {
            dp += ` same => n,Playback(tt-weasels)\n`;
            dp += ` same => n,Hangup()\n`;
          }
        }
      });
    });

    // Tratamento para DID desconhecido (Unknown DID Handler)
    dp += `\n; --- Tratamento de DID Desconhecido ou Não Cadastrado ---
exten => i,1,Goto(handle-unknown-did,1)
exten => h,1,NoOp(Chamada encerrada pelo assinante)

exten => handle-unknown-did,1,NoOp(ALERTA DE SEGURANCA: Chamada recebida para DID nao cadastrado: \${RAW_DID})
 same => n,Set(CDR(userfield)=UNKNOWN_DID_REJECTED)
 same => n,Congestion(10)
 same => n,Hangup(1)
`;

    return dp;
  }

  /**
   * Teste real de conectividade de rede e handshake SIP OPTIONS com o host SIP / SBC.
   * Suporta UDP (socket dgram), TLS (socket tls) e TCP (socket net).
   * Separa estritamente:
   * - Camada de Transporte: TCP_REACHABLE, TCP_UNREACHABLE, UDP_REACHABLE, TLS_REACHABLE, TIMEOUT, UNAVAILABLE
   * - Camada SIP: SIP_OPTIONS_200, SIP_OPTIONS_401, SIP_OPTIONS_403, SIP_OPTIONS_404,
   *               SIP_OPTIONS_408, SIP_OPTIONS_5XX, SIP_TIMEOUT, SIP_INVALID_RESPONSE
   * Guarda evidência completa do teste e NUNCA converte conexão de transporte em "200 OK" sem resposta SIP real.
   */
  async testSipHostSocket(
    hostOrIp: string,
    port: number = 5060,
    timeoutMs: number = 2500,
    transport: 'TCP' | 'UDP' | 'TLS' = 'UDP'
  ): Promise<{
    status: 'active' | 'inactive' | 'unreachable';
    classification:
      | 'SIP_OPTIONS_200'
      | 'SIP_OPTIONS_401'
      | 'SIP_OPTIONS_403'
      | 'SIP_OPTIONS_404'
      | 'SIP_OPTIONS_408'
      | 'SIP_OPTIONS_5XX'
      | 'SIP_TIMEOUT'
      | 'SIP_INVALID_RESPONSE'
      | 'TCP_REACHABLE'
      | 'TCP_UNREACHABLE'
      | 'UDP_REACHABLE'
      | 'TLS_REACHABLE'
      | 'TIMEOUT'
      | 'UNAVAILABLE';
    transport: 'TCP' | 'UDP' | 'TLS';
    target: string;
    port: number;
    sentAt: string | null;
    receivedAt: string | null;
    responseCode: number | null;
    responseReason: string | null;
    latencyMs: number;
    sipResponse: string;
  }> {
    const cleanHost = hostOrIp.split('/')[0].trim();
    const start = Date.now();
    const target = cleanHost;

    const buildOptionsPacket = (proto: string) =>
      `OPTIONS sip:${cleanHost}:${port} SIP/2.0\r\n` +
      `Via: SIP/2.0/${proto} 127.0.0.1;branch=z9hG4bK-enlace-${Date.now()}\r\n` +
      `Max-Forwards: 70\r\n` +
      `From: <sip:ping@enlace.slz.br>;tag=ping-${Date.now()}\r\n` +
      `To: <sip:${cleanHost}>\r\n` +
      `Call-ID: ping-${Date.now()}@enlace.slz.br\r\n` +
      `CSeq: 1 OPTIONS\r\n` +
      `User-Agent: Enlace-PBX Enterprise Pure SIP\r\n` +
      `Content-Length: 0\r\n\r\n`;

    const parseSipResponse = (
      responseBuffer: string,
      sentTimestamp: number | null,
      receivedTimestamp: number
    ) => {
      const statusMatch = responseBuffer.match(/SIP\/2\.0\s+(\d{3})\s*([^\r\n]*)/i);
      if (!statusMatch) return null;

      const code = parseInt(statusMatch[1], 10);
      const reason = (statusMatch[2] || '').trim();
      const latency = Math.max(1, receivedTimestamp - (sentTimestamp || start));

      let classification:
        | 'SIP_OPTIONS_200'
        | 'SIP_OPTIONS_401'
        | 'SIP_OPTIONS_403'
        | 'SIP_OPTIONS_404'
        | 'SIP_OPTIONS_408'
        | 'SIP_OPTIONS_5XX'
        | 'SIP_INVALID_RESPONSE' = 'SIP_INVALID_RESPONSE';

      let status: 'active' | 'inactive' | 'unreachable' = 'inactive';

      if (code === 200) {
        classification = 'SIP_OPTIONS_200';
        status = 'active';
      } else if (code === 401) {
        classification = 'SIP_OPTIONS_401';
        status = 'active'; // 401 confirma que o servidor SIP remoto está ativo e respondendo
      } else if (code === 403) {
        classification = 'SIP_OPTIONS_403';
        status = 'active';
      } else if (code === 404) {
        classification = 'SIP_OPTIONS_404';
        status = 'active';
      } else if (code === 408) {
        classification = 'SIP_OPTIONS_408';
        status = 'inactive';
      } else if (code >= 500 && code < 600) {
        classification = 'SIP_OPTIONS_5XX';
        status = 'inactive';
      }

      return {
        status,
        classification,
        responseCode: code,
        responseReason: reason || null,
        latencyMs: latency,
        sipResponse: `SIP/2.0 ${code} ${reason}`.trim(),
      };
    };

    // Caso 1: Transporte UDP Real (RFC 3261)
    if (transport === 'UDP') {
      return new Promise((resolve) => {
        const client = dgram.createSocket('udp4');
        let resolved = false;
        let sentTimestamp: number | null = null;

        const timer = setTimeout(() => {
          if (!resolved) {
            resolved = true;
            try { client.close(); } catch {}
            const latency = Date.now() - start;
            resolve({
              status: 'unreachable',
              classification: 'TIMEOUT',
              transport: 'UDP',
              target,
              port,
              sentAt: sentTimestamp ? new Date(sentTimestamp).toISOString() : null,
              receivedAt: null,
              responseCode: null,
              responseReason: 'UDP_TIMEOUT',
              latencyMs: latency,
              sipResponse: 'Nenhuma resposta SIP recebida via UDP dentro do timeout.',
            });
          }
        }, timeoutMs);

        client.on('message', (msg) => {
          if (resolved) return;
          const receivedTimestamp = Date.now();
          const parsed = parseSipResponse(msg.toString(), sentTimestamp, receivedTimestamp);
          if (parsed) {
            resolved = true;
            clearTimeout(timer);
            try { client.close(); } catch {}
            resolve({
              status: parsed.status,
              classification: parsed.classification,
              transport: 'UDP',
              target,
              port,
              sentAt: sentTimestamp ? new Date(sentTimestamp).toISOString() : null,
              receivedAt: new Date(receivedTimestamp).toISOString(),
              responseCode: parsed.responseCode,
              responseReason: parsed.responseReason,
              latencyMs: parsed.latencyMs,
              sipResponse: parsed.sipResponse,
            });
          }
        });

        client.on('error', (err: any) => {
          if (!resolved) {
            resolved = true;
            clearTimeout(timer);
            try { client.close(); } catch {}
            resolve({
              status: 'unreachable',
              classification: 'UNAVAILABLE',
              transport: 'UDP',
              target,
              port,
              sentAt: null,
              receivedAt: null,
              responseCode: null,
              responseReason: err.code || 'UDP_ERROR',
              latencyMs: Date.now() - start,
              sipResponse: `Falha no socket UDP: ${err.message || err.code}`,
            });
          }
        });

        const packet = Buffer.from(buildOptionsPacket('UDP'));
        sentTimestamp = Date.now();
        client.send(packet, 0, packet.length, port, cleanHost, (err) => {
          if (err && !resolved) {
            resolved = true;
            clearTimeout(timer);
            try { client.close(); } catch {}
            resolve({
              status: 'unreachable',
              classification: 'UNAVAILABLE',
              transport: 'UDP',
              target,
              port,
              sentAt: null,
              receivedAt: null,
              responseCode: null,
              responseReason: err.message,
              latencyMs: Date.now() - start,
              sipResponse: `Erro no envio UDP: ${err.message}`,
            });
          }
        });
      });
    }

    // Caso 2: Transporte TLS Real (SIPS / TLS 1.2+)
    if (transport === 'TLS') {
      return new Promise((resolve) => {
        let resolved = false;
        let sentTimestamp: number | null = null;
        let responseBuffer = '';

        const timer = setTimeout(() => {
          if (!resolved) {
            resolved = true;
            socket.destroy();
            const latency = Date.now() - start;
            resolve({
              status: 'unreachable',
              classification: sentTimestamp !== null ? 'SIP_TIMEOUT' : 'TIMEOUT',
              transport: 'TLS',
              target,
              port,
              sentAt: sentTimestamp ? new Date(sentTimestamp).toISOString() : null,
              receivedAt: null,
              responseCode: null,
              responseReason: sentTimestamp !== null ? 'SIP_TIMEOUT' : 'TLS_TIMEOUT',
              latencyMs: latency,
              sipResponse: sentTimestamp !== null
                ? 'Handshake TLS concluído, mas o SBC SIP não respondeu ao pacote OPTIONS (SIP_TIMEOUT).'
                : 'Timeout durante handshake TLS SIP.',
            });
          }
        }, timeoutMs);

        const socket = tls.connect(
          {
            host: cleanHost,
            port,
            rejectUnauthorized: false, // Permite certificados corporativos autoassinados
            timeout: timeoutMs,
          },
          () => {
            sentTimestamp = Date.now();
            socket.write(buildOptionsPacket('TLS'));
          }
        );

        socket.on('data', (chunk) => {
          responseBuffer += chunk.toString();
          const receivedTimestamp = Date.now();
          const parsed = parseSipResponse(responseBuffer, sentTimestamp, receivedTimestamp);
          if (parsed && !resolved) {
            resolved = true;
            clearTimeout(timer);
            socket.end();
            resolve({
              status: parsed.status,
              classification: parsed.classification,
              transport: 'TLS',
              target,
              port,
              sentAt: sentTimestamp ? new Date(sentTimestamp).toISOString() : null,
              receivedAt: new Date(receivedTimestamp).toISOString(),
              responseCode: parsed.responseCode,
              responseReason: parsed.responseReason,
              latencyMs: parsed.latencyMs,
              sipResponse: parsed.sipResponse,
            });
          }
        });

        socket.on('error', (err: any) => {
          if (!resolved) {
            resolved = true;
            clearTimeout(timer);
            resolve({
              status: 'unreachable',
              classification: 'UNAVAILABLE',
              transport: 'TLS',
              target,
              port,
              sentAt: null,
              receivedAt: null,
              responseCode: null,
              responseReason: err.code || 'TLS_ERROR',
              latencyMs: Date.now() - start,
              sipResponse: `Falha na conexão TLS SIP: ${err.message || err.code}`,
            });
          }
        });
      });
    }

    // Caso 3: Transporte TCP Real (RFC 3261)
    return new Promise((resolve) => {
      const socket = new net.Socket();
      let resolved = false;
      let sentTimestamp: number | null = null;
      let responseBuffer = '';

      const timer = setTimeout(() => {
        if (!resolved) {
          resolved = true;
          socket.destroy();
          const latency = Date.now() - start;
          const wasTcpConnected = sentTimestamp !== null;
          resolve({
            status: 'unreachable',
            classification: wasTcpConnected ? 'SIP_TIMEOUT' : 'TIMEOUT',
            transport: 'TCP',
            target,
            port,
            sentAt: sentTimestamp ? new Date(sentTimestamp).toISOString() : null,
            receivedAt: null,
            responseCode: null,
            responseReason: wasTcpConnected ? 'SIP_TIMEOUT' : 'TIMEOUT',
            latencyMs: latency,
            sipResponse: wasTcpConnected
              ? 'Conexão TCP estabelecida, mas o servidor SIP não respondeu ao pacote OPTIONS dentro do prazo (SIP_TIMEOUT).'
              : 'Tempo limite esgotado ao tentar conectar ao host SIP (TIMEOUT).',
          });
        }
      }, timeoutMs);

      socket.connect(port, cleanHost, () => {
        sentTimestamp = Date.now();
        socket.write(buildOptionsPacket('TCP'));
      });

      socket.on('data', (chunk) => {
        responseBuffer += chunk.toString();
        const receivedTimestamp = Date.now();
        const parsed = parseSipResponse(responseBuffer, sentTimestamp, receivedTimestamp);
        if (parsed && !resolved) {
          resolved = true;
          clearTimeout(timer);
          socket.end();
          resolve({
            status: parsed.status,
            classification: parsed.classification,
            transport: 'TCP',
            target,
            port,
            sentAt: sentTimestamp ? new Date(sentTimestamp).toISOString() : null,
            receivedAt: new Date(receivedTimestamp).toISOString(),
            responseCode: parsed.responseCode,
            responseReason: parsed.responseReason,
            latencyMs: parsed.latencyMs,
            sipResponse: parsed.sipResponse,
          });
        }
      });

      socket.on('error', (err: any) => {
        if (!resolved) {
          resolved = true;
          clearTimeout(timer);
          const latency = Date.now() - start;
          const isRefused = err.code === 'ECONNREFUSED';
          resolve({
            status: isRefused ? 'inactive' : 'unreachable',
            classification: 'TCP_UNREACHABLE',
            transport: 'TCP',
            target,
            port,
            sentAt: null,
            receivedAt: null,
            responseCode: null,
            responseReason: err.code || 'TCP_UNREACHABLE',
            latencyMs: latency,
            sipResponse: isRefused
              ? 'Conexão TCP recusada pelo host remoto na porta SIP (ECONNREFUSED)'
              : `Falha na camada de rede TCP: ${err.message || err.code}`,
          });
        }
      });
    });
  }

  /**
   * Executa bateria completa de diagnósticos em um tronco SIP
   */
  async runTrunkDiagnostics(trunkId: string): Promise<TrunkDiagnosticReport> {
    throw new OutboundHttpError('Diagnóstico SIP indisponível até coleta autenticada e política de destinos autorizados.',501);
  }

  /**
   * Simula o fluxo completo de uma chamada recebida para teste em tempo real
   */
  async simulateInboundCall(params: {
    sourceIp: string;
    rawDid: string;
    callerNumber: string;
    trunkId?: string;
  }): Promise<CallSimulationResult> {
    const callId = `sim-call-${Date.now()}`;
    const timestamp = new Date().toISOString();
    const sourceIp = params.sourceIp || 'UNKNOWN';
    const callerId = params.callerNumber || 'UNKNOWN';
    const rawDid = params.rawDid || 'UNKNOWN';

    const infraStored = await SystemRepository.getInfraConfig();
    const publicIp = infraStored?.publicIp || process.env.PBX_PUBLIC_IP || process.env.PUBLIC_IP || 'NOT_CONFIGURED';
    const allTrunks = await TrunkRepository.listAll();
    const allDids = await DidRepository.listAll();

    const steps: CallSimulationStep[] = [];
    let stepNum = 1;

    // Etapa 1: Chegada do INVITE SIP na porta 5060
    steps.push({
      step: stepNum++,
      phase: 'Sinalização SIP Inbound',
      asteriskApp: 'res_pjsip.so',
      channel: `PJSIP/anon-\${RAND()}`,
      action: `INVITE recebido de ${sourceIp}:5060 para sip:${rawDid}@${publicIp}`,
      result: 'info',
      timestamp: new Date().toISOString(),
    });

    // Etapa 2: Identificação do Tronco por IP (PJSIP Identify)
    const matchedTrunk = allTrunks.find((t) => this.isIpAuthorized(t, sourceIp))
      || (params.trunkId ? allTrunks.find((t) => t.id === params.trunkId) : undefined);

    const isAuthorizedIp = !!matchedTrunk;

    if (!isAuthorizedIp) {
      steps.push({
        step: stepNum++,
        phase: 'PJSIP Identify por IP',
        asteriskApp: 'res_pjsip_endpoint_identifier_ip',
        channel: 'PJSIP/unauthorized',
        action: `IP de origem ${sourceIp} NÃO encontrado em nenhuma regra [identify]. Rejeitando chamada.`,
        result: 'rejected',
        timestamp: new Date().toISOString(),
      });

      return {
        callId,
        sourceIp,
        callerId,
        rawDid,
        extractedDid: rawDid,
        normalizedDid: rawDid,
        destinationType: 'reject',
        destinationTarget: '403 Forbidden / Drop',
        destinationLabel: 'Chamada Rejeitada: IP Não Autorizado',
        isAuthorizedIp: false,
        isKnownDid: false,
        routeReason: 'IP de origem não consta na lista de autorizados da operadora',
        steps,
      };
    }

    steps.push({
      step: stepNum++,
      phase: 'PJSIP Identify por IP',
      asteriskApp: 'res_pjsip_endpoint_identifier_ip',
      channel: `PJSIP/${matchedTrunk.id}`,
      action: `IP ${sourceIp} identificado com sucesso como endpoint [${matchedTrunk.id}] (${matchedTrunk.name}). Contexto: ${matchedTrunk.inboundContext || 'from-trunk'}.`,
      result: 'matched',
      timestamp: new Date().toISOString(),
    });

    // Etapa 3: Normalização do DID
    const norm = this.normalizeDid(rawDid);
    steps.push({
      step: stepNum++,
      phase: 'Normalização E.164 / Nacional',
      asteriskApp: 'pbx_config (extensions.conf)',
      channel: `PJSIP/${matchedTrunk.id}`,
      action: `DID bruto "${rawDid}" normalizado para Nacional "${norm.national}" e E.164 "${norm.e164}". Formatação apresentada: "${norm.presented}".`,
      result: 'info',
      timestamp: new Date().toISOString(),
    });

    // Etapa 4: Busca do DID na tabela de rotas
    const matchedDid = allDids.find((d) => {
      const dNorm = this.normalizeDid(d.did);
      return (
        d.did === rawDid ||
        d.did === norm.national ||
        dNorm.national === norm.national ||
        dNorm.e164 === norm.e164
      );
    });

    const isKnownDid = !!matchedDid;

    if (!isKnownDid) {
      steps.push({
        step: stepNum++,
        phase: 'Mapeamento de DID',
        asteriskApp: 'route-did',
        channel: `PJSIP/${matchedTrunk.id}`,
        action: `DID ${norm.national} não encontrado no cadastro de DIDs. Executando ação de fallback: Congestion(10) / 404 Not Found.`,
        result: 'rejected',
        timestamp: new Date().toISOString(),
      });

      return {
        callId,
        sourceIp,
        callerId,
        rawDid,
        extractedDid: rawDid,
        normalizedDid: norm.national,
        matchedTrunk,
        destinationType: 'unknown_did_reject',
        destinationTarget: 'SIP 404 Not Found',
        destinationLabel: 'DID Desconhecido (Rejeitado)',
        isAuthorizedIp: true,
        isKnownDid: false,
        routeReason: 'DID não cadastrado na plataforma Enlace-PBX',
        steps,
      };
    }

    steps.push({
      step: stepNum++,
      phase: 'Mapeamento de DID',
      asteriskApp: 'route-did',
      channel: `PJSIP/${matchedTrunk.id}`,
      action: `DID ${matchedDid.presentedNumber} localizado com sucesso. Destino configurado: [${matchedDid.destinationType.toUpperCase()}] -> ${matchedDid.destinationLabel || matchedDid.destinationId}.`,
      result: 'matched',
      timestamp: new Date().toISOString(),
    });

    // Etapa 5: Validação de Horário de Atendimento
    if (matchedDid.timeConditionEnabled && matchedDid.timeSchedule) {
      steps.push({
        step: stepNum++,
        phase: 'Horário de Atendimento',
        asteriskApp: 'GotoIfTime',
        channel: `PJSIP/${matchedTrunk.id}`,
        action: `Verificando escala semanal: ${matchedDid.timeSchedule.startHour} às ${matchedDid.timeSchedule.endHour}. Horário atual aprovado para atendimento regular.`,
        result: 'matched',
        timestamp: new Date().toISOString(),
      });
    }

    // Etapa 6: Gravação e MixMonitor
    steps.push({
      step: stepNum++,
      phase: 'Gravação & CDR',
      asteriskApp: 'MixMonitor',
      channel: `PJSIP/${matchedTrunk.id}`,
      action: `Gravação iniciada: /var/spool/asterisk/monitor/enlace-did-${matchedDid.did}-${callId}.wav (Codec PCMA 8kHz)`,
      result: 'info',
      timestamp: new Date().toISOString(),
    });

    // Etapa 7: Encaminhamento ao Destino Final
    let destLabel = matchedDid.destinationLabel || matchedDid.destinationId;
    let appCall = '';
    switch (matchedDid.destinationType) {
      case 'ai_agent':
        appCall = `Stasis(enlace_ai_bridge, ${matchedDid.destinationId})`;
        destLabel = 'MaIA — Agente Inteligente 24/7 (Google Gemini Live)';
        break;
      case 'queue':
        appCall = `Queue(${matchedDid.destinationId}, t, 60)`;
        destLabel = `Fila de Atendimento ${matchedDid.destinationId}`;
        break;
      case 'ivr':
        appCall = `Goto(ivr-${matchedDid.destinationId}, s, 1)`;
        destLabel = `URA / IVR ${matchedDid.destinationId}`;
        break;
      case 'extension':
        appCall = `Dial(PJSIP/${matchedDid.destinationId}, 30, tT)`;
        destLabel = `Ramal PJSIP ${matchedDid.destinationId}`;
        break;
      case 'ring_group':
        appCall = `Goto(ringgroup-${matchedDid.destinationId}, s, 1)`;
        destLabel = `Grupo de Toque ${matchedDid.destinationId}`;
        break;
    }

    steps.push({
      step: stepNum++,
      phase: 'Roteamento Final',
      asteriskApp: appCall,
      channel: `PJSIP/${matchedTrunk.id}`,
      action: `Canal atendido e conectado com sucesso ao destino: ${destLabel}.`,
      result: 'routed',
      timestamp: new Date().toISOString(),
    });

    return {
      callId,
      sourceIp,
      callerId,
      rawDid,
      extractedDid: rawDid,
      normalizedDid: norm.national,
      matchedDid,
      matchedTrunk,
      destinationType: matchedDid.destinationType,
      destinationTarget: matchedDid.destinationId,
      destinationLabel: destLabel,
      isAuthorizedIp: true,
      isKnownDid: true,
      routeReason: `Roteamento de entrada executado via DID [${matchedDid.presentedNumber}]`,
      steps,
    };
  }

  /**
   * Retorna os 11 casos de teste de homologação oficial para certificação do tronco
   */
  getHomologationChecklist(): HomologationTestItem[] {
    const cases:[string,HomologationTestItem['category'],string][]=[
      ['Autenticação do tronco','AUTENTICACAO_IP','Confirmar autenticação e registro, ou entroncamento por IP, conforme contrato.'],
      ['SBCs autorizados','AUTENTICACAO_IP','Validar recepção de cada SBC contratado sem admitir origens adicionais.'],
      ['Origem não autorizada','SEGURANCA','Recusar tráfego de origem não autorizada com evidência no host.'],
      ['Normalização de DIDs','ROTEAMENTO_DID','Conferir formatos contratados e destino do DID.'],
      ['Chamada de entrada','ROTEAMENTO_DID','Completar chamada recebida no destino autorizado.'],
      ['Chamada de saída','ROTEAMENTO_DID','Completar chamada permitida e recusar prefixos bloqueados.'],
      ['Áudio bidirecional','MIDIA_CODECS','Validar áudio, codecs e NAT com chamadas reais.'],
      ['DTMF','MIDIA_CODECS','Validar navegação de URA com DTMF real.'],
      ['Contingência','ALTA_DISPONIBILIDADE','Ensaiar falha controlada e observar recuperação.'],
      ['Identificação de origem','MIDIA_CODECS','Conferir Caller ID e cabeçalhos exigidos pela operadora.'],
      ['Recarga e recuperação','ALTA_DISPONIBILIDADE','Ensaiar recarga, chamadas em andamento e recuperação dos arquivos.'],
    ];
    return cases.map(([title,category,expectedResult],index)=>({id:`tc-${index+1}`,code:`TC-HOM-${String(index+1).padStart(2,'0')}`,title,category,description:'Roteiro para execução no host; nenhum resultado foi coletado por esta tela.',expectedResult,status:'pending',notes:'Execução e evidência pendentes.'}));
  }
}

export const sipTrunkService = new SipTrunkService();
