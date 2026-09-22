import { postgresClient } from '../client';
import { AiKnowledgeSource } from '../../../../src/types/pbx';

export class AiKnowledgeRepository {
  public static async listByTenant(tenantId: string): Promise<AiKnowledgeSource[]> {
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
      updatedAt: row.updated_at ? row.updated_at.toISOString() : new Date().toISOString(),
      fileName: row.file_name || undefined,
      fileType: row.file_type || undefined,
      fileSizeBytes: row.file_size_bytes ? parseInt(row.file_size_bytes, 10) : undefined,
    }));
  }

  public static async findById(id: string, tenantId?: string): Promise<AiKnowledgeSource | null> {
    let query = 'SELECT * FROM ai_knowledge WHERE id = $1';
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
        title: row.title,
        category: row.category,
        content: row.content,
        updatedAt: row.updated_at ? row.updated_at.toISOString() : new Date().toISOString(),
        fileName: row.file_name || undefined,
        fileType: row.file_type || undefined,
        fileSizeBytes: row.file_size_bytes ? parseInt(row.file_size_bytes, 10) : undefined,
      };
    }
    return null;
  }

  public static async save(source: AiKnowledgeSource): Promise<AiKnowledgeSource> {
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
  }

  public static async delete(id: string, tenantId?: string): Promise<boolean> {
    let query = 'DELETE FROM ai_knowledge WHERE id = $1';
    const params: any[] = [id];
    if (tenantId) {
      query += ' AND tenant_id = $2';
      params.push(tenantId);
    }
    const res = await postgresClient.query(query, params);
    return (res.rowCount ?? 0) > 0;
  }
}
