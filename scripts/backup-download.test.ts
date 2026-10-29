import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,writeFile,rename,symlink,rm,mkdir} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {openBackup,listBackups} from '../server/infrastructure/security/BackupInventory.js';
const name='enlace-123456-abcdef01.epbx';
const bytes=Buffer.concat([Buffer.from('EPBXBK01'),Buffer.alloc(64,7)]);
async function fixture(root:string){await writeFile(path.join(root,name),bytes);await writeFile(path.join(root,name+'.json'),JSON.stringify({format:1,name,bytes:bytes.length,createdAt:new Date().toISOString(),secret:'nao-retornar'}));}
test('download mantém o descritor validado mesmo após substituição do caminho',async()=>{
 const root=await mkdtemp(path.join(os.tmpdir(),'pbx-backup-fd-'));
 try{await fixture(root);const file=await openBackup(name,root);
  try{await rename(path.join(root,name),path.join(root,'original'));await writeFile(path.join(root,name),'segredo substituto');
   const chunks:Buffer[]=[];for await(const chunk of file.handle.createReadStream({autoClose:false,start:0,end:file.size-1}))chunks.push(chunk);
   assert.deepEqual(Buffer.concat(chunks),bytes);
  }finally{await file.handle.close();}
 }finally{await rm(root,{recursive:true,force:true});}
});
test('inventário exige estrutura coerente, omite segredos e não certifica integridade',async()=>{
 const root=await mkdtemp(path.join(os.tmpdir(),'pbx-backup-manifest-'));
 try{await fixture(root);const list=await listBackups(root);assert.equal(list.length,1);assert.equal(list[0].integrity,'not_verified');assert.equal(JSON.stringify(list).includes('nao-retornar'),false);
  for(const patch of [{bytes:1},{name:'outro'},{createdAt:'invalido'},{format:2}]){
   await fixture(root);const manifest={format:1,name,bytes:bytes.length,createdAt:new Date().toISOString(),...patch};await writeFile(path.join(root,name+'.json'),JSON.stringify(manifest));
   await assert.rejects(openBackup(name,root));assert.deepEqual(await listBackups(root),[]);
  }
  await fixture(root);await writeFile(path.join(root,name),Buffer.alloc(bytes.length));await assert.rejects(openBackup(name,root));
  await fixture(root);await writeFile(path.join(root,name+'.json'),'x'.repeat(1024*1024+1));await assert.rejects(openBackup(name,root));
 }finally{await rm(root,{recursive:true,force:true});}
});
test('backup e manifesto não seguem links nem aceitam traversal, arquivos vazios ou diretórios',async()=>{
 const root=await mkdtemp(path.join(os.tmpdir(),'pbx-backup-links-'));
 try{for(const suffix of ['', '.json']){await fixture(root);await rename(path.join(root,name+suffix),path.join(root,'target'+suffix));await symlink(path.join(root,'target'+suffix),path.join(root,name+suffix));await assert.rejects(openBackup(name,root));await rm(path.join(root,name+suffix));}
  await fixture(root);await writeFile(path.join(root,name),'');await assert.rejects(openBackup(name,root));await rm(path.join(root,name));await mkdir(path.join(root,name));await assert.rejects(openBackup(name,root));
  for(const invalid of ['../runtime.json','/etc/passwd','enlace-123456-abcdef01.epbx/../x'])await assert.rejects(openBackup(invalid,root));
 }finally{await rm(root,{recursive:true,force:true});}
});
