import test from 'node:test';
import assert from 'node:assert/strict';
import {agentPatch,configurationIds,knowledgePatch,knowledgeUpload,reviewedKnowledge} from '../server/infrastructure/ai/AiConfiguration.js';
const agent={name:'Atendimento',model:'modelo-revisado',voice:'Zephyr',systemInstruction:'Atenda conforme os textos revisados.'};
test('agente aceita zero/false e não inventa ramal, ferramenta ou vínculo na criação',()=>{
 const value=agentPatch({...agent,temperature:0,isActive:false,allowBargeIn:false},true);assert.equal(value.temperature,0);assert.equal(value.isActive,false);assert.equal(value.allowBargeIn,false);
 assert.equal(value.transferExtension,'');assert.equal(value.fallbackAction,'hangup');assert.deepEqual(value.tools,[]);assert.deepEqual(value.knowledgeSources,[]);assert.equal(value.providerId,'9router');
});
test('agente recusa campos protegidos, tipos, limites e destinos com sintaxe de comando',()=>{
 for(const patch of [{id:'forjado'},{tenantId:'outra'},{name:''},{temperature:NaN},{temperature:2.01},{temperature:0.333},{isActive:'true'},{silenceTimeoutSeconds:0},{maxSessionMinutes:241},{model:'modelo\ncomando'},{transferExtension:'4101,1)'},{tools:['id','id']},{systemInstruction:'texto\0inválido'}])assert.throws(()=>agentPatch(patch));
 assert.throws(()=>agentPatch({}));assert.throws(()=>agentPatch({name:'Sem modelo'},true));
 assert.deepEqual(agentPatch({name:'Novo nome'}),{name:'Novo nome'});
});
test('documento preserva texto e exige limites UTF-8 sem metadados ou classificação forjados',()=>{
 const content='  Texto revisado com acentos e emoji 🙂\nsegunda linha  ';const value=knowledgePatch({title:' Manual ',content},true);
 assert.equal(value.content,content);assert.equal(value.title,'Manual');assert.deepEqual(value.targetAgentIds,[]);
 for(const patch of [{id:'forjado'},{updatedAt:'forjado'},{fileSizeBytes:1},{classification:'REVIEWED_TEXT'},{reviewState:'REVIEWED_TEXT'},{contentStatus:'REVIEWED_TEXT'},{content:' '},{content:'á'.repeat(32769)},{content:'\ud800'},{fileName:'../manual.txt'}])assert.throws(()=>knowledgePatch(patch));
});
test('upload não extrai PDF nem aceita base64 e recebe somente texto explícito',()=>{
 for(const value of [{base64Data:'JVBERi0=',fileType:'application/pdf'},{base64Data:'',rawText:'texto'}])assert.throws(()=>knowledgeUpload(value),(error:any)=>error.statusCode===501);
 assert.throws(()=>knowledgePatch({title:'PDF',content:'conteúdo',fileType:'application/pdf'},true),(error:any)=>error.statusCode===501);
 const value=knowledgeUpload({title:'Texto revisado',rawText:'Procedimento literal',targetAgentIds:[]});assert.equal(value.content,'Procedimento literal');assert.deepEqual(value.targetAgentIds,[]);
 assert.throws(()=>knowledgeUpload({rawText:''}));
});
test('vínculos exigem até 32 IDs únicos sem conversão de objetos ou números',()=>{
 assert.deepEqual(configurationIds([]),[]);assert.deepEqual(configurationIds(['agent-1','kb-1']),['agent-1','kb-1']);
 for(const value of [[1],[{}],['a','a'],['../a'],Array.from({length:33},(_,index)=>'id-'+index)])assert.throws(()=>configurationIds(value));
});
test('grounding admite somente documentos marcados como texto revisado pelo servidor',()=>{
 const rows=[{id:'legacy'},{id:'pdf',contentStatus:'LEGACY_NOT_REVIEWED'},{id:'reviewed',contentStatus:'REVIEWED_TEXT'}];
 assert.deepEqual(reviewedKnowledge(rows).map(row=>row.id),['reviewed']);assert.equal(rows.length,3);
});
