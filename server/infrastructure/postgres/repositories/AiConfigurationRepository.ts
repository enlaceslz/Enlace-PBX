import crypto from 'node:crypto';
import {postgresClient} from '../client.js';
import {agentColumns,agentPatch,configurationIds,knowledgeColumns,knowledgePatch} from '../../ai/AiConfiguration.js';
import {OutboundHttpError} from '../../security/OutboundHttp.js';
const missing=()=>new OutboundHttpError('Configuração não encontrada nesta empresa.',404);
const lock=async(client:any,tenantId:string)=>client.query('SELECT pg_advisory_xact_lock(hashtext($1))',['ai-configuration:'+tenantId]);
async function save(client:any,table:'ai_agents'|'ai_knowledge',tenantId:string,id:string,fields:Record<string,any>,mapping:Record<string,string>,update:boolean){
 const entries=Object.entries(fields).filter(([key])=>key!=='targetAgentIds');const columns=entries.map(([key])=>mapping[key]);if(columns.some(column=>!column))throw new OutboundHttpError('Campo de configuração não editável.',400);
 const values=entries.map(([key,value])=>['tools','knowledgeSources'].includes(key)?JSON.stringify(value):value);
 if(update){await client.query(`UPDATE ${table} SET ${columns.length?columns.map((column,index)=>column+'=$'+(index+1)).join(',')+',':''}updated_at=CURRENT_TIMESTAMP WHERE id=$${values.length+1} AND tenant_id=$${values.length+2}`,[...values,id,tenantId]);}
 else{columns.push('id','tenant_id');values.push(id,tenantId);await client.query(`INSERT INTO ${table} (${columns.join(',')}) VALUES (${values.map((_,index)=>'$'+(index+1)).join(',')})`,values);}
}
export class AiConfigurationRepository{
 static async agent(tenantId:string,id:string|undefined,input:unknown){const patch=agentPatch(input,!id);return postgresClient.executeTenantScoped(tenantId,async client=>{
  await client.query('SELECT pg_advisory_xact_lock(hashtext($1))',['routing-namespace:'+tenantId]);await lock(client,tenantId);const previous=id?(await client.query('SELECT * FROM ai_agents WHERE id=$1 AND tenant_id=$2 FOR UPDATE',[id,tenantId])).rows[0]:undefined;if(id&&!previous)throw missing();
  for(const [key,table] of [['tools','ai_tools'],['knowledgeSources','ai_knowledge']] as const){const ids=patch[key]??(patch.isActive===true?previous?.[key==='tools'?'tools':'knowledge_sources']:undefined);if(ids!==undefined){
   configurationIds(ids);const refs=await client.query(`SELECT id FROM ${table} WHERE tenant_id=$1 AND id=ANY($2::text[]) ${key==='knowledgeSources'?"AND review_state='REVIEWED_TEXT'":''} FOR SHARE`,[tenantId,ids]);if(refs.rows.length!==ids.length)throw new OutboundHttpError('Vínculos devem pertencer à empresa selecionada e documentos devem ter texto revisado.',400);
  }
  }
  if(!id||patch.isActive===true||'fallbackAction' in patch||'transferExtension' in patch){
   const action=patch.fallbackAction??previous?.fallback_action;const number=patch.transferExtension??previous?.transfer_extension;
   if(action==='hangup'&&number)throw new OutboundHttpError('Fallback de encerramento deve ficar sem destino de transferência.',400);
   if(action!=='hangup'){
    if(!number)throw new OutboundHttpError('Selecione um destino de fallback cadastrado.',400);
    const table=action==='transfer_queue'?'queues':'extensions';const target=await client.query(`SELECT id FROM ${table} WHERE tenant_id=$1 AND number=$2 FOR SHARE`,[tenantId,number]);if(!target.rows.length)throw new OutboundHttpError('Destino de fallback deve pertencer à empresa selecionada.',400);
   }
  }
  const target=id||'agent-'+crypto.randomUUID();await save(client,'ai_agents',tenantId,target,patch,agentColumns,!!id);return target;
 });}
 static async removeAgent(tenantId:string,id:string){return postgresClient.executeTenantScoped(tenantId,async client=>{
  await client.query('SELECT pg_advisory_xact_lock(hashtext($1))',['routing-namespace:'+tenantId]);await lock(client,tenantId);if(!(await client.query('SELECT id FROM ai_agents WHERE id=$1 AND tenant_id=$2 FOR UPDATE',[id,tenantId])).rows.length)throw missing();
  const refs=await client.query('SELECT id FROM ai_sessions WHERE tenant_id=$1 AND agent_id=$2 UNION ALL SELECT id FROM campaigns WHERE tenant_id=$1 AND ai_agent_id=$2 UNION ALL SELECT id FROM cdr WHERE tenant_id=$1 AND ai_agent_id=$2 UNION ALL SELECT id FROM dids WHERE tenant_id=$1 AND (destination_id=$2 OR after_hours_dest_id=$2 OR fallback_target=$2) UNION ALL SELECT id FROM ivrs WHERE tenant_id=$1 AND (options::text LIKE $3 OR flow::text LIKE $3) LIMIT 1',[tenantId,id,'%'+id+'%']);
  if(refs.rows.length)throw new OutboundHttpError('Agente referenciado por sessões, campanhas ou bilhetagem. Desative-o para preservar o histórico.',409);
  await client.query('DELETE FROM ai_agents WHERE id=$1 AND tenant_id=$2',[id,tenantId]);
 }).catch(error=>{if(error?.code==='23503')throw new OutboundHttpError('Agente referenciado exige revisão; histórico preservado.',409);throw error;});}
 static async knowledge(tenantId:string,id:string|undefined,input:unknown){const patch=knowledgePatch(input,!id);return postgresClient.executeTenantScoped(tenantId,async client=>{
  await lock(client,tenantId);const previous=id?(await client.query('SELECT * FROM ai_knowledge WHERE id=$1 AND tenant_id=$2 FOR UPDATE',[id,tenantId])).rows[0]:undefined;if(id&&!previous)throw missing();
  const target=id||'kb-'+crypto.randomUUID();if('content' in patch){patch.fileSizeBytes=Buffer.byteLength(patch.content,'utf8');patch.reviewState='REVIEWED_TEXT';patch.fileType??='text/plain';}
  if(patch.targetAgentIds?.length&&(patch.reviewState??previous?.review_state)!=='REVIEWED_TEXT')throw new OutboundHttpError('Revise o texto antes de vincular o documento.',409);
  await this.links(client,tenantId,target,patch.targetAgentIds??[],!id||patch.targetAgentIds!==undefined);
  await save(client,'ai_knowledge',tenantId,target,patch,{...knowledgeColumns,fileSizeBytes:'file_size_bytes',reviewState:'review_state'},!!id);return target;
 });}
 static async removeKnowledge(tenantId:string,id:string){return postgresClient.executeTenantScoped(tenantId,async client=>{
  await lock(client,tenantId);if(!(await client.query('SELECT id FROM ai_knowledge WHERE id=$1 AND tenant_id=$2 FOR UPDATE',[id,tenantId])).rows.length)throw missing();
  await this.links(client,tenantId,id,[],true);await client.query('DELETE FROM ai_knowledge WHERE id=$1 AND tenant_id=$2',[id,tenantId]);
 });}
 private static async links(client:any,tenantId:string,documentId:string,targets:string[],replace:boolean){
  if(!replace)return;
  const agents=(await client.query('SELECT id,knowledge_sources FROM ai_agents WHERE tenant_id=$1 AND (id=ANY($2::text[]) OR knowledge_sources ? $3) FOR UPDATE',[tenantId,targets,documentId])).rows;
  if(targets.some(id=>!agents.some(agent=>agent.id===id)))throw new OutboundHttpError('Agentes alvo devem pertencer à empresa selecionada.',400);
  for(const agent of agents){if(!Array.isArray(agent.knowledge_sources)||agent.knowledge_sources.some(value=>typeof value!=='string'))throw new OutboundHttpError('Vínculos legados inválidos exigem revisão antes de alterar.',409);
   const references=agent.knowledge_sources.filter(value=>value!==documentId);if(targets.includes(agent.id))references.push(documentId);
   await client.query('UPDATE ai_agents SET knowledge_sources=$1::jsonb,updated_at=CURRENT_TIMESTAMP WHERE id=$2 AND tenant_id=$3',[JSON.stringify(references),agent.id,tenantId]);
  }
 }
}
