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
  const values = { ASTERISK_AMI_USERNAME:'enlace_ami',ASTERISK_ARI_USERNAME:'enlace_ari', ASTERISK_AMI_PASSWORD: 'a'.repeat(48), ASTERISK_ARI_PASSWORD: 'b'.repeat(48), CORS_ALLOWED_ORIGINS: 'https://pbx.example.invalid' };
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
    const bytes=Buffer.concat([Buffer.from('EPBXBK01'),Buffer.alloc(40)]);
    await fs.writeFile(path.join(directory, name), bytes);
    assert.deepEqual(await listBackups(), []);
    await fs.writeFile(path.join(directory, name + '.json'), JSON.stringify({ format: 1, name, bytes:bytes.length, createdAt: new Date().toISOString(), password: 'nunca-retornar' }));
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

test('falha na recarga de filas recupera PJSIP, plano e queues.conf',async()=>{
 const directory=await fs.mkdtemp(path.join(os.tmpdir(),'pbx-three-config-'));const previous=process.env.ASTERISK_CONFIG_DIR;process.env.ASTERISK_CONFIG_DIR=directory;
 try{
  for(const name of ['pjsip.conf','extensions.conf','queues.conf'])await fs.writeFile(path.join(directory,name),'anterior '+name);
  const adapter=new AsteriskAdapter();adapter.reloadPjsip=async()=>({success:true,message:'teste'});adapter.reloadDialplan=async()=>({success:true,message:'teste'});let attempts=0;
  adapter.reloadQueues=async()=>({success:++attempts>1,message:'teste'});
  const result=await adapter.applyPjsipConfig('pjsip novo','plano novo','filas novas');assert.equal(result.success,false);assert.equal(attempts,2);
  for(const name of ['pjsip.conf','extensions.conf','queues.conf'])assert.equal(await fs.readFile(path.join(directory,name),'utf8'),'anterior '+name);
  await fs.rm(path.join(directory,'queues.conf'));adapter.reloadQueues=async()=>({success:false,message:'teste'});assert.equal((await adapter.applyPjsipConfig('pjsip novo','plano novo','filas novas')).success,false);await assert.rejects(fs.stat(path.join(directory,'queues.conf')),(error:any)=>error.code==='ENOENT');
 }finally{if(previous===undefined)delete process.env.ASTERISK_CONFIG_DIR;else process.env.ASTERISK_CONFIG_DIR=previous;await fs.rm(directory,{recursive:true,force:true});}
});
test('aplicação com filas só aceita resultado após a recarga das três configurações',async()=>{
 const directory=await fs.mkdtemp(path.join(os.tmpdir(),'pbx-queue-config-'));const previous=process.env.ASTERISK_CONFIG_DIR;process.env.ASTERISK_CONFIG_DIR=directory;
 try{
  const order:string[]=[];const adapter=new AsteriskAdapter();adapter.reloadPjsip=async()=>{order.push('pjsip');return {success:true,message:'teste'};};adapter.reloadDialplan=async()=>{order.push('dialplan');return {success:true,message:'teste'};};adapter.reloadQueues=async()=>{order.push('queues');return {success:true,message:'teste'};};
  const result=await adapter.applyPjsipConfig('pjsip novo','plano novo','filas novas');assert.equal(result.success,true);assert.deepEqual(order,['pjsip','dialplan','queues']);assert.equal(await fs.readFile(path.join(directory,'queues.conf'),'utf8'),'filas novas');
 }finally{if(previous===undefined)delete process.env.ASTERISK_CONFIG_DIR;else process.env.ASTERISK_CONFIG_DIR=previous;await fs.rm(directory,{recursive:true,force:true});}
});

test('instalador e prévia ARI usam o mesmo contrato e priorizam origem ARI explícita', async()=>{
 const {ariConfiguration}=await import('../server/infrastructure/asterisk/AuxiliaryConfig.js');
 const settings={NODE_ENV:'production',ASTERISK_AMI_USERNAME:'enlace_ami',ASTERISK_ARI_USERNAME:'enlace_ari',ASTERISK_AMI_PASSWORD:'a'.repeat(48),ASTERISK_ARI_PASSWORD:'credencial-ari-com-caracteres#[]',CORS_ALLOWED_ORIGINS:'https://painel.example.invalid',ASTERISK_ARI_ALLOWED_ORIGINS:'https://ari.example.invalid'};
 const files=asteriskSettings(settings);assert.equal(files['ari.conf'].general.allowed_origins,'https://ari.example.invalid');assert.equal(files['ari.conf'].enlace_ari.password,settings.ASTERISK_ARI_PASSWORD);assert.match(ariConfiguration(settings,true),/allowed_origins=https:\/\/ari.example.invalid/);
 for(const override of [{ASTERISK_ARI_ALLOWED_ORIGINS:'https://ari.example.invalid/caminho'},{ASTERISK_ARI_ALLOWED_ORIGINS:'https://*.example.invalid'},{ASTERISK_ARI_USERNAME:'general'},{ASTERISK_AMI_USERNAME:'general'}])assert.throws(()=>asteriskSettings({...settings,...override}));
});
test('edição INI remove chaves antigas sem diferenciar maiúsculas e recusa seções ambíguas',()=>{
 const changed=updateIni(' [general] ; opções\nENABLED => no\nbindaddr=0.0.0.0\n[externo]\nsecret=preservar\n','general',{enabled:'yes',bindaddr:'127.0.0.1'});assert.doesNotMatch(changed,/ENABLED => no|bindaddr=0.0.0.0/);assert.match(changed,/secret=preservar/);
 for(const source of ['[general]\n[GENERAL]\n','[general](!)\n','[general](+)\n'])assert.throws(()=>updateIni(source,'general',{enabled:'yes'}));
 assert.throws(()=>updateIni('','general',{enabled:'yes\n#include segredo'}));
});
test('include gerenciado de queues.conf é idempotente e recusa duplicidade',async()=>{
 const {includeManaged}=await import('./asterisk-settings.mjs');const target='/var/lib/enlace-pbx/asterisk/queues.conf';
 const once=includeManaged('[general]\n',target);assert.equal(includeManaged(once,target),once);
 const quoted='#include "'+target+'" ; mantido\n';assert.equal(includeManaged(quoted,target),quoted.replace('#include','#tryinclude'));
 assert.throws(()=>includeManaged(once+quoted,target));assert.throws(()=>includeManaged('',target+'\n#exec comando'));
});
