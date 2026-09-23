import { postgresClient } from '../client';
import { Extension } from '../../../../src/types/pbx';
import { initialSeedData } from '../seedData';

export class ExtensionRepository {
  public static async listAll(): Promise<Extension[]> {
    try {
      const res = await postgresClient.query(
        'SELECT * FROM extensions ORDER BY number ASC'
      );
      return res.rows.map(row => ({
        id: row.id,
        tenantId: row.tenant_id,
        number: row.number,
        name: row.name,
        sipSecret: row.sip_secret,
        context: row.context,
        callerId: row.caller_id,
        cliCallerId: row.cli_caller_id || undefined,
        codecs: typeof row.codecs === 'string' ? JSON.parse(row.codecs) : (row.codecs || ['opus', 'alaw', 'ulaw']),
        nat: row.nat,
        webrtc: row.webrtc,
        recording: row.recording,
        voicemail: row.voicemail,
        dnd: row.dnd,
        status: row.status,
        ipAddress: row.ip_address || undefined,
        allowAiTransfer: row.allow_ai_transfer,
      }));
    } catch {
      return [...initialSeedData.extensions];
    }
  }

  public static async listByTenant(tenantId: string): Promise<Extension[]> {
    try {
      const res = await postgresClient.query(
        'SELECT * FROM extensions WHERE tenant_id = $1 ORDER BY number ASC',
        [tenantId]
      );
      return res.rows.map(row => ({
        id: row.id,
        tenantId: row.tenant_id,
        number: row.number,
        name: row.name,
        sipSecret: row.sip_secret,
        context: row.context,
        callerId: row.caller_id,
        cliCallerId: row.cli_caller_id || undefined,
        codecs: typeof row.codecs === 'string' ? JSON.parse(row.codecs) : (row.codecs || ['opus', 'alaw', 'ulaw']),
        nat: row.nat,
        webrtc: row.webrtc,
        recording: row.recording,
        voicemail: row.voicemail,
        dnd: row.dnd,
        status: row.status,
        ipAddress: row.ip_address || undefined,
        allowAiTransfer: row.allow_ai_transfer,
      }));
    } catch {
      return initialSeedData.extensions.filter(e => e.tenantId === tenantId);
    }
  }

  public static async findByNumber(tenantId: string, number: string): Promise<Extension | null> {
    try {
      const res = await postgresClient.query(
        'SELECT * FROM extensions WHERE tenant_id = $1 AND number = $2',
        [tenantId, number]
      );
      if (res.rows.length > 0) {
        const row = res.rows[0];
        return {
          id: row.id,
          tenantId: row.tenant_id,
          number: row.number,
          name: row.name,
          sipSecret: row.sip_secret,
          context: row.context,
          callerId: row.caller_id,
          cliCallerId: row.cli_caller_id || undefined,
          codecs: typeof row.codecs === 'string' ? JSON.parse(row.codecs) : (row.codecs || ['opus', 'alaw', 'ulaw']),
          nat: row.nat,
          webrtc: row.webrtc,
          recording: row.recording,
          voicemail: row.voicemail,
          dnd: row.dnd,
          status: row.status,
          ipAddress: row.ip_address || undefined,
          allowAiTransfer: row.allow_ai_transfer,
        };
      }
      return null;
    } catch {
      const ext = initialSeedData.extensions.find(e => e.tenantId === tenantId && e.number === number);
      return ext ? { ...ext } : null;
    }
  }

  public static async findById(id: string, tenantId?: string): Promise<Extension | null> {
    try {
      let query = 'SELECT * FROM extensions WHERE id = $1';
      const params: any[] = [id];
      if (tenantId) {
        query += ' AND tenant_id = $2';
        params.push(tenantId);
      }
      const res = await postgresClient.query(query, params);
      if (res.rows.length > 0) {
        const row = res.rows[0];
        return {
          id: row.id,
          tenantId: row.tenant_id,
          number: row.number,
          name: row.name,
          sipSecret: row.sip_secret,
          context: row.context,
          callerId: row.caller_id,
          cliCallerId: row.cli_caller_id || undefined,
          codecs: typeof row.codecs === 'string' ? JSON.parse(row.codecs) : (row.codecs || ['opus', 'alaw', 'ulaw']),
          nat: row.nat,
          webrtc: row.webrtc,
          recording: row.recording,
          voicemail: row.voicemail,
          dnd: row.dnd,
          status: row.status,
          ipAddress: row.ip_address || undefined,
          allowAiTransfer: row.allow_ai_transfer,
        };
      }
      return null;
    } catch {
      const ext = initialSeedData.extensions.find(e => e.id === id && (!tenantId || e.tenantId === tenantId));
      return ext ? { ...ext } : null;
    }
  }

  public static async save(ext: Extension): Promise<Extension> {
    try {
      await postgresClient.query(
        `INSERT INTO extensions (id, tenant_id, number, name, sip_secret, context, caller_id, cli_caller_id, codecs, nat, webrtc, recording, voicemail, dnd, status, ip_address, allow_ai_transfer)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
         ON CONFLICT (id) DO UPDATE
         SET name = EXCLUDED.name,
             number = EXCLUDED.number,
             sip_secret = EXCLUDED.sip_secret,
             context = EXCLUDED.context,
             caller_id = EXCLUDED.caller_id,
             cli_caller_id = EXCLUDED.cli_caller_id,
             codecs = EXCLUDED.codecs,
             nat = EXCLUDED.nat,
             webrtc = EXCLUDED.webrtc,
             recording = EXCLUDED.recording,
             voicemail = EXCLUDED.voicemail,
             dnd = EXCLUDED.dnd,
             status = EXCLUDED.status,
             ip_address = EXCLUDED.ip_address,
             allow_ai_transfer = EXCLUDED.allow_ai_transfer,
             updated_at = CURRENT_TIMESTAMP`,
        [
          ext.id, ext.tenantId, ext.number, ext.name, ext.sipSecret, ext.context,
          ext.callerId, ext.cliCallerId || null, JSON.stringify(ext.codecs || ['opus', 'alaw', 'ulaw']),
          ext.nat ?? true, ext.webrtc ?? true, ext.recording ?? true, ext.voicemail ?? false, ext.dnd ?? false,
          ext.status || 'offline', ext.ipAddress || null, ext.allowAiTransfer ?? true
        ]
      );
    } catch {
      const idx = initialSeedData.extensions.findIndex(e => e.id === ext.id);
      if (idx !== -1) {
        initialSeedData.extensions[idx] = { ...ext };
      } else {
        initialSeedData.extensions.push({ ...ext });
      }
    }
    return ext;
  }

  public static async delete(tenantId: string, id: string): Promise<boolean> {
    try {
      const res = await postgresClient.query(
        'DELETE FROM extensions WHERE tenant_id = $1 AND (id = $2 OR number = $2)',
        [tenantId, id]
      );
      return (res.rowCount ?? 0) > 0;
    } catch {
      const idx = initialSeedData.extensions.findIndex(e => e.tenantId === tenantId && (e.id === id || e.number === id));
      if (idx !== -1) {
        initialSeedData.extensions.splice(idx, 1);
        return true;
      }
      return false;
    }
  }
}
