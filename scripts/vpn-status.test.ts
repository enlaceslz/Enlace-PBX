import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseWireguardDump, hasRecentHandshake } from '../server/infrastructure/network/VpnAdapter.js';

test('WireGuard interpreta múltiplas interfaces sem retornar segredos', () => {
  const dump = 'wg0\tSEGREDO_PRIVADO\tPUBLICA0\t51820\toff\nwg0\tPEER0\tSEGREDO_COMPARTILHADO\t1.2.3.4:1234\t10.0.0.2/32,fd00::2/128\t1700000000\t123\t456\t25\nwg1\tOUTRO_SEGREDO\tPUBLICA1\t51821\toff\nwg1\tPEER1\t(none)\t(none)\t(none)\t0\t0\t0\t0\n';
  const result = parseWireguardDump(dump);
  assert.equal(result.publicKey, 'PUBLICA0'); assert.equal(result.listenPort, 51820);
  assert.equal(result.peers.length, 2); assert.equal(result.peers[1].interface, 'wg1');
  assert.equal(result.peers[0].endpoint, '1.2.3.4:1234');
  assert.deepEqual(result.peers[0].allowedIps, ['10.0.0.2/32', 'fd00::2/128']);
  assert.equal(result.peers[0].transferRxBytes, 123); assert.equal(result.peers[0].transferTxBytes, 456);
  assert.equal(result.peers[1].latestHandshake, undefined);
  assert.equal(result.peers[1].endpoint, undefined);
  assert.doesNotMatch(JSON.stringify(result), /SEGREDO/);
  assert.equal(hasRecentHandshake(result.peers[0], 1700000000000 + 179000), true);
  assert.equal(hasRecentHandshake(result.peers[0], 1700000000000 + 181000), false);
  assert.equal(hasRecentHandshake(result.peers[0], 1699999999000), false);
  assert.equal(hasRecentHandshake(result.peers[1]), false);
});

test('WireGuard recusa entradas truncadas ou inválidas sem incluir a saída no erro', () => {
  assert.equal(parseWireguardDump('').status, 'DOWN');
  for (const raw of ['wg0\tSEGREDO', 'wg0\tSEGREDO\tPUB\tNaN\toff', 'wg0\tSEGREDO\tPUB\t99999\toff',
    'wg0\tPEER\tSEGREDO\t(none)\t(none)\t-1\t0\t0\t0']) {
    assert.throws(() => parseWireguardDump(raw), { message: 'Resposta WireGuard inválida.' });
  }
});
