import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {AnchoredDirectory} from './anchored-files.mjs';
import {readProcessStatus,processProfileMatches} from './process-profile.mjs';
const execute=promisify(execFile);
const service='enlace-pbx.service';
export async function activateWithRollback(operations){
  let phase='activate';
  try{
    await operations.activate();phase='readiness';
    if(!await operations.ready())throw new Error('Prontidão não confirmada.');
    phase='proxy';await operations.publish();
    phase='final_readiness';if(!await operations.ready())throw new Error('Prontidão final não confirmada.');
    return {success:true,status:'ACTIVATED',phase};
  }catch{
    try{await operations.rollback();return {success:false,status:await operations.previousReady()?(operations.hasPrevious===false?'CANDIDATE_REMOVED':'CODE_RESTORED'):'ROLLBACK_NOT_CONFIRMED',phase};}
    catch{return {success:false,status:'ROLLBACK_NOT_CONFIRMED',phase};}
  }
}
export function readinessEvidence(status,body,expectedId){return status===200&&body?.status==='ready'&&(!expectedId||body.releaseId===expectedId);}
export function deploymentIdentity(value){return typeof value==='string'&&/^[-a-zA-Z0-9_]{1,80}$/.test(value)?value:undefined;}

export async function restoreStoppedRelease(operations){
  // Não troca arquivos enquanto a parada da candidata estiver incerta.
  await operations.stop();
  if(!await operations.stopped())throw new Error('Parada da candidata não confirmada.');
  let incomplete=false;
  const attempt=async operation=>{try{await operation();}catch{incomplete=true;}};
  await attempt(operations.disable);
  // Uma falha não pode impedir a tentativa de restaurar os outros destinos.
  for(const restore of operations.files)await attempt(restore);
  await attempt(operations.reload);
  // Nunca reinicia com arquivos parcialmente recuperados ou controle incerto.
  if(incomplete)throw new Error('Recuperação incompleta exige revisão manual.');
  await operations.enablement();
  await operations.resume();
  await operations.publish();
}

