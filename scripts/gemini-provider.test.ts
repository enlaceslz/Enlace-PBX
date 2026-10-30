import test from 'node:test';
import assert from 'node:assert/strict';
import {GeminiProvider} from '../server/maia/gateway/providers/GeminiProvider.js';
const request={tenantId:'empresa-ci',correlationId:'gemini-ci',systemPrompt:'Instruções extensas sem estimativa',prompt:'Pergunta'};
function provider(response:any){const instance=new GeminiProvider();(instance as any).client={models:{generateContent:async()=>response}};return instance;}
test('Gemini usa contagem do SDK e versão retornada, preservando zero',async()=>{
 const result=await provider({text:'Resposta extensa que não define o consumo',usageMetadata:{promptTokenCount:0,candidatesTokenCount:7},modelVersion:'versao-retornada'}).generateText(request);
 assert.deepEqual(result.tokensUsed,{input:0,output:7});assert.equal(result.modelUsed,'versao-retornada');
});
test('Gemini recusa consumo ausente ou inválido sem estimativa por caracteres',async()=>{
 for(const usageMetadata of [undefined,{}, {promptTokenCount:1}, {promptTokenCount:-1,candidatesTokenCount:2},{promptTokenCount:1,candidatesTokenCount:1.5},{promptTokenCount:'1',candidatesTokenCount:2}])await assert.rejects(provider({text:'Resposta',usageMetadata}).generateText(request),/^Error: Falha na geração de texto do Gemini\.$/);
});
test('erros Gemini de texto, voz e diagnóstico não retornam detalhes do SDK nem catálogo inventado',async()=>{
 const instance=provider(null);(instance as any).client.models.generateContent=async()=>{throw new Error('CREDENCIAL_PRIVADA_CI https://interno.invalid prompt privado');};
 await assert.rejects(instance.generateText(request),/^Error: Falha na geração de texto do Gemini\.$/);
 await assert.rejects(instance.generateVoice({text:'Teste',voiceName:'Zephyr'} as any),/^Error: Falha na síntese de voz do Gemini\.$/);
 const previous=process.env.GEMINI_API_KEY;process.env.GEMINI_API_KEY='credencial-descartavel';
 try{const health=await instance.healthCheck();assert.equal(health.status,'DOWN');assert.equal(health.error,'Falha na comunicação com o Gemini.');assert.deepEqual(health.modelsAvailable,[]);}finally{if(previous===undefined)delete process.env.GEMINI_API_KEY;else process.env.GEMINI_API_KEY=previous;}
});
