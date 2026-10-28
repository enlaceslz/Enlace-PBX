import test from 'node:test';
import assert from 'node:assert/strict';
import { nextWorkflow,validateWorkflowInput,validateInternalNote } from '../server/maia/integrations/ConversationWorkflow.js';
const operator={id:'operador',name:'Operador',role:'operator'};
test('estado do atendimento exige versão atual e atribui responsável apenas ao atendimento humano',()=>{
 const waiting={status:'waiting',assigned_user_id:null,workflow_version:3};
 assert.deepEqual(nextWorkflow(waiting,'active',3,operator),{status:'active',owner:'operador'});
 assert.throws(()=>nextWorkflow(waiting,'active',2,operator),/mudou/);
 assert.throws(()=>validateWorkflowInput('active','3'),/versão/);
 assert.throws(()=>validateWorkflowInput('bot_handling',3),/não está disponível/);
 assert.deepEqual(nextWorkflow({...waiting,status:'active',assigned_user_id:'operador'},'queued',3,operator),{status:'queued',owner:null});
});
test('operador não toma nem encerra atendimento alheio; supervisor pode administrar explicitamente',()=>{
 const active={status:'active',assigned_user_id:'outro',workflow_version:1};
 assert.throws(()=>nextWorkflow(active,'closed',1,operator),/outro operador/);
 assert.deepEqual(nextWorkflow(active,'closed',1,{...operator,role:'supervisor'}),{status:'closed',owner:null});
 assert.throws(()=>nextWorkflow({...active,status:'closed',assigned_user_id:null},'queued',1,operator),/Reabra/);
 assert.deepEqual(nextWorkflow({...active,status:'closed',assigned_user_id:null},'active',1,operator),{status:'active',owner:'operador'});
});
test('anotação interna exige texto limitado e chave de tentativa estável',()=>{
 assert.deepEqual(validateInternalNote(' Nota interna ','chave-de-tentativa-2026'),{text:'Nota interna',requestId:'chave-de-tentativa-2026'});
 for(const [text,id] of [[{},'chave-de-tentativa-2026'],['texto','x'],['a'.repeat(4001),'chave-de-tentativa-2026']])assert.throws(()=>validateInternalNote(text,id));
});
