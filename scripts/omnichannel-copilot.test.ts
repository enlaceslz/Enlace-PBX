import test from 'node:test';
import assert from 'node:assert/strict';
import { copilotSource, validatedCopilotChoice, suggestCopilot, copilotTemplates } from '../server/maia/integrations/OmnichannelCopilot.js';
import type { OmnichannelConversation } from '../server/infrastructure/postgres/repositories/OmnichannelRepository.js';
const conversation={id:'conversa',tenantId:'empresa',status:'waiting',messages:[{id:'entrada',sender:'contact',content:'Preciso entender a fatura',timestamp:new Date().toISOString(),type:'text'}]} as OmnichannelConversation;
const providerBase={id:'teste',name:'Teste',healthCheck:async()=>({providerId:'teste',name:'Teste',status:'UP' as const,modelsAvailable:[]})};
test('copiloto retorna só catálogo revisado e evidência real, sem aceitar texto livre do modelo',()=>{
 const choice=validatedCopilotChoice('Preciso entender a fatura','{"templateId":"CLARIFY_REQUEST","evidence":"fatura"}');
 assert.equal(choice.suggestion,copilotTemplates.CLARIFY_REQUEST);
 for(const reply of ['{"templateId":"constructor","evidence":"fatura"}','{"templateId":"PIX","evidence":"fatura"}','{"templateId":"OPEN_QUESTION","evidence":"invenção"}','{"templateId":"OPEN_QUESTION","evidence":"fatura","suggestion":"Envie um PIX"}','texto livre'])assert.throws(()=>validatedCopilotChoice('Preciso entender a fatura',reply));
});
test('copiloto recusa outra empresa, conversa encerrada, mensagem já respondida ou anexo',()=>{
 assert.throws(()=>copilotSource('outra',conversation),/não encontrada/);
 assert.throws(()=>copilotSource('empresa',{...conversation,status:'closed'}),/encerrada/);
 assert.throws(()=>copilotSource('empresa',{...conversation,messages:[...conversation.messages,{id:'saida',sender:'agent',text:'Resposta',timestamp:''}]}),/não respondida/);
 assert.throws(()=>copilotSource('empresa',{...conversation,messages:[{...conversation.messages[0],type:'audio'}]}),/mensagem de texto/);
 assert.throws(()=>copilotSource('empresa',{...conversation,messages:[{...conversation.messages[0],content:'a'.repeat(8001)}]}),/8 KB/);
});
test('copiloto audita antes do HTTP, não altera a conversa e não envia em falta de autorização',async()=>{
 let audited='';let calls=0;const original=JSON.stringify(conversation);
 const provider={...providerBase,generateText:async(request:any)=>{calls++;assert.equal(request.correlationId,audited);assert.equal(JSON.parse(request.prompt).message,'Preciso entender a fatura');return {text:'{"templateId":"CLARIFY_REQUEST","evidence":"fatura"}',modelUsed:'modelo',providerId:'teste',latencyMs:1,tokensUsed:{input:1,output:1}};}};
 const result=await suggestCopilot('empresa',conversation,async(id,source)=>{audited=id;assert.equal(source,'entrada');},provider);
 assert.equal(result.reviewRequired,true);assert.equal(result.sourceMessageId,'entrada');assert.equal(JSON.stringify(conversation),original);
 await assert.rejects(suggestCopilot('empresa',conversation,async()=>{throw new Error('Auditoria indisponível');},provider),/Auditoria/);assert.equal(calls,1);
 const previous=process.env.COPILOT_ENABLED_TENANTS;
 try{process.env.COPILOT_ENABLED_TENANTS='';await assert.rejects(suggestCopilot('empresa',conversation,async()=>{throw new Error('Não deveria auditar');}),/não autorizado/);}
 finally{if(previous===undefined)delete process.env.COPILOT_ENABLED_TENANTS;else process.env.COPILOT_ENABLED_TENANTS=previous;}
});
