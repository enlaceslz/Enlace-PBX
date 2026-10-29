import test from 'node:test';
import assert from 'node:assert/strict';
import {didPatch,nationalDid} from '../server/infrastructure/asterisk/DidMutation.js';
import {managedDidDestination} from '../server/infrastructure/asterisk/DidDialplan.js';
test('DID normaliza sem confundir DDD 55 com DDI e exige destino explícito',()=>{
 assert.equal(nationalDid('55 3222-1000'),'5532221000');assert.equal(nationalDid('+55 55 3222-1000'),'5532221000');assert.equal(nationalDid('0800 123 4567'),'08001234567');
 assert.throws(()=>didPatch({did:'1132221000',trunkId:'t'},true));assert.equal(didPatch({monthlyFee:0}).monthlyFee,0);
 for(const value of ['123','1132221000\n#exec x','abc1132221000','0000000000'])assert.throws(()=>nationalDid(value));
});
test('DID recusa identidade, contadores, destinos implícitos e funções não executadas',()=>{
 for(const value of [{id:'x'},{tenantId:'outra'},{totalCallsReceived:99},{normalizedNumber:'+55'},{monthlyFee:'10'},{monthlyFee:-1},{billingCycleDay:0},{description:'linha\ncomando'},{timeConditionEnabled:true},{fallbackTarget:'4101'},{destinationId:'${SHELL(id)}'}])assert.throws(()=>didPatch(value));
 assert.throws(()=>didPatch({destinationType:'ai_agent'}),(error:any)=>error.statusCode===501);
 assert.equal(didPatch({did:'1132221000',trunkId:'t',destinationType:'extension',destinationId:'4101'},true).did,'1132221000');
});
test('dialplan exige ramal e tronco próprios sem fallback presumido ou recursos ignorados',()=>{
 const did={did:'5532221000',trunkId:'t',destinationType:'extension',destinationId:'4101',didSourceHeader:'request_uri',unknownDidAction:'reject_404'};
 assert.deepEqual(managedDidDestination(did,[{number:'4101'}],[{id:'t'}]),{national:'5532221000',extension:'4101'});
 for(const patch of [{trunkId:'outra'},{destinationId:'4102'},{destinationType:'ai_agent'},{fallbackTarget:'4101'},{timeConditionEnabled:true},{didSourceHeader:'custom'}])assert.throws(()=>managedDidDestination({...did,...patch},[{number:'4101'}],[{id:'t'}]));
});
