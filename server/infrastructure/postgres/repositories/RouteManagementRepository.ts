import crypto from 'node:crypto';
import {postgresClient} from '../client.js';
import {OutboundHttpError} from '../../security/OutboundHttp.js';
import {routeColumns,routePatch,routePattern} from '../../asterisk/RouteMutation.js';
export class RouteManagementRepository {
 static async mutate(tenantId:string,id:string|undefined,patch:Record<string,any>){return postgresClient.executeTenantScoped(tenantId,async client=>{
  await client.query('SELECT pg_advisory_xact_lock(hashtext($1))',['route-management:'+tenantId]);
  const rows=(await client.query('SELECT * FROM routes WHERE tenant_id=$1 FOR UPDATE',[tenantId])).rows;const previous=id?rows.find(row=>row.id===id):undefined;
  if(id&&!previous)throw new OutboundHttpError('Rota não encontrada nesta empresa.',404);
  if(previous&&Object.keys(patch).length===1&&patch.isActive===false){await client.query('UPDATE routes SET is_active=false,updated_at=CURRENT_TIMESTAMP WHERE id=$1 AND tenant_id=$2',[id,tenantId]);return id!;}
  if(previous&&(previous.is_cli_itx||previous.caller_id_override||(previous.extension_overrides!=null&&(!Array.isArray(previous.extension_overrides)||previous.extension_overrides.length>0))))throw new OutboundHttpError('Rota CLI legada exige revisão. É possível desativar ou excluir preservando o cadastro.',501);
  const effective=routePatch({name:patch.name??previous?.name,pattern:patch.pattern??previous?.pattern,trunkId:patch.trunkId??previous?.trunk_id,failoverTrunkId:patch.failoverTrunkId??previous?.failover_trunk_id??'',priority:patch.priority??previous?.priority??1,stripDigits:patch.stripDigits??previous?.strip_digits??0,prepend:patch.prepend??previous?.prepend_digits??''},true);
  for(const trunkId of [effective.trunkId,effective.failoverTrunkId].filter(Boolean))if(!(await client.query('SELECT id FROM trunks WHERE id=$1 AND tenant_id=$2 FOR SHARE',[trunkId,tenantId])).rows.length)throw new OutboundHttpError('Troncos devem pertencer à mesma empresa.',400);
  if(effective.trunkId===effective.failoverTrunkId)throw new OutboundHttpError('Troncos primário e de contingência devem ser distintos.',400);
  if(rows.some(row=>row.id!==id&&((()=>{try{return routePattern(row.pattern)===effective.pattern;}catch{return row.pattern===effective.pattern;}})()||row.name.toLowerCase()===effective.name.toLowerCase())))throw new OutboundHttpError('Nome ou padrão já cadastrado nesta empresa.',409);
  const fields=id?patch:effective;const columns:string[]=[];const values:any[]=[];
  for(const [key,value] of Object.entries(fields)){if(!Object.hasOwn(routeColumns,key))throw new OutboundHttpError('Campo não editável.',400);columns.push(routeColumns[key as keyof typeof routeColumns]);values.push(key==='failoverTrunkId'&&value===''?null:value);}
  const target=id||'route-'+crypto.randomUUID();
  if(id)await client.query(`UPDATE routes SET ${columns.map((column,index)=>column+'=$'+(index+1)).join(',')},updated_at=CURRENT_TIMESTAMP WHERE id=$${values.length+1} AND tenant_id=$${values.length+2}`,[...values,target,tenantId]);
  else{if(patch.isActive!==undefined){columns.push('is_active');values.push(patch.isActive);}columns.push('id','tenant_id');values.push(target,tenantId);await client.query(`INSERT INTO routes (${columns.join(',')}) VALUES (${values.map((_,i)=>'$'+(i+1)).join(',')})`,values);}
  return target;
 });}
 static async remove(tenantId:string,id:string){return postgresClient.executeTenantScoped(tenantId,async client=>{await client.query('SELECT pg_advisory_xact_lock(hashtext($1))',['route-management:'+tenantId]);const result=await client.query('DELETE FROM routes WHERE id=$1 AND tenant_id=$2',[id,tenantId]);if(!result.rowCount)throw new OutboundHttpError('Rota não encontrada.',404);});}
}
