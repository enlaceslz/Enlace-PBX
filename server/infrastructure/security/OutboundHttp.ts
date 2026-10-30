import http from 'node:http';
import https from 'node:https';
import dns from 'node:dns/promises';
import net from 'node:net';

export class OutboundHttpError extends Error {
  constructor(message: string, public statusCode: number = 502, public upstreamStatus?: number) { super(message); }
}
type Address = { address: string; family: number };
export interface OutboundPolicy {
  allowedOrigins: string[];
  privateOrigins: string[];
  resolve?: (hostname: string) => Promise<Address[]>;
}
export const outboundPolicy = (): OutboundPolicy => ({
  allowedOrigins: (process.env.OUTBOUND_ALLOWED_ORIGINS || '').split(',').map(value => value.trim()).filter(Boolean),
  privateOrigins: (process.env.OUTBOUND_PRIVATE_ORIGINS || '').split(',').map(value => value.trim()).filter(Boolean),
});

const forbidden = new net.BlockList();
for (const [address, prefix] of [['0.0.0.0', 8], ['169.254.0.0', 16], ['192.0.0.0', 24], ['192.0.2.0', 24],
  ['192.88.99.0', 24], ['198.18.0.0', 15], ['198.51.100.0', 24], ['203.0.113.0', 24], ['224.0.0.0', 4], ['240.0.0.0', 4]] as const) forbidden.addSubnet(address, prefix, 'ipv4');
const privateNetworks = new net.BlockList();
for (const [address, prefix] of [['10.0.0.0', 8], ['100.64.0.0', 10], ['127.0.0.0', 8], ['172.16.0.0', 12], ['192.168.0.0', 16]] as const) privateNetworks.addSubnet(address, prefix, 'ipv4');
privateNetworks.addSubnet('fc00::', 7, 'ipv6');
privateNetworks.addAddress('::1', 'ipv6');
const publicV6 = new net.BlockList(); publicV6.addSubnet('2000::', 3, 'ipv6');
for (const [address, prefix] of [['2001:db8::', 32], ['2001::', 23], ['2002::', 16], ['3fff::', 20]] as const) forbidden.addSubnet(address, prefix, 'ipv6');

export function allowedAddress(address: string, allowPrivate: boolean): boolean {
  const family = net.isIP(address);
  if (!family || address.includes('%')) return false;
  if (family === 6 && new URL(`http://[${address}]/`).hostname.startsWith('[::ffff:')) return false;
  const type = family === 4 ? 'ipv4' : 'ipv6';
  if (forbidden.check(address, type)) return false;
  if (privateNetworks.check(address, type)) return allowPrivate;
  return family === 4 || publicV6.check(address, 'ipv6');
}

export async function validateOutboundUrl(raw: string, policy = outboundPolicy()): Promise<{ url: URL; address: Address }> {
  let url: URL;
  try { url = new URL(raw); } catch { throw new OutboundHttpError('URL de integração inválida.', 400); }
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || url.hash || raw.length > 2048) throw new OutboundHttpError('URL de integração inválida.', 400);
  if (!policy.allowedOrigins.includes(url.origin)) throw new OutboundHttpError('Origem não autorizada pelo administrador do servidor.', 403);
  const allowPrivate = policy.privateOrigins.includes(url.origin);
  if (url.protocol !== 'https:' && !allowPrivate) throw new OutboundHttpError('HTTPS obrigatório para integrações externas.', 400);
  const hostname = url.hostname.replace(/^\[|\]$/g, '');
  const resolve = policy.resolve || (async (host: string) => dns.lookup(host, { all: true, verbatim: true }));
  let timer: NodeJS.Timeout | undefined;
  let addresses: Address[];
  try {
    addresses = net.isIP(hostname) ? [{ address: hostname, family: net.isIP(hostname) }] : await Promise.race([
      resolve(hostname), new Promise<never>((_resolve, reject) => { timer = setTimeout(() => reject(new Error('dns')), 2000); }),
    ]);
  } catch { throw new OutboundHttpError('Não foi possível resolver o destino da integração.'); }
  finally { if (timer) clearTimeout(timer); }
  if (!addresses.length || addresses.length > 32 || addresses.some(value => value.family !== net.isIP(value.address) || !allowedAddress(value.address, allowPrivate))) throw new OutboundHttpError('Endereço de destino não permitido.', 403);
  return { url, address: addresses.find(value => value.family === 4) || addresses[0] };
}

export interface OutboundRequest {
  method?: 'GET' | 'POST';
  body?: unknown;
  headers?: Record<string, string>;
  timeoutMs?: number;
  maxResponseBytes?: number;
  responseMode?: 'json' | 'discard';
  policy?: OutboundPolicy;
}

