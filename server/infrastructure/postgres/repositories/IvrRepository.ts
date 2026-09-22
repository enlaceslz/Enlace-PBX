import { postgresClient } from '../client';
import { Ivr } from '../../../../src/types/pbx';

export class IvrRepository {
  public static async listByTenant(tenantId: string): Promise<Ivr[]> {
    const res = await postgresClient.query(
      'SELECT * FROM ivrs WHERE tenant_id = $1 ORDER BY number ASC',
      [tenantId]
    );
    return res.rows.map(row => ({
      id: row.id,
      tenantId: row.tenant_id,
      name: row.name,
      number: row.number,
      audioPrompt: row.audio_prompt,
      timeoutSeconds: row.timeout_seconds || 10,
      invalidRetries: row.invalid_retries || 3,
      options: typeof row.options === 'string' ? JSON.parse(row.options) : (row.options || []),
      flow: typeof row.flow === 'string' ? JSON.parse(row.flow) : (row.flow || undefined),
    }));
  }

  public static async findById(id: string, tenantId?: string): Promise<Ivr | null> {
    let query = 'SELECT * FROM ivrs WHERE id = $1';
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
        name: row.name,
        number: row.number,
        audioPrompt: row.audio_prompt,
        timeoutSeconds: row.timeout_seconds || 10,
        invalidRetries: row.invalid_retries || 3,
        options: typeof row.options === 'string' ? JSON.parse(row.options) : (row.options || []),
        flow: typeof row.flow === 'string' ? JSON.parse(row.flow) : (row.flow || undefined),
      };
    }
    return null;
  }

  public static async save(ivr: Ivr): Promise<Ivr> {
    await postgresClient.query(
      `INSERT INTO ivrs (
        id, tenant_id, name, number, audio_prompt, timeout_seconds,
        invalid_retries, options, flow
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      ON CONFLICT (id) DO UPDATE SET
        name = EXCLUDED.name,
        number = EXCLUDED.number,
        audio_prompt = EXCLUDED.audio_prompt,
        timeout_seconds = EXCLUDED.timeout_seconds,
        invalid_retries = EXCLUDED.invalid_retries,
        options = EXCLUDED.options,
        flow = EXCLUDED.flow,
        updated_at = CURRENT_TIMESTAMP`,
      [
        ivr.id,
        ivr.tenantId,
        ivr.name,
        ivr.number,
        ivr.audioPrompt || '',
        ivr.timeoutSeconds || 10,
        ivr.invalidRetries || 3,
        JSON.stringify(ivr.options || []),
        ivr.flow ? JSON.stringify(ivr.flow) : null
      ]
    );
    return ivr;
  }

  public static async delete(id: string, tenantId?: string): Promise<boolean> {
    let query = 'DELETE FROM ivrs WHERE id = $1';
    const params: any[] = [id];
    if (tenantId) {
      query += ' AND tenant_id = $2';
      params.push(tenantId);
    }
    const res = await postgresClient.query(query, params);
    return (res.rowCount ?? 0) > 0;
  }
}
