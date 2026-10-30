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
