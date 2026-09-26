import { postgresClient } from '../client';
import { toSafeIsoStringOrNow } from '../dateUtils';
import { AiKnowledgeSource } from '../../../../src/types/pbx';

export class AiKnowledgeRepository {
  public static async listAll(): Promise<AiKnowledgeSource[]> {
    try {
      const res = await postgresClient.query(
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
      console.error('[AiKnowledgeRepository.listAll] Erro no PostgreSQL:', err?.message || err);
      throw err;
    }
  }

  public static async listByTenant(tenantId: string): Promise<AiKnowledgeSource[]> {
    try {
      const res = await postgresClient.query(
        'SELECT * FROM ai_knowledge WHERE tenant_id = $1 ORDER BY updated_at DESC',
        [tenantId]
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
      console.error('[AiKnowledgeRepository.listByTenant] Erro no PostgreSQL:', err?.message || err);
      throw err;
    }
  }

  public static async findById(id: string, tenantId?: string): Promise<AiKnowledgeSource | null> {
    try {
      let query = 'SELECT * FROM ai_knowledge WHERE id = $1';
      const params: any[] = [id];
      if (tenantId && tenantId.trim() !== '') {
        query += ' AND tenant_id = $2';
        params.push(tenantId.trim());
      }
      const res = await postgresClient.query(query, params);
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
      console.error('[AiKnowledgeRepository.findById] Erro no PostgreSQL:', err?.message || err);
      throw err;
    }
  }

  public static async findAnyByIdForSuperAdmin(id: string): Promise<AiKnowledgeSource | null> {
    return this.findById(id);
  }

  public static async save(source: AiKnowledgeSource): Promise<AiKnowledgeSource> {
    try {
      await postgresClient.query(
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
          source.tenantId,
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
      console.error('[AiKnowledgeRepository.save] Erro no PostgreSQL:', err?.message || err);
      throw err;
    }
  }

  public static async delete(id: string, tenantId?: string): Promise<boolean> {
    try {
      let query = 'DELETE FROM ai_knowledge WHERE id = $1';
      const params: any[] = [id];
      if (tenantId && tenantId.trim() !== '') {
        query += ' AND tenant_id = $2';
        params.push(tenantId.trim());
      }
      const res = await postgresClient.query(query, params);
      return (res.rowCount ?? 0) > 0;
    } catch (err: any) {
      console.error('[AiKnowledgeRepository.delete] Erro no PostgreSQL:', err?.message || err);
      throw err;
    }
  }
}
