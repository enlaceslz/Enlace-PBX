import test from 'node:test';
import assert from 'node:assert/strict';
import {ariConfiguration,rtpConfiguration} from '../server/infrastructure/asterisk/AuxiliaryConfig.js';
import {AsteriskService} from '../server/asteriskService.js';
const environment={NODE_ENV:'production',ASTERISK_ARI_USERNAME:'enlace_ari',ASTERISK_ARI_PASSWORD:'credencial-ari-forte#[]',ASTERISK_ARI_ALLOWED_ORIGINS:'https://pbx.example.invalid'};
test('ARI exige ambiente explícito e mascara segredo após validação',()=>{
 const masked=ariConfiguration(environment,true);assert.match(masked,/\[enlace_ari\]/);assert.match(masked,/allowed_origins=https:\/\/pbx.example.invalid/);assert.equal(masked.includes(environment.ASTERISK_ARI_PASSWORD),false);assert.match(ariConfiguration(environment),/password=credencial-ari-forte#\[\]/);
 for(const patch of [{ASTERISK_ARI_USERNAME:'general'},{ASTERISK_ARI_USERNAME:'user]\n[other'},{ASTERISK_ARI_PASSWORD:''},{ASTERISK_ARI_PASSWORD:' segredo-com-espaco '},{ASTERISK_ARI_PASSWORD:'senha;diretiva=x'},{ASTERISK_ARI_ALLOWED_ORIGINS:'*'},{ASTERISK_ARI_ALLOWED_ORIGINS:'https://*.example.invalid'},{ASTERISK_ARI_ALLOWED_ORIGINS:'https://user:pass@host'},{ASTERISK_ARI_ALLOWED_ORIGINS:'https://pbx.example.invalid/caminho'},{ASTERISK_ARI_ALLOWED_ORIGINS:'http://pbx.example.invalid'}])assert.throws(()=>ariConfiguration({...environment,...patch},true));
 assert.throws(()=>ariConfiguration({NODE_ENV:'development'},true));
});
test('origem HTTP de ARI é aceita somente em loopback fora de produção',()=>{
 assert.match(ariConfiguration({...environment,NODE_ENV:'development',ASTERISK_ARI_ALLOWED_ORIGINS:'http://127.0.0.1:3000'},true),/127.0.0.1:3000/);
 assert.throws(()=>ariConfiguration({...environment,NODE_ENV:'development',ASTERISK_ARI_ALLOWED_ORIGINS:'http://192.168.1.10'},true));
});
test('RTP usa faixa salva e STUN explícito sem introduzir servidor público padrão',()=>{
 const output=rtpConfiguration({ports:{rtpRange:'12000-13000'},stunServer:'stun:stun.example.invalid:3478'});assert.match(output,/rtpstart=12000/);assert.match(output,/rtpend=13000/);assert.match(output,/stunaddr=stun.example.invalid:3478/);
 assert.doesNotMatch(rtpConfiguration({ports:{rtpRange:'14000-15000'},stunServer:''}),/stunaddr=|google/);
 for(const config of [null,{ports:{rtpRange:'100-200'}},{ports:{rtpRange:'20000-10000'}},{ports:{rtpRange:'12000-13000'},stunServer:'host\nstunaddr=outra'}])assert.throws(()=>rtpConfiguration(config));
});
test('AudioSocket e instalador legados não geram arquivos ou scripts fictícios',()=>{
 const service=new AsteriskService();assert.throws(()=>service.generateAudioSocketConf(),(error:any)=>error.statusCode===501);assert.throws(()=>service.generateInstallScript(),(error:any)=>error.statusCode===501);
});
