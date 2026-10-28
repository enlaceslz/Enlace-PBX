import { isAllowedOutboundNumber, outboundGuardDialplan } from '../server/infrastructure/asterisk/OutboundPolicy.js';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import test from 'node:test';
import { asteriskSettings, updateIni } from './asterisk-settings.mjs';
import { listBackups, backupPath } from '../server/infrastructure/security/BackupInventory.js';
import { assertSingleLineConfig, safeTrunkPayload } from '../server/infrastructure/asterisk/configValidation.js';
import { AsteriskAdapter } from '../server/infrastructure/asterisk/AsteriskAdapter.js';
const execute = promisify(execFile);

test('recarga PJSIP recusada restaura o arquivo anterior antes de tentar novamente', async () => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'pbx-pjsip-'));
  const previous = process.env.ASTERISK_CONFIG_DIR;
  process.env.ASTERISK_CONFIG_DIR = directory;
  try {
    const file = path.join(directory, 'pjsip.conf');
    await fs.writeFile(file, '[anterior]\ntype=endpoint\n');
    const adapter = new AsteriskAdapter();
    let attempts = 0;
    adapter.reloadPjsip = async () => ({ success: ++attempts > 1, message: 'teste' });
    const result = await adapter.applyPjsipConfig('[nova]\ntype=endpoint\n');
    assert.equal(result.success, false);
    assert.equal(attempts, 2);
    assert.equal(await fs.readFile(file, 'utf8'), '[anterior]\ntype=endpoint\n');
    assert.match(result.message, /restaurada e recarregada/);
  } finally {
    if (previous === undefined) delete process.env.ASTERISK_CONFIG_DIR; else process.env.ASTERISK_CONFIG_DIR = previous;
    await fs.rm(directory, { recursive: true, force: true });
  }
});

test('falha de recarga do plano de discagem restaura os dois arquivos', async () => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'pbx-dialplan-'));
  const previous = process.env.ASTERISK_CONFIG_DIR;
  process.env.ASTERISK_CONFIG_DIR = directory;
  try {
    await fs.writeFile(path.join(directory, 'pjsip.conf'), 'pjsip anterior');
    await fs.writeFile(path.join(directory, 'extensions.conf'), 'dialplan anterior');
    const adapter = new AsteriskAdapter();
    adapter.reloadPjsip = async () => ({ success: true, message: 'teste' });
    let attempts = 0;
    adapter.reloadDialplan = async () => ({ success: ++attempts > 1, message: 'teste' });
    const result = await adapter.applyPjsipConfig('pjsip novo', 'dialplan novo');
    assert.equal(result.success, false);
    assert.equal(await fs.readFile(path.join(directory, 'pjsip.conf'), 'utf8'), 'pjsip anterior');
    assert.equal(await fs.readFile(path.join(directory, 'extensions.conf'), 'utf8'), 'dialplan anterior');
  } finally {
    if (previous === undefined) delete process.env.ASTERISK_CONFIG_DIR; else process.env.ASTERISK_CONFIG_DIR = previous;
    await fs.rm(directory, { recursive: true, force: true });
  }
});

test('configuração do Asterisk preserva outras contas e rejeita injeção INI', () => {
  const original = '[general]\nenabled = no\n[outra_conta]\nsecret = preservar\n';
  const changed = updateIni(original, 'general', { enabled: 'yes', bindaddr: '127.0.0.1' });
  assert.match(changed, /enabled = yes/);
  assert.doesNotMatch(changed, /enabled = no/);
  assert.match(changed, /\[outra_conta\]\nsecret = preservar/);
  const values = { ASTERISK_AMI_PASSWORD: 'a'.repeat(48), ASTERISK_ARI_PASSWORD: 'b'.repeat(48), CORS_ALLOWED_ORIGINS: 'https://pbx.example.invalid' };
  const result = asteriskSettings(values);
  assert.equal(result['manager.conf'].enlace_ami.secret, values.ASTERISK_AMI_PASSWORD);
  assert.equal(result['http.conf'].general.bindaddr, '127.0.0.1');
  assert.throws(() => asteriskSettings({ ...values, ASTERISK_AMI_PASSWORD: 'x\n[general]' }), /Credenciais/);
  assert.throws(() => asteriskSettings({ ...values, CORS_ALLOWED_ORIGINS: '*' }), /Origens/);
});

