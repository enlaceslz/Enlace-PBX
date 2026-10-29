import {logOperational} from '../../security/OperationalLog.js';
import { postgresClient } from '../client.js';
import { toSafeIsoStringOrNow } from '../dateUtils.js';
import { AiKnowledgeSource } from '../../../../src/types/pbx.js';
import { TenantContext } from '../../auth/tenantContext.js';

export class AiKnowledgeRepository {
  public static async listAll(): Promise<AiKnowledgeSource[]> {
    return this.listAllGlobalForSuperAdmin();
  }

  public static async listAllGlobalForSuperAdmin(): Promise<AiKnowledgeSource[]> {
    return postgresClient.executeGlobalScoped(async (client) => {
      try {
        const res = await client.query(
          'SELECT * FROM ai_knowledge ORDER BY updated_at DESC'
        );
        return res.rows.map(row => ({
          id: row.id,
          tenantId: row.tenant_id,
          title: row.title,
          category: row.category,
          content: row.content,
          updatedAt: toSafeIsoStringOrNow(row.updated_at),
          fileName: row.file_name || undefined,
          fileType: row.file_type || undefined,
          fileSizeBytes: row.file_size_bytes ? parseInt(row.file_size_bytes, 10) : undefined,
        }));
      } catch (err: any) {
        logOperational('DB_OPERATION_FAILURE');
        throw err;
      }
    });
  }

  public static async listByTenant(contextOrTenant: TenantContext | string): Promise<AiKnowledgeSource[]> {
    return postgresClient.executeTenantScoped(contextOrTenant, async (client, ctx) => {
      try {
        const res = await client.query(
          'SELECT * FROM ai_knowledge WHERE tenant_id = $1 ORDER BY updated_at DESC',
          [ctx.tenantId]
        );
        return res.rows.map(row => ({
          id: row.id,
          tenantId: row.tenant_id,
          title: row.title,
          category: row.category,
          content: row.content,
          updatedAt: toSafeIsoStringOrNow(row.updated_at),
          fileName: row.file_name || undefined,
          fileType: row.file_type || undefined,
          fileSizeBytes: row.file_size_bytes ? parseInt(row.file_size_bytes, 10) : undefined,
        }));
      } catch (err: any) {
        logOperational('DB_OPERATION_FAILURE');
        throw err;
      }
    });
  }

  public static async findById(id: string, contextOrTenant?: TenantContext | string): Promise<AiKnowledgeSource | null> {
    if (!contextOrTenant || (typeof contextOrTenant === 'string' && contextOrTenant.trim() === '')) {
      // Regra Fail-Closed CS-148/CS-199: Tenant ausente produz recusa estrita de recurso
      return null;
    }
    return postgresClient.executeTenantScoped(contextOrTenant, async (client, ctx) => {
      try {
        const res = await client.query(
          'SELECT * FROM ai_knowledge WHERE id = $1 AND tenant_id = $2',
          [id, ctx.tenantId]
        );
        if (res.rows.length > 0) {
          const row = res.rows[0];
          return {
            id: row.id,
            tenantId: row.tenant_id,
            title: row.title,
            category: row.category,
            content: row.content,
            updatedAt: toSafeIsoStringOrNow(row.updated_at),
            fileName: row.file_name || undefined,
            fileType: row.file_type || undefined,
            fileSizeBytes: row.file_size_bytes ? parseInt(row.file_size_bytes, 10) : undefined,
          };
        }
        return null;
      } catch (err: any) {
        logOperational('DB_OPERATION_FAILURE');
        throw err;
      }
    });
  }

  public static async findAnyByIdForSuperAdmin(id: string): Promise<AiKnowledgeSource | null> {
    return postgresClient.executeGlobalScoped(async (client) => {
      try {
        const res = await client.query('SELECT * FROM ai_knowledge WHERE id = $1', [id]);
        if (res.rows.length > 0) {
          const row = res.rows[0];
          return {
            id: row.id,
            tenantId: row.tenant_id,
            title: row.title,
            category: row.category,
            content: row.content,
            updatedAt: toSafeIsoStringOrNow(row.updated_at),
            fileName: row.file_name || undefined,
            fileType: row.file_type || undefined,
            fileSizeBytes: row.file_size_bytes ? parseInt(row.file_size_bytes, 10) : undefined,
          };
        }
        return null;
      } catch (err: any) {
        logOperational('DB_OPERATION_FAILURE');
        throw err;
      }
    });
  }

  public static async save(source: AiKnowledgeSource, contextOrTenant?: TenantContext | string): Promise<AiKnowledgeSource> {
    const target = contextOrTenant || source.tenantId;
    return postgresClient.executeTenantScoped(target, async (client, ctx) => {
      try {
        await client.query(
          `INSERT INTO ai_knowledge (
            id, tenant_id, title, category, content,
            file_name, file_type, file_size_bytes, updated_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, CURRENT_TIMESTAMP)
          ON CONFLICT (id) DO UPDATE SET
            title = EXCLUDED.title,
            category = EXCLUDED.category,
            content = EXCLUDED.content,
            file_name = EXCLUDED.file_name,
            file_type = EXCLUDED.file_type,
            file_size_bytes = EXCLUDED.file_size_bytes,
            updated_at = CURRENT_TIMESTAMP`,
          [
            source.id,
            ctx.tenantId,
            source.title,
            source.category || 'Geral',
            source.content,
            source.fileName || null,
            source.fileType || null,
            source.fileSizeBytes || null
          ]
        );
        return source;
      } catch (err: any) {
        logOperational('DB_OPERATION_FAILURE');
        throw err;
      }
    });
  }

  public static async delete(id: string, contextOrTenant?: TenantContext | string): Promise<boolean> {
    if (!contextOrTenant || (typeof contextOrTenant === 'string' && contextOrTenant.trim() === '')) {
      throw new Error('TENANT_REQUIRED: Deleção de base de conhecimento requer tenantId explícito (Fail-Closed).');
    }
    return postgresClient.executeTenantScoped(contextOrTenant, async (client, ctx) => {
      try {
        const res = await client.query(
          'DELETE FROM ai_knowledge WHERE id = $1 AND tenant_id = $2',
          [id, ctx.tenantId]
        );
        return (res.rowCount ?? 0) > 0;
      } catch (err: any) {
        logOperational('DB_OPERATION_FAILURE');
        throw err;
      }
    });
  }

  public static async deleteAnyForSuperAdmin(id: string): Promise<boolean> {
    return postgresClient.executeGlobalScoped(async (client) => {
      try {
        const res = await client.query('DELETE FROM ai_knowledge WHERE id = $1', [id]);
        return (res.rowCount ?? 0) > 0;
      } catch (err: any) {
        logOperational('DB_OPERATION_FAILURE');
        throw err;
      }
    });
  }
}
