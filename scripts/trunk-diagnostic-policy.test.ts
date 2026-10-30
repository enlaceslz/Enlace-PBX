import test from 'node:test';
import assert from 'node:assert/strict';
import {sipTrunkService} from '../server/sipTrunkService.js';
import {applyConfiguration} from '../server/infrastructure/asterisk/ApplyConfiguration.js';
test('checklist é roteiro pendente e diagnóstico legado não anuncia homologação',async()=>{
 const items=sipTrunkService.getHomologationChecklist();assert.equal(items.length,11);assert.equal(items.every(item=>item.status==='pending'&&!item.executedAt),true);
 await assert.rejects(sipTrunkService.runTrunkDiagnostics('id'),(error:any)=>error.statusCode===501);
});
test('falha de auditoria impede geração e gravação da configuração',async()=>{
 let called=false;await assert.rejects(applyConfiguration({audit:async()=>{throw new Error('AUDIT_REQUIRED_FAILURE');},generate:async()=>{called=true;return {pjsip:'p',dialplan:'d'};},apply:async()=>{called=true;return {success:true};}}));assert.equal(called,false);
});
test('aplicação separa aceite de recarga e falha sem devolver mensagens ou caminhos internos',async()=>{
 const order:string[]=[];const dependencies={audit:async()=>{order.push('audit');},generate:async()=>{order.push('generate');return {pjsip:'p',dialplan:'d'};},apply:async()=>{order.push('apply');return {success:false,message:'senha-interna',backupPath:'/etc/asterisk/segredo'};}};
 const failure=await applyConfiguration(dependencies);assert.deepEqual(order,['audit','generate','apply']);assert.equal(failure.success,false);assert.equal(failure.status,'NOT_APPLIED');assert.doesNotMatch(JSON.stringify(failure),/senha-interna|\/etc|backupPath|snapshotId/);
 const success=await applyConfiguration({...dependencies,apply:async()=>({success:true})});assert.equal(success.status,'RELOAD_ACCEPTED');assert.match(success.message,/homologação/);
});
