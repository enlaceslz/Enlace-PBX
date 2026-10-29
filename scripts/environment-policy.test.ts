import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import bcrypt from 'bcrypt';
import {parse} from 'pg-connection-string';
import {environmentValues,parseEnvironmentJson,assertProductionSecrets,applicationDatabaseUrl,administrativeDatabaseUrl,bootstrapCredentials} from '../server/config/environmentPolicy.mjs';
import {productionSettings} from './configure-production.mjs';

const secret='chave-de-teste-literal-com-mais-de-32-caracteres';
test('configuração exige objeto de strings válidas e erros omitem conteúdo e nomes recebidos',()=>{
 for(const value of [null,[],42,'texto',{JWT_SECRET:42},{JWT_SECRET:{}},{JWT_SECRET:'texto\0inválido'},{'nome-sensivel-recebido':'valor'}]){
  assert.throws(()=>environmentValues(value),(error:Error)=>!error.message.includes('nome-sensivel-recebido')&&!error.message.includes('valor'));
 }
 assert.throws(()=>parseEnvironmentJson('{"TOKEN":"marcador-secreto",'),(error:Error)=>!error.message.includes('marcador-secreto'));
 const values={JWT_SECRET:'  '+secret+'\n',GEMINI_API_KEY:'texto # com aspas " e $()'};
 assert.deepEqual(parseEnvironmentJson(JSON.stringify(values)),values);
});

test('instalador e backend recusam a mesma chave fraca ou de exemplo sem normalizar a chave válida',()=>{
 const base={JWT_SECRET:secret,ENCRYPTION_KEY:secret};
 for(const override of [{JWT_SECRET:' '.repeat(40)},{JWT_SECRET:'  enlace-chave-previsivel-com-mais-de-32-caracteres  '},{ENCRYPTION_KEY:' '.repeat(40)},{WHATSAPP_VERIFY_TOKEN:'enlace_meta_webhook_token_2026'}]){
  assert.throws(()=>assertProductionSecrets({...base,...override}));
  assert.throws(()=>productionSettings({PBX_DOMAIN:'pbx.example.invalid',...base,...override}));
  const runtime=spawnSync(process.execPath,['--import','tsx','-e',"import('./server/config/env.ts').catch(()=>{process.exitCode=1;});"],{encoding:'utf8',env:{PATH:process.env.PATH,NODE_ENV:'production',CORS_ALLOWED_ORIGINS:'https://pbx.example.invalid',...base,...override}});
  assert.notEqual(runtime.status,0);
 }
 const literal='  '+secret+'\n';const settings=productionSettings({PBX_DOMAIN:'pbx.example.invalid',JWT_SECRET:literal,ENCRYPTION_KEY:literal});
 assert.equal(settings.JWT_SECRET,literal);assert.equal(settings.ENCRYPTION_KEY,literal);
});

test('URL operacional recusa substituição de identidade e destino que o driver PostgreSQL interpreta',()=>{
 const base='postgresql://enlace_app:senha-correta@127.0.0.1:5432/enlace_pbx';
 assert.equal(parse(base+'?user=postgres').user,'postgres');assert.equal(parse(base+'?host=externo.invalid').host,'externo.invalid');
 for(const query of ['user=postgres','password=outra','host=externo.invalid','port=5433','database=outro','USER=postgres','connectionString=postgresql%3A%2F%2Foutro'])assert.throws(()=>applicationDatabaseUrl(base+'?'+query));
 for(const value of ['https://enlace_app:marcador-secreto@db.invalid/enlace_pbx','postgresql://enlace_app@db.invalid/enlace_pbx','postgresql://enlace_app:senha@%2Fvar%2Frun/enlace_pbx','postgresql://enlace_app:senha%00@db.invalid/enlace_pbx','marcador-secreto://[inválido']){
  assert.throws(()=>applicationDatabaseUrl(value),(error:Error)=>!error.message.includes('marcador-secreto'));
 }
});

test('URL operacional mantém credencial codificada e permite protocolo PostgreSQL e opção TLS',()=>{
 for(const protocol of ['postgres:','postgresql:']){
  const password='senha literal # " e $()';const url=protocol+'//enlace_app:'+encodeURIComponent(password)+'@db.example.invalid:5433/enlace_pbx?sslmode=verify-full';
  const settings=productionSettings({PBX_DOMAIN:'pbx.example.invalid',DATABASE_URL:url});
  assert.equal(settings.DATABASE_URL,url);assert.equal(parse(settings.DATABASE_URL).password,password);assert.equal(applicationDatabaseUrl(url).port,'5433');
 }
});

test('URL administrativa mantém socket explícito e falha sem revelar credencial inválida',()=>{
 const url='postgresql:///enlace_pbx?host=/var/run/postgresql';assert.equal(administrativeDatabaseUrl(url).searchParams.get('host'),'/var/run/postgresql');
 for(const value of ['https://postgres:marcador-secreto@db.invalid/enlace_pbx','postgresql://marcador-secreto@[inválido'])assert.throws(()=>administrativeDatabaseUrl(value),(error:Error)=>!error.message.includes('marcador-secreto'));
});