async function main(){
 const [release,unitCandidate,proxyCandidate]=process.argv.slice(2);
 if(!release||!/^\/opt\/enlace-pbx\/releases\/[-a-zA-Z0-9_]{1,80}$/.test(release)||!unitCandidate||!proxyCandidate)throw new Error('Candidata de ativação inválida.');
 const releaseId=deploymentIdentity(path.basename(release));
 const protectedDirectory=directory=>{
  const value=new AnchoredDirectory(directory,{trustedUid:0});
  const state=value.state();if(state.uid!==0||(state.mode&0o022)!==0){value.close();throw new Error('Diretório de ativação desprotegido.');}return value;
 };
 const readCandidate=file=>{
  if(!file.startsWith('/opt/enlace-pbx/provisioning/'))throw new Error('Candidata fora do provisionamento protegido.');
  const directory=protectedDirectory(path.dirname(file));
  try{return directory.read(path.basename(file),{uid:0,protectedMode:true});}finally{directory.close();}
 };
 const unitBytes=readCandidate(unitCandidate);const proxyBytes=readCandidate(proxyCandidate);
 if(!unitBytes||!proxyBytes||!unitBytes.toString().includes('Environment=PBX_RELEASE_ID='+releaseId+'\n'))throw new Error('Unidade sem identidade esperada.');
 const base=protectedDirectory('/opt/enlace-pbx');const units=protectedDirectory('/etc/systemd/system');const available=protectedDirectory('/etc/nginx/sites-available');const enabled=protectedDirectory('/etc/nginx/sites-enabled');
 const directories={base,units,available,enabled};let locked=false;let keepLock=false;
 try{
  base.create('.activation.lock',String(process.pid),{uid:0,gid:0,mode:0o600});locked=true;
  const releaseDirectory=protectedDirectory(release);releaseDirectory.close();
  const capture=(directory,name,allowLink=false)=>{
   let state;try{state=fs.lstatSync(directory.location(name));}catch(error){if(error.code==='ENOENT')return {kind:'absent'};throw error;}
   if(state.uid!==0||state.nlink!==1)throw new Error('Destino de ativação com proprietário ou vínculo inesperado.');
   if(state.isSymbolicLink()&&allowLink)return {kind:'link',target:fs.readlinkSync(directory.location(name))};
   if(!state.isFile()||(state.mode&0o022)!==0)throw new Error('Destino de ativação inválido.');
   return {kind:'file',bytes:directory.read(name,{uid:0}).toString('base64'),mode:state.mode&0o777,gid:state.gid};
  };
  const snapshot={current:capture(base,'current',true),unit:capture(units,service),proxy:capture(available,'enlace-pbx'),enabled:capture(enabled,'enlace-pbx',true)};
  if(snapshot.current.kind!=='absent'&&snapshot.current.kind!=='link'||(snapshot.current.kind==='absent')!==(snapshot.unit.kind==='absent'))throw new Error('Estado anterior incompleto exige revisão manual.');
  const previous=snapshot.current.kind==='link'?path.resolve('/opt/enlace-pbx',snapshot.current.target):undefined;
  if(previous&&!/^\/opt\/enlace-pbx\/releases\/[-a-zA-Z0-9_]{1,80}$/.test(previous))throw new Error('Release anterior fora do diretório esperado.');
  if(previous){const value=protectedDirectory(previous);value.close();}
  if(snapshot.enabled.kind==='link'&&path.resolve('/etc/nginx/sites-enabled',snapshot.enabled.target)!=='/etc/nginx/sites-available/enlace-pbx')throw new Error('Proxy anterior exige revisão manual.');
  const loadState=(await execute('systemctl',['show','--property=LoadState','--value',service],{timeout:10000,maxBuffer:65536})).stdout.trim();
  const activeState=(await execute('systemctl',['show','--property=ActiveState','--value',service],{timeout:10000,maxBuffer:65536})).stdout.trim();
  if(!['active','inactive'].includes(activeState)||!previous&&loadState!=='not-found')throw new Error('Serviço existente sem estado rastreado exige revisão manual.');
  const wasActive=activeState==='active';let wasEnabled=false;
  if(previous){
    try{const result=await execute('systemctl',['is-enabled',service],{timeout:10000,maxBuffer:65536});if(result.stdout.trim()!=='enabled')throw new Error();wasEnabled=true;}
    catch(error){if(error.stdout?.trim()!=='disabled')throw new Error('Estado de habilitação não suportado.');}
  }
  const backup='.activation-'+crypto.randomUUID()+'.json';base.create(backup,JSON.stringify({...snapshot,previous,wasEnabled,wasActive}),{uid:0,gid:0,mode:0o600});fs.fsyncSync(base.fd);
  const replaceFile=(directory,name,bytes,mode=0o644,gid=0)=>{const temporary=directory.stage(name,bytes,{uid:0,gid,mode});try{directory.activate(temporary,name);}finally{directory.remove(temporary);}};
  const replaceLink=(directory,name,target)=>{const temporary=name+'.activation-'+crypto.randomUUID();fs.symlinkSync(target,directory.location(temporary));try{directory.activate(temporary,name);}finally{directory.remove(temporary);}};
  const restore=(directory,name,value)=>{if(value.kind==='absent')directory.remove(name);else if(value.kind==='link')replaceLink(directory,name,value.target);else replaceFile(directory,name,Buffer.from(value.bytes,'base64'),value.mode,value.gid);};
  const command=(...args)=>execute('systemctl',args,{timeout:30000,maxBuffer:65536});
  const accountNumber=async(command,args)=>{
   const value=(await execute(command,args,{timeout:10000,maxBuffer:65536})).stdout.trim();
   if(!/^[1-9][0-9]*$/.test(value)||!Number.isSafeInteger(Number(value)))throw new Error('Identidade numérica do serviço inválida.');return Number(value);
  };
  const uid=await accountNumber('id',['-u','enlace-pbx']);const gid=await accountNumber('id',['-g','enlace-pbx']);let asteriskGid;
  try{const result=await execute('getent',['group','asterisk'],{timeout:10000,maxBuffer:65536});const value=result.stdout.trim().split(':')[2];if(!/^[1-9][0-9]*$/.test(value)||Number(value)===gid)throw new Error('Grupo Asterisk inválido.');asteriskGid=Number(value);}
  catch(error){if(error.code!==2)throw error;}
  const stopped=async()=>{try{await command('is-active',service);return false;}catch(error){return ['inactive','unknown'].includes(error.stdout?.trim());}};
  const ready=async(expected,expectedId)=>{
   for(let attempt=0;attempt<20;attempt++){
    try{
     const state=await command('show','--property=MainPID','--value',service);const pid=state.stdout.trim();
     if(!/^[1-9][0-9]*$/.test(pid)||fs.readlinkSync('/proc/'+pid+'/cwd')!==expected)throw new Error();
     if(!processProfileMatches(readProcessStatus(pid),{uid,gid,asteriskGid}))throw new Error('Perfil do processo não confirmado.');
     const response=await fetch('http://127.0.0.1:3000/health/ready',{signal:AbortSignal.timeout(3000),redirect:'error'});
     const reader=response.body.getReader();const chunks=[];let size=0;
     try{while(true){const part=await reader.read();if(part.done)break;size+=part.value.length;if(size>16384)throw new Error('Prontidão fora do limite.');chunks.push(Buffer.from(part.value));}}
     finally{await reader.cancel().catch(()=>{});}
     const body=JSON.parse(Buffer.concat(chunks).toString('utf8'));
     if(readinessEvidence(response.status,body,expectedId))return true;
    }catch{}
    await new Promise(resolve=>setTimeout(resolve,1000));
   }return false;
  };
  const result=await activateWithRollback({
   hasPrevious:!!previous,
   activate:async()=>{replaceFile(units,service,unitBytes);replaceLink(base,'current',release);await command('daemon-reload');await command('enable',service);await command('restart',service);},
   ready:()=>ready(release,releaseId),
   publish:async()=>{replaceFile(available,'enlace-pbx',proxyBytes);replaceLink(enabled,'enlace-pbx','/etc/nginx/sites-available/enlace-pbx');await execute('nginx',['-t'],{timeout:10000,maxBuffer:65536});await command('reload','nginx');},
   rollback:()=>restoreStoppedRelease({
    stop:()=>command('stop',service),stopped,
    disable:()=>command('disable',service),
    files:[()=>restore(base,'current',snapshot.current),()=>restore(units,service,snapshot.unit),()=>restore(available,'enlace-pbx',snapshot.proxy),()=>restore(enabled,'enlace-pbx',snapshot.enabled)],
    reload:()=>command('daemon-reload'),
    enablement:async()=>{if(wasEnabled)await command('enable',service);},
    resume:async()=>{if(previous&&wasActive)await command('start',service);},
    publish:async()=>{await execute('nginx',['-t'],{timeout:10000,maxBuffer:65536});await command('reload','nginx');},
   }),
   previousReady:async()=>previous&&wasActive?ready(previous,undefined):stopped(),
  });
  keepLock=result.status==='ROLLBACK_NOT_CONFIRMED';
  console.log(JSON.stringify({...result,backup,previousProcess:wasActive?'READY_REQUIRED':'INACTIVE_REQUIRED'}));process.exitCode=result.success?0:1;
 }finally{try{if(locked&&!keepLock)base.remove('.activation.lock');}finally{for(const directory of Object.values(directories))directory.close();}}
}
if(process.argv[1]&&path.resolve(process.argv[1])===path.resolve(new URL(import.meta.url).pathname))main().catch(()=>{console.error('Ativação não confirmada. Revise snapshots e estado do serviço antes de repetir.');process.exitCode=1;});
