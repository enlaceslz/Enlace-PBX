import test from 'node:test';
import assert from 'node:assert/strict';
import { createQualityAnalysis, validateQualityInput } from '../server/maia/integrations/QualityReview.js';
const input={channel:'voice',reference:'referencia-informada',transcript:'Olá. A conexão falhou. Vou verificar.'};
const base={id:'teste',name:'Teste',healthCheck:async()=>({providerId:'teste',name:'Teste',status:'UP' as const,modelsAvailable:[]})};
test('revisão usa evidências literais sem notas, conclusões de resolução ou transcrição persistível',async()=>{
 let audited='';
 const result=await createQualityAnalysis('empresa',input,async id=>{audited=id;},{...base,generateText:async request=>{
  assert.equal(request.correlationId,audited);assert.equal(JSON.parse(request.prompt).text,input.transcript);
  return {text:JSON.stringify({fields:{greeting:'Olá',complaint:'A conexão falhou',solutionStatement:'Problema resolvido'}}),modelUsed:'modelo-test',providerId:'teste',latencyMs:2,tokensUsed:{input:20,output:10}};
 }});
 assert.equal(result.id,audited);assert.equal(result.evidence.greeting,'Olá');assert.equal(result.evidence.solutionStatement,null);
 assert.deepEqual(result.rejectedFields,['solutionStatement']);assert.equal(result.sourceReference,input.reference);
 for(const field of ['score','complianceScore','resolutionStatus','sentiment','transcript'])assert.equal(Object.hasOwn(result,field),false);
});
test('revisão recusa metadados inválidos, JSON com conclusões extras e falha de auditoria',async()=>{
 assert.throws(()=>validateQualityInput({...input,channel:'email'}),/canal/);
 assert.throws(()=>validateQualityInput({...input,transcript:123}),/transcrição/);
 assert.throws(()=>validateQualityInput({...input,reference:'a'.repeat(129)}),/referência/);
 let calls=0;
 const provider={...base,generateText:async()=>{calls++;return {text:'{"fields":{},"score":100}',modelUsed:'modelo',providerId:'teste',latencyMs:1,tokensUsed:{input:1,output:1}};}};
 await assert.rejects(createQualityAnalysis('empresa',input,async()=>{throw new Error('Auditoria indisponível');},provider),/Auditoria/);assert.equal(calls,0);
 await assert.rejects(createQualityAnalysis('empresa',input,async()=>{},provider),/incompatível/);
 await assert.rejects(createQualityAnalysis('empresa',input,async()=>{},{...base,generateText:async()=>{throw new Error('TOKEN-QUE-NAO-PODE-SAIR');}}),error=>!String(error).includes('TOKEN-QUE')&&/provedor/.test(String(error)));
});
test('empresa não autorizada e provedor incompleto não recebem a transcrição',async()=>{
 const keys=['QUALITY_REVIEW_ENABLED_TENANTS','QUALITY_REVIEW_MODEL'];const saved=Object.fromEntries(keys.map(key=>[key,process.env[key]]));let audit=0;
 try{
  process.env.QUALITY_REVIEW_ENABLED_TENANTS='';await assert.rejects(createQualityAnalysis('empresa',input,async()=>{audit++;}),/não autorizada/);
  process.env.QUALITY_REVIEW_ENABLED_TENANTS='empresa';delete process.env.QUALITY_REVIEW_MODEL;
  await assert.rejects(createQualityAnalysis('empresa',input,async()=>{audit++;}),/não configurados/);assert.equal(audit,0);
 }finally{for(const key of keys){if(saved[key]===undefined)delete process.env[key];else process.env[key]=saved[key];}}
});
