import { randomUUID } from 'node:crypto';
import { postgresClient } from '../client.js';
import { campaignMetadata,assertDraftCampaign } from '../../../maia/integrations/CampaignPlanning.js';
import { OutboundHttpError } from '../../security/OutboundHttp.js';
import { AiAgentRepository } from './AiAgentRepository.js';
export class CampaignPlanningRepository{
 static async find(tenantId:string,id:string){return postgresClient.executeTenantScoped(tenantId,async client=>(await client.query('SELECT * FROM campaigns WHERE tenant_id=$1 AND id=$2',[tenantId,id])).rows[0]);}
 static async list(tenantId:string){return postgresClient.executeTenantScoped(tenantId,async client=>{
  const rows=(await client.query(`SELECT c.*,(SELECT count(*)::int FROM campaign_leads l WHERE l.tenant_id=c.tenant_id AND l.campaign_id=c.id) AS lead_count FROM campaigns c WHERE c.tenant_id=$1 ORDER BY c.created_at DESC LIMIT 100`,[tenantId])).rows;
  return rows.map(row=>{let editable=true;try{assertDraftCampaign(row);}catch{editable=false;}return {id:row.id,name:row.name,type:row.type,aiAgentId:row.ai_agent_id,planVersion:row.plan_version,leadCount:row.lead_count,status:editable?'draft':'unverified',legacyStatus:editable?null:row.status,executionAvailable:false,createdAt:row.created_at};});
 });}
 static async agent(tenantId:string,id:string|null){if(id&&!await AiAgentRepository.findById(id,tenantId))throw new OutboundHttpError('Agente não encontrado na empresa.',422);}
 static async create(tenantId:string,raw:any){const input=campaignMetadata(raw);await this.agent(tenantId,input.aiAgentId);return postgresClient.executeTenantScoped(tenantId,async client=>(await client.query("INSERT INTO campaigns(id,tenant_id,name,type,status,ai_agent_id,total_leads,processed_leads,success_count,active_calls) VALUES($1,$2,$3,$4,'draft',$5,0,0,0,0) RETURNING id",[randomUUID(),tenantId,input.name,input.type,input.aiAgentId])).rows[0]);}
 static async update(tenantId:string,id:string,raw:any){
  return postgresClient.executeTenantScoped(tenantId,async client=>{
   const row=(await client.query('SELECT * FROM campaigns WHERE tenant_id=$1 AND id=$2 FOR UPDATE',[tenantId,id])).rows[0];if(!row)throw new OutboundHttpError('Campanha não encontrada.',404);
   if(raw.planVersion===undefined)throw new OutboundHttpError('Informe a versão do planejamento.',400);assertDraftCampaign(row,raw.planVersion);
   const input=campaignMetadata(raw,row);
   if(input.aiAgentId){const agent=await client.query('SELECT id FROM ai_agents WHERE tenant_id=$1 AND id=$2',[tenantId,input.aiAgentId]);if(!agent.rows[0])throw new OutboundHttpError('Agente não encontrado na empresa.',422);}
   await client.query('UPDATE campaigns SET name=$3,type=$4,ai_agent_id=$5,plan_version=plan_version+1,updated_at=CURRENT_TIMESTAMP WHERE tenant_id=$1 AND id=$2',[tenantId,id,input.name,input.type,input.aiAgentId]);
  });
 }
 static async import(tenantId:string,id:string,phones:string[]){return postgresClient.executeTenantScoped(tenantId,async client=>{
  const row=(await client.query('SELECT * FROM campaigns WHERE tenant_id=$1 AND id=$2 FOR UPDATE',[tenantId,id])).rows[0];if(!row)throw new OutboundHttpError('Campanha não encontrada.',404);assertDraftCampaign(row);
  const inserted=await client.query('INSERT INTO campaign_leads(campaign_id,tenant_id,phone) SELECT $1,$2,unnest($3::text[]) ON CONFLICT(campaign_id,phone) DO NOTHING RETURNING phone',[id,tenantId,phones]);
  const total=(await client.query('SELECT count(*)::int AS total FROM campaign_leads WHERE tenant_id=$1 AND campaign_id=$2',[tenantId,id])).rows[0].total;
  if(total>10000)throw new OutboundHttpError('Limite de 10000 destinos por campanha atingido; lote não gravado.',413);
  if(inserted.rowCount)await client.query('UPDATE campaigns SET plan_version=plan_version+1,updated_at=CURRENT_TIMESTAMP WHERE tenant_id=$1 AND id=$2',[tenantId,id]);
  return {added:inserted.rowCount,total};
 });}
 static async leads(tenantId:string,id:string,after:string){return postgresClient.executeTenantScoped(tenantId,async client=>(await client.query('SELECT phone,created_at FROM campaign_leads WHERE tenant_id=$1 AND campaign_id=$2 AND phone>$3 ORDER BY phone LIMIT 101',[tenantId,id,after])).rows);}
 static async removeLead(tenantId:string,id:string,phone:string,version:number){return postgresClient.executeTenantScoped(tenantId,async client=>{
  const row=(await client.query('SELECT * FROM campaigns WHERE tenant_id=$1 AND id=$2 FOR UPDATE',[tenantId,id])).rows[0];if(!row)throw new OutboundHttpError('Campanha não encontrada.',404);assertDraftCampaign(row,version);
  const result=await client.query('DELETE FROM campaign_leads WHERE tenant_id=$1 AND campaign_id=$2 AND phone=$3',[tenantId,id,phone]);
  if(!result.rowCount)throw new OutboundHttpError('Destino não encontrado.',404);
  await client.query('UPDATE campaigns SET plan_version=plan_version+1,updated_at=CURRENT_TIMESTAMP WHERE tenant_id=$1 AND id=$2',[tenantId,id]);
 });}
 static async remove(tenantId:string,id:string,version:number){return postgresClient.executeTenantScoped(tenantId,async client=>{
  const row=(await client.query('SELECT * FROM campaigns WHERE tenant_id=$1 AND id=$2 FOR UPDATE',[tenantId,id])).rows[0];if(!row)throw new OutboundHttpError('Campanha não encontrada.',404);assertDraftCampaign(row,version);
  await client.query('DELETE FROM campaigns WHERE tenant_id=$1 AND id=$2',[tenantId,id]);
 });}
}