test('extração recusa traversal e links antes de escrever arquivos', async () => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'pbx-extract-test-'));
  try {
    const archive = path.join(directory, 'malicious.tar');
    const target = path.join(directory, 'destination'); await fs.mkdir(target);
    await execute('python3', ['-c', "import tarfile,io,sys\nwith tarfile.open(sys.argv[1],'w') as t:\n i=tarfile.TarInfo('../outside');i.size=1;t.addfile(i,io.BytesIO(b'x'))", archive]);
    await assert.rejects(execute('python3', ['ops/extract-backup.py', archive, target]));
    assert.deepEqual(await fs.readdir(target), []);
    await assert.rejects(fs.stat(path.join(directory, 'outside')));
    await execute('python3', ['-c', "import tarfile,sys\nwith tarfile.open(sys.argv[1],'w') as t:\n i=tarfile.TarInfo('asterisk/link');i.type=tarfile.SYMTYPE;i.linkname='/etc/passwd';t.addfile(i)", archive]);
    await assert.rejects(execute('python3', ['ops/extract-backup.py', archive, target]));
    assert.deepEqual(await fs.readdir(target), []);
  } finally { await fs.rm(directory, { recursive: true, force: true }); }
});

test('inventário só anuncia arquivos completos e não segue links', async () => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'pbx-inventory-'));
  const previous = process.env.PBX_BACKUP_DIRECTORY;
  process.env.PBX_BACKUP_DIRECTORY = directory;
  try {
    const name = 'enlace-123456-abcdef01.epbx';
    await fs.writeFile(path.join(directory, name), 'encrypted-fixture');
    assert.deepEqual(await listBackups(), []);
    await fs.writeFile(path.join(directory, name + '.json'), JSON.stringify({ format: 1, createdAt: new Date().toISOString(), password: 'nunca-retornar' }));
    const list = await listBackups();
    assert.equal(list.length, 1);
    assert.equal('password' in list[0], false);
    assert.throws(() => backupPath('../runtime.json'), /inválido/);
    await fs.symlink(path.join(directory, name), path.join(directory, 'enlace-123457-abcdef02.epbx'));
    assert.equal((await listBackups()).length, 1);
  } finally {
    if (previous === undefined) delete process.env.PBX_BACKUP_DIRECTORY; else process.env.PBX_BACKUP_DIRECTORY = previous;
    await fs.rm(directory, { recursive: true, force: true });
  }
});

test('campos SIP não podem injetar diretivas e respostas não contêm segredo', () => {
  assert.throws(() => assertSingleLineConfig({ host: 'sip.example.invalid\n[administrador]' }), /controle/);
  assert.throws(() => assertSingleLineConfig({ codecs: ['alaw', 'ulaw\r\n#include /etc/passwd'] }), /controle/);
  assertSingleLineConfig({ host: 'sip.example.invalid', codecs: ['alaw', 'ulaw'] });
  const safe = safeTrunkPayload({ id: 't', secret: 'plaintext', secret_encrypted: 'ciphertext', secretEncrypted: 'ciphertext' });
  assert.deepEqual(safe, { id: 't' });
});

test('política de saída bloqueia DDI, premium e caracteres fora do plano nacional', () => {
  for (const number of ['5511987654321', '+5511987654321', '11987654321', '1133334444', '08001234567', '03001234567', '01511987654321', '190']) assert.equal(isAllowedOutboundNumber(number), true, number);
  for (const number of ['00441234567890', '+441234567890', '09001234567', '9001234567', '5590012345678', '0159001234567', '123;System(x)', 'invalid', '']) assert.equal(isAllowedOutboundNumber(number), false, number);
  assert.match(outboundGuardDialplan(), /Hangup\(21\)/);
});
