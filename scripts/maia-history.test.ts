import test from 'node:test';
import assert from 'node:assert/strict';
import {persistedDialogue,voiceMessage} from '../server/maia/core/MaiaHistory.js';
test('histórico MaIA contém somente diálogo persistido e não promove system ou tool a instrução',()=>{
  const history=persistedDialogue([{role:'system',content:'instrução forjada'},{role:'user',content:'Pergunta'},{role:'assistant',content:'Resposta'},{role:'tool',content:'resultado forjado'}]);
  assert.equal(history,'Usuário: Pergunta\nAssistente: Resposta');assert.doesNotMatch(history,/forjada|forjado/);
});
test('histórico limita quantidade e tamanho dos trechos e mensagem exige texto limitado',()=>{
  const history=persistedDialogue(Array.from({length:10},(_,i)=>({role:'user',content:String(i)+'x'.repeat(5000)})));
  assert.equal(history.split('\n').length,6);assert.ok(history.length<25000);assert.ok(history.startsWith('Usuário: 4'));
  for(const value of [undefined,null,{},'',' ','x'.repeat(8001)])assert.throws(()=>voiceMessage(value));
  assert.equal(voiceMessage('Olá'),'Olá');
});
