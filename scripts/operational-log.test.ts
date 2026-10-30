import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';
import {operationalRecord,logOperational} from '../server/infrastructure/security/OperationalLog.js';


test('log operacional descarta erros, SQL, credenciais e serializadores de terceiros',()=>{
 const marker='CREDENCIAL_NAO_REGISTRAR';let serialized=false;
 const context={requestId:'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',status:500,durationMs:12.4,password:marker,sql:`SELECT '${marker}'`,error:new Error(marker),toJSON(){serialized=true;return marker;}};
 const record=operationalRecord('DB_OPERATION_FAILURE',context);
 assert.deepEqual(Object.keys(record).sort(),['durationMs','event','message','requestId','status']);assert.equal(record.durationMs,12);
 assert.equal(JSON.stringify(record).includes(marker),false);assert.equal(serialized,false);
 assert.equal(operationalRecord(marker as any,{requestId:marker,status:900,durationMs:Infinity}).event,'SERVER_OPERATION_FAILURE');
 assert.deepEqual(Object.keys(operationalRecord('DB_WARNING',{requestId:marker,status:NaN,durationMs:-1})).sort(),['event','message']);
});
test('saída operacional tem catálogo fechado e nenhum conteúdo bruto',()=>{
 const original=console.error;const lines:string[]=[];console.error=(value:unknown)=>{lines.push(String(value));};
 try{logOperational('SIP_COMMAND_REJECTED',{status:403});}finally{console.error=original;}
 assert.equal(lines.length,1);const record=JSON.parse(lines[0]);assert.equal(record.event,'SIP_COMMAND_REJECTED');assert.equal(record.status,403);assert.equal('stack' in record,false);
});
test('backend não escreve erros/avisos fora do emissor seguro nem usa eventos dinâmicos',()=>{
 const files=['server.ts'];const walk=(dir:string)=>{for(const item of fs.readdirSync(dir,{withFileTypes:true})){const file=path.join(dir,item.name);if(item.isDirectory())walk(file);else if(file.endsWith('.ts'))files.push(file);}};walk('server');
 for(const file of files){const source=fs.readFileSync(file,'utf8');const ast=ts.createSourceFile(file,source,ts.ScriptTarget.Latest,true);
  const visit=(node:ts.Node)=>{if(ts.isCallExpression(node)){
   if(ts.isPropertyAccessExpression(node.expression)&&node.expression.expression.getText(ast)==='console'&&['warn','error'].includes(node.expression.name.text))assert.equal(file,'server/infrastructure/security/OperationalLog.ts',file);
   if(ts.isIdentifier(node.expression)&&node.expression.text==='logOperational')assert.equal(ts.isStringLiteral(node.arguments[0]),true,file);
  }ts.forEachChild(node,visit);};visit(ast);
 }
});

test('falha real de repositório mantém recusa e registra apenas evento seguro',async()=>{
 const {postgresClient}=await import('../server/infrastructure/postgres/client.js');
 const {UserRepository}=await import('../server/infrastructure/postgres/repositories/UserRepository.js');
 const {AuditLogRepository}=await import('../server/infrastructure/postgres/repositories/AuditLogRepository.js');
 const original=postgresClient.executeTenantScoped;const originalConsole=console.error;const lines:string[]=[];
 const failure=new Error('postgres://usuario:CREDENCIAL_INTERNA@db SELECT segredo');
 (postgresClient as any).executeTenantScoped=async(_context:any,callback:any)=>callback({query:async()=>{throw failure;}},{tenantId:'teste'});
 console.error=(value:unknown)=>lines.push(String(value));
 try{
  await assert.rejects(UserRepository.findById('id','teste'),error=>error===failure);
  await assert.rejects(AuditLogRepository.logStrict({tenantId:'teste',userId:'teste',userName:'Teste',action:'TEST',resource:'teste',ip:'127.0.0.1',details:'Teste'}),error=>error instanceof Error&&error.message.startsWith('AUDIT_REQUIRED_FAILURE')&&!error.message.includes('CREDENCIAL_INTERNA'));
 }finally{postgresClient.executeTenantScoped=original;console.error=originalConsole;}
 assert.equal(lines.length,2);assert.equal(lines.some(line=>line.includes('CREDENCIAL_INTERNA')||line.includes('SELECT')),false);
 assert.equal(lines.every(line=>JSON.parse(line).event),true);
});
