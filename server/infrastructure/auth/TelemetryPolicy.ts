import {endpointFromChannel} from '../asterisk/CallControl.js';
import {OutboundHttpError} from '../security/OutboundHttp.js';
type Actor={role:string;tenantId:string;extension?:string};
export function metricAccess(role:string){return ['super_admin','admin','supervisor','readonly'].includes(role);}
export function financialMetrics(role:string){return ['super_admin','admin'].includes(role);}
export function ownChannelOnly(role:string){return ['operator','agent'].includes(role);}
export function visibleChannels<T extends {tenantId?:string;name:string}>(channels:T[],actor:Actor):T[]{
  const scoped=channels.filter(channel=>channel.tenantId===actor.tenantId);
  if(['super_admin','admin','supervisor'].includes(actor.role))return scoped;
  if(!ownChannelOnly(actor.role)||!actor.extension||!/^[1-9][0-9]{1,7}$/.test(actor.extension))return [];
  return scoped.filter(channel=>endpointFromChannel(channel.name)===actor.extension);
}
export function channelDto(channel:any){return {id:channel.id,name:channel.name,state:channel.state,callerNumber:channel.callerNumber,
  connectedLine:channel.connectedLine,exten:channel.exten,durationSeconds:channel.durationSeconds,tenantId:channel.tenantId,
  application:typeof channel.application==='string'?channel.application.split('(')[0]:'Não informado',aiBridgeActive:channel.aiBridgeActive};}
export function assertOwnCaller(actor:Actor,caller:string){
  if(ownChannelOnly(actor.role)&&caller!==actor.extension)throw new OutboundHttpError('Originação permitida apenas pelo ramal atribuído à conta.',403);
}
export function metricsDto(raw:any,role:string){
  if(!metricAccess(role))throw new OutboundHttpError('Perfil sem acesso às métricas agregadas da empresa.',403);
  const {costEstimateTodayBrl,aiTokensUsedToday}=raw;
  const operational=Object.fromEntries(['callsToday','callsAnswered','callsMissed','callsActive','avgCallDurationSeconds','extensionsTotal','extensionsOnline','trunksTotal','trunksOnline','aiAgentsActive','aiSessionsCount','aiLatencyAvgMs','humanTransferRatePercent','hourlyCallDistribution','period','observedAt','sourceNote'].map(key=>[key,raw[key]]));
  return financialMetrics(role)?{...operational,costEstimateTodayBrl,aiTokensUsedToday}:operational;
}
