import test from 'node:test';
import assert from 'node:assert/strict';
import {SystemLogsManager,logQuery} from '../server/systemLogs.js';
const id='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
test('buffer HTTP aceita apenas status e UUID e elimina qualquer mensagem ou metadado arbitrário',()=>{
 const logs=new SystemLogsManager();assert.equal(logs.getLogs().stats.lastTimestamp,null);
 for(const [status,requestId] of [[200,id],[600,id],[500,'Bearer segredo'],['500',id],[500,{password:'segredo'}]])logs.recordHttpFailure(status,requestId);
 assert.equal(logs.getLogs().logs.length,0);
 logs.recordHttpFailure(500,id);logs.recordHttpFailure(401,id);const result=logs.getLogs();assert.equal(result.logs.length,2);assert.equal(result.source.persistent,false);assert.equal(result.source.hostCollectorConfigured,false);
 assert.deepEqual(Object.keys(result.logs[0].metadata!).sort(),['requestId','status']);assert.equal(result.logs[0].service,'application');assert.equal(result.logs[0].level,'WARNING');
 result.logs[0].message='segredo';assert.equal(JSON.stringify(logs.getLogs()).includes('segredo'),false);
});
test('buffer mantém limite, filtros e estatísticas reais; limpeza não fabrica evento Asterisk',()=>{
 const logs=new SystemLogsManager();for(let n=0;n<605;n++)logs.recordHttpFailure(n%2?500:403,id);
 assert.equal(logs.getLogs().stats.total,600);assert.equal(logs.getLogs({limit:10}).logs.length,10);assert.equal(logs.getLogs({limit:10}).hasMore,true);
 assert.equal(logs.getLogs({level:'ERROR',limit:600}).logs.every(e=>e.level==='ERROR'),true);assert.equal(logs.getLogs({search:'nao-existe'}).logs.length,0);
 logs.clearLogs();assert.equal(logs.getLogs().stats.total,0);assert.equal(logs.getLogs().stats.lastTimestamp,null);
});
test('filtros HTTP rejeitam estruturas inesperadas, limites abusivos e coletores inexistentes',()=>{
 for(const query of [{limit:'-1'},{limit:'601'},{limit:'NaN'},{search:['segredo']},{search:'x'.repeat(201)},{level:{}},{date:'today'},{service:'asterisk'}])assert.throws(()=>logQuery(query));
 assert.equal(logQuery({limit:'1',service:'application',level:'ERROR'}).limit,1);assert.equal(logQuery({},true).limit,600);
});
