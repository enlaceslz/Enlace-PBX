import {constants} from 'node:fs';
import {open,realpath,lstat} from 'node:fs/promises';
import path from 'node:path';
import {OutboundHttpError} from './OutboundHttp.js';

export async function openRecording(reference:unknown,root=process.env.RECORDINGS_ROOT) {
  if(!root || !path.isAbsolute(root) || process.platform!=='linux')throw new OutboundHttpError('Diretório de gravações não configurado para leitura segura neste host.',503);
  if(typeof reference!=='string' || !reference || reference.length>1024 || /[\x00-\x1f\\]/.test(reference) || /[?#]/.test(reference) || /^[a-z]+:\/\//i.test(reference) || reference.split('/').includes('..'))throw new OutboundHttpError('Referência de gravação inválida.',400);
  const types:Record<string,string>={'.wav':'audio/wav','.mp3':'audio/mpeg','.ogg':'audio/ogg','.opus':'audio/ogg'};
  const extension=path.extname(reference).toLowerCase();
  if(!types[extension])throw new OutboundHttpError('Formato de gravação não suportado.',415);
  let handle:Awaited<ReturnType<typeof open>>|undefined;
  try {
    const base=await realpath(root);const target=path.resolve(base,reference);
    if(!target.startsWith(base+path.sep))throw new Error('Fora da raiz.');
    const relative=path.relative(base,target).split(path.sep);let current=base;
    for(const component of relative){current=path.join(current,component);if((await lstat(current)).isSymbolicLink())throw new Error('Link não permitido.');}
    handle=await open(target,constants.O_RDONLY|constants.O_NOFOLLOW|constants.O_NONBLOCK);
    const actual=await realpath(`/proc/self/fd/${handle.fd}`);
    if(actual!==target || !actual.startsWith(base+path.sep))throw new Error('Arquivo mudou.');
    const stat=await handle.stat();
    if(!stat.isFile() || stat.size<=0 || stat.size>50*1024*1024)throw new Error('Arquivo indisponível ou acima do limite.');
    return {handle,size:stat.size,type:types[extension],filename:'gravacao'+extension};
  }catch{await handle?.close();throw new OutboundHttpError('Gravação indisponível para leitura. Verifique arquivo, permissões e limite de 50 MB.',404);}
}
