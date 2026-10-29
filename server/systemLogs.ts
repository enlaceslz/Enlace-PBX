import crypto from 'node:crypto';
import {OutboundHttpError} from './infrastructure/security/OutboundHttp.js';
import type {SystemLogEntry} from '../src/types/pbx.js';

export function logQuery(query:Record<string,unknown>,download=false){
  for(const [key,value] of Object.entries(query)){
    if(!['level','service','search','limit'].includes(key)||typeof value!=='string'||value.length>200)throw new OutboundHttpError('Filtro de eventos inválido.',400);
  }
  if(query.service&&!['all','application'].includes(query.service as string))throw new OutboundHttpError('Coletor de logs do host não configurado.',400);
  if(query.level&&!['all','WARNING','ERROR'].includes(query.level as string))throw new OutboundHttpError('Severidade inválida.',400);
  const limit=query.limit===undefined?(download?600:200):Number(query.limit);
  if(!Number.isInteger(limit)||limit<1||limit>600)throw new OutboundHttpError('Limite deve estar entre 1 e 600.',400);
  return {level:query.level as string|undefined,search:query.search as string|undefined,limit};
}

/** Buffer limitado da aplicação; não lê journal, arquivos do Asterisk ou mensagens brutas. */
export class SystemLogsManager {
  private logs:SystemLogEntry[]=[];
  recordHttpFailure(status:unknown,requestId:unknown){
    if(typeof status!=='number'||!Number.isInteger(status)||status<400||status>599||typeof requestId!=='string'||!(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(requestId)))return;
    this.logs.unshift({id:crypto.randomUUID(),timestamp:new Date().toISOString(),service:'application',serviceLabel:'Aplicação HTTP',level:status>=500?'ERROR':'WARNING',component:'HTTP_RESPONSE',message:'Requisição encerrada com erro HTTP.',metadata:{status,requestId}});
    this.logs.length=Math.min(this.logs.length,600);
  }
  getLogs(params:{level?:string;search?:string;limit?:number}={}){
    const snapshot=structuredClone(this.logs);
    const filtered=snapshot.filter(entry=>(!params.level||params.level==='all'||entry.level===params.level)&&(!params.search||JSON.stringify(entry).toLowerCase().includes(params.search.toLowerCase())));
    const limit=Math.max(1,Math.min(600,Number.isInteger(params.limit)?params.limit!:200));
    const now=Date.now();
    return {logs:filtered.slice(0,limit),hasMore:filtered.length>limit,
      stats:{total:snapshot.length,byLevel:{DEBUG:0,INFO:0,NOTICE:0,WARNING:snapshot.filter(e=>e.level==='WARNING').length,ERROR:snapshot.filter(e=>e.level==='ERROR').length,CRITICAL:0},byService:{application:snapshot.length},eventsPerMinute:snapshot.filter(e=>Date.parse(e.timestamp)>=now-60000).length,lastTimestamp:snapshot[0]?.timestamp??null},
      source:{kind:'application_http_errors',hostCollectorConfigured:false,capacity:600,persistent:false,startedAt:this.startedAt},observedAt:new Date().toISOString()};
  }
  private readonly startedAt=new Date().toISOString();
  clearLogs(){this.logs=[];}
}
export const systemLogsManager=new SystemLogsManager();
