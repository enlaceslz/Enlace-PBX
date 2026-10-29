import test from 'node:test';
import assert from 'node:assert/strict';
import {collectionPatch,managedCollection,assertInternalNumbers,queueDto} from '../server/infrastructure/asterisk/CollectionMutation.js';
test('coleções recusam identidade, contadores, membros inválidos e estratégias não executadas',()=>{
 for(const patch of [{id:'forjado'},{tenantId:'outra'},{callsWaiting:99},{slaTargetSeconds:20},{members:[]},{members:['4101','4101']},{members:['PJSIP/4101']},{number:'190'},{timeoutSeconds:0},{wrapUpTimeSeconds:'0'},{name:'x\n#exec id'}])assert.throws(()=>collectionPatch('queue',patch));
 assert.throws(()=>collectionPatch('group',{strategy:'random'}),(error:any)=>error.statusCode===501);
 assert.throws(()=>collectionPatch('group',{failoverDestination:'voicemail'}));
 assert.equal(collectionPatch('queue',{wrapUpTimeSeconds:0}).wrapUpTimeSeconds,0);
});
test('geração exige membros próprios e numeração única e não certifica métricas armazenadas',()=>{
 const group={name:'Grupo',number:'7001',members:['4101'],strategy:'ringall',timeoutSeconds:20,failoverDestination:'',fallbackType:'hangup'};
 assert.equal(managedCollection('group',group,[{number:'4101'}]).members.length,1);
 assert.throws(()=>managedCollection('group',group,[{number:'4102'}]));assert.throws(()=>managedCollection('group',{...group,fallbackType:'voicemail'},[{number:'4101'}]));
 assert.throws(()=>assertInternalNumbers([{number:'7001'}],[{number:'7001'}],[],[]));
 const dto=queueDto({callsWaiting:42,avgWaitTimeSeconds:20,answeredToday:100});assert.equal(dto.callsWaiting,null);assert.equal(dto.answeredToday,null);assert.equal(dto.telemetryStatus,'NOT_MEASURED');
});
