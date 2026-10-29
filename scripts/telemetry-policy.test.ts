import test from 'node:test';
import assert from 'node:assert/strict';
import {visibleChannels,channelDto,assertOwnCaller,metricsDto} from '../server/infrastructure/auth/TelemetryPolicy.js';
test('Operação recebe apenas o endpoint atribuído e a empresa autorizada, sem confiar no Caller ID',()=>{
 const channels=[{id:'a',name:'PJSIP/4101-00000001',tenantId:'a',callerNumber:'9999'},{id:'b',name:'PJSIP/4102-00000002',tenantId:'a',callerNumber:'4101'},{id:'c',name:'PJSIP/4101-00000003',tenantId:'b'}];
 assert.deepEqual(visibleChannels(channels,{role:'operator',tenantId:'a',extension:'4101'}).map(c=>c.id),['a']);
 assert.equal(visibleChannels(channels,{role:'agent',tenantId:'a'}).length,0);
 assert.equal(visibleChannels(channels,{role:'readonly',tenantId:'a'}).length,0);
 assert.equal(visibleChannels(channels,{role:'supervisor',tenantId:'a'}).length,2);
 assert.throws(()=>assertOwnCaller({role:'operator',tenantId:'a',extension:'4101'},'4102'));
 assert.doesNotThrow(()=>assertOwnCaller({role:'agent',tenantId:'a',extension:'4101'},'4101'));
});
test('DTO de canais elimina argumentos de aplicação e propriedades internas',()=>{
 const dto=channelDto({id:'a',name:'PJSIP/4101-00000001',application:'Dial(PJSIP/segredo)',applicationData:'segredo',context:'interno',credential:'segredo'});
 assert.equal(dto.application,'Dial');assert.equal(JSON.stringify(dto).includes('segredo'),false);assert.equal('context' in dto,false);
});
test('Métricas financeiras restritas e lista explícita de campos operacionais',()=>{
 const raw={callsToday:3,costEstimateTodayBrl:5,aiTokensUsedToday:20,secret:'oculto'};
 for(const role of ['readonly','supervisor']){const dto=metricsDto(raw,role);assert.equal(dto.callsToday,3);assert.equal('costEstimateTodayBrl' in dto,false);assert.equal('aiTokensUsedToday' in dto,false);assert.equal('secret' in dto,false);}
 assert.equal(metricsDto(raw,'admin').costEstimateTodayBrl,5);assert.throws(()=>metricsDto(raw,'operator'));
});
