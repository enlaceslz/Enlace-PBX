import net from 'node:net';
import { StringDecoder } from 'node:string_decoder';
import crypto from 'node:crypto';
import { isAsteriskCommandAllowed } from './AsteriskAllowlist.js';

export interface AmiConnection { host: string; port: number; username: string; password: string; timeoutMs?: number }

export async function sendAmiAction(connection: AmiConnection, action: string, params: Record<string, string> = {}): Promise<string> {
  if (!['CoreStatus', 'CoreShowChannels', 'Command', 'Hangup', 'Redirect', 'Originate','QueueReload'].includes(action)) throw new Error('Ação AMI não autorizada.');
  for (const [name, value] of Object.entries({ Username: connection.username, Secret: connection.password, ...params })) {
    if (!/^[A-Za-z][A-Za-z0-9]*$/.test(name) || typeof value !== 'string' || /[\r\n\0]/.test(value) || value.length > 4096) throw new Error('Campo AMI inválido.');
  }
  if (Object.keys(params).some(name => ['action', 'actionid', 'username', 'secret'].includes(name.toLowerCase()))) throw new Error('Cabeçalho AMI reservado.');
  if (!connection.password) throw new Error('Credencial AMI não configurada.');
  if(action==='QueueReload'&&(Object.keys(params).sort().join(',')!=='Members,Parameters,Rules'||params.Members!=='yes'||params.Parameters!=='yes'||params.Rules!=='no'))throw new Error('Recarga de filas fora do contrato permitido.');
  if (action === 'Command' && !isAsteriskCommandAllowed(params.Command || '')) throw new Error('Comando AMI fora da lista permitida.');
  return new Promise((resolve, reject) => {
    const socket = new net.Socket();
    const loginId = crypto.randomUUID();
    const actionId = crypto.randomUUID();
    const decoder = new StringDecoder('utf8');
    let authenticated = false;
    let complete = false;
    let buffer = '';
    let bytes = 0;
    const responses: string[] = [];
    const finish = (error?: Error) => {
      if (complete) return;
      complete = true;
      clearTimeout(timer);
      socket.destroy();
      if (error) reject(error); else resolve(responses.join('\r\n\r\n'));
    };
    const timer = setTimeout(() => finish(new Error('Tempo limite da operação AMI.')), connection.timeoutMs || 5000);
    socket.on('error', () => finish(new Error('Falha de conexão AMI.')));
    socket.on('close', () => { if (!complete) finish(new Error('Conexão AMI encerrada antes da resposta completa.')); });
    socket.on('data', data => {
      bytes += data.length;
      if (bytes > 2 * 1024 * 1024) return finish(new Error('Resposta AMI excedeu o limite.'));
      buffer += decoder.write(data);
      let boundary: number;
      while ((boundary = buffer.indexOf('\r\n\r\n')) >= 0 && !complete) {
        const frame = buffer.slice(0, boundary);
        buffer = buffer.slice(boundary + 4);
        const headers = new Map(frame.split('\r\n').filter(line => line.includes(':')).map(line => {
          const delimiter = line.indexOf(':');
          return [line.slice(0, delimiter).toLowerCase(), line.slice(delimiter + 1).trim()];
        }));
        const id = headers.get('actionid');
        if (!authenticated) {
          if (id !== loginId) continue;
          if (headers.get('response') !== 'Success') return finish(new Error('Autenticação AMI recusada.'));
          authenticated = true;
          socket.write(`Action: ${action}\r\nActionID: ${actionId}\r\n${Object.entries(params).map(([name, value]) => `${name}: ${value}\r\n`).join('')}\r\n`);
          continue;
        }
        if (id !== actionId) continue;
        if (headers.get('response') === 'Error') return finish(new Error('Operação recusada pelo Asterisk.'));
        responses.push(frame);
        if (action === 'CoreShowChannels' || headers.get('eventlist')?.toLowerCase() === 'start') {
          if (headers.get('event') === 'CoreShowChannelsComplete' || headers.get('eventlist')?.toLowerCase() === 'complete') finish();
        } else if (headers.get('response') === 'Follows') {
          if (frame.includes('--END COMMAND--')) finish();
        } else if (headers.get('response') === 'Success') finish();
      }
    });
    socket.connect(connection.port, connection.host, () => {
      socket.write(`Action: Login\r\nActionID: ${loginId}\r\nUsername: ${connection.username}\r\nSecret: ${connection.password}\r\nEvents: off\r\n\r\n`);
    });
  });
}
