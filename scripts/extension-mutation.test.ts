import test from 'node:test';
import assert from 'node:assert/strict';
import {extensionPatch} from '../server/infrastructure/asterisk/ExtensionMutation.js';
test('ramal limita campos e credenciais sem remover espaços da senha SIP',()=>{
 const secret=' senha#[]com-espacos ';
 assert.equal(extensionPatch({name:'Nome',number:'4101',sipSecret:secret},true).sipSecret,secret);
 assert.deepEqual(extensionPatch({name:'Novo',sipSecret:''}),{name:'Novo'});
 for(const value of [{status:'online'},{tenantId:'outra'},{id:'ext-x'},{sipSecret:'curta'},{sipSecret:'senha;diretiva-invalida'},{context:'from-trunk'},{callerId:'${SHELL(id)}'},{codecs:['pcma']},{codecs:['opus','opus']},{number:'04101'},{webrtc:'true'}])assert.throws(()=>extensionPatch(value));
 for(const value of [{voicemail:true},{dnd:true},{nat:false},{cliCallerId:'5511999999999'}])assert.throws(()=>extensionPatch(value));
 assert.deepEqual(extensionPatch({callerId:'"Equipe" <4101>',recording:'never',codecs:['alaw','ulaw']}),{callerId:'"Equipe" <4101>',recording:'never',codecs:['alaw','ulaw']});
});
