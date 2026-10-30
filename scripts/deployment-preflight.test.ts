import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
const execute=promisify(execFile);
const verifier=path.resolve('scripts/trusted-source.py');
// A identidade da fixture usa o grupo dos arquivos locais; a política NSS é testada separadamente.
const verify=(root:string,groupOffset=0)=>execute('python3',['-I','-c',"import os,runpy,sys; policy=runpy.run_path(sys.argv[1]); identity={'uid':os.getuid()+10000,'gid':os.getgid()+int(sys.argv[3]),'groups':[os.getgid()+int(sys.argv[3])]}; print(policy['verify_installation'](sys.argv[2],trusted_uid=os.getuid(),check_ancestors=False,identity_provider=lambda required: identity))",verifier,root,String(groupOffset)]);
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

const serviceIdentity={uid:21001,gid:21001,primary_gid:21001,home:'/var/lib/enlace-pbx',shell:'/usr/sbin/nologin',groups:[21001],asterisk_gid:21002,uid_shared:false,gid_shared:false};
const identity=(value:object,required=true)=>execute('python3',['-I','-c',"import json,runpy,sys; policy=runpy.run_path(sys.argv[1]); print(json.dumps(policy['verify_service_identity'](json.loads(sys.argv[2]),sys.argv[3]=='1')))",verifier,JSON.stringify(value),required?'1':'0']);

test('identidade aceita conta dedicada e permite criação inicial sem reutilizar conta ausente na atualização',async()=>{
 assert.deepEqual(JSON.parse((await identity(serviceIdentity)).stdout),serviceIdentity);
 assert.equal(JSON.parse((await identity({uid:null,gid:null},false)).stdout),null);
 assert.equal(JSON.parse((await identity({uid:null,gid:21001},false)).stdout),null);
 await assert.rejects(identity({uid:null,gid:null}));await assert.rejects(identity({uid:null,gid:21001}));
});

test('identidade recusa root, grupo privilegiado, aliases, grupo primário divergente e conta interativa',async()=>{
 for(const override of [{uid:0},{gid:0,primary_gid:0,groups:[0]},{uid_shared:true},{gid_shared:true},{primary_gid:21002},{home:'/root'},{shell:'/bin/bash'},{gid:null}]){
  await assert.rejects(identity({...serviceIdentity,...override}));
 }
 for(const shell of ['/sbin/nologin','/bin/false','/usr/bin/false'])await identity({...serviceIdentity,shell});
});

test('identidade admite somente grupo próprio e Asterisk não privilegiado',async()=>{
 await identity({...serviceIdentity,groups:[21001,21002]});
 for(const override of [{groups:[21001,0]},{groups:[21001,21003]},{groups:[]},{asterisk_gid:0},{asterisk_gid:21001},{asterisk_gid:0,groups:[21001,0]},{asterisk_gid:null,groups:[21001,21002]}])await assert.rejects(identity({...serviceIdentity,...override}));
});

test('resolução NSS recusa UID/GID compartilhados e alias de grupo permitido sem alterar o host',async()=>{
 const resolve=(kind:string)=>execute('python3',['-I','-c',
  `import runpy,sys,types
policy=runpy.run_path(sys.argv[1]); kind=sys.argv[2]
user=types.SimpleNamespace(pw_name='enlace-pbx',pw_uid=21001,pw_gid=21001,pw_dir='/var/lib/enlace-pbx',pw_shell='/usr/sbin/nologin')
own=types.SimpleNamespace(gr_name='enlace-pbx',gr_gid=21001)
asterisk=types.SimpleNamespace(gr_name='asterisk',gr_gid=21002)
users=[user]; groups=[own,asterisk]
if kind=='uid_alias': users.append(types.SimpleNamespace(pw_name='alias',pw_uid=21001))
if kind=='same_user_name': users.append(types.SimpleNamespace(pw_name='enlace-pbx',pw_uid=21099))
if kind=='gid_alias': groups.append(types.SimpleNamespace(gr_name='alias',gr_gid=21001))
if kind in ('asterisk_alias','asterisk_alias_without_membership'): groups.append(types.SimpleNamespace(gr_name='alias',gr_gid=21002))
if kind=='same_group_name': groups.append(types.SimpleNamespace(gr_name='enlace-pbx',gr_gid=21099))
if kind=='same_asterisk_name': groups.append(types.SimpleNamespace(gr_name='asterisk',gr_gid=21099))
policy['pwd'].getpwnam=lambda name:user
policy['pwd'].getpwall=lambda:users
policy['grp'].getgrnam=lambda name:own
policy['grp'].getgrall=lambda:groups
policy['os'].getgrouplist=lambda name,gid:[21001] if kind=='asterisk_alias_without_membership' else [21001,21002]
policy['service_access_identity'](True)`,verifier,kind]);
 await resolve('valid');for(const kind of ['uid_alias','gid_alias','asterisk_alias','asterisk_alias_without_membership','same_user_name','same_group_name','same_asterisk_name'])await assert.rejects(resolve(kind));
});

test('runtime exige modo e grupo exatos sem corrigir configuração ou diretório',async()=>{
 for(const [name,mode] of [['etc/enlace-pbx/runtime.json',0o400],['etc/enlace-pbx/runtime.json',0o600],['etc/enlace-pbx/runtime.json',0o644],['etc/enlace-pbx',0o710],['etc/enlace-pbx',0o755]] as const){
  const root=await fixture();try{
   await installed(root);const file=at(root,name);await fs.chmod(file,mode);const before=await fs.stat(file);
   await assert.rejects(verify(root));assert.deepEqual(await fs.stat(file),before);
  }finally{await fs.rm(root,{recursive:true,force:true});}
 }
 const root=await fixture();try{await installed(root);await assert.rejects(verify(root,1));assert.equal((await verify(root)).stdout.trim(),'UPDATE');}
 finally{await fs.rm(root,{recursive:true,force:true});}
});

test('pré-checagem recusa backend sem leitura e ancestral sem travessia para o serviço',async()=>{
 for(const [name,mode] of [['opt/enlace-pbx/releases/anterior/dist/server.cjs',0o600],['opt/enlace-pbx/releases/anterior',0o740],['etc',0o700],['opt',0o700]] as const){
  const root=await fixture();try{
   await installed(root);const file=at(root,name);await fs.chmod(file,mode);const before=await fs.stat(file);
   await assert.rejects(verify(root));assert.deepEqual(await fs.stat(file),before);
  }finally{await fs.rm(root,{recursive:true,force:true});}
 }
});
