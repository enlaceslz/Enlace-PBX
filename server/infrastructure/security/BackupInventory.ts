import fs from 'node:fs/promises';
import {constants} from 'node:fs';
import path from 'node:path';
import {OutboundHttpError} from './OutboundHttp.js';

export const backupDirectory = () => process.env.PBX_BACKUP_DIRECTORY || '/var/backups/enlace-pbx';
export function backupPath(name:string):string {
  if(!/^enlace-\d+-[a-f0-9]{8}\.epbx$/.test(name))throw new Error('Nome de backup inválido.');
  return path.join(backupDirectory(),name);
}
async function openBoundFile(directory:string,name:string,maxBytes=Number.MAX_SAFE_INTEGER){
  if(process.platform!=='linux'||!path.isAbsolute(directory))throw new Error('Raiz segura indisponível.');
  const root=await fs.realpath(directory);const target=path.join(root,name);
  let handle:Awaited<ReturnType<typeof fs.open>>|undefined;
  try{
    handle=await fs.open(target,constants.O_RDONLY|constants.O_NOFOLLOW|constants.O_NONBLOCK);
    if(await fs.realpath(`/proc/self/fd/${handle.fd}`)!==target)throw new Error('Arquivo mudou.');
    const stat=await handle.stat();
    if(!stat.isFile()||stat.size<=0||stat.size>maxBytes)throw new Error('Arquivo inválido.');
    return {handle,size:stat.size};
  }catch(error){await handle?.close();throw error;}
}
export async function openBackup(name:string,directory=backupDirectory()){
  let file:Awaited<ReturnType<typeof openBoundFile>>|undefined;
  try{
    backupPath(name);
    file=await openBoundFile(directory,name);
    if(file.size<=36)throw new Error('Arquivo incompleto.');
    const header=Buffer.alloc(8);await file.handle.read(header,0,8,0);
    if(!header.equals(Buffer.from('EPBXBK01')))throw new Error('Formato inválido.');
    const metadata=await openBoundFile(directory,name+'.json',1024*1024);
    let manifest:any;
    try{
      const bytes=Buffer.alloc(metadata.size+1);const read=await metadata.handle.read(bytes,0,bytes.length,0);
      if(read.bytesRead!==metadata.size)throw new Error('Manifesto mudou.');
      manifest=JSON.parse(bytes.subarray(0,read.bytesRead).toString('utf8'));
    }finally{await metadata.handle.close();}
    if(manifest.format!==1||typeof manifest.createdAt!=='string'||!Number.isFinite(Date.parse(manifest.createdAt))||manifest.name!==name||manifest.bytes!==file.size)throw new Error('Manifesto inválido.');
    return {...file,name,createdAt:manifest.createdAt};
  }catch{await file?.handle.close();throw new OutboundHttpError('Backup indisponível para leitura segura.',404);}
}
export async function listBackups(directory=backupDirectory()){
  let names:string[];
  try{names=await fs.readdir(directory);}catch(error:any){if(error.code==='ENOENT')return [];throw error;}
  const backups=[];
  for(const name of names){
    if(!/^enlace-\d+-[a-f0-9]{8}\.epbx$/.test(name))continue;
    try{
      const file=await openBackup(name,directory);
      try{backups.push({name,createdAt:file.createdAt,bytes:file.size,encrypted:true,integrity:'not_verified',
        databaseConsistency:'snapshot',filesConsistency:'copy',scope:['postgresql','configuration','asterisk','recordings']});}
      finally{await file.handle.close();}
    }catch{/* Arquivos ausentes, incompletos ou sem manifesto válido não são listados. */}
  }
  return backups.sort((a,b)=>b.createdAt.localeCompare(a.createdAt));
}
