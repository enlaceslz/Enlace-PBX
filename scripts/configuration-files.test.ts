import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {AnchoredDirectory} from './anchored-files.mjs';
import {readSettingsFile,stageSettings,writeSettings,writeConfigurationFiles} from './configuration-files.mjs';
import {productionSettings} from './configure-production.mjs';
const fixture=()=>fs.mkdtempSync(path.join(os.tmpdir(),'pbx-config-files-'));
const values={ENCRYPTION_KEY:'chave-literal-preservada',JWT_SECRET:'outra-chave-literal'};
const administrative={...values,ADMIN_INITIAL_PASSWORD:'credencial-administrativa-separada'};

test('gravação sincroniza conteúdo e diretório, com modos finais antes da publicação',t=>{
 const root=fixture();const runtime=path.join(root,'runtime.json');const bootstrap=path.join(root,'bootstrap.json');const events:string[]=[];
 const originalSync=fs.fsyncSync;const originalActivate=AnchoredDirectory.prototype.activate;const previousMask=process.umask(0);
 t.mock.method(fs,'fsyncSync',(fd:number)=>{events.push(fs.fstatSync(fd).isDirectory()?'sync_directory':'sync_file');return originalSync(fd);});
 t.mock.method(AnchoredDirectory.prototype,'activate',function(temporary:string,name:string){
  events.push('publish_'+name);assert.equal(fs.statSync(this.location(temporary)).mode&0o777,name==='runtime.json'?0o640:0o600);
  return originalActivate.call(this,temporary,name);
 });
 try{
  writeConfigurationFiles(runtime,values,bootstrap,administrative);
  assert.deepEqual(events,['sync_file','sync_file','publish_runtime.json','sync_directory','publish_bootstrap.json','sync_directory']);
  assert.deepEqual(JSON.parse(readSettingsFile(runtime)!.toString()),values);assert.deepEqual(JSON.parse(readSettingsFile(bootstrap)!.toString()),administrative);
  assert.equal(fs.statSync(runtime).mode&0o777,0o640);assert.equal(fs.statSync(bootstrap).mode&0o777,0o600);
  assert.deepEqual(fs.readdirSync(root).sort(),['bootstrap.json','runtime.json']);
 }finally{process.umask(previousMask);t.mock.restoreAll();fs.rmSync(root,{recursive:true,force:true});}
});

test('falha ao preparar bootstrap não publica runtime e remove o temporário que criou',()=>{
 const root=fixture();const runtime=path.join(root,'runtime.json');const unsafe=path.join(root,'gravavel');fs.mkdirSync(unsafe,{mode:0o777});fs.chmodSync(unsafe,0o777);
 try{
  fs.writeFileSync(runtime,'anterior',{mode:0o600});const inode=fs.statSync(runtime).ino;
  assert.throws(()=>writeConfigurationFiles(runtime,values,path.join(unsafe,'bootstrap.json'),administrative));
  assert.equal(fs.readFileSync(runtime,'utf8'),'anterior');assert.equal(fs.statSync(runtime).ino,inode);
  assert.deepEqual(fs.readdirSync(root).sort(),['gravavel','runtime.json']);assert.deepEqual(fs.readdirSync(unsafe),[]);
 }finally{fs.rmSync(root,{recursive:true,force:true});}
});

test('falha de fsync antes de publicar conserva arquivo anterior e não deixa estágio ativo',t=>{
 const root=fixture();const runtime=path.join(root,'runtime.json');const original=fs.fsyncSync;
 t.mock.method(fs,'fsyncSync',(fd:number)=>{if(fs.fstatSync(fd).isFile())throw new Error('falha de disco injetada');return original(fd);});
 try{
  fs.writeFileSync(runtime,'anterior',{mode:0o600});assert.throws(()=>writeSettings(runtime,values));
  assert.equal(fs.readFileSync(runtime,'utf8'),'anterior');assert.deepEqual(fs.readdirSync(root),['runtime.json']);
 }finally{t.mock.restoreAll();fs.rmSync(root,{recursive:true,force:true});}
});

test('falha após publicar runtime retorna erro e preserva chaves, sem anunciar transação entre arquivos',t=>{
 for(const failure of ['directory_sync','bootstrap_publish']){
  const root=fixture();const runtime=path.join(root,'runtime.json');const bootstrap=path.join(root,'bootstrap.json');
  const originalSync=fs.fsyncSync;const originalActivate=AnchoredDirectory.prototype.activate;
  if(failure==='directory_sync')t.mock.method(fs,'fsyncSync',(fd:number)=>{if(fs.fstatSync(fd).isDirectory())throw new Error('falha injetada');return originalSync(fd);});
  else t.mock.method(AnchoredDirectory.prototype,'activate',function(temporary:string,name:string){if(name==='bootstrap.json')throw new Error('falha injetada');return originalActivate.call(this,temporary,name);});
  try{
   fs.writeFileSync(bootstrap,'bootstrap anterior',{mode:0o600});assert.throws(()=>writeConfigurationFiles(runtime,values,bootstrap,administrative));
   assert.deepEqual(JSON.parse(fs.readFileSync(runtime,'utf8')),values);assert.equal(fs.readFileSync(bootstrap,'utf8'),'bootstrap anterior');
   assert.deepEqual(fs.readdirSync(root).sort(),['bootstrap.json','runtime.json']);
  }finally{t.mock.restoreAll();fs.rmSync(root,{recursive:true,force:true});}
 }
});

