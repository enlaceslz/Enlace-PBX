import test from 'node:test';
import assert from 'node:assert/strict';
import { Fail2banMonitor, parseJailList, parseJailStatus } from '../server/infrastructure/security/Fail2banMonitor.js';
const list = 'Status\n|- Number of jail: 1\n`- Jail list: asterisk-pjsip\n';
const jail = 'Status for the jail: asterisk-pjsip\n|- Filter\n|  |- Currently failed: 2\n|  `- Total failed: 8\n`- Actions\n   |- Currently banned: 1\n   |- Total banned: 3\n   `- Banned IP list: 198.51.100.1\n';
test('Fail2ban interpreta saída real sem inventar horários, geolocalização ou regras', () => {
  assert.deepEqual(parseJailList(list), ['asterisk-pjsip']);
  assert.deepEqual(parseJailList('Number of jail: 0\nJail list:\n'), []);
  assert.deepEqual(parseJailStatus('asterisk-pjsip', jail), { name: 'asterisk-pjsip', currentlyBanned: 1, totalBanned: 3, currentlyFailed: 2, totalFailed: 8 });
  for (const output of [list.replace('1','2'), list.replace('asterisk-pjsip', '--help'), list.replace('asterisk-pjsip','a;id'), list + 'Number of jail: 1\n', '']) assert.throws(() => parseJailList(output));
  assert.throws(() => parseJailList('Number of jail: 33\nJail list: '+Array.from({length:33},(_,i)=>'j'+i).join(',')));
  assert.throws(() => parseJailStatus('ssh',jail));
  assert.throws(() => parseJailStatus('asterisk-pjsip',jail.replace('Total banned: 3','Total banned: 0')));
  assert.throws(() => parseJailStatus('asterisk-pjsip',jail.replace('Currently failed: 2','Currently failed: desconhecido')));
});
test('Fail2ban agrega consultas simultâneas e usa apenas status com jail validada', async () => {
  const calls: string[][] = [];
  const monitor = new Fail2banMonitor(async (args, timeout) => { calls.push(args); assert.ok(timeout > 0 && timeout <= 1500); return args.length===1 ? list : jail; });
  const [first, second] = await Promise.all([monitor.snapshot(),monitor.snapshot()]);
  assert.equal(first,second);
  assert.equal(first.available,true);
  assert.equal(first.currentBanEntries,1);
  assert.equal(first.mutationsAvailable,false);
  assert.equal('bannedIps' in first,false);
  await monitor.snapshot();
  assert.deepEqual(calls,[['status'],['status','asterisk-pjsip']]);
});
test('Fail2ban omite sucesso parcial e não expõe stdout, stderr ou dados antigos em falha', async () => {
  const monitor = new Fail2banMonitor(async args => { if(args.length===1)return list; throw new Error('segredo do socket'); });
  const snapshot = await monitor.snapshot();
  assert.equal(snapshot.available,false);
  assert.equal(snapshot.currentBanEntries,null);
  assert.deepEqual(snapshot.jails,[]);
  assert.doesNotMatch(JSON.stringify(snapshot),/segredo/);
  const malformed = await new Fail2banMonitor(async()=> 'resposta inválida').snapshot();
  assert.equal(malformed.available,false);
});
