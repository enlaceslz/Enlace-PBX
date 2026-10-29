import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
const C=fs.constants;
const leaf=name=>{if(typeof name!=='string'||!/^[-a-zA-Z0-9_.]+$/.test(name)||name==='.'||name==='..')throw new Error('Nome de arquivo inválido.');return name;};
export function readBounded(fd,maxBytes=16*1024*1024){
  const before=fs.fstatSync(fd,{bigint:true});
  if(!before.isFile()||before.size>BigInt(maxBytes))throw new Error('Arquivo fora do limite de leitura.');
  const data=Buffer.alloc(Number(before.size));let offset=0;
  while(offset<data.length){const count=fs.readSync(fd,data,offset,data.length-offset,offset);if(!count)throw new Error('Arquivo alterado durante leitura.');offset+=count;}
  const after=fs.fstatSync(fd,{bigint:true});
  if(before.size!==after.size||before.mtimeNs!==after.mtimeNs||before.ctimeNs!==after.ctimeNs)throw new Error('Arquivo alterado durante leitura.');
  return data;
}
export class AnchoredDirectory {
  constructor(directory,{trustedUid}={}){
    if(process.platform!=='linux'||!path.isAbsolute(directory)||directory.split('/').some(part=>part==='.'||part==='..'))throw new Error('Diretório Linux absoluto obrigatório.');
    let fd=fs.openSync('/',C.O_RDONLY|C.O_DIRECTORY|C.O_NOFOLLOW);
    try{
      const rootState=fs.fstatSync(fd);
      if(trustedUid!==undefined&&(rootState.uid!==trustedUid||(rootState.mode&0o022)!==0))throw new Error('Raiz de diretório não confiável.');
      for(const part of directory.split('/').filter(Boolean)){
        const next=fs.openSync('/proc/self/fd/'+fd+'/'+leaf(part),C.O_RDONLY|C.O_DIRECTORY|C.O_NOFOLLOW);
        const state=fs.fstatSync(next);
        if(trustedUid!==undefined&&(state.uid!==trustedUid||(state.mode&0o022)!==0)){fs.closeSync(next);throw new Error('Ancestral de diretório não confiável.');}
        fs.closeSync(fd);fd=next;
      }
      this.fd=fd;fd=undefined;
    }finally{if(fd!==undefined)fs.closeSync(fd);}
  }
  location(name){return '/proc/self/fd/'+this.fd+'/'+leaf(name);}
  state(){return fs.fstatSync(this.fd);}
  close(){if(this.fd!==undefined){fs.closeSync(this.fd);this.fd=undefined;}}
  read(name,{uid,normalizeGid,metadataOnly=false,protectedMode=false}={}){
    let fd;
    try{
      fd=fs.openSync(this.location(name),C.O_RDONLY|C.O_NOFOLLOW|C.O_NONBLOCK);
      const state=fs.fstatSync(fd);
      if(!state.isFile()||state.nlink!==1||uid!==undefined&&state.uid!==uid||protectedMode&&(state.mode&0o022)!==0)throw new Error('Arquivo não regular, vinculado ou com proprietário inesperado.');
      if(normalizeGid!==undefined){fs.fchownSync(fd,uid,normalizeGid);fs.fchmodSync(fd,0o640);}
      return metadataOnly?state:readBounded(fd);
    }catch(error){if(error.code==='ENOENT')return undefined;throw error;}
    finally{if(fd!==undefined)fs.closeSync(fd);}
  }
  create(name,content,{uid=process.getuid(),gid=process.getgid(),mode=0o600}={}){
    const fd=fs.openSync(this.location(name),C.O_WRONLY|C.O_CREAT|C.O_EXCL|C.O_NOFOLLOW|C.O_NONBLOCK,0o600);
    let complete=false;
    try{fs.writeFileSync(fd,content);fs.fchownSync(fd,uid,gid);fs.fchmodSync(fd,mode);fs.fsyncSync(fd);complete=true;}
    finally{fs.closeSync(fd);if(!complete)this.remove(name);}
  }
  stage(name,content,options){const temporary=leaf(name)+'.enlace-'+crypto.randomUUID()+'.tmp';this.create(temporary,content,options);return temporary;}
  activate(temporary,name){fs.renameSync(this.location(temporary),this.location(name));fs.fsyncSync(this.fd);}
  remove(name){try{fs.unlinkSync(this.location(name));}catch(error){if(error.code!=='ENOENT')throw error;}}
}

export function prepareManagedDirectory(basePath,uid,gid){
  const base=new AnchoredDirectory(basePath);let directory;
  try{
    if(base.state().uid!==uid)throw new Error('Proprietário do diretório de dados inesperado.');
    let created=false;
    try{fs.mkdirSync(base.location('asterisk'),{mode:0o700});created=true;}catch(error){if(error.code!=='EEXIST')throw error;}
    const fd=fs.openSync(base.location('asterisk'),C.O_RDONLY|C.O_DIRECTORY|C.O_NOFOLLOW);
    directory=Object.create(AnchoredDirectory.prototype);directory.fd=fd;
    if(!created&&directory.state().uid!==uid)throw new Error('Diretório gerenciado com proprietário inesperado.');
    fs.fchownSync(fd,uid,gid);fs.fchmodSync(fd,0o2750);
    for(const file of ['pjsip.conf','extensions.conf','queues.conf']){
      if(directory.read(file,{uid,normalizeGid:gid,metadataOnly:true})!==undefined)continue;
      // O_EXCL recusa uma criação concorrente, inclusive links pendurados.
      directory.create(file,'',{uid,gid,mode:0o640});
    }
  }finally{directory?.close();base.close();}
}

export function verifyManagedDirectory(basePath,uid,gid){
  const base=new AnchoredDirectory(basePath);let directory;
  try{
    if(base.state().uid!==uid||(base.state().mode&0o022)!==0)throw new Error('Diretório de dados inesperado.');
    const fd=fs.openSync(base.location('asterisk'),C.O_RDONLY|C.O_DIRECTORY|C.O_NOFOLLOW);
    directory=Object.create(AnchoredDirectory.prototype);directory.fd=fd;
    const state=directory.state();
    if(state.uid!==uid||state.gid!==gid||(state.mode&0o7777)!==0o2750)throw new Error('Diretório gerenciado exige manutenção de permissões.');
    for(const file of ['pjsip.conf','extensions.conf','queues.conf']){
      const stat=directory.read(file,{uid,metadataOnly:true,protectedMode:true});
      if(!stat||stat.gid!==gid||(stat.mode&0o7777)!==0o640)throw new Error('Arquivo gerenciado ausente ou com permissões divergentes.');
    }
  }finally{directory?.close();base.close();}
}