/** DNS fixado no socket; não segue redirects nem encaminha credenciais para outro host. */
export async function outboundJson(raw: string, options: OutboundRequest = {}): Promise<{ status: number; data: unknown; durationMs: number }> {
  const positiveLimit=(value:unknown,fallback:number,maximum:number)=>{
    if(value===undefined)return fallback;
    if(typeof value!=='number'||!Number.isSafeInteger(value)||value<1)throw new OutboundHttpError('Limite de integração inválido.',400);
    return Math.min(value,maximum);
  };
  const timeoutMs=positiveLimit(options.timeoutMs,5000,30000);
  const limit=positiveLimit(options.maxResponseBytes,64*1024,1024*1024);
  if(options.responseMode!==undefined&&!['json','discard'].includes(options.responseMode))throw new OutboundHttpError('Modo de resposta de integração inválido.',400);
  const start = Date.now();
  const method = options.method === undefined ? 'GET' : options.method;
  if (!['GET', 'POST'].includes(method)) throw new OutboundHttpError('Método de integração não permitido.', 400);
  const body = method === 'POST' ? Buffer.from(JSON.stringify(options.body ?? {})) : undefined;
  if (body && body.length > 32 * 1024) throw new OutboundHttpError('Corpo da integração excedeu o limite.', 413);
  const headers: Record<string, string> = { Accept: 'application/json', 'Accept-Encoding': 'identity' };
  const allowedHeaders = new Set(['authorization', 'x-enlace-signature-256', 'x-enlace-request-id']);
  if(options.headers!==undefined&&(!options.headers||typeof options.headers!=='object'||Array.isArray(options.headers)))throw new OutboundHttpError('Cabeçalho de integração inválido.',400);
  const seen=new Set<string>();let headerBytes=0;
  for (const [name, value] of Object.entries(options.headers || {})) {
    const key=name.toLowerCase();
    if (!allowedHeaders.has(key)||seen.has(key)||typeof value!=='string'||Buffer.byteLength(value)>8192) throw new OutboundHttpError('Cabeçalho de integração inválido.',400);
    try{http.validateHeaderValue(key,value);}catch{throw new OutboundHttpError('Cabeçalho de integração inválido.',400);}
    headerBytes+=Buffer.byteLength(name)+Buffer.byteLength(value);
    if(headerBytes>16384)throw new OutboundHttpError('Cabeçalhos de integração excederam o limite.',400);
    seen.add(key);headers[key]=value;
  }
  if (body) { headers['Content-Type'] = 'application/json'; headers['Content-Length'] = String(body.length); }
  const { url, address } = await validateOutboundUrl(raw, options.policy);
  return new Promise((resolve, reject) => {
    let settled = false;
    const finish = (error?: OutboundHttpError, response?: { status: number; data: unknown; durationMs: number }) => {
      if (settled) return;
      settled = true; clearTimeout(timeout);
      if (error) reject(error); else resolve(response!);
    };
    const request = (url.protocol === 'https:' ? https : http).request(url, {
      method, headers, agent: false, family: address.family,
      lookup: (_hostname, _options, callback) => callback(null, address.address, address.family),
    }, response => {
      const status = response.statusCode || 502;
      if (status < 200 || status >= 300) {
        response.destroy(); request.destroy();
        return finish(new OutboundHttpError(status >= 300 && status < 400 ? 'Redirecionamento de integração recusado.' : `Destino retornou HTTP ${status}.`, 502, status));
      }
      if (response.headers['content-encoding'] !== undefined && response.headers['content-encoding'].trim().toLowerCase() !== 'identity') {
        response.destroy(); request.destroy();
        return finish(new OutboundHttpError('Codificação da resposta da integração não suportada.'));
      }
      let bytes = 0; const blocks: Buffer[] = [];
      response.on('data', (block: Buffer) => {
        bytes += block.length;
        if (bytes > limit) { response.destroy(); request.destroy(); return finish(new OutboundHttpError('Resposta da integração excedeu o limite.')); }
        if (options.responseMode !== 'discard') blocks.push(block);
      });
      response.on('error', () => finish(new OutboundHttpError('Resposta da integração interrompida.')));
      response.on('end', () => {
        let data: unknown = null;
        if (options.responseMode !== 'discard' && bytes) {
          let text:string;
          try { text = new TextDecoder('utf-8', {fatal:true,ignoreBOM:true}).decode(Buffer.concat(blocks)); }
          catch { return finish(new OutboundHttpError('Destino não retornou UTF-8 válido.')); }
          try { data = JSON.parse(text); } catch { return finish(new OutboundHttpError('Destino não retornou JSON válido.')); }
        }
        finish(undefined, { status, data, durationMs: Date.now() - start });
      });
    });
    const timeout = setTimeout(() => { request.destroy(); finish(new OutboundHttpError('Tempo limite da integração excedido.', 504)); }, timeoutMs);
    request.on('error', () => finish(new OutboundHttpError('Falha na conexão com a integração.')));
    request.end(body);
  });
}
