import crypto from 'node:crypto';
import {postgresClient} from '../client.js';
import {OutboundHttpError} from '../../security/OutboundHttp.js';
import {CollectionKind,collectionColumns,collectionPatch} from '../../asterisk/CollectionMutation.js';
export class CollectionManagementRepository {
 static async mutate(kind:CollectionKind,tenantId:string,id:string|undefined,patch:Record<string,any>){return postgresClient.executeTenantScoped(tenantId,async client=>{
  const table=kind==='queue'?'queues':'ring_groups';const membersColumn=kind==='queue'?'members':'extensions';
  await client.query('SELECT pg_advisory_xact_lock(hashtext($1))',['routing-namespace:'+tenantId]);
  const previous=id?(await client.query(`SELECT * FROM ${table} WHERE id=$1 AND tenant_id=$2 FOR UPDATE`,[id,tenantId])).rows[0]:undefined;if(id&&!previous)throw new OutboundHttpError('Cadastro não encontrado nesta empresa.',404);
  const effective=collectionPatch(kind,{name:patch.name??previous?.name,number:patch.number??previous?.number,strategy:patch.strategy??previous?.strategy??'ringall',timeoutSeconds:patch.timeoutSeconds??previous?.timeout_seconds??30,members:patch.members??previous?.[membersColumn],...(kind==='queue'?{wrapUpTimeSeconds:patch.wrapUpTimeSeconds??previous?.wrap_up_time_seconds??15,mohSound:patch.mohSound??previous?.moh_sound??'default'}:{failoverDestination:patch.failoverDestination??previous?.fallback_target??''})},true);
  if(kind==='group'&&previous&&previous.fallback_type!=='hangup'&&patch.failoverDestination!=='')throw new OutboundHttpError('Confirme a remoção do fallback legado antes de editar.',501);
  if(previous&&previous.number!==effective.number)await assertUnreferenced(client,tenantId,id!,previous.number,kind);
  const members=(await client.query('SELECT number FROM extensions WHERE tenant_id=$1 AND number=ANY($2::text[]) FOR SHARE',[tenantId,effective.members])).rows;
  if(members.length!==effective.members.length)throw new OutboundHttpError('Todos os membros devem ser ramais desta empresa.',400);
  const numbers=(await client.query("SELECT 'extensions' AS source,id,number FROM extensions WHERE tenant_id=$1 UNION ALL SELECT 'queues',id,number FROM queues WHERE tenant_id=$1 UNION ALL SELECT 'ring_groups',id,number FROM ring_groups WHERE tenant_id=$1 UNION ALL SELECT 'ivrs',id,number FROM ivrs WHERE tenant_id=$1",[tenantId])).rows;
  if(numbers.some(row=>row.number===effective.number&&!(row.source===table&&row.id===id)))throw new OutboundHttpError('Número já utilizado por ramal, fila, grupo ou URA.',409);
  const names=(await client.query(`SELECT id FROM ${table} WHERE tenant_id=$1 AND LOWER(name)=LOWER($2) AND ($3::text IS NULL OR id<>$3)`,[tenantId,effective.name,id??null])).rows;if(names.length)throw new OutboundHttpError('Nome já cadastrado nesta empresa.',409);
  const fields=id?patch:effective;const columns:string[]=[];const values:any[]=[];
  for(const [key,value] of Object.entries(fields)){if(!Object.hasOwn(collectionColumns,key))throw new OutboundHttpError('Campo não editável.',400);columns.push(key==='members'?membersColumn:collectionColumns[key as keyof typeof collectionColumns]);values.push(key==='members'?JSON.stringify(value):value);}
  if(kind==='group'&&(!id||patch.failoverDestination!==undefined)){columns.push('fallback_type');values.push('hangup');}
  const target=id||kind+'-'+crypto.randomUUID();
  if(id)await client.query(`UPDATE ${table} SET ${columns.map((column,index)=>column+'=$'+(index+1)).join(',')},updated_at=CURRENT_TIMESTAMP WHERE id=$${values.length+1} AND tenant_id=$${values.length+2}`,[...values,target,tenantId]);
  else{columns.push('id','tenant_id');values.push(target,tenantId);await client.query(`INSERT INTO ${table} (${columns.join(',')}) VALUES (${values.map((_,index)=>'$'+(index+1)).join(',')})`,values);}
  return target;
 });}
 static async remove(kind:CollectionKind,tenantId:string,id:string){return postgresClient.executeTenantScoped(tenantId,async client=>{
  const table=kind==='queue'?'queues':'ring_groups';const type=kind==='queue'?'queue':'ring_group';
  await client.query('SELECT pg_advisory_xact_lock(hashtext($1))',['routing-namespace:'+tenantId]);
  const previous=(await client.query(`SELECT id,number FROM ${table} WHERE id=$1 AND tenant_id=$2 FOR UPDATE`,[id,tenantId])).rows[0];if(!previous)throw new OutboundHttpError('Cadastro não encontrado.',404);
  await assertUnreferenced(client,tenantId,id,previous.number,kind);
  await client.query(`DELETE FROM ${table} WHERE id=$1 AND tenant_id=$2`,[id,tenantId]);
 });}
}

async function assertUnreferenced(client:any,tenantId:string,id:string,number:string,kind:CollectionKind){
 const type=kind==='queue'?'queue':'ring_group';
 const didRefs=await client.query('SELECT id FROM dids WHERE tenant_id=$1 AND ((destination_type=$2 AND destination_id=ANY($3::text[])) OR (after_hours_dest_type=$2 AND after_hours_dest_id=ANY($3::text[])) OR (fallback_type=$2 AND fallback_target=ANY($3::text[]))) LIMIT 1',[tenantId,type,[id,number]]);
 const ivrRefs=await client.query('SELECT id FROM ivrs WHERE tenant_id=$1 AND (options::text LIKE $2 OR options::text LIKE $3 OR flow::text LIKE $2 OR flow::text LIKE $3) LIMIT 1',[tenantId,'%'+id+'%','%'+number+'%']);
 const groupRefs=await client.query('SELECT id FROM ring_groups WHERE tenant_id=$1 AND id<>$2 AND fallback_target=ANY($3::text[]) LIMIT 1',[tenantId,id,[id,number]]);
 const agentRefs=kind==='queue'?await client.query("SELECT id FROM ai_agents WHERE tenant_id=$1 AND fallback_action='transfer_queue' AND transfer_extension=$2 LIMIT 1",[tenantId,number]):{rows:[]};
 if(agentRefs.rows.length||didRefs.rows.length||ivrRefs.rows.length||groupRefs.rows.length)throw new OutboundHttpError('Vínculo cadastral, agente de IA ou possível referência em URA exige revisão antes de renumerar ou excluir.',409);
}
