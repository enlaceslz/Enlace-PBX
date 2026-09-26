import { postgresClient } from '../client';
import { RingGroup } from '../../../../src/types/pbx';

export class RingGroupRepository {
  public static async listAll(): Promise<RingGroup[]> {
    try {
      const res = await postgresClient.query(
        'SELECT * FROM ring_groups ORDER BY number ASC'
      );
      return res.rows.map(row => ({
        id: row.id,
        tenantId: row.tenant_id,
        name: row.name,
        number: row.number,
        strategy: row.strategy || 'ringall',
        timeoutSeconds: row.timeout_seconds || 25,
        members: typeof row.extensions === 'string' ? JSON.parse(row.extensions) : (row.extensions || []),
        failoverDestination: row.fallback_target || 'voicemail',
      }));
    } catch (err: any) {
      console.error('[RingGroupRepository.listAll] Erro no PostgreSQL:', err?.message || err);
      throw err;
    }
  }

  public static async listByTenant(tenantId: string): Promise<RingGroup[]> {
    try {
      const res = await postgresClient.query(
        'SELECT * FROM ring_groups WHERE tenant_id = $1 ORDER BY number ASC',
        [tenantId]
      );
      return res.rows.map(row => ({
        id: row.id,
        tenantId: row.tenant_id,
        name: row.name,
        number: row.number,
        strategy: row.strategy || 'ringall',
        timeoutSeconds: row.timeout_seconds || 25,
        members: typeof row.extensions === 'string' ? JSON.parse(row.extensions) : (row.extensions || []),
        failoverDestination: row.fallback_target || 'voicemail',
      }));
    } catch (err: any) {
      console.error('[RingGroupRepository.listByTenant] Erro no PostgreSQL:', err?.message || err);
      throw err;
    }
  }

  public static async findById(id: string, tenantId?: string): Promise<RingGroup | null> {
    try {
      let query = 'SELECT * FROM ring_groups WHERE id = $1';
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
          name: row.name,
          number: row.number,
          strategy: row.strategy || 'ringall',
          timeoutSeconds: row.timeout_seconds || 25,
          members: typeof row.extensions === 'string' ? JSON.parse(row.extensions) : (row.extensions || []),
          failoverDestination: row.fallback_target || 'voicemail',
        };
      }
      return null;
    } catch (err: any) {
      console.error('[RingGroupRepository.findById] Erro no PostgreSQL:', err?.message || err);
      throw err;
    }
  }

  public static async findAnyByIdForSuperAdmin(id: string): Promise<RingGroup | null> {
    return this.findById(id);
  }

  public static async save(group: RingGroup): Promise<RingGroup> {
    try {
      await postgresClient.query(
        `INSERT INTO ring_groups (
          id, tenant_id, name, number, strategy, timeout_seconds,
          extensions, fallback_type, fallback_target
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        ON CONFLICT (id) DO UPDATE SET
          name = EXCLUDED.name,
          number = EXCLUDED.number,
          strategy = EXCLUDED.strategy,
          timeout_seconds = EXCLUDED.timeout_seconds,
          extensions = EXCLUDED.extensions,
          fallback_type = EXCLUDED.fallback_type,
          fallback_target = EXCLUDED.fallback_target,
          updated_at = CURRENT_TIMESTAMP`,
        [
          group.id,
          group.tenantId,
          group.name,
          group.number,
          group.strategy || 'ringall',
          group.timeoutSeconds || 25,
          JSON.stringify(group.members || []),
          'destination',
          group.failoverDestination || 'voicemail'
        ]
      );
      return group;
    } catch (err: any) {
      console.error('[RingGroupRepository.save] Erro no PostgreSQL:', err?.message || err);
      throw err;
    }
  }

  public static async delete(id: string, tenantId?: string): Promise<boolean> {
    try {
      let query = 'DELETE FROM ring_groups WHERE id = $1';
      const params: any[] = [id];
      if (tenantId && tenantId.trim() !== '') {
        query += ' AND tenant_id = $2';
        params.push(tenantId.trim());
      }
      const res = await postgresClient.query(query, params);
      return (res.rowCount ?? 0) > 0;
    } catch (err: any) {
      console.error('[RingGroupRepository.delete] Erro no PostgreSQL:', err?.message || err);
      throw err;
    }
  }
}
