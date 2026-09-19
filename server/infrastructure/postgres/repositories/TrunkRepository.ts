import { postgresClient } from '../client';
import { Trunk } from '../../../../src/types/pbx';
import { initialSeedData } from '../seedData';

export class TrunkRepository {
  public static async listByTenant(tenantId: string): Promise<Trunk[]> {
    if (postgresClient.isConnected()) {
      try {
        const res = await postgresClient.query(
          'SELECT * FROM trunks WHERE tenant_id = $1 ORDER BY name ASC',
          [tenantId]
        );
        return res.rows.map(row => ({
          id: row.id,
          tenantId: row.tenant_id,
          name: row.name,
          providerName: row.provider_name,
          host: row.host,
          port: row.port,
          username: row.username,
          secretMasked: row.secret_masked,
          transport: row.transport,
          callerId: row.caller_id,
          codecs: row.codecs || [],
          context: row.context,
          register: row.register,
          status: row.status,
          channelsMax: row.channels_max,
          channelsInUse: row.channels_in_use,
          authMode: row.auth_mode,
          authorizedIps: row.authorized_ips || [],
          inboundContext: row.inbound_context,
          sendPai: row.send_pai,
          sendRpid: row.send_rpid,
          directMedia: row.direct_media,
          dtmfMode: row.dtmf_mode,
          fromDomain: row.from_domain,
          fromUser: row.from_user,
          qualifyFrequency: row.qualify_frequency,
          outboundProxy: row.outbound_proxy,
          callerIdMode: row.caller_id_mode,
          failoverTrunkId: row.failover_trunk_id,
          lastPingLatencyMs: row.last_ping_latency_ms,
          lastPingStatus: row.last_ping_status,
          lastPingAt: row.last_ping_at ? row.last_ping_at.toISOString() : undefined,
        }));
      } catch (err: any) {
        console.error('[TrunkRepository] Erro ao listar troncos no Postgres:', err.message);
      }
    }
    return initialSeedData.trunks.filter(t => t.tenantId === tenantId);
  }

  public static async findById(tenantId: string, id: string): Promise<Trunk | null> {
    if (postgresClient.isConnected()) {
      try {
        const res = await postgresClient.query(
          'SELECT * FROM trunks WHERE tenant_id = $1 AND id = $2',
          [tenantId, id]
        );
        if (res.rows.length > 0) {
          const row = res.rows[0];
          return {
            id: row.id,
            tenantId: row.tenant_id,
            name: row.name,
            providerName: row.provider_name,
            host: row.host,
            port: row.port,
            username: row.username,
            secretMasked: row.secret_masked,
            transport: row.transport,
            callerId: row.caller_id,
            codecs: row.codecs || [],
            context: row.context,
            register: row.register,
            status: row.status,
            channelsMax: row.channels_max,
            channelsInUse: row.channels_in_use,
            authMode: row.auth_mode,
            authorizedIps: row.authorized_ips || [],
            inboundContext: row.inbound_context,
            sendPai: row.send_pai,
            sendRpid: row.send_rpid,
            directMedia: row.direct_media,
            dtmfMode: row.dtmf_mode,
            fromDomain: row.from_domain,
            fromUser: row.from_user,
            qualifyFrequency: row.qualify_frequency,
            outboundProxy: row.outbound_proxy,
            callerIdMode: row.caller_id_mode,
            failoverTrunkId: row.failover_trunk_id,
            lastPingLatencyMs: row.last_ping_latency_ms,
            lastPingStatus: row.last_ping_status,
            lastPingAt: row.last_ping_at ? row.last_ping_at.toISOString() : undefined,
          };
        }
        return null;
      } catch (err: any) {
        console.error('[TrunkRepository] Erro ao buscar tronco por id:', err.message);
      }
    }
    return initialSeedData.trunks.find(t => t.tenantId === tenantId && t.id === id) || null;
  }

