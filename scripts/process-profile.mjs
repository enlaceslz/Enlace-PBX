import fs from 'node:fs';

export function readProcessStatus(pid){
  if(typeof pid!=='string'||!/^[1-9][0-9]{0,9}$/.test(pid))throw new Error('PID inválido.');
  const fd=fs.openSync('/proc/'+pid+'/status',fs.constants.O_RDONLY|fs.constants.O_NOFOLLOW|fs.constants.O_NONBLOCK);
  try{
    const chunks=[];let size=0;
    while(true){const buffer=Buffer.alloc(Math.min(4096,16385-size));const bytes=fs.readSync(fd,buffer,0,buffer.length,null);if(!bytes)break;size+=bytes;if(size>16384)throw new Error('Perfil do processo fora do limite.');chunks.push(buffer.subarray(0,bytes));}
    return Buffer.concat(chunks).toString('utf8');
  }finally{fs.closeSync(fd);}
}

export function processProfileMatches(text,{uid,gid,asteriskGid}={}){
  if(typeof text!=='string'||Buffer.byteLength(text)>16384||!Number.isSafeInteger(uid)||uid<=0||!Number.isSafeInteger(gid)||gid<=0||asteriskGid!==undefined&&(!Number.isSafeInteger(asteriskGid)||asteriskGid<=0||asteriskGid===gid))return false;
  const fields=new Map();
  for(const line of text.split('\n')){
    const match=line.match(/^([A-Za-z]+):\s*(.*?)\s*$/);if(!match)continue;
    if(fields.has(match[1]))return false;fields.set(match[1],match[2]);
  }
  for(const [name,expected] of [['Uid',uid],['Gid',gid]]){
    const value=fields.get(name);if(!value||!/^\d+\s+\d+\s+\d+\s+\d+$/.test(value)||value.split(/\s+/).some(item=>Number(item)!==expected))return false;
  }
  const groups=fields.get('Groups');if(groups===undefined||groups!==''&&!/^\d+(?:\s+\d+)*$/.test(groups))return false;
  const allowed=new Set([gid,...(asteriskGid===undefined?[]:[asteriskGid])]);
  if(groups!==''&&groups.split(/\s+/).some(value=>!allowed.has(Number(value))))return false;
  if(fields.get('NoNewPrivs')!=='1')return false;
  for(const name of ['CapInh','CapPrm','CapEff','CapBnd','CapAmb'])if(!/^0+$/.test(fields.get(name)??''))return false;
  return true;
}
