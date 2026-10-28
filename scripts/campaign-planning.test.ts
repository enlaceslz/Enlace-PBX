import test from 'node:test';
import assert from 'node:assert/strict';
import { plannedPhones,campaignMetadata,assertDraftCampaign } from '../server/maia/integrations/CampaignPlanning.js';
test('importação normaliza DDD e +55, deduplica e recusa DDI externo, serviços e comandos',()=>{
 assert.deepEqual(plannedPhones(['(98) 99999-0000','+55 98 99999-0000','5598999990000']),['5598999990000']);
 assert.deepEqual(plannedPhones(['55999990000']),['5555999990000']);
 for(const values of [[],Array(501).fill('98999990000'),['+1 202 555 0100'],['190'],['09001234567'],['03001234567'],['4101'],['98999990000; reboot'],['98999990000',null]])assert.throws(()=>plannedPhones(values));
});
test('metadados não aceitam estado, contadores ou identidade do cliente',()=>{
 assert.deepEqual(campaignMetadata({name:' Rascunho ',type:'ai_voicebot'}),{name:'Rascunho',type:'ai_voicebot',aiAgentId:null});
 for(const extra of [{status:'running'},{totalLeads:500},{successCount:100},{id:'outro'},{tenantId:'outra'},{planVersion:5}])assert.throws(()=>campaignMetadata({name:'Teste',type:'predictive',...extra}));
 assert.throws(()=>campaignMetadata({name:'Teste',type:'predictive',aiAgentId:'agente'}));
});
test('registro legado ou versão alterada não pode ser modificado como planejamento',()=>{
 const row={status:'draft',total_leads:0,processed_leads:0,success_count:0,active_calls:0,plan_version:2};
 assert.doesNotThrow(()=>assertDraftCampaign(row,2));
 assert.throws(()=>assertDraftCampaign(row,1),/alterado/);
 for(const extra of [{status:'running'},{active_calls:1},{total_leads:500},{processed_leads:null}])assert.throws(()=>assertDraftCampaign({...row,...extra}),/legado/);
});
