import { OutboundHttpError } from '../../infrastructure/security/OutboundHttp.js';
import { isAllowedOutboundNumber } from '../../infrastructure/asterisk/OutboundPolicy.js';
export function campaignMetadata(raw:any,previous?:any){
 if(!raw||typeof raw!=='object'||Array.isArray(raw)||Object.keys(raw).some(key=>!(previous?['name','type','aiAgentId','planVersion']:['name','type','aiAgentId']).includes(key)))throw new OutboundHttpError('Informe somente nome, tipo, agente opcional e versão do planejamento.',422);
 const name=raw.name??previous?.name;const type=raw.type??previous?.type;
 const aiAgentId=raw.aiAgentId===undefined?(previous?.ai_agent_id??null):raw.aiAgentId;
 if(typeof name!=='string'||!name.trim()||name.length>128||!['ai_voicebot','power_dialer','predictive'].includes(type)||(aiAgentId!==null&&(typeof aiAgentId!=='string'||!aiAgentId||aiAgentId.length>64))||(type!=='ai_voicebot'&&aiAgentId!==null))throw new OutboundHttpError('Metadados da campanha inválidos.',422);
 return {name:name.trim(),type,aiAgentId};
}
export function plannedPhones(raw:unknown){
 if(!Array.isArray(raw)||!raw.length||raw.length>500)throw new OutboundHttpError('Informe de 1 a 500 telefones por lote.',400);
 return [...new Set(raw.map((value:unknown)=>{
  if(typeof value!=='string'||value.length>40||!/^[+\d\s().-]+$/.test(value))throw new OutboundHttpError('Lote contém telefone em formato não permitido.',422);
  let phone=value.replace(/[\s().-]/g,'');
  if(phone.startsWith('+')){if(!/^\+55\d{10,11}$/.test(phone))throw new OutboundHttpError('Lote aceita somente formato brasileiro com DDD.',422);phone=phone.slice(1);}
  if(/^55\d{10,11}$/.test(phone))phone=phone.slice(2);
  if(!/^[1-9]\d{9,10}$/.test(phone)||!isAllowedOutboundNumber('55'+phone))throw new OutboundHttpError('Lote aceita somente telefone nacional com DDD, sem DDI externo ou serviços especiais.',422);
  return '55'+phone;
 }))];
}
export function assertDraftCampaign(row:any,version?:unknown){
 if(row.status!=='draft'||[row.total_leads,row.processed_leads,row.success_count,row.active_calls].some(value=>value===null||value===undefined||!Number.isInteger(Number(value))||Number(value)!==0))throw new OutboundHttpError('Registro legado exige revisão administrativa. Prepare uma nova campanha em rascunho.',409);
 if(version!==undefined&&(!Number.isInteger(version)||row.plan_version!==version))throw new OutboundHttpError('Planejamento alterado ou versão inválida. Atualize antes de repetir.',409);
}
