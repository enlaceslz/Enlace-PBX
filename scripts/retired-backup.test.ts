import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import {once} from 'node:events';
import {retiredJsonBackup} from '../server/infrastructure/security/RetiredJsonBackup.js';
test('rotas JSON retiradas não exportam dados nem aceitam restauração, independentemente do método',async()=>{
 const app=express();app.use(express.json());app.all(['/system/backup','/system/restore'],retiredJsonBackup);
 const server=app.listen(0,'127.0.0.1');await once(server,'listening');
 try{for(const route of ['/system/backup','/system/restore','/SYSTEM/RESTORE/'])for(const method of ['GET','HEAD','POST','PUT','DELETE']){
   const response=await fetch(`http://127.0.0.1:${(server.address() as any).port}`+route,{method,...(!['GET','HEAD'].includes(method)?{headers:{'Content-Type':'application/json'},body:JSON.stringify({data:{users:[{id:'root',isActive:false}],tenants:[]}})}:{})});
   assert.equal(response.status,501);if(method!=='HEAD'){const body=await response.json();assert.equal(body.code,'LEGACY_BACKUP_RETIRED');assert.equal('data' in body,false);assert.equal('success' in body,false);}
 }}finally{server.closeAllConnections();await new Promise<void>(resolve=>server.close(()=>resolve()));}
});
