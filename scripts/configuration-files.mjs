import path from 'node:path';
import {AnchoredDirectory} from './anchored-files.mjs';
import {environmentValues} from '../server/config/environmentPolicy.mjs';

const maximumBytes=16*1024*1024;
const openParent=file=>{
  if(typeof file!=='string'||!path.isAbsolute(file))throw new Error('Configuração exige caminho absoluto.');
  const directory=new AnchoredDirectory(path.dirname(file));
  const state=directory.state();
  if(state.uid!==process.getuid()||(state.mode&0o022)!==0){directory.close();throw new Error('Diretório de configuração deve pertencer ao executor e recusar escrita por terceiros.');}
  return {directory,name:path.basename(file)};
};

export function assertDistinctSettingsFiles(runtime,bootstrap){
  if(typeof runtime!=='string'||typeof bootstrap!=='string'||path.resolve(runtime)===path.resolve(bootstrap))throw new Error('Runtime e bootstrap exigem destinos distintos.');
}

export function readSettingsFile(file){
  const {directory,name}=openParent(file);
  try{return directory.read(name,{uid:process.getuid(),protectedMode:true});}
  finally{directory.close();}
}

export function stageSettings(file,values,mode=0o600){
  if(![0o600,0o640].includes(mode))throw new Error('Modo de configuração inválido.');
  const content=JSON.stringify(environmentValues(values),null,2)+'\n';
  if(Buffer.byteLength(content,'utf8')>maximumBytes)throw new Error('Configuração excede o limite de leitura.');
  const {directory,name}=openParent(file);let temporary;
  try{
    const previous=directory.read(name,{uid:process.getuid(),protectedMode:true,metadataOnly:true});
    temporary=directory.stage(name,content,{uid:process.getuid(),gid:previous?.gid??directory.state().gid,mode});
  }catch(error){directory.close();throw error;}
  let closed=false;
  return {
    publish(){if(closed||!temporary)throw new Error('Configuração preparada já encerrada.');directory.activate(temporary,name);temporary=undefined;},
    close(){if(closed)return;closed=true;try{if(temporary)directory.remove(temporary);}finally{directory.close();}},
  };
}

export function writeSettings(file,values,mode=0o600){
  const prepared=stageSettings(file,values,mode);
  try{prepared.publish();}finally{prepared.close();}
}

export function writeConfigurationFiles(runtime,values,bootstrap,administrative,{preserveRuntime=false}={}){
  assertDistinctSettingsFiles(runtime,bootstrap);
  const prepared=[];
  try{
    if(preserveRuntime){
      const {directory,name}=openParent(runtime);
      try{if(!directory.read(name,{uid:process.getuid(),protectedMode:true,metadataOnly:true}))throw new Error('Runtime existente obrigatório para preservação.');}
      finally{directory.close();}
    }
    // Prepara ambos antes de publicar; o runtime durável vem antes do bootstrap.
    if(!preserveRuntime)prepared.push(stageSettings(runtime,values,0o640));
    prepared.push(stageSettings(bootstrap,administrative,0o600));
    for(const item of prepared)item.publish();
  }finally{
    let incomplete=false;
    for(const item of prepared.reverse()){try{item.close();}catch{incomplete=true;}}
    if(incomplete)throw new Error('Falha ao limpar configuração preparada; revise arquivos temporários protegidos.');
  }
}
