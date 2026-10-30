import crypto from 'node:crypto';
import {postgresClient} from '../client.js';
import {OutboundHttpError} from '../../security/OutboundHttp.js';
import {ivrColumns,managedIvr} from '../../asterisk/IvrMutation.js';
export class IvrManagementRepository {
 static async mutate(tenantId:string,id:string|undefined,patch:Record<string,any>){return postgresClient.executeTenantScoped(tenantId,async client=>{
  await client.query('SELECT pg_advisory_xact_lock(hashtext($1))',['routing-namespace:'+tenantId]);
  const previous=id?(await client.query('SELECT * FROM ivrs WHERE id=$1 AND tenant_id=$2 FOR UPDATE',[id,tenantId])).rows[0]:undefined;
  if(id&&!previous)throw new OutboundHttpError('URA não encontrada nesta empresa.',404);
  const target=id||'ivr-'+crypto.randomUUID();
  const effective:Record<string,any>={id:target,...Object.fromEntries(Object.entries(ivrColumns).map(([key,column])=>[key,previous?.[column]])),...patch};
  const extensions=(await client.query('SELECT number FROM extensions WHERE tenant_id=$1 FOR SHARE',[tenantId])).rows;
  const queues=(await client.query('SELECT id,number FROM queues WHERE tenant_id=$1 FOR SHARE',[tenantId])).rows;
  managedIvr(effective,extensions,queues);
  if(previous&&previous.number!==effective.number)await assertIvrUnreferenced(client,tenantId,id!,previous.number);
  const numbers=(await client.query("SELECT 'extensions' AS source,id,number FROM extensions WHERE tenant_id=$1 UNION ALL SELECT 'queues',id,number FROM queues WHERE tenant_id=$1 UNION ALL SELECT 'ring_groups',id,number FROM ring_groups WHERE tenant_id=$1 UNION ALL SELECT 'ivrs',id,number FROM ivrs WHERE tenant_id=$1",[tenantId])).rows;
  if(numbers.some(row=>row.number===effective.number&&!(row.source==='ivrs'&&row.id===id)))throw new OutboundHttpError('Número interno já utilizado.',409);
  const fields=id?patch:Object.fromEntries(Object.keys(ivrColumns).map(key=>[key,effective[key]??null]));
  const columns:string[]=[];const values:any[]=[];
  for(const [key,value] of Object.entries(fields)){if(!Object.hasOwn(ivrColumns,key))throw new OutboundHttpError('Campo não editável.',400);columns.push(ivrColumns[key as keyof typeof ivrColumns]);values.push(key==='options'?JSON.stringify(value):value);}
  if(id)await client.query(`UPDATE ivrs SET ${columns.map((column,index)=>column+'=$'+(index+1)).join(',')},updated_at=CURRENT_TIMESTAMP WHERE id=$${values.length+1} AND tenant_id=$${values.length+2}`,[...values,target,tenantId]);
  else{columns.push('id','tenant_id');values.push(target,tenantId);await client.query(`INSERT INTO ivrs (${columns.join(',')}) VALUES (${values.map((_,index)=>'$'+(index+1)).join(',')})`,values);}
  return target;
 });}
 static async remove(tenantId:string,id:string){return postgresClient.executeTenantScoped(tenantId,async client=>{
  await client.query('SELECT pg_advisory_xact_lock(hashtext($1))',['routing-namespace:'+tenantId]);
  const previous=(await client.query('SELECT id,number FROM ivrs WHERE id=$1 AND tenant_id=$2 FOR UPDATE',[id,tenantId])).rows[0];if(!previous)throw new OutboundHttpError('URA não encontrada.',404);
  await assertIvrUnreferenced(client,tenantId,id,previous.number);
  await client.query('DELETE FROM ivrs WHERE id=$1 AND tenant_id=$2',[id,tenantId]);
 });}
}
async function assertIvrUnreferenced(client:any,tenantId:string,id:string,number:string){
 const refs=await client.query("SELECT id FROM dids WHERE tenant_id=$1 AND ((destination_type='ivr' AND destination_id=ANY($2::text[])) OR (after_hours_dest_type='ivr' AND after_hours_dest_id=ANY($2::text[])) OR (fallback_type='ivr' AND fallback_target=ANY($2::text[]))) UNION ALL SELECT id FROM ivrs WHERE tenant_id=$1 AND id<>$3 AND (options::text LIKE $4 OR options::text LIKE $5 OR flow::text LIKE $4 OR flow::text LIKE $5) UNION ALL SELECT id FROM ring_groups WHERE tenant_id=$1 AND fallback_target=ANY($2::text[])",[tenantId,[id,number],id,'%'+id+'%','%'+number+'%']);
 if(refs.rows.length)throw new OutboundHttpError('URA referenciada exige revisão antes de renumerar ou excluir.',409);
}
