import test from 'node:test';
import assert from 'node:assert/strict';
import {trunkPatch} from '../server/infrastructure/asterisk/TrunkMutation.js';
test('cadastro aceita apenas campos editáveis com tipos e limites explícitos',()=>{
 assert.deepEqual(trunkPatch({name:' Tronco ',host:'sip.example.invalid',port:5060,register:false,qualifyFrequency:0,codecs:['alaw','ulaw']},true),{name:'Tronco',host:'sip.example.invalid',port:5060,register:false,qualifyFrequency:0,codecs:['alaw','ulaw']});
 for(const field of ['tenantId','id','status','channelsInUse','lastPingStatus','lastPingAt','secretEncrypted','secretMasked','hasSecret','natEnabled'])assert.throws(()=>trunkPatch({[field]:'forjado'}));
 for(const value of [{port:'5060'},{port:0},{channelsMax:-1},{register:'false'},{qualifyFrequency:3601},{transport:'HTTP'},{codecs:['alaw','alaw']},{codecs:['inventado']},{host:'999.999.999.999'},{host:'https://host'},{context:'from-internal'},{authorizedIps:['0.0.0.0/0']},{authorizedIps:['192.0.2.1/33']},{outboundProxy:'http://host'}])assert.throws(()=>trunkPatch(value));
});
test('campos SIP recusam diretivas, objetos e entradas descontroladas sem alterar senha válida',()=>{
 for(const value of [{name:'teste\n#exec segredo'},{secret:'abc;secret=x'},{secret:{senha:'x'}},{authorizedIps:['192.0.2.1\nmatch=0.0.0.0']},{username:'user?header=x'},{name:'x'.repeat(129)},[],null])assert.throws(()=>trunkPatch(value));
 assert.equal(trunkPatch({secret:' senha!123#[] '}).secret,' senha!123#[] ');
 assert.deepEqual(trunkPatch({authorizedIps:['192.0.2.0/24','sip.example.invalid'],failoverTrunkId:''}).authorizedIps,['192.0.2.0/24','sip.example.invalid']);
});