  public static async save(trunk: Trunk): Promise<Trunk> {
    if (postgresClient.isConnected()) {
      try {
        await postgresClient.query(
          `INSERT INTO trunks (id, tenant_id, name, provider_name, host, port, username, secret_masked, transport, caller_id, codecs, context, register, status, channels_max, channels_in_use, auth_mode, authorized_ips, inbound_context, send_pai, send_rpid, direct_media, dtmf_mode, from_domain, from_user, qualify_frequency, outbound_proxy, caller_id_mode, failover_trunk_id, last_ping_latency_ms, last_ping_status, last_ping_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, $30, $31, $32)
           ON CONFLICT (id) DO UPDATE
           SET name = EXCLUDED.name,
               provider_name = EXCLUDED.provider_name,
               host = EXCLUDED.host,
               port = EXCLUDED.port,
               username = EXCLUDED.username,
               secret_masked = EXCLUDED.secret_masked,
               transport = EXCLUDED.transport,
               caller_id = EXCLUDED.caller_id,
               codecs = EXCLUDED.codecs,
               context = EXCLUDED.context,
               register = EXCLUDED.register,
               status = EXCLUDED.status,
               channels_max = EXCLUDED.channels_max,
               channels_in_use = EXCLUDED.channels_in_use,
               auth_mode = EXCLUDED.auth_mode,
               authorized_ips = EXCLUDED.authorized_ips,
               inbound_context = EXCLUDED.inbound_context,
               send_pai = EXCLUDED.send_pai,
               send_rpid = EXCLUDED.send_rpid,
               direct_media = EXCLUDED.direct_media,
               dtmf_mode = EXCLUDED.dtmf_mode,
               from_domain = EXCLUDED.from_domain,
               from_user = EXCLUDED.from_user,
               qualify_frequency = EXCLUDED.qualify_frequency,
               outbound_proxy = EXCLUDED.outbound_proxy,
               caller_id_mode = EXCLUDED.caller_id_mode,
               failover_trunk_id = EXCLUDED.failover_trunk_id,
               last_ping_latency_ms = EXCLUDED.last_ping_latency_ms,
               last_ping_status = EXCLUDED.last_ping_status,
               last_ping_at = EXCLUDED.last_ping_at,
               updated_at = CURRENT_TIMESTAMP`,
          [
            trunk.id, trunk.tenantId, trunk.name, trunk.providerName, trunk.host, trunk.port || 5060,
            trunk.username || '', trunk.secretMasked || '', trunk.transport || 'UDP', trunk.callerId || '',
            JSON.stringify(trunk.codecs || []), trunk.context || 'from-trunk', trunk.register || false,
            trunk.status || 'unregistered', trunk.channelsMax || 30, trunk.channelsInUse || 0,
            trunk.authMode || 'ip', JSON.stringify(trunk.authorizedIps || []),
            trunk.inboundContext || 'from-trunk', trunk.sendPai || false, trunk.sendRpid || false,
            trunk.directMedia || false, trunk.dtmfMode || 'rfc4733', trunk.fromDomain || null,
            trunk.fromUser || null, trunk.qualifyFrequency || 60, trunk.outboundProxy || null,
            trunk.callerIdMode || 'from', trunk.failoverTrunkId || null, trunk.lastPingLatencyMs || null,
            trunk.lastPingStatus || null, trunk.lastPingAt ? new Date(trunk.lastPingAt) : null
          ]
        );
      } catch (err: any) {
        console.error('[TrunkRepository] Erro ao salvar tronco no Postgres:', err.message);
      }
    }

    const idx = initialSeedData.trunks.findIndex(t => t.id === trunk.id);
    if (idx >= 0) {
      initialSeedData.trunks[idx] = trunk;
    } else {
      initialSeedData.trunks.push(trunk);
    }
    return trunk;
  }

  public static async delete(tenantId: string, id: string): Promise<boolean> {
    if (postgresClient.isConnected()) {
      try {
        await postgresClient.query('DELETE FROM trunks WHERE tenant_id = $1 AND id = $2', [tenantId, id]);
      } catch (err: any) {
        console.error('[TrunkRepository] Erro ao deletar tronco no Postgres:', err.message);
      }
    }
    const prevLen = initialSeedData.trunks.length;
    initialSeedData.trunks = initialSeedData.trunks.filter(t => !(t.tenantId === tenantId && t.id === id));
    return initialSeedData.trunks.length < prevLen;
  }
}
