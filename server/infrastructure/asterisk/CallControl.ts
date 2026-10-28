import { OutboundHttpError } from '../security/OutboundHttp.js';
import { isAllowedOutboundNumber } from './OutboundPolicy.js';

export function callExtension(value: unknown): string {
  if (typeof value !== 'string' || !/^[1-9][0-9]{1,7}$/.test(value)) throw new OutboundHttpError('Informe um ramal numérico válido, sem espaços ou caracteres especiais.', 400);
  return value;
}
export function callDestination(value: unknown): string {
  if (typeof value !== 'string' || !( /^[1-9][0-9]{1,7}$/.test(value) || isAllowedOutboundNumber(value))) throw new OutboundHttpError('Destino inválido ou bloqueado pela política de saída.', 400);
  return value.startsWith('+55') ? value.slice(1) : value;
}
export function channelReference(value: unknown): string {
  if(typeof value !== 'string' || value.length > 256 || !/^[A-Za-z0-9_./;@-]+$/.test(value) || value.includes('..')) throw new OutboundHttpError('Identificador de canal inválido.',400);
  return value;
}
export function endpointFromChannel(name: string): string | null {
  // Apenas o sufixo hexadecimal do canal é removido; Caller ID nunca identifica a empresa.
  const match = /^(?:PJSIP|SIP)\/([A-Za-z0-9_-]{1,128})-[a-fA-F0-9]{8,16}$/.exec(name);
  return match?.[1] || null;
}
export type AmiCall = (action: string, params: Record<string,string>) => Promise<string>;
export async function acceptedCallAction(ami: AmiCall, action: string, params: Record<string,string>) {
  try {
    const response = await ami(action,params);
    const id = /^ActionID:\s*([a-f0-9-]{36})\s*$/im.exec(response)?.[1];
    if (!/^Response:\s*Success\s*$/im.test(response) || !id) throw new Error('Resposta sem confirmação.');
    return { accepted:true, status:'ACCEPTED' as const, operationId:id };
  } catch { throw new OutboundHttpError('Operação sem confirmação do Asterisk. Verifique o estado real antes de tentar novamente.',502); }
}
