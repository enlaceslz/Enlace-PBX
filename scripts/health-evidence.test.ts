import test from 'node:test';
import assert from 'node:assert/strict';
import {healthEvidence,diagnosticEvidence} from '../server/infrastructure/security/HealthEvidence.js';
import {AsteriskAdapter} from '../server/infrastructure/asterisk/AsteriskAdapter.js';
test('sondas reais não certificam mídia, configuração ou serviços externos nem expõem erros',()=>{
 const health=healthEvidence({status:'UP',amiConnected:false,error:'senha-secreta'} as any,{status:'UP',latencyMs:0,error:'postgres://segredo'} as any);
 assert.equal(health.status,'DEGRADED');assert.equal(health.components.ami.status,'DOWN');assert.equal(health.components.postgresql.latencyMs,0);
 for(const key of ['ari','pjsip','webrtc','audioSocket','redis','aiGateway','geminiApi','whatsapp'])assert.equal(health.components[key].status,'NOT_TESTED');
 assert.doesNotMatch(JSON.stringify(health),/senha-secreta|postgres:\/\/|segredo/);
 const diag=diagnosticEvidence(health);assert.equal(diag.overallHealth,'DEGRADED');assert.equal(diag.diagnostics.find(d=>d.name==='ari')?.pingMs,null);
 assert.equal(healthEvidence({status:'UP',amiConnected:true},{status:'UP'}).status,'PARTIAL');
});
test('falhas e latências não verificadas não viram disponibilidade ou valores fixos',()=>{
 for(const latencyMs of [undefined,NaN,Infinity,-1])assert.equal('latencyMs' in healthEvidence({status:'DOWN'},{status:'UP',latencyMs}).components.postgresql,false);
 assert.equal('latencyMs' in healthEvidence({status:'DOWN'},{status:'DOWN',latencyMs:20}).components.postgresql,false);
});
test('CLI local disponível não presume AMI autenticado nem zero canais',async()=>{
 const adapter=new AsteriskAdapter();(adapter as any).checkBinaryExists=async()=>true;adapter.getVersion=async()=>'Asterisk 20';adapter.getUptime=async()=>'consulta real de teste';
 adapter.executeAmiAction=async()=>{throw new Error('Conexão recusada');};const health=await adapter.checkHealth();
 assert.equal(health.status,'UP');assert.equal(health.amiConnected,false);assert.equal(health.channelsCount,null);
 adapter.executeAmiAction=async()=> 'Response: Success';assert.equal((await adapter.checkHealth()).amiConnected,true);
});
test('CoreStatus remoto não equivale a inventário de canais ou mídia',async()=>{
 const adapter=new AsteriskAdapter();(adapter as any).checkBinaryExists=async()=>false;adapter.executeAmiAction=async()=> 'Response: Success\r\nCoreCurrentVersion: 20';
 const health=await adapter.checkHealth();assert.equal(health.status,'UP');assert.equal(health.amiConnected,true);assert.equal(health.channelsCount,null);
});