test('CLI recusa JSON ou valores inválidos antes de escrever e não revela trechos de segredos',()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'pbx-env-refusal-'));const runtime=path.join(root,'runtime.json');const bootstrap=path.join(root,'bootstrap.json');
 try{
  for(const text of ['{"TOKEN":"marcador-secreto",',JSON.stringify({PBX_DOMAIN:'pbx.example.invalid',JWT_SECRET:{valor:'marcador-secreto'}}),JSON.stringify({PBX_DOMAIN:'pbx.example.invalid',DATABASE_URL:'marcador-secreto://[inválido'})]){
   fs.writeFileSync(runtime,text);const before=fs.statSync(runtime);
   const result=spawnSync(process.execPath,['scripts/configure-production.mjs',runtime,bootstrap,'--preserve-existing'],{encoding:'utf8',env:{PATH:process.env.PATH}});
   assert.notEqual(result.status,0);assert.equal(result.stderr.includes('marcador-secreto'),false);assert.equal(fs.existsSync(bootstrap),false);
   assert.equal(fs.readFileSync(runtime,'utf8'),text);assert.equal(fs.statSync(runtime).ino,before.ino);
  }
 }finally{fs.rmSync(root,{recursive:true,force:true});}
});

test('bootstrap preserva senha literal no bcrypt e recusa fraqueza, truncamento UTF-8 e e-mail inválido',async()=>{
 const password='  senha-literal-de-bootstrap  ';const value=bootstrapCredentials(' ADMIN@example.invalid ',password,true);
 assert.equal(value.email,'admin@example.invalid');assert.equal(value.password,password);
 const hash=await bcrypt.hash(value.password,4);assert.equal(await bcrypt.compare(password,hash),true);assert.equal(await bcrypt.compare(password.trim(),hash),false);
 for(const candidate of ['', 'curta', ' '.repeat(40),'á'.repeat(37),'texto-com\0controle'])assert.throws(()=>bootstrapCredentials('admin@example.invalid',candidate,true));
 for(const email of ['', 'inválido', 'admin@example.invalid\n'])assert.throws(()=>bootstrapCredentials(email,password,true));
 assert.deepEqual(bootstrapCredentials(),{email:'',password:''});assert.throws(()=>bootstrapCredentials('admin@example.invalid','',false));
});

test('CLI valida bootstrap antes de criar qualquer configuração e separa senha literal do runtime',()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'pbx-bootstrap-policy-'));const runtime=path.join(root,'runtime.json');const bootstrap=path.join(root,'bootstrap.json');
 const password='  senha-literal-com-espacos  ';
 const invoke=(extra:Record<string,string>)=>spawnSync(process.execPath,['scripts/configure-production.mjs',runtime,bootstrap],{encoding:'utf8',env:{PATH:process.env.PATH,PBX_DOMAIN:'pbx.example.invalid',...extra}});
 try{
  assert.notEqual(invoke({ADMIN_INITIAL_EMAIL:'inválido',ADMIN_INITIAL_PASSWORD:password}).status,0);assert.equal(fs.existsSync(runtime),false);assert.equal(fs.existsSync(bootstrap),false);
  const invalid=invoke({ADMIN_INITIAL_EMAIL:'admin@example.invalid',ADMIN_INITIAL_PASSWORD:password,DATABASE_MIGRATION_URL:'marcador-secreto://[inválido'});
  assert.notEqual(invalid.status,0);assert.equal(invalid.stderr.includes('marcador-secreto'),false);assert.equal(fs.existsSync(runtime),false);assert.equal(fs.existsSync(bootstrap),false);
  assert.equal(invoke({ADMIN_INITIAL_EMAIL:'ADMIN@example.invalid',ADMIN_INITIAL_PASSWORD:password}).status,0);
  assert.equal(JSON.parse(fs.readFileSync(bootstrap,'utf8')).ADMIN_INITIAL_PASSWORD,password);assert.equal(JSON.parse(fs.readFileSync(runtime,'utf8')).ADMIN_INITIAL_PASSWORD,undefined);
 }finally{fs.rmSync(root,{recursive:true,force:true});}
});

test('instalador recusa domínio e credenciais de telefonia inválidos antes de persistir configuração',()=>{
 assert.equal(productionSettings({PBX_DOMAIN:'a'.repeat(63)+'.example.invalid'}).PBX_DOMAIN,'a'.repeat(63)+'.example.invalid');
 for(const PBX_DOMAIN of ['a'.repeat(64)+'.invalid','pbx.example-','-pbx.example.invalid'])assert.throws(()=>productionSettings({PBX_DOMAIN}));
 for(const override of [{ASTERISK_AMI_PASSWORD:'fraca'},{ASTERISK_ARI_PASSWORD:'fraca'},{ASTERISK_ARI_ALLOWED_ORIGINS:'*'},{ASTERISK_AMI_USER:'general'}])assert.throws(()=>productionSettings({PBX_DOMAIN:'pbx.example.invalid',...override}));
});
