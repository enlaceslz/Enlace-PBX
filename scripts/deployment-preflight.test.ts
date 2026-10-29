import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
const execute=promisify(execFile);
const verifier=path.resolve('scripts/trusted-source.py');
const verify=(root:string)=>execute('python3',['-I','-c',"import os,runpy,sys; policy=runpy.run_path(sys.argv[1]); print(policy['verify_installation'](sys.argv[2],trusted_uid=os.getuid(),check_ancestors=False))",verifier,root]);
const at=(root:string,name:string)=>path.join(root,name);
const write=async(root:string,name:string,content='preservar')=>{const file=at(root,name);await fs.mkdir(path.dirname(file),{recursive:true,mode:0o750});await fs.writeFile(file,content,{mode:0o640});};
const installed=async(root:string)=>{
 await write(root,'opt/enlace-pbx/releases/anterior/dist/server.cjs');
 await fs.symlink('/opt/enlace-pbx/releases/anterior',at(root,'opt/enlace-pbx/current'));
 await write(root,'etc/systemd/system/enlace-pbx.service');
 await write(root,'etc/enlace-pbx/runtime.json','{"ENCRYPTION_KEY":"segredo-que-nao-pode-ser-regenerado"}');
 await write(root,'etc/enlace-pbx/backup.key','a'.repeat(64)+'\n');
 await fs.chmod(at(root,'etc/enlace-pbx/backup.key'),0o400);
};
const fixture=()=>fs.mkdtemp(path.join(os.tmpdir(),'pbx-deploy-preflight-'));

test('pré-checagem distingue instalação nova de atualização e não cria destinos',async()=>{
 const root=await fixture();
 try{
  assert.equal((await verify(root)).stdout.trim(),'INITIAL');assert.deepEqual(await fs.readdir(root),[]);
  await installed(root);
  const key=at(root,'etc/enlace-pbx/backup.key');const runtime=at(root,'etc/enlace-pbx/runtime.json');const beforeKey=await fs.stat(key);const beforeRuntime=await fs.stat(runtime);
  assert.equal((await verify(root)).stdout.trim(),'UPDATE');
  assert.deepEqual(await fs.stat(key),beforeKey);assert.deepEqual(await fs.stat(runtime),beforeRuntime);
  assert.equal(await fs.readlink(at(root,'opt/enlace-pbx/current')),'/opt/enlace-pbx/releases/anterior');
 }finally{await fs.rm(root,{recursive:true,force:true});}
});

test('atualização recusa runtime, chave ou backend ausente e não os regenera',async()=>{
 for(const name of ['etc/enlace-pbx/runtime.json','etc/enlace-pbx/backup.key','opt/enlace-pbx/releases/anterior/dist/server.cjs']){
  const root=await fixture();try{
   await installed(root);await fs.unlink(at(root,name));await assert.rejects(verify(root));
   await assert.rejects(fs.lstat(at(root,name)),{code:'ENOENT'});
  }finally{await fs.rm(root,{recursive:true,force:true});}
 }
});

test('pré-checagem recusa instalação incompleta, current inválido e trava pendente',async()=>{
 for(const kind of ['unit_only','dangling','file','outside','lock','relative']){
  const root=await fixture();try{
   await installed(root);const current=at(root,'opt/enlace-pbx/current');
   if(kind==='lock')await write(root,'opt/enlace-pbx/.activation.lock','recuperação pendente');
   else{await fs.unlink(current);
    if(kind==='dangling')await fs.symlink('/opt/enlace-pbx/releases/ausente',current);
    if(kind==='file')await fs.writeFile(current,'inválido');
    if(kind==='outside')await fs.symlink('/tmp/fora',current);
    if(kind==='relative')await fs.symlink('releases/anterior',current);
   }
   if(kind==='relative')assert.equal((await verify(root)).stdout.trim(),'UPDATE');
   else await assert.rejects(verify(root));
   if(kind==='lock')assert.equal(await fs.readFile(at(root,'opt/enlace-pbx/.activation.lock'),'utf8'),'recuperação pendente');
  }finally{await fs.rm(root,{recursive:true,force:true});}
 }
});

test('pré-checagem recusa destinos privilegiados vinculados e arquivos vazios ou graváveis',async()=>{
 for(const kind of ['directory_link','runtime_link','runtime_hardlink','runtime_writable','key_empty','key_readable','release_link']){
  const root=await fixture();try{
   await installed(root);const runtime=at(root,'etc/enlace-pbx/runtime.json');const outside=at(root,'externo');await write(root,'externo','marcador preservado');
   if(kind==='directory_link'){await fs.rename(at(root,'etc/enlace-pbx'),at(root,'original'));await fs.symlink(at(root,'original'),at(root,'etc/enlace-pbx'));}
   if(kind==='runtime_link'){await fs.unlink(runtime);await fs.symlink(outside,runtime);}
   if(kind==='runtime_hardlink'){await fs.unlink(runtime);await fs.link(outside,runtime);}
   if(kind==='runtime_writable')await fs.chmod(runtime,0o660);
   if(kind==='key_empty'){await fs.chmod(at(root,'etc/enlace-pbx/backup.key'),0o600);await fs.writeFile(at(root,'etc/enlace-pbx/backup.key'),'');}
   if(kind==='key_readable')await fs.chmod(at(root,'etc/enlace-pbx/backup.key'),0o440);
   if(kind==='release_link'){const release=at(root,'opt/enlace-pbx/releases/anterior');await fs.rename(release,at(root,'anterior-real'));await fs.symlink(at(root,'anterior-real'),release);}
   await assert.rejects(verify(root));assert.equal(await fs.readFile(outside,'utf8'),'marcador preservado');
  }finally{await fs.rm(root,{recursive:true,force:true});}
 }
});

test('pré-checagem recusa proxy sem instalação rastreada e vínculo externo, preservando proxy válido',async()=>{
 const root=await fixture();try{
  await write(root,'etc/nginx/sites-available/enlace-pbx');await assert.rejects(verify(root));
  await installed(root);await fs.mkdir(at(root,'etc/nginx/sites-enabled'),{recursive:true,mode:0o750});const link=at(root,'etc/nginx/sites-enabled/enlace-pbx');
  await fs.symlink('../sites-available/enlace-pbx',link);assert.equal((await verify(root)).stdout.trim(),'UPDATE');
  await fs.unlink(link);await fs.symlink('/tmp/proxy-externo',link);await assert.rejects(verify(root));assert.equal(await fs.readlink(link),'/tmp/proxy-externo');
 }finally{await fs.rm(root,{recursive:true,force:true});}
});
