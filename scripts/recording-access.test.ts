import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,writeFile,symlink,mkdir,rm,open} from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {openRecording} from '../server/infrastructure/security/RecordingAccess.js';
test('gravação abre bytes originais dentro da raiz e rejeita traversal, URLs e links',async()=>{
  const root=await mkdtemp(path.join(os.tmpdir(),'pbx-audio-'));try{
    const bytes=Buffer.from('RIFF0000WAVEarquivo-de-teste');await writeFile(path.join(root,'real.wav'),bytes);
    for(const reference of ['real.wav',path.join(root,'real.wav')]){const file=await openRecording(reference,root);try{assert.deepEqual(await file.handle.readFile(),bytes);assert.equal(file.type,'audio/wav');assert.equal(file.size,bytes.length);}finally{await file.handle.close();}}
    await symlink(path.join(root,'real.wav'),path.join(root,'link.wav'));await mkdir(path.join(root,'dir'));await symlink(path.join(root,'dir'),path.join(root,'linked-dir'));
    for(const reference of ['../segredo.wav','https://host/real.wav','/etc/passwd','link.wav','linked-dir/real.wav','real.wav?token=x','real.html','real.wav\u0000'])await assert.rejects(openRecording(reference,root));
  }finally{await rm(root,{recursive:true,force:true});}
});
test('gravação ausente, vazia, diretório ou maior que 50 MB não produz áudio substituto',async()=>{
  const root=await mkdtemp(path.join(os.tmpdir(),'pbx-audio-'));try{
    await writeFile(path.join(root,'empty.wav'),'');await mkdir(path.join(root,'folder.wav'));const large=await open(path.join(root,'large.wav'),'w');await large.truncate(51*1024*1024);await large.close();
    for(const reference of ['missing.wav','empty.wav','folder.wav','large.wav'])await assert.rejects(openRecording(reference,root));
    await assert.rejects(openRecording('file.wav',''));
  }finally{await rm(root,{recursive:true,force:true});}
});
