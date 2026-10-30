import test from 'node:test';
import assert from 'node:assert/strict';
import {extensionPatch,managedExtension} from '../server/infrastructure/asterisk/ExtensionMutation.js';
test('ramal limita campos e credenciais sem remover espaços da senha SIP',()=>{
 const secret=' senha#[]com-espacos ';
 assert.equal(extensionPatch({name:'Nome',number:'4101',sipSecret:secret},true).sipSecret,secret);
 assert.deepEqual(extensionPatch({name:'Novo',sipSecret:''}),{name:'Novo'});
 for(const value of [{status:'online'},{tenantId:'outra'},{id:'ext-x'},{sipSecret:'curta'},{sipSecret:'senha;diretiva-invalida'},{context:'from-trunk'},{callerId:'${SHELL(id)}'},{codecs:['pcma']},{codecs:['opus','opus']},{number:'04101'},{webrtc:'true'}])assert.throws(()=>extensionPatch(value));
 for(const value of [{voicemail:true},{dnd:true},{nat:false},{cliCallerId:'5511999999999'}])assert.throws(()=>extensionPatch(value));
 assert.deepEqual(extensionPatch({callerId:'"Equipe" <4101>',recording:'never',codecs:['alaw','ulaw']}),{callerId:'"Equipe" <4101>',recording:'never',codecs:['alaw','ulaw']});
});

const legacy={id:'ext-a',tenantId:'empresa-a',number:'4101',name:'Equipe',sipSecret:' senha#[]forte-preservada ',context:'from-internal',callerId:'4101',cliCallerId:undefined,codecs:['opus','alaw'],nat:true,webrtc:true,recording:'never',voicemail:false,dnd:false,allowAiTransfer:false};
test('geração recusa campos legados inválidos e recursos sem execução, inclusive sem quebra de linha',()=>{
 assert.equal(managedExtension(legacy,true).sipSecret,legacy.sipSecret);
 for(const patch of [{context:'from-trunk'},{context:'${SHELL(id)}'},{callerId:'${SHELL(id)}'},{codecs:['opus)']},{recording:'on_demand'},{voicemail:true},{dnd:true},{nat:false},{cliCallerId:'5511999999999'},{number:'4101,1'},{allowAiTransfer:undefined}])assert.throws(()=>managedExtension({...legacy,...patch}));
 for(const sipSecret of ['', 'curta', 'senha;injecao-insegura'])assert.throws(()=>managedExtension({...legacy,sipSecret},true));
 assert.equal(managedExtension({...legacy,sipSecret:''}).number,'4101');
});
