import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
const execute=promisify(execFile);
const verifier=path.resolve('scripts/trusted-source.py');
const verify=(directory:string)=>execute('python3',['-I','-c',"import os,runpy,sys; policy=runpy.run_path(sys.argv[1]); policy['verify_tree'](sys.argv[2],trusted_uid=os.getuid(),check_ancestors=False)",verifier,directory]);
test('checkout confiável recusa arquivo gravável, symlink e hardlink antes de provisionar',async()=>{
 const directory=await fs.mkdtemp(path.join(os.tmpdir(),'pbx-trust-'));try{
  const helper=path.join(directory,'helper.mjs');await fs.writeFile(helper,'conteúdo revisado',{mode:0o644});await verify(directory);await assert.rejects(verify(helper));
  await fs.chmod(helper,0o666);await assert.rejects(verify(directory));await fs.chmod(helper,0o644);
  await fs.symlink(helper,path.join(directory,'alias'));await assert.rejects(verify(directory));await fs.unlink(path.join(directory,'alias'));
  await fs.link(helper,path.join(directory,'vinculado'));await assert.rejects(verify(directory));
 }finally{await fs.rm(directory,{recursive:true,force:true});}
});
test('alteração na árvore do build não modifica a cópia administrativa independente',async()=>{
 const directory=await fs.mkdtemp(path.join(os.tmpdir(),'pbx-capsule-'));try{
  const trusted=path.join(directory,'provisionamento');const release=path.join(directory,'release');await fs.mkdir(trusted);await fs.writeFile(path.join(trusted,'helper.mjs'),'versão revisada',{mode:0o644});await fs.cp(trusted,release,{recursive:true});
  await fs.writeFile(path.join(release,'helper.mjs'),'alterado pelo build');assert.equal(await fs.readFile(path.join(trusted,'helper.mjs'),'utf8'),'versão revisada');await verify(trusted);
  const deploy=await fs.readFile('deploy.sh','utf8');
  for(const file of ['configure-production.mjs','prepare-managed-asterisk.mjs','asterisk-settings.mjs','provision-database.mjs'])assert.ok(deploy.includes('"$PROVISIONING/scripts/'+file+'"'));
  assert.ok(deploy.includes('"$PROVISIONING/ops/enlace-pbx.service"'));assert.ok(deploy.includes('cd "$PROVISIONING" && env -i'));assert.equal(deploy.includes('"$NODE_BIN" scripts/'),false);
 }finally{await fs.rm(directory,{recursive:true,force:true});}
});
test('instalação administrativa com ignore-scripts não executa lifecycle de pacote',async()=>{
 const directory=await fs.mkdtemp(path.join(os.tmpdir(),'pbx-npm-policy-'));try{
  const packageJson={name:'ensaio-local',version:'1.0.0',scripts:{postinstall:"node -e \"require('fs').writeFileSync('executado','nao-deveria')\""}};
  await fs.writeFile(path.join(directory,'package.json'),JSON.stringify(packageJson));await fs.writeFile(path.join(directory,'package-lock.json'),JSON.stringify({name:packageJson.name,version:packageJson.version,lockfileVersion:3,requires:true,packages:{'':{name:packageJson.name,version:packageJson.version,hasInstallScript:true}}}));
  await execute('npm',['ci','--ignore-scripts','--include=dev','--no-audit','--no-fund'],{cwd:directory});await assert.rejects(fs.stat(path.join(directory,'executado')),(error:any)=>error.code==='ENOENT');
 }finally{await fs.rm(directory,{recursive:true,force:true});}
});
