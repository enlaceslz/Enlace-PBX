import crypto from 'node:crypto';
import {postgresClient} from '../client.js';
import {OutboundHttpError} from '../../security/OutboundHttp.js';
import {didColumns,nationalDid} from '../../asterisk/DidMutation.js';
export class DidManagementRepository {
 static async mutate(tenantId:string,id:string|undefined,patch:Record<string,any>,count=1){
  return postgresClient.executeTenantScoped(tenantId,async client=>{
   await client.query('SELECT pg_advisory_xact_lock(hashtext($1))',['did-management:'+tenantId]);
   const previous=id?(await client.query('SELECT * FROM dids WHERE id=$1 AND tenant_id=$2 FOR UPDATE',[id,tenantId])).rows[0]:undefined;
   if(id&&!previous)throw new OutboundHttpError('DID não encontrado nesta empresa.',404);
   if(previous&&Object.keys(patch).length===1&&['inactive','suspended'].includes(patch.status)){await client.query('UPDATE dids SET status=$1,updated_at=CURRENT_TIMESTAMP WHERE id=$2 AND tenant_id=$3',[patch.status,id,tenantId]);return [id!];}
   if(previous&&(previous.time_condition_enabled||previous.after_hours_dest_type||previous.after_hours_dest_id||previous.fallback_type||previous.fallback_target||previous.custom_header_name||previous.did_source_header!=='request_uri'||previous.unknown_did_action!=='reject_404'))throw new OutboundHttpError('Roteamento legado exige revisão. É possível desativar ou excluir sem modificar as evidências anteriores.',501);
   const trunkId=patch.trunkId??previous?.trunk_id;
   const trunk=(await client.query('SELECT id,provider_name FROM trunks WHERE id=$1 AND tenant_id=$2 FOR SHARE',[trunkId,tenantId])).rows[0];
   if(!trunk)throw new OutboundHttpError('Tronco deve pertencer à mesma empresa.',400);
   const type=patch.destinationType??previous?.destination_type;const number=patch.destinationId??previous?.destination_id;
   if(type!=='extension')throw new OutboundHttpError('Destino legado exige revisão; selecione ramal explícito.',501);
   const extension=(await client.query('SELECT number,name FROM extensions WHERE tenant_id=$1 AND number=$2 FOR SHARE',[tenantId,number])).rows[0];
   if(!extension)throw new OutboundHttpError('Ramal de destino não pertence à empresa.',400);
   if(!id&&(!patch.did||!patch.trunkId))throw new OutboundHttpError('Número e tronco obrigatórios.',400);
   if(!Number.isInteger(count)||count<1||count>100||id&&count!==1)throw new OutboundHttpError('Lote deve ter entre 1 e 100 números.',400);
   const start=nationalDid(patch.did??previous.did);const numbers=Array.from({length:count},(_,index)=>String(BigInt(start)+BigInt(index)));
   if(numbers.some(value=>nationalDid(value).length!==start.length||value.slice(0,start.startsWith('0')?4:2)!==start.slice(0,start.startsWith('0')?4:2)))throw new OutboundHttpError('Lote não pode atravessar prefixo ou DDD.',400);
   if((await client.query('SELECT id FROM dids WHERE tenant_id=$1 AND did=ANY($2::text[]) AND ($3::text IS NULL OR id<>$3) LIMIT 1',[tenantId,numbers,id??null])).rows.length)throw new OutboundHttpError('Número já cadastrado nesta empresa. Nenhum item do lote foi gravado.',409);
   const ids:string[]=[];
   for(const numberDid of numbers){
    const values:any[]=[];const columns:string[]=[];
    const fields={...patch,did:numberDid,destinationType:type,destinationId:number};
    for(const [key,value] of Object.entries(fields)){if(!Object.hasOwn(didColumns,key))throw new OutboundHttpError('Campo não editável.',400);columns.push(didColumns[key as keyof typeof didColumns]);values.push(value);}
    columns.push('normalized_number','presented_number','operator_name','destination_label');values.push('+55'+numberDid,numberDid,trunk.provider_name,('Ramal '+extension.number+' — '+extension.name).slice(0,128));
    const target=id||'did-'+crypto.randomUUID();
    if(!id){columns.push('id','tenant_id','did_source_header','unknown_did_action');values.push(target,tenantId,'request_uri','reject_404');await client.query(`INSERT INTO dids (${columns.join(',')}) VALUES (${values.map((_,i)=>'$'+(i+1)).join(',')})`,values);}
    else await client.query(`UPDATE dids SET ${columns.map((column,i)=>column+'=$'+(i+1)).join(',')},updated_at=CURRENT_TIMESTAMP WHERE id=$${values.length+1} AND tenant_id=$${values.length+2}`,[...values,target,tenantId]);
    ids.push(target);
   }
   return ids;
  });
 }
 static async remove(tenantId:string,id:string){return postgresClient.executeTenantScoped(tenantId,async client=>{await client.query('SELECT pg_advisory_xact_lock(hashtext($1))',['did-management:'+tenantId]);const result=await client.query('DELETE FROM dids WHERE id=$1 AND tenant_id=$2',[id,tenantId]);if(!result.rowCount)throw new OutboundHttpError('DID não encontrado.',404);});}
}
