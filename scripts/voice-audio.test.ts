import {MaiaVoiceGateway} from '../server/maia/gateway/MaiaVoiceGateway.js';
import {GeminiProvider} from '../server/maia/gateway/providers/GeminiProvider.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import {validatedWavAudio} from '../server/infrastructure/ai/VoiceAudio.js';
function wav(){const b=Buffer.alloc(46);b.write('RIFF');b.writeUInt32LE(38,4);b.write('WAVEfmt ',8);b.writeUInt32LE(16,16);b.writeUInt16LE(1,20);b.writeUInt16LE(1,22);b.writeUInt32LE(24000,24);b.writeUInt32LE(48000,28);b.writeUInt16LE(2,32);b.writeUInt16LE(16,34);b.write('data',36);b.writeUInt32LE(2,40);return b;}
test('síntese aceita WAV PCM16 íntegro e preserva os bytes',async()=>{
 const data=wav().toString('base64');assert.equal(validatedWavAudio({data,mimeType:'audio/wav'}),data);
 const provider=new GeminiProvider();let mimeType='audio/wav';let requestedModel='';(provider as any).client={models:{generateContent:async(request:any)=>{requestedModel=request.model;return {candidates:[{content:{parts:[{inlineData:{data,mimeType}}]}}]};}}};
 const previous=process.env.GEMINI_TTS_MODEL;process.env.GEMINI_TTS_MODEL='modelo-tts-ci';
 try{
 assert.deepEqual(await provider.generateVoice({text:'Teste',voiceName:'Zephyr',gender:'female'}),{audioBase64:data,format:'wav'});
 assert.equal(requestedModel,'modelo-tts-ci');
 mimeType='audio/L16;rate=24000';await assert.rejects(provider.generateVoice({text:'Teste',voiceName:'Zephyr',gender:'female'}),/^Error: Falha na síntese de voz do Gemini\.$/);
 }finally{if(previous===undefined)delete process.env.GEMINI_TTS_MODEL;else process.env.GEMINI_TTS_MODEL=previous;}
});
test('síntese recusa PCM cru, base64 inválido, truncamento, tamanho e formato divergente',()=>{
 const original=wav();
 const invalid=[{data:original.toString('base64'),mimeType:'audio/L16;rate=24000'},{data:'!!!!',mimeType:'audio/wav'},{data:original.subarray(0,44).toString('base64'),mimeType:'audio/wav'},{data:Buffer.alloc(2*1024*1024+1).toString('base64'),mimeType:'audio/wav'}];
 for(const offset of [4,16,20,22,24,28,32,34,40]){const copy=Buffer.from(original);copy.writeUInt16LE(0,offset);invalid.push({data:copy.toString('base64'),mimeType:'audio/wav'});}
 for(const offset of [0,8,12,36]){const copy=Buffer.from(original);copy[offset]|=0x80;invalid.push({data:copy.toString('base64'),mimeType:'audio/wav'});}
 for(const value of invalid)assert.throws(()=>validatedWavAudio(value),/^Error: Áudio WAV inválido ou não suportado\.$/);
});

test('voz exige modelo TTS explícito válido antes de chamar SDK',async()=>{
 const provider=new GeminiProvider();let calls=0;(provider as any).client={models:{generateContent:async()=>{calls++;return {};}}};
 const previous=process.env.GEMINI_TTS_MODEL;
 try{for(const model of [undefined,'','modelo\nprivado','x'.repeat(129)]){
  if(model===undefined)delete process.env.GEMINI_TTS_MODEL;else process.env.GEMINI_TTS_MODEL=model;
  await assert.rejects(provider.generateVoice({text:'Teste',voiceName:'Zephyr',gender:'female'}),/^Error: AI_PROVIDER_UNAVAILABLE: Configure um modelo TTS explícito e homologado\.$/);
 }assert.equal(calls,0);}finally{if(previous===undefined)delete process.env.GEMINI_TTS_MODEL;else process.env.GEMINI_TTS_MODEL=previous;}
});

test('gateway valida áudio de qualquer provedor e não usa outro por padrão',async()=>{
 let alternateCalls=0;const other={id:'outro',generateVoice:async()=>{alternateCalls++;return {format:'wav',audioBase64:wav().toString('base64')};}};
 let response:any={format:'wav',audioBase64:'AAAA'};const selected={id:'gemini',generateVoice:async()=>response};
 const gateway=new MaiaVoiceGateway({getProvider:()=>selected,getAllProviders:()=>[selected,other]} as any);
 const request={text:'Texto privado',voiceName:'Zephyr',gender:'female' as const};
 assert.equal(await gateway.synthesize(request),null);assert.equal(alternateCalls,0);
 response={format:'mp3',audioBase64:wav().toString('base64')};assert.equal(await gateway.synthesize(request),null);assert.equal(alternateCalls,0);
 response={format:'wav',audioBase64:wav().toString('base64'),durationMs:999999};assert.deepEqual(await gateway.synthesize(request),{format:'wav',audioBase64:response.audioBase64});
});
test('gateway só tenta outro provedor quando contingência é habilitada explicitamente',async()=>{
 let calls=0;const selected={id:'gemini',generateVoice:async()=>{throw new Error('falha controlada');}};const other={id:'outro',generateVoice:async()=>{calls++;return {format:'wav',audioBase64:wav().toString('base64')};}};
 const gateway=new MaiaVoiceGateway({getProvider:()=>selected,getAllProviders:()=>[selected,other]} as any);const request={text:'Texto',voiceName:'Zephyr',gender:'female' as const};
 assert.equal(await gateway.synthesize(request,{enableFallback:false}),null);assert.equal(calls,0);
 assert.equal((await gateway.synthesize(request,{enableFallback:true}))?.format,'wav');assert.equal(calls,1);
});

test('entrada de voz inválida não acessa gateway nem SDK e não expõe conteúdo',async()=>{
 let calls=0;const provider=new GeminiProvider();(provider as any).client={models:{generateContent:async()=>{calls++;return {};}}};
 const gateway=new MaiaVoiceGateway({getProvider:()=>{calls++;return provider;},getAllProviders:()=>{calls++;return [];}} as any);
 const base={text:'Texto privado',voiceName:'Zephyr',gender:'female'};
 const invalid=[null,[],{...base,text:''},{...base,text:' '},{...base,text:'á'.repeat(8193)},{...base,text:'segredo\0'},{...base,text:'\ud800'},{...base,voiceName:'voz\nsegredo'},{...base,voiceName:'a'.repeat(65)},{...base,gender:'outro'}];
 for(const request of invalid){for(const run of [()=>gateway.synthesize(request as any),()=>provider.generateVoice(request as any)])await assert.rejects(run,/^Error: Entrada de síntese de voz inválida\.$/);}
 assert.equal(calls,0);
});
test('opções inválidas de voz não escolhem provedor nem habilitam contingência por coerção',async()=>{
 let calls=0;const gateway=new MaiaVoiceGateway({getProvider:()=>{calls++;},getAllProviders:()=>{calls++;return [];}} as any);
 const request={text:'Texto',voiceName:'Zephyr',gender:'female' as const};
 for(const options of [{enableFallback:'true'},{enableFallback:1},{preferredProviderId:''},{preferredProviderId:'gemini\nsegredo'}])await assert.rejects(gateway.synthesize(request,options as any),/^Error: Opções de síntese de voz inválidas\.$/);
 assert.equal(calls,0);
});
