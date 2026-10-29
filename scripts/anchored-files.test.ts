import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {AnchoredDirectory,prepareManagedDirectory,readBounded} from './anchored-files.mjs';
const fixture=()=>fs.mkdtempSync(path.join(os.tmpdir(),'pbx-anchor-'));
test('troca do nome do diretório por link não redireciona escrita privilegiada',()=>{
 const root=fixture();let held;
 assert.throws(()=>new AnchoredDirectory(root,{trustedUid:2147483647}));
 try{
  const original=path.join(root,'config');const moved=path.join(root,'anterior');const outside=path.join(root,'externo');fs.mkdirSync(original);fs.mkdirSync(outside);fs.writeFileSync(path.join(outside,'ari.conf'),'preservar');
  held=new AnchoredDirectory(original);fs.renameSync(original,moved);fs.symlinkSync(outside,original,'dir');
  const temporary=held.stage('ari.conf','novo',{mode:0o640});held.activate(temporary,'ari.conf');
  assert.equal(fs.readFileSync(path.join(outside,'ari.conf'),'utf8'),'preservar');assert.equal(fs.readFileSync(path.join(moved,'ari.conf'),'utf8'),'novo');
  assert.throws(()=>new AnchoredDirectory(original));
 }finally{held?.close();fs.rmSync(root,{recursive:true,force:true});}
});
test('abertura recusa links, arquivos vinculados e substituição de diretório gerenciado',()=>{
 const root=fixture();let directory;
 try{
  fs.writeFileSync(path.join(root,'fora'),'preservar');fs.symlinkSync('fora',path.join(root,'link'));fs.linkSync(path.join(root,'fora'),path.join(root,'vinculado'));
  directory=new AnchoredDirectory(root);assert.throws(()=>directory.read('link'));assert.throws(()=>directory.read('vinculado'));assert.throws(()=>directory.create('link','não gravar'));assert.equal(fs.readFileSync(path.join(root,'fora'),'utf8'),'preservar');
  fs.symlinkSync(root,path.join(root,'asterisk'),'dir');assert.throws(()=>prepareManagedDirectory(root,process.getuid(),process.getgid()));assert.equal(fs.existsSync(path.join(root,'queues.conf')),false);
 }finally{directory?.close();fs.rmSync(root,{recursive:true,force:true});}
});
test('preparação gerenciada preserva conteúdo e recusa arquivo simbólico pendurado',()=>{
 const root=fixture();
 try{
  prepareManagedDirectory(root,process.getuid(),process.getgid());const managed=path.join(root,'asterisk');const queue=path.join(managed,'queues.conf');fs.writeFileSync(queue,'fila existente');prepareManagedDirectory(root,process.getuid(),process.getgid());assert.equal(fs.readFileSync(queue,'utf8'),'fila existente');
  fs.unlinkSync(queue);const outside=path.join(root,'nao-criar');fs.symlinkSync(outside,queue);assert.throws(()=>prepareManagedDirectory(root,process.getuid(),process.getgid()));assert.equal(fs.existsSync(outside),false);
 }finally{fs.rmSync(root,{recursive:true,force:true});}
});
test('backups usam bytes capturados e leitura respeita limite sem reabrir o nome',()=>{
 const root=fixture();let directory;
 try{
  directory=new AnchoredDirectory(root);directory.create('ari.conf','original');const bytes=directory.read('ari.conf');fs.unlinkSync(path.join(root,'ari.conf'));fs.symlinkSync('/arquivo-inexistente',path.join(root,'ari.conf'));directory.create('backup',bytes,{mode:0o600});assert.equal(directory.read('backup').toString(),'original');assert.equal(fs.statSync(path.join(root,'backup')).mode&0o777,0o600);
  const fd=fs.openSync(path.join(root,'backup'),'r');try{assert.throws(()=>readBounded(fd,1));}finally{fs.closeSync(fd);}
  directory.create('.enlace-settings.lock','trava');assert.throws(()=>directory.create('.enlace-settings.lock','outra'));assert.equal(directory.read('.enlace-settings.lock').toString(),'trava');
 }finally{directory?.close();fs.rmSync(root,{recursive:true,force:true});}
});
