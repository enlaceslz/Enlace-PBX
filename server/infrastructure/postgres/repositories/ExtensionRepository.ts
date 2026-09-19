import { postgresClient } from '../client';
import { db, Extension } from '../../../db';

export class ExtensionRepository {
  public static async listByTenant(tenantId: string): Promise<Extension[]> {
    if (postgresClient.isConnected()) {
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
          codecs: row.codecs || ['opus', 'alaw', 'ulaw'],
          nat: row.nat,
          webrtc: row.webrtc,
          recording: row.recording,
          voicemail: row.voicemail,
          dnd: row.dnd,
          status: row.status,
          ipAddress: row.ip_address || undefined,
          allowAiTransfer: row.allow_ai_transfer,
        }));
      } catch (err: any) {
        console.error('[ExtensionRepository] Erro ao listar ramais no Postgres:', err.message);
      }
    }
    return db.extensions.filter(e => e.tenantId === tenantId);
  }

  public static async findByNumber(tenantId: string, number: string): Promise<Extension | null> {
    if (postgresClient.isConnected()) {
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
            codecs: row.codecs || ['opus', 'alaw', 'ulaw'],
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
      } catch (err: any) {
        console.error('[ExtensionRepository] Erro ao buscar ramal por número:', err.message);
      }
    }
    return db.extensions.find(e => e.tenantId === tenantId && e.number === number) || null;
  }

  public static async save(ext: Extension): Promise<Extension> {
    if (postgresClient.isConnected()) {
      try {
        await postgresClient.query(
          `INSERT INTO extensions (id, tenant_id, number, name, sip_secret, context, caller_id, cli_caller_id, codecs, nat, webrtc, recording, voicemail, dnd, status, ip_address, allow_ai_transfer)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
           ON CONFLICT (tenant_id, number) DO UPDATE
           SET name = EXCLUDED.name,
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
            ext.callerId, ext.cliCallerId || null, JSON.stringify(ext.codecs),
            ext.nat, ext.webrtc, ext.recording, ext.voicemail, ext.dnd,
            ext.status, ext.ipAddress || null, ext.allowAiTransfer
          ]
        );
      } catch (err: any) {
        console.error('[ExtensionRepository] Erro ao salvar ramal no Postgres:', err.message);
      }
    }

    const idx = db.extensions.findIndex(e => e.id === ext.id || (e.tenantId === ext.tenantId && e.number === ext.number));
    if (idx >= 0) {
      db.extensions[idx] = ext;
    } else {
      db.extensions.push(ext);
    }
    return ext;
  }

  public static async delete(tenantId: string, id: string): Promise<boolean> {
    if (postgresClient.isConnected()) {
      try {
        await postgresClient.query('DELETE FROM extensions WHERE tenant_id = $1 AND id = $2', [tenantId, id]);
      } catch (err: any) {
        console.error('[ExtensionRepository] Erro ao deletar ramal no Postgres:', err.message);
      }
    }
    const prevLen = db.extensions.length;
    db.extensions = db.extensions.filter(e => !(e.tenantId === tenantId && e.id === id));
    return db.extensions.length < prevLen;
  }
}
