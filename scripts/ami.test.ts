import test from 'node:test';
import assert from 'node:assert/strict';
import net from 'node:net';
import { once } from 'node:events';
import { sendAmiAction } from '../server/infrastructure/asterisk/AmiClient.js';

test('AMI aguarda a lista completa, ignora ActionID alheio e rejeita Error', async () => {
  let failure = false;
  const sockets = new Set<net.Socket>();
  const server = net.createServer(socket => {
    sockets.add(socket);
    socket.once('close', () => sockets.delete(socket));
    let buffer = '';
    socket.on('data', data => {
      buffer += data.toString();
      let end: number;
      while ((end = buffer.indexOf('\r\n\r\n')) >= 0) {
        const frame = buffer.slice(0, end); buffer = buffer.slice(end + 4);
        const id = frame.match(/ActionID: ([^\r]+)/)?.[1];
        if (frame.startsWith('Action: Login')) {
          socket.write(`Response: Success\r\nActionID: ${id}\r\n\r\n`);
        } else if (failure) {
          socket.write(`Response: Error\r\nActionID: ${id}\r\nMessage: Failure\r\n\r\n`);
        } else {
          socket.write(`Response: Success\r\nActionID: ${id}\r\nEventList: start\r\n\r\n`);
          socket.write('Event: CoreShowChannelsComplete\r\nActionID: alheio\r\n\r\n');
          setImmediate(() => {
            const event = `Event: CoreShowChannel\r\nActionID: ${id}\r\nChannel: PJSIP/1001-0001\r\n\r\nEvent: CoreShowChannelsComplete\r\nActionID: ${id}\r\nEventList: Complete\r\nListItems: 1\r\n\r\n`;
            socket.write(event.slice(0, 17));
            setImmediate(() => socket.write(event.slice(17)));
          });
        }
      }
    });
  });
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const connection = { host: '127.0.0.1', port: (server.address() as net.AddressInfo).port, username: 'test', password: 'test-secret', timeoutMs: 1000 };
  try {
    const result = await sendAmiAction(connection, 'CoreShowChannels');
    assert.match(result, /PJSIP\/1001-0001/);
    assert.match(result, /ListItems: 1/);
    assert.doesNotMatch(result, /ActionID: alheio/);
    failure = true;
    await assert.rejects(sendAmiAction(connection, 'Hangup', { Channel: 'PJSIP/1001-0001' }), /recusada/);
    await assert.rejects(sendAmiAction(connection, 'Hangup', { Channel: 'x\r\nAction: Command' }), /inválido/);
    await assert.rejects(sendAmiAction(connection, 'Command', { Command: 'shell rm -rf /' }), /lista permitida/);
  } finally {
    for (const socket of sockets) socket.destroy();
    await new Promise<void>(resolve => server.close(() => resolve()));
  }
});
