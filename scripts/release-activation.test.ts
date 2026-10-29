import test from 'node:test';
import assert from 'node:assert/strict';
import {activateWithRollback,readinessEvidence,deploymentIdentity} from './release-activation.mjs';
const scenario=(failure?:string,rollbackReady=true)=>{
 const events:string[]=[];let probes=0;
 const operations={hasPrevious:true,activate:async()=>{events.push('activate');if(failure==='activate')throw new Error();},ready:async()=>{events.push('ready');return failure!=='ready'&&!(failure==='final'&&++probes>1);},publish:async()=>{events.push('publish');if(failure==='publish')throw new Error();},rollback:async()=>{events.push('rollback');if(failure==='rollback')throw new Error();},previousReady:async()=>{events.push('previous_ready');return rollbackReady;}};
 return {events,operations};
};
test('ativação só publica proxy após prontidão e verifica novamente antes de confirmar',async()=>{
 const {events,operations}=scenario();const result=await activateWithRollback(operations);assert.equal(result.success,true);assert.deepEqual(events,['activate','ready','publish','ready']);
});
test('falha de ativação, prontidão ou proxy restaura código e verifica estado anterior',async()=>{
 for(const failure of ['activate','ready','publish','final']){const {events,operations}=scenario(failure);const result=await activateWithRollback(operations);assert.equal(result.success,false);assert.equal(result.status,'CODE_RESTORED');assert.ok(events.includes('rollback'));assert.equal(events.at(-1),'previous_ready');if(failure==='ready')assert.equal(events.includes('publish'),false);}
});
test('recuperação não confirmada é explícita e primeira instalação pode remover candidata',async()=>{
 const failed=scenario('publish',false);assert.equal((await activateWithRollback(failed.operations)).status,'ROLLBACK_NOT_CONFIRMED');
 const first=scenario('ready');first.operations.hasPrevious=false;assert.equal((await activateWithRollback(first.operations)).status,'CANDIDATE_REMOVED');
 const broken=scenario('ready');broken.operations.rollback=async()=>{throw new Error();};assert.equal((await activateWithRollback(broken.operations)).status,'ROLLBACK_NOT_CONFIRMED');
});
test('prontidão de outro processo/release não confirma candidata e identidade é limitada',()=>{
 assert.equal(readinessEvidence(200,{status:'ready',releaseId:'antiga'},'nova'),false);assert.equal(readinessEvidence(503,{status:'ready',releaseId:'nova'},'nova'),false);assert.equal(readinessEvidence(200,{status:'ready',releaseId:'nova'},'nova'),true);assert.equal(deploymentIdentity('../nova'),undefined);assert.equal(deploymentIdentity('nova\nEnvironment=X'),undefined);assert.equal(deploymentIdentity('nova-2026'),'nova-2026');
});
