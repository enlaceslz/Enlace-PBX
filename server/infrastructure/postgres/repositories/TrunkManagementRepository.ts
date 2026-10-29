import crypto from 'node:crypto';
import {postgresClient} from '../client.js';
import {EncryptionService} from '../../security/EncryptionService.js';
import {OutboundHttpError} from '../../security/OutboundHttp.js';
import {trunkColumns} from '../../asterisk/TrunkMutation.js';
export class TrunkManagementRepository {
 static async mutate(tenantId:string,id:string|undefined,patch:Record<string,any>){
  return postgresClient.executeTenantScoped(tenantId,async client=>{
   await client.query('SELECT pg_advisory_xact_lock(hashtext($1))',['trunk-management:'+tenantId]);
   const rows=(await client.query('SELECT id,name,failover_trunk_id,auth_mode,username,secret_encrypted FROM trunks WHERE tenant_id=$1 FOR UPDATE',[tenantId])).rows;
   const existing=id?rows.find(row=>row.id===id):undefined;
   if(id&&!existing)throw new OutboundHttpError('Tronco não encontrado nesta empresa.',404);
   if(patch.name!==undefined&&rows.some(row=>row.id!==id&&row.name.toLowerCase()===patch.name.toLowerCase()))throw new OutboundHttpError('Já existe um tronco com esse nome nesta empresa.',409);
   const target=id||'trunk-'+crypto.randomUUID();
   const failover=patch.failoverTrunkId!==undefined?patch.failoverTrunkId:existing?.failover_trunk_id;
   if(failover){const visited=new Set([target]);let next=failover;while(next){if(visited.has(next))throw new OutboundHttpError('Contingência não pode conter ciclos.',409);visited.add(next);const row=rows.find(item=>item.id===next);if(!row)throw new OutboundHttpError('Contingência deve pertencer à mesma empresa.',400);next=row.failover_trunk_id;}}
   const auth=patch.authMode??existing?.auth_mode??'ip';
   if(auth==='credentials'&&(!(patch.username??existing?.username)||!(patch.secret||existing?.secret_encrypted)))throw new OutboundHttpError('Autenticação por credenciais exige usuário e senha SIP cadastrados.',400);
   if(auth==='ip'&&patch.register===true)throw new OutboundHttpError('Modo IP não utiliza registro por credenciais.',400);
   const fields={...patch};delete fields.secret;
   if(auth==='ip')fields.register=false;
   const columns:string[]=[];const values:any[]=[];
   for(const [key,value] of Object.entries(fields)){
    if(!Object.hasOwn(trunkColumns,key))throw new OutboundHttpError('Campo não editável.',400);
    columns.push(trunkColumns[key as keyof typeof trunkColumns]);values.push(['codecs','authorizedIps'].includes(key)?JSON.stringify(value):value===''&&['failoverTrunkId','fromDomain','fromUser'].includes(key)?null:value);
   }
   if(patch.secret){columns.push('secret_encrypted');values.push(EncryptionService.encrypt(patch.secret));}
   if(id&&columns.length===0)return target;
   if(!id){
    if(!fields.name||!fields.host)throw new OutboundHttpError('Nome e host obrigatórios.',400);
    if(!Object.hasOwn(fields,'providerName')){columns.push('provider_name');values.push('');}
    columns.push('id','tenant_id','status','last_ping_status');values.push(target,tenantId,'unregistered','NOT_TESTED');
    await client.query(`INSERT INTO trunks (${columns.join(',')}) VALUES (${values.map((_,index)=>'$'+(index+1)).join(',')})`,values);
   }else{
    await client.query(`UPDATE trunks SET ${columns.map((column,index)=>column+'=$'+(index+1)).join(',')}, status='unregistered',last_ping_status='NOT_TESTED',last_ping_latency_ms=NULL,last_ping_at=NULL,updated_at=CURRENT_TIMESTAMP WHERE id=$${values.length+1} AND tenant_id=$${values.length+2}`,[...values,target,tenantId]);
   }
   return target;
  });
 }
 static async remove(tenantId:string,id:string){
  return postgresClient.executeTenantScoped(tenantId,async client=>{
   await client.query('SELECT pg_advisory_xact_lock(hashtext($1))',['trunk-management:'+tenantId]);
   if((await client.query('SELECT id FROM trunks WHERE id=$1 AND tenant_id=$2 FOR UPDATE',[id,tenantId])).rows.length===0)throw new OutboundHttpError('Tronco não encontrado.',404);
   if((await client.query('SELECT id FROM trunks WHERE tenant_id=$1 AND failover_trunk_id=$2 LIMIT 1',[tenantId,id])).rows.length)throw new OutboundHttpError('Tronco utilizado como contingência. Remova o vínculo antes de excluir.',409);
   try{await client.query('DELETE FROM trunks WHERE id=$1 AND tenant_id=$2',[id,tenantId]);}catch(error:any){if(error.code==='23503')throw new OutboundHttpError('Tronco vinculado a DIDs ou rotas. Remova os vínculos antes de excluir.',409);throw error;}
  });
 }
}
