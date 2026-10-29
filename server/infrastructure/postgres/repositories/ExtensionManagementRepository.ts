import crypto from 'node:crypto';
import type pg from 'pg';
import {postgresClient} from '../client.js';
import {EncryptionService} from '../../security/EncryptionService.js';
import {OutboundHttpError} from '../../security/OutboundHttp.js';
import {extensionColumns,extensionPatch} from '../../asterisk/ExtensionMutation.js';
export class ExtensionManagementRepository {
 static async mutate(tenantId:string,id:string|undefined,patch:Record<string,any>){return postgresClient.executeTenantScoped(tenantId,client=>this.mutateInTransaction(client,tenantId,id,patch));}
 static async createBatch(tenantId:string,items:{name:string;number:string}[]){
  if(!items.length||items.length>100)throw new OutboundHttpError('Lote fora do limite.',400);
  return postgresClient.executeTenantScoped(tenantId,async client=>{
   const ids:string[]=[];for(const item of items)ids.push(await this.mutateInTransaction(client,tenantId,undefined,extensionPatch(item,true)));return ids;
  });
 }
 private static async mutateInTransaction(client:pg.PoolClient,tenantId:string,id:string|undefined,patch:Record<string,any>){
  await client.query('SELECT pg_advisory_xact_lock(hashtext($1))',['routing-namespace:'+tenantId]);
  const previous=id?(await client.query('SELECT * FROM extensions WHERE id=$1 AND tenant_id=$2 FOR UPDATE',[id,tenantId])).rows[0]:undefined;
  if(id&&!previous)throw new OutboundHttpError('Ramal não encontrado nesta empresa.',404);
  const number=patch.number??previous?.number;
  if(previous&&number!==previous.number)await assertExtensionUnreferenced(client,tenantId,id!,previous.number);
  const numbers=(await client.query("SELECT 'extensions' AS source,id,number FROM extensions WHERE tenant_id=$1 UNION ALL SELECT 'queues',id,number FROM queues WHERE tenant_id=$1 UNION ALL SELECT 'ring_groups',id,number FROM ring_groups WHERE tenant_id=$1 UNION ALL SELECT 'ivrs',id,number FROM ivrs WHERE tenant_id=$1",[tenantId])).rows;
  if(numbers.some(row=>row.number===number&&!(row.source==='extensions'&&row.id===id)))throw new OutboundHttpError('Número interno já utilizado.',409);
  const fields=id?extensionPatch(patch):extensionPatch({context:'from-internal',callerId:'',cliCallerId:'',codecs:['opus','alaw','ulaw','g722'],nat:true,webrtc:true,recording:'never',voicemail:false,dnd:false,allowAiTransfer:false,...patch,sipSecret:patch.sipSecret??crypto.randomBytes(32).toString('base64url')},true);
  const columns:string[]=[];const values:any[]=[];
  for(const [key,value] of Object.entries(fields)){columns.push(extensionColumns[key as keyof typeof extensionColumns]);values.push(key==='sipSecret'?EncryptionService.encrypt(value):key==='codecs'?JSON.stringify(value):value);}
  if(id)await client.query(`UPDATE extensions SET ${columns.map((column,index)=>column+'=$'+(index+1)).join(',')},status='offline',ip_address=NULL,updated_at=CURRENT_TIMESTAMP WHERE id=$${values.length+1} AND tenant_id=$${values.length+2}`,[...values,id,tenantId]);
  else{columns.push('id','tenant_id','status');const target='ext-'+crypto.randomUUID();values.push(target,tenantId,'offline');await client.query(`INSERT INTO extensions (${columns.join(',')}) VALUES (${values.map((_,index)=>'$'+(index+1)).join(',')})`,values);return target;}
  return id!;
 }
 static async remove(tenantId:string,id:string){return postgresClient.executeTenantScoped(tenantId,async client=>{
  await client.query('SELECT pg_advisory_xact_lock(hashtext($1))',['routing-namespace:'+tenantId]);
  const previous=(await client.query('SELECT id,number FROM extensions WHERE id=$1 AND tenant_id=$2 FOR UPDATE',[id,tenantId])).rows[0];if(!previous)throw new OutboundHttpError('Ramal não encontrado.',404);
  await assertExtensionUnreferenced(client,tenantId,id,previous.number);
  await client.query('DELETE FROM extensions WHERE id=$1 AND tenant_id=$2',[id,tenantId]);
 });}
}
async function assertExtensionUnreferenced(client:any,tenantId:string,id:string,number:string){
 const references=await client.query("SELECT id FROM users WHERE tenant_id=$1 AND extension=$2 UNION ALL SELECT id FROM queues WHERE tenant_id=$1 AND members::text LIKE $3 UNION ALL SELECT id FROM ring_groups WHERE tenant_id=$1 AND (extensions::text LIKE $3 OR fallback_target=ANY($4::text[])) UNION ALL SELECT id FROM ivrs WHERE tenant_id=$1 AND (options::text LIKE $3 OR flow::text LIKE $3 OR options::text LIKE $5 OR flow::text LIKE $5) UNION ALL SELECT id FROM dids WHERE tenant_id=$1 AND ((destination_type='extension' AND destination_id=ANY($4::text[])) OR (after_hours_dest_type='extension' AND after_hours_dest_id=ANY($4::text[])) OR (fallback_type='extension' AND fallback_target=ANY($4::text[])))",[tenantId,number,'%'+number+'%',[id,number],'%'+id+'%']);
 if(references.rows.length)throw new OutboundHttpError('Ramal vinculado a usuário, fila, grupo, URA ou DID exige revisão antes de renumerar ou excluir.',409);
}
