import test from 'node:test';
import assert from 'node:assert/strict';
import {isUnavailableProductionOperation} from '../server/infrastructure/security/httpSecurity.js';
import {extensionBatch} from '../server/infrastructure/asterisk/ExtensionBatch.js';
test('lote de ramais limita tamanho, sequência e campos sem tronco ou IA fictícios',()=>{
 assert.deepEqual(extensionBatch({prefix:'40',quantity:2,startNumber:0}).map(item=>item.number),['4000','4001']);
 for(const value of [{prefix:'40',quantity:101,startNumber:0},{prefix:'40',quantity:'2',startNumber:0},{prefix:'',quantity:1,startNumber:0},{prefix:'012',quantity:1,startNumber:0},{prefix:'999999',quantity:2,startNumber:999999},{prefix:'40',quantity:1,startNumber:-1},{prefix:'40',quantity:1,startNumber:0,trunkName:'SIP'},{prefix:'40',quantity:1,startNumber:0,includeAi:true}])assert.throws(()=>extensionBatch(value));
 assert.equal(extensionBatch({prefix:'40',quantity:100,startNumber:0}).length,100);
 for(const route of ['/setup/apply','/system/quick-setup/apply','/setup/rollback','/system/snapshots/id/rollback'])assert.equal(isUnavailableProductionOperation('POST',route),false);
});
