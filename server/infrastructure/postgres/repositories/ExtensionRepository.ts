import { postgresClient } from '../client.js';
import { Extension, SafeExtension } from '../../../../src/types/pbx.js';
import { EncryptionService } from '../../security/EncryptionService.js';
import { TenantContext } from '../../auth/tenantContext.js';

export class ExtensionRepository {
  public static toSafeExtension(ext: Extension): SafeExtension {
    const { sipSecret, ...safe } = ext;
    return {
      ...safe,
      hasSipSecret: Boolean(sipSecret && sipSecret.trim() !== ''),
    };
  }

  public static async listAll(): Promise<Extension[]> {
    return this.listAllGlobalForSuperAdmin();
  }

  public static async listAllGlobalForSuperAdmin(): Promise<Extension[]> {
    return postgresClient.executeGlobalScoped(async (client) => {
      try {
        const res = await client.query('SELECT * FROM extensions ORDER BY number ASC');
        return res.rows.map(row => ({
          id: row.id,
          tenantId: row.tenant_id,
          number: row.number,
          name: row.name,
          sipSecret: EncryptionService.decrypt(row.sip_secret),
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
      } catch (err: any) {
        console.error('[ExtensionRepository.listAllGlobalForSuperAdmin] Erro no PostgreSQL sob transação RLS:', err?.message || err);
        throw err;
      }
    });
  }

  public static async listByTenant(contextOrTenant: TenantContext | string): Promise<Extension[]> {
    return postgresClient.executeTenantScoped(contextOrTenant, async (client, ctx) => {
      try {
        const res = await client.query(
          'SELECT * FROM extensions WHERE tenant_id = $1 ORDER BY number ASC',
          [ctx.tenantId]
        );
        return res.rows.map(row => ({
          id: row.id,
          tenantId: row.tenant_id,
          number: row.number,
          name: row.name,
          sipSecret: EncryptionService.decrypt(row.sip_secret),
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
      } catch (err: any) {
        console.error('[ExtensionRepository.listByTenant] Erro no PostgreSQL sob transação RLS:', err?.message || err);
        throw err;
      }
    });
  }

  public static async findByNumber(contextOrTenant: TenantContext | string, number: string): Promise<Extension | null> {
    return postgresClient.executeTenantScoped(contextOrTenant, async (client, ctx) => {
      try {
        const res = await client.query(
          'SELECT * FROM extensions WHERE tenant_id = $1 AND number = $2',
          [ctx.tenantId, number]
        );
        if (res.rows.length > 0) {
          const row = res.rows[0];
          return {
            id: row.id,
            tenantId: row.tenant_id,
            number: row.number,
            name: row.name,
            sipSecret: EncryptionService.decrypt(row.sip_secret),
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
      } catch (err: any) {
        console.error('[ExtensionRepository.findByNumber] Erro no PostgreSQL sob transação RLS:', err?.message || err);
        throw err;
      }
    });
  }

  public static async findById(id: string, contextOrTenant?: TenantContext | string): Promise<Extension | null> {
    if (!contextOrTenant || (typeof contextOrTenant === 'string' && contextOrTenant.trim() === '')) {
      // Regra Fail-Closed CS-148/CS-149: Tenant ausente produz recusa estrita de recurso
      return null;
    }
    return postgresClient.executeTenantScoped(contextOrTenant, async (client, ctx) => {
      try {
        const res = await client.query(
          'SELECT * FROM extensions WHERE id = $1 AND tenant_id = $2',
          [id, ctx.tenantId]
        );
        if (res.rows.length > 0) {
          const row = res.rows[0];
          return {
            id: row.id,
            tenantId: row.tenant_id,
            number: row.number,
            name: row.name,
            sipSecret: EncryptionService.decrypt(row.sip_secret),
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
      } catch (err: any) {
        console.error('[ExtensionRepository.findById] Erro no PostgreSQL sob transação RLS:', err?.message || err);
        throw err;
      }
    });
  }

  public static async findAnyByIdForSuperAdmin(id: string): Promise<Extension | null> {
    return postgresClient.executeGlobalScoped(async (client) => {
      try {
        const res = await client.query('SELECT * FROM extensions WHERE id = $1', [id]);
        if (res.rows.length > 0) {
          const row = res.rows[0];
          return {
            id: row.id,
            tenantId: row.tenant_id,
            number: row.number,
            name: row.name,
            sipSecret: EncryptionService.decrypt(row.sip_secret),
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
      } catch (err: any) {
        console.error('[ExtensionRepository.findAnyByIdForSuperAdmin] Erro no PostgreSQL sob transação RLS:', err?.message || err);
        throw err;
      }
    });
  }

  public static async save(ext: Extension, contextOrTenant?: TenantContext | string): Promise<Extension> {
    const target = contextOrTenant || ext.tenantId;
    return postgresClient.executeTenantScoped(target, async (client, ctx) => {
      try {
        const encryptedSecret = EncryptionService.encrypt(ext.sipSecret);

        await client.query(
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
            ext.id, ctx.tenantId, ext.number, ext.name, encryptedSecret, ext.context,
            ext.callerId, ext.cliCallerId || null, JSON.stringify(ext.codecs || ['opus', 'alaw', 'ulaw']),
            ext.nat ?? true, ext.webrtc ?? true, ext.recording ?? true, ext.voicemail ?? false, ext.dnd ?? false,
            ext.status || 'offline', ext.ipAddress || null, ext.allowAiTransfer ?? true
          ]
        );
        return ext;
      } catch (err: any) {
        console.error('[ExtensionRepository.save] Erro no PostgreSQL sob transação RLS:', err?.message || err);
        throw err;
      }
    });
  }

  public static async delete(id: string, contextOrTenant: TenantContext | string): Promise<boolean> {
    return postgresClient.executeTenantScoped(contextOrTenant, async (client, ctx) => {
      try {
        const res = await client.query(
          'DELETE FROM extensions WHERE tenant_id = $1 AND (id = $2 OR number = $2)',
          [ctx.tenantId, id]
        );
        return (res.rowCount ?? 0) > 0;
      } catch (err: any) {
        console.error('[ExtensionRepository.delete] Erro no PostgreSQL sob transação RLS:', err?.message || err);
        throw err;
      }
    });
  }
}
