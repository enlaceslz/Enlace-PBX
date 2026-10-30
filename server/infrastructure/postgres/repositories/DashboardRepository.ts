import {postgresClient} from '../client.js';
const day=`SELECT date_trunc('day',CURRENT_TIMESTAMP AT TIME ZONE 'America/Fortaleza') AT TIME ZONE 'America/Fortaleza' AS start_at`;
export class DashboardRepository {
  static async daily(tenantId:string){
    return postgresClient.executeTenantScoped(tenantId,async client=>{
      const result=await client.query(`WITH day AS (${day}),cdr_day AS (
        SELECT * FROM cdr,day WHERE tenant_id=$1 AND start_time>=start_at AND start_time<start_at+INTERVAL '1 day'),
        sessions_day AS (SELECT * FROM ai_sessions,day WHERE tenant_id=$1 AND started_at>=start_at AND started_at<start_at+INTERVAL '1 day')
        SELECT (SELECT start_at FROM day) AS from_at,(SELECT start_at+INTERVAL '1 day' FROM day) AS to_at,
          (SELECT count(*) FROM cdr_day) AS calls,
          (SELECT count(*) FROM cdr_day WHERE disposition='ANSWERED') AS answered,
          (SELECT count(*) FROM cdr_day WHERE disposition<>'ANSWERED') AS missed,
          (SELECT avg(duration) FROM cdr_day) AS duration,
          (SELECT COALESCE(sum(cost_brl),0) FROM cdr_day) AS cost,
          (SELECT count(*) FROM sessions_day) AS sessions,
          (SELECT COALESCE(sum(tokens_input+tokens_output),0) FROM sessions_day) AS tokens,
          (SELECT count(*) FROM extensions WHERE tenant_id=$1) AS extensions,
          (SELECT count(*) FROM extensions WHERE tenant_id=$1 AND status='online') AS extensions_online,
          (SELECT count(*) FROM trunks WHERE tenant_id=$1) AS trunks,
          (SELECT count(*) FROM trunks WHERE tenant_id=$1 AND status='registered') AS trunks_online,
          (SELECT count(*) FROM ai_agents WHERE tenant_id=$1 AND is_active=true) AS agents,
          (SELECT avg(latency_ms) FROM ai_session_turns,day WHERE tenant_id=$1 AND role='assistant' AND latency_ms>0 AND created_at>=start_at AND created_at<start_at+INTERVAL '1 day') AS latency,
          (SELECT json_agg(hours ORDER BY hour) FROM (SELECT to_char(start_time AT TIME ZONE 'America/Fortaleza','HH24:00') AS hour,count(*)::int AS total,
            count(*) FILTER(WHERE ai_agent_id IS NOT NULL)::int AS ai FROM cdr_day GROUP BY 1) hours) AS hourly`,[tenantId]);
      const row=result.rows[0];const counts=new Map((row.hourly||[]).map((value:any)=>[value.hour,value]));
      return {callsToday:Number(row.calls),callsAnswered:Number(row.answered),callsMissed:Number(row.missed),callsActive:null,
        avgCallDurationSeconds:row.duration===null?null:Math.round(Number(row.duration)),extensionsTotal:Number(row.extensions),extensionsOnline:Number(row.extensions_online),
        trunksTotal:Number(row.trunks),trunksOnline:Number(row.trunks_online),aiAgentsActive:Number(row.agents),aiSessionsCount:Number(row.sessions),
        aiLatencyAvgMs:row.latency===null?null:Math.round(Number(row.latency)),humanTransferRatePercent:null,
        aiTokensUsedToday:Number(row.tokens),costEstimateTodayBrl:Number(row.cost),
        hourlyCallDistribution:Array.from({length:24},(_,index)=>{const hour=String(index).padStart(2,'0')+':00';return counts.get(hour)||{hour,total:0,ai:0};}),
        period:{from:row.from_at.toISOString(),to:row.to_at.toISOString(),timeZone:'America/Fortaleza'},observedAt:new Date().toISOString(),
        sourceNote:'Agregados de registros do banco. Estados de ramais/troncos são cadastrais; não certificam registro SIP, disponibilidade ou SLA.'};
    });
  }
}
