import test from 'node:test';
import assert from 'node:assert/strict';
import {cdrEvidence} from '../server/maia/integrations/CdrEvidence.js';
test('análise CDR só devolve trechos literais e exige revisão sem inventar satisfação',async()=>{
  let audited=false;const result=await cdrEvidence('empresa','Preciso de suporte. Vou verificar.',async()=>{audited=true;}, {generateText:async()=>{assert.equal(audited,true);return {text:JSON.stringify({fields:{request:'Preciso de suporte.',proposal:'Problema resolvido',nextStep:null}}),providerId:'teste',modelUsed:'modelo'};}} as any);
  assert.equal(result.evidence.request,'Preciso de suporte.');assert.equal(result.evidence.proposal,null);assert.deepEqual(result.rejectedFields,['proposal']);assert.equal(result.reviewRequired,true);assert.equal('sentiment' in result,false);assert.equal('summary' in result,false);
});
test('análise CDR não envia transcrição sem autorização, auditoria ou entrada válida',async()=>{
  await assert.rejects(cdrEvidence('empresa-nao-autorizada','Texto',async()=>{throw new Error('Não deveria auditar');}));
  let calls=0;const provider={generateText:async()=>{calls++;throw new Error('segredo do provedor');}} as any;
  await assert.rejects(cdrEvidence('empresa','',async()=>{},provider));
  await assert.rejects(cdrEvidence('empresa','Texto',async()=>{throw new Error('auditoria indisponível');},provider));assert.equal(calls,0);
  await assert.rejects(cdrEvidence('empresa','Texto',async()=>{},provider),error=>!String(error).includes('segredo'));assert.equal(calls,1);
});