test('CLI recusa alias e modo desconhecido; leitura e escrita recusam symlink e hardlink',()=>{
 const root=fixture();const runtime=path.join(root,'runtime.json');const bootstrap=path.join(root,'bootstrap.json');const outside=path.join(root,'externo.json');
 try{
  fs.writeFileSync(runtime,'original',{mode:0o600});
  for(const args of [[runtime,runtime,'--preserve-existing'],[runtime,bootstrap,'--modo-incorreto']]){
   const result=spawnSync(process.execPath,['scripts/configure-production.mjs',...args],{encoding:'utf8',env:{PATH:process.env.PATH}});assert.notEqual(result.status,0);
   assert.equal(fs.readFileSync(runtime,'utf8'),'original');assert.equal(fs.existsSync(bootstrap),false);
  }
  fs.renameSync(runtime,outside);fs.symlinkSync(outside,runtime);
  assert.throws(()=>readSettingsFile(runtime));assert.throws(()=>writeSettings(runtime,values));assert.throws(()=>writeConfigurationFiles(runtime,values,bootstrap,administrative,{preserveRuntime:true}));
  fs.unlinkSync(runtime);fs.linkSync(outside,runtime);assert.throws(()=>readSettingsFile(runtime));assert.throws(()=>writeSettings(runtime,values));
  assert.equal(fs.readFileSync(outside,'utf8'),'original');assert.deepEqual(fs.readdirSync(root).sort(),['externo.json','runtime.json']);
 }finally{fs.rmSync(root,{recursive:true,force:true});}
});

test('estágio ancorado não segue troca de diretório por symlink e leitura recusa arquivo acima do limite',()=>{
 const root=fixture();const original=path.join(root,'original');const moved=path.join(root,'movido');const outside=path.join(root,'externo');
 fs.mkdirSync(original);fs.mkdirSync(outside);fs.writeFileSync(path.join(outside,'runtime.json'),'marcador externo',{mode:0o600});let prepared;
 try{
  prepared=stageSettings(path.join(original,'runtime.json'),values);fs.renameSync(original,moved);fs.symlinkSync(outside,original,'dir');prepared.publish();prepared.close();
  assert.equal(fs.readFileSync(path.join(outside,'runtime.json'),'utf8'),'marcador externo');assert.deepEqual(JSON.parse(fs.readFileSync(path.join(moved,'runtime.json'),'utf8')),values);
  const oversized=path.join(root,'grande.json');const fd=fs.openSync(oversized,'wx',0o600);try{fs.ftruncateSync(fd,16*1024*1024+1);}finally{fs.closeSync(fd);}
  assert.throws(()=>readSettingsFile(oversized));
 }finally{prepared?.close();fs.rmSync(root,{recursive:true,force:true});}
});

test('falha de limpeza em um destino não impede limpar o outro e mantém temporário administrativo privado',t=>{
 const root=fixture();const runtime=path.join(root,'runtime.json');const bootstrap=path.join(root,'bootstrap.json');const originalRemove=AnchoredDirectory.prototype.remove;
 t.mock.method(AnchoredDirectory.prototype,'activate',()=>{throw new Error('publicação recusada');});
 t.mock.method(AnchoredDirectory.prototype,'remove',function(name:string){if(name.startsWith('bootstrap.json.enlace-'))throw new Error('limpeza recusada');return originalRemove.call(this,name);});
 try{
  assert.throws(()=>writeConfigurationFiles(runtime,values,bootstrap,administrative),/Falha ao limpar/);
  const files=fs.readdirSync(root);assert.equal(files.length,1);assert.ok(files[0].startsWith('bootstrap.json.enlace-'));
  assert.equal(fs.statSync(path.join(root,files[0])).mode&0o777,0o600);assert.equal(fs.existsSync(runtime),false);assert.equal(fs.existsSync(bootstrap),false);
 }finally{t.mock.restoreAll();fs.rmSync(root,{recursive:true,force:true});}
});

test('nova tentativa após falha do bootstrap mantém bytes e chaves do runtime já publicado',t=>{
 const root=fixture();const runtime=path.join(root,'runtime.json');const bootstrap=path.join(root,'bootstrap.json');const settings=productionSettings({PBX_DOMAIN:'pbx.example.invalid'});
 const original=AnchoredDirectory.prototype.activate;
 t.mock.method(AnchoredDirectory.prototype,'activate',function(temporary:string,name:string){if(name==='bootstrap.json')throw new Error('falha injetada');return original.call(this,temporary,name);});
 try{
  assert.throws(()=>writeConfigurationFiles(runtime,settings,bootstrap,{...settings,ADMIN_INITIAL_PASSWORD:'senha-administrativa-inicial'}));
  const bytes=fs.readFileSync(runtime);const inode=fs.statSync(runtime).ino;t.mock.restoreAll();
  const result=spawnSync(process.execPath,['scripts/configure-production.mjs',runtime,bootstrap,'--preserve-existing'],{encoding:'utf8',env:{PATH:process.env.PATH,ADMIN_INITIAL_EMAIL:'admin@example.invalid',ADMIN_INITIAL_PASSWORD:'senha-administrativa-inicial'}});
  assert.equal(result.status,0);assert.deepEqual(fs.readFileSync(runtime),bytes);assert.equal(fs.statSync(runtime).ino,inode);
  const prepared=JSON.parse(fs.readFileSync(bootstrap,'utf8'));assert.equal(prepared.ENCRYPTION_KEY,settings.ENCRYPTION_KEY);assert.equal(prepared.JWT_SECRET,settings.JWT_SECRET);
 }finally{t.mock.restoreAll();fs.rmSync(root,{recursive:true,force:true});}
});
