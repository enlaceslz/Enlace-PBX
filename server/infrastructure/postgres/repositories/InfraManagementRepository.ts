import {postgresClient} from '../client.js';
import {OutboundHttpError} from '../../security/OutboundHttp.js';
import {infraDto,mergeInfra} from '../../asterisk/InfraMutation.js';
export class InfraManagementRepository {
 static async read(){return postgresClient.executeGlobalScoped(async client=>infraDto((await client.query("SELECT value FROM system_settings WHERE key='infra_config'")).rows[0]?.value));}
 static async mutate(expectedRevision:number,patch:Record<string,any>){return postgresClient.executeGlobalScoped(async client=>{
  await client.query("SELECT pg_advisory_xact_lock(hashtext('infra-management'))");
  const previous=(await client.query("SELECT value FROM system_settings WHERE key='infra_config' FOR UPDATE")).rows[0]?.value;
  const revision=previous?._revision??0;
  if(!Number.isSafeInteger(revision)||revision!==expectedRevision||revision>=Number.MAX_SAFE_INTEGER)throw new OutboundHttpError('Infraestrutura alterada por outra sessão. Recarregue e revise antes de salvar.',409);
  const next=mergeInfra(previous,patch);next._revision=revision+1;next.updatedAt=new Date().toISOString();
  await client.query("INSERT INTO system_settings(key,value,updated_at) VALUES('infra_config',$1,CURRENT_TIMESTAMP) ON CONFLICT(key) DO UPDATE SET value=EXCLUDED.value,updated_at=CURRENT_TIMESTAMP",[JSON.stringify(next)]);
  return infraDto(next);
 });}
}
