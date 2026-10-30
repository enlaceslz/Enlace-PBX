import test from 'node:test';
import assert from 'node:assert/strict';
import {ivrPatch,managedIvr,renderIvr} from '../server/infrastructure/asterisk/IvrMutation.js';
const menu={id:'ivr-a',name:'URA A',number:'8001',audioPrompt:'custom/saudacao',timeoutSeconds:8,invalidRetries:0,options:[{digit:'1',label:'Atender',destinationType:'extension',destinationTarget:'4101'},{digit:'2',label:'Fila',destinationType:'queue',destinationTarget:'6001'},{digit:'#',label:'Encerrar',destinationType:'hangup',destinationTarget:''}]};
test('URA aceita menu limitado com destinos próprios e preserva zero repetições',()=>{
 const value=managedIvr(menu,[{number:'4101'}],[{id:'queue-a',number:'6001'}]);assert.equal(value.invalidRetries,0);
 assert.throws(()=>managedIvr(menu,[{number:'4102'}],[{id:'queue-a',number:'6001'}]),/empresa/);
 assert.throws(()=>managedIvr(menu,[{number:'4101'}],[]),/empresa/);
 for(const patch of [{tenantId:'outra'},{id:'x'},{audioPrompt:'${SHELL(id)}'},{audioPrompt:'../saudacao'},{audioPrompt:'Olá, bem-vindo'},{invalidRetries:6},{options:[menu.options[0],menu.options[0]]}])assert.throws(()=>ivrPatch(patch));
 assert.throws(()=>ivrPatch({flow:{nodes:[]}}),/visual/);assert.deepEqual(ivrPatch({flow:null}),{flow:null});
 assert.throws(()=>ivrPatch({options:[{...menu.options[0],destinationType:'ai_agent'}]}),/suportado/);
});
test('cada URA gera contexto isolado sem nome ou rótulo executável e encerra timeout',()=>{
 const first=renderIvr({...menu,name:'${SHELL(id)}',options:menu.options.map(option=>({...option,label:'${SHELL(id)}'}))});const second=renderIvr({...menu,id:'ivr-b',number:'8002'});
 assert.match(first,/\[ivr-ivr-a\]/);assert.match(second,/\[ivr-ivr-b\]/);assert.doesNotMatch(first,/SHELL/);assert.match(first,/Background\(custom\/saudacao\)/);assert.match(first,/Goto\(call-queues,6001,1\)/);assert.match(first,/Goto\(from-internal,4101,1\)/);assert.match(first,/exten => t,1,Hangup\(\)/);assert.match(first,/IVR_INVALID}>0/);
});
