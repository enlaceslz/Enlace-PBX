import { postgresClient } from '../client';
import { Queue } from '../../../../src/types/pbx';
import { initialSeedData } from '../seedData';

export class QueueRepository {
  public static async listAll(): Promise<Queue[]> {
    try {
      const res = await postgresClient.query(
        'SELECT * FROM queues ORDER BY number ASC'
      );
      return res.rows.map(row => ({
        id: row.id,
        tenantId: row.tenant_id,
        name: row.name,
        number: row.number,
        strategy: (row.strategy || 'ringall') as any,
        timeoutSeconds: row.timeout_seconds || 30,
        wrapUpTimeSeconds: row.wrap_up_time_seconds || 15,
        mohSound: row.moh_sound || 'default',
        slaTargetSeconds: row.sla_target_seconds || 20,
        members: typeof row.members === 'string' ? JSON.parse(row.members) : (row.members || []),
        callsWaiting: row.calls_waiting || 0,
        avgWaitTimeSeconds: row.avg_wait_time_seconds || 0,
        abandonedToday: row.abandoned_today || 0,
        answeredToday: row.answered_today || 0,
      }));
    } catch {
      return [...initialSeedData.queues];
    }
  }

  public static async listByTenant(tenantId: string): Promise<Queue[]> {
    try {
      const res = await postgresClient.query(
        'SELECT * FROM queues WHERE tenant_id = $1 ORDER BY number ASC',
        [tenantId]
      );
      return res.rows.map(row => ({
        id: row.id,
        tenantId: row.tenant_id,
        name: row.name,
        number: row.number,
        strategy: (row.strategy || 'ringall') as any,
        timeoutSeconds: row.timeout_seconds || 30,
        wrapUpTimeSeconds: row.wrap_up_time_seconds || 15,
        mohSound: row.moh_sound || 'default',
        slaTargetSeconds: row.sla_target_seconds || 20,
        members: typeof row.members === 'string' ? JSON.parse(row.members) : (row.members || []),
        callsWaiting: row.calls_waiting || 0,
        avgWaitTimeSeconds: row.avg_wait_time_seconds || 0,
        abandonedToday: row.abandoned_today || 0,
        answeredToday: row.answered_today || 0,
      }));
    } catch {
      return initialSeedData.queues.filter(q => q.tenantId === tenantId);
    }
  }

  public static async findById(id: string, tenantId?: string): Promise<Queue | null> {
    try {
      let query = 'SELECT * FROM queues WHERE id = $1';
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
          strategy: (row.strategy || 'ringall') as any,
          timeoutSeconds: row.timeout_seconds || 30,
          wrapUpTimeSeconds: row.wrap_up_time_seconds || 15,
          mohSound: row.moh_sound || 'default',
          slaTargetSeconds: row.sla_target_seconds || 20,
          members: typeof row.members === 'string' ? JSON.parse(row.members) : (row.members || []),
          callsWaiting: row.calls_waiting || 0,
          avgWaitTimeSeconds: row.avg_wait_time_seconds || 0,
          abandonedToday: row.abandoned_today || 0,
          answeredToday: row.answered_today || 0,
        };
      }
      return null;
    } catch {
      const q = initialSeedData.queues.find(queue => queue.id === id && (!tenantId || queue.tenantId === tenantId));
      return q ? { ...q } : null;
    }
  }

  public static async save(queue: Queue): Promise<Queue> {
    try {
      await postgresClient.query(
        `INSERT INTO queues (
          id, tenant_id, name, number, strategy, timeout_seconds,
          wrap_up_time_seconds, moh_sound, sla_target_seconds, members,
          calls_waiting, avg_wait_time_seconds, abandoned_today, answered_today
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
        ON CONFLICT (id) DO UPDATE SET
          name = EXCLUDED.name,
          number = EXCLUDED.number,
          strategy = EXCLUDED.strategy,
          timeout_seconds = EXCLUDED.timeout_seconds,
          wrap_up_time_seconds = EXCLUDED.wrap_up_time_seconds,
          moh_sound = EXCLUDED.moh_sound,
          sla_target_seconds = EXCLUDED.sla_target_seconds,
          members = EXCLUDED.members,
          updated_at = CURRENT_TIMESTAMP`,
        [
          queue.id,
          queue.tenantId,
          queue.name,
          queue.number,
          queue.strategy || 'ringall',
          queue.timeoutSeconds || 30,
          queue.wrapUpTimeSeconds || 15,
          queue.mohSound || 'default',
          queue.slaTargetSeconds || 20,
          JSON.stringify(queue.members || []),
          queue.callsWaiting || 0,
          queue.avgWaitTimeSeconds || 0,
          queue.abandonedToday || 0,
          queue.answeredToday || 0
        ]
      );
    } catch {
      const idx = initialSeedData.queues.findIndex(q => q.id === queue.id);
      if (idx !== -1) {
        initialSeedData.queues[idx] = { ...queue };
      } else {
        initialSeedData.queues.push({ ...queue });
      }
    }
    return queue;
  }

  public static async delete(id: string, tenantId?: string): Promise<boolean> {
    try {
      let query = 'DELETE FROM queues WHERE id = $1';
      const params: any[] = [id];
      if (tenantId) {
        query += ' AND tenant_id = $2';
        params.push(tenantId);
      }
      const res = await postgresClient.query(query, params);
      return (res.rowCount ?? 0) > 0;
    } catch {
      const idx = initialSeedData.queues.findIndex(q => q.id === id && (!tenantId || q.tenantId === tenantId));
      if (idx !== -1) {
        initialSeedData.queues.splice(idx, 1);
        return true;
      }
      return false;
    }
  }
}
