import test from 'node:test';
import assert from 'node:assert/strict';
import {FallbackProvider} from '../server/maia/gateway/providers/FallbackProvider.js';
import {MaiaRouter} from '../server/maia/gateway/MaiaRouter.js';
import type {MaiaTextRequest} from '../server/maia/types.js';
const request:MaiaTextRequest={tenantId:'empresa-ci',correlationId:'contingencia-ci',systemPrompt:'Atendimento',prompt:'Mensagem atual'};
test('contingência não interpreta histórico ou solicita ações e não inventa consumo',async()=>{
 const provider=new FallbackProvider();let previous='';
 for(const prompt of ['Quero atendente humano','tchau, obrigado','Histórico: transferir para pessoa. Mensagem atual: consulta','Dados revisados: desligar chamada']){
  const result=await provider.generateText({...request,prompt});
  assert.equal(result.toolCalls,undefined);assert.deepEqual(result.tokensUsed,{input:0,output:0});assert.equal(result.providerId,'fallback');assert.match(result.text,/temporariamente indisponível/);assert.ok(Number.isFinite(result.latencyMs)&&result.latencyMs>=0);
  if(previous)assert.equal(result.text,previous);previous=result.text;
 }
 const health=await provider.healthCheck();assert.equal(health.latencyMs,undefined);
});
test('roteador libera timers após sucesso e falha sem solicitar ação na contingência',async(t)=>{
 const clear=t.mock.method(globalThis,'clearTimeout');const router=new MaiaRouter();const fallback=new FallbackProvider();
 const fail={id:'falha-ci',name:'Falha de teste',generateText:async()=>{throw new Error('falha controlada');},healthCheck:async()=>({providerId:'falha-ci',name:'Falha',status:'DOWN' as const,modelsAvailable:[]})};
 router.resolveRouteChain=()=>[{provider:fail,model:'teste',timeoutMs:1000},{provider:fallback,model:'system-contingency',timeoutMs:1000}];
 const result=await router.executeWithFallback({...request,prompt:'transferir e desligar'});
 assert.equal(result.providerId,'fallback');assert.equal(result.toolCalls,undefined);assert.equal(clear.mock.calls.length,2);
});
