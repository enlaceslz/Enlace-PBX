import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {AnchoredDirectory,prepareManagedDirectory,verifyManagedDirectory} from './anchored-files.mjs';
import {asteriskSettings,includeManaged,updateIni,verifyAsteriskSettings,verifyAsteriskDirectory} from './asterisk-settings.mjs';

const settings={NODE_ENV:'production',ASTERISK_AMI_USERNAME:'enlace_ami',ASTERISK_ARI_USERNAME:'enlace_ari',ASTERISK_AMI_PASSWORD:'a'.repeat(48),ASTERISK_ARI_PASSWORD:'b'.repeat(48),CORS_ALLOWED_ORIGINS:'https://pbx.example.invalid'};
const fixture=()=>{
 const files:Record<string,string>={};
 for(const [file,sections] of Object.entries(asteriskSettings(settings))){
  let text='; comentário preservado\n[externo]\nvalor=preservar\n';
  for(const [section,fields] of Object.entries(sections))text=updateIni(text,section,fields);
  files[file]=text;
 }
 for(const file of ['pjsip.conf','extensions.conf','queues.conf'])files[file]=includeManaged('; configuração própria\n','/var/lib/enlace-pbx/asterisk/'+file);
 return files;
};

test('conferência aceita configuração equivalente sem normalizar texto ou contas externas',()=>{
 const files=fixture();
 files['manager.conf']=files['manager.conf'].replace('enabled = yes','ENABLED => yes ; comentário').replace('[general]',' [GENERAL] ; comentário');
 const before=JSON.stringify(files);verifyAsteriskSettings(files,settings);
 assert.equal(JSON.stringify(files),before);
});

test('conferência recusa divergência, campos duplicados, templates e fontes indiretas',()=>{
 const changes=[
  (files:Record<string,string>)=>{files['manager.conf']=files['manager.conf'].replace('bindaddr = 127.0.0.1','bindaddr = 0.0.0.0');},
  (files:Record<string,string>)=>{files['manager.conf']=files['manager.conf'].replace(settings.ASTERISK_AMI_PASSWORD,'c'.repeat(48));},
  (files:Record<string,string>)=>{files['ari.conf']=files['ari.conf'].replace('password = '+settings.ASTERISK_ARI_PASSWORD,'password = divergente');},
  (files:Record<string,string>)=>{files['http.conf']=files['http.conf'].replace('enabled = yes','enabled = yes\nENABLED => no');},
  (files:Record<string,string>)=>{files['manager.conf']+='\n[GENERAL]\n';},
  (files:Record<string,string>)=>{files['ari.conf']=files['ari.conf'].replace('[general]','[general](+)');},
  ...['#include "extra.conf"','#tryinclude extra*.conf','#exec comando','#INCLUDE "extra.conf"'].map(directive=>(files:Record<string,string>)=>{files['asterisk.conf']+='\n'+directive+'\n';}),
 ];
 for(const change of changes){const files=fixture();change(files);assert.throws(()=>verifyAsteriskSettings(files,settings));}
 for(const file of Object.keys(fixture())){const files=fixture();delete files[file];assert.throws(()=>verifyAsteriskSettings(files,settings));}
});

test('conferência exige os três includes gerenciados sem criar ou converter diretivas',()=>{
 for(const file of ['pjsip.conf','extensions.conf','queues.conf']){
  for(const change of [(text:string)=>text.replace('#tryinclude','#include'),()=>'',(text:string)=>text+text]){
   const files=fixture();files[file]=change(files[file]);const before=JSON.stringify(files);
   assert.throws(()=>verifyAsteriskSettings(files,settings));assert.equal(JSON.stringify(files),before);
  }
 }
});

test('conferência por descritores mantém bytes, inode, modo e tempo; recusa vínculos e escrita por terceiros',()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'pbx-asterisk-verify-'));const directory=new AnchoredDirectory(root);
 try{
  const files=fixture();for(const [file,text] of Object.entries(files))fs.writeFileSync(path.join(root,file),text,{mode:0o640});
  const before=Object.fromEntries(Object.keys(files).map(file=>{const stat=fs.statSync(path.join(root,file));return [file,{ino:stat.ino,mode:stat.mode,mtime:stat.mtimeMs,ctime:stat.ctimeMs}];}));
  verifyAsteriskDirectory(directory,settings,process.getuid());
  assert.deepEqual(fs.readdirSync(root).sort(),Object.keys(files).sort());
  for(const [file,text] of Object.entries(files)){
   const stat=fs.statSync(path.join(root,file));assert.equal(fs.readFileSync(path.join(root,file),'utf8'),text);
   assert.deepEqual({ino:stat.ino,mode:stat.mode,mtime:stat.mtimeMs,ctime:stat.ctimeMs},before[file]);
  }
  const manager=path.join(root,'manager.conf');const outside=path.join(root,'outside.conf');fs.renameSync(manager,outside);fs.symlinkSync(outside,manager);
  assert.throws(()=>verifyAsteriskDirectory(directory,settings,process.getuid()));fs.unlinkSync(manager);fs.linkSync(outside,manager);
  assert.throws(()=>verifyAsteriskDirectory(directory,settings,process.getuid()));fs.unlinkSync(manager);fs.renameSync(outside,manager);fs.chmodSync(manager,0o660);
  assert.throws(()=>verifyAsteriskDirectory(directory,settings,process.getuid()));assert.equal(fs.statSync(manager).mode&0o777,0o660);
 }finally{directory.close();fs.rmSync(root,{recursive:true,force:true});}
});

test('atualização confere diretório gerenciado sem recriar arquivo ausente ou corrigir permissões',()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'pbx-managed-verify-'));const uid=process.getuid();const gid=process.getgid();
 try{
  fs.chmodSync(root,0o750);prepareManagedDirectory(root,uid,gid);
  const file=path.join(root,'asterisk','pjsip.conf');fs.writeFileSync(file,'configuração preservada');const before=fs.statSync(file);
  verifyManagedDirectory(root,uid,gid);assert.equal(fs.readFileSync(file,'utf8'),'configuração preservada');assert.equal(fs.statSync(file).ctimeMs,before.ctimeMs);
  fs.chmodSync(file,0o660);assert.throws(()=>verifyManagedDirectory(root,uid,gid));assert.equal(fs.statSync(file).mode&0o777,0o660);
  fs.unlinkSync(file);assert.throws(()=>verifyManagedDirectory(root,uid,gid));assert.equal(fs.existsSync(file),false);
  const directory=path.join(root,'asterisk');fs.chmodSync(directory,0o750);assert.throws(()=>verifyManagedDirectory(root,uid,gid));assert.equal(fs.statSync(directory).mode&0o7777,0o750);
 }finally{fs.rmSync(root,{recursive:true,force:true});}
});
