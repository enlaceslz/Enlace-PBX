import test from 'node:test';
import assert from 'node:assert/strict';
import {activateWithRollback,restoreStoppedRelease,readinessEvidence,deploymentIdentity} from './release-activation.mjs';
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

const recovery=(failure?:string,stopped=true)=>{
 const events:string[]=[];
 const step=(name:string)=>async()=>{events.push(name);if(name===failure)throw new Error('falha injetada');};
 const operations={stop:step('stop'),stopped:async()=>{events.push('stopped');return stopped;},disable:step('disable'),files:['current','unit','proxy','enabled'].map(step),reload:step('reload'),enablement:step('enablement'),resume:step('resume'),publish:step('publish')};
 return {events,operations};
};
test('recuperação exige parada confirmada antes de alterar qualquer arquivo',async()=>{
 for(const failure of ['stop','not_stopped']){
  const value=recovery(failure,failure!=='not_stopped');
  await assert.rejects(()=>restoreStoppedRelease(value.operations));
  assert.deepEqual(value.events,failure==='stop'?['stop']:['stop','stopped']);
 }
});
test('falhas de desabilitação, arquivo ou recarga não impedem os demais arquivos nem reiniciam recuperação parcial',async()=>{
 for(const failure of ['disable','current','unit','proxy','enabled','reload']){
  const value=recovery(failure);
  const activation=scenario('ready');activation.operations.rollback=()=>restoreStoppedRelease(value.operations);
  const result=await activateWithRollback(activation.operations);
  assert.equal(result.status,'ROLLBACK_NOT_CONFIRMED');
  assert.deepEqual(value.events,['stop','stopped','disable','current','unit','proxy','enabled','reload']);
  assert.equal(activation.events.includes('previous_ready'),false);
 }
});
test('recuperação só retoma serviço e proxy depois de todos os arquivos e controle confirmados',async()=>{
 const complete=recovery();await restoreStoppedRelease(complete.operations);
 assert.deepEqual(complete.events,['stop','stopped','disable','current','unit','proxy','enabled','reload','enablement','resume','publish']);
 for(const failure of ['enablement','resume','publish']){
  const value=recovery(failure);await assert.rejects(()=>restoreStoppedRelease(value.operations));
  assert.equal(value.events.at(-1),failure);
 }
});
