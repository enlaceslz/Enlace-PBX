import { postgresClient } from '../client';
import { Did } from '../../../../src/types/pbx';
import { initialSeedData } from '../seedData';

export class DidRepository {
  private static mapRow(row: any): Did {
    return {
      id: row.id,
      tenantId: row.tenant_id,
      did: row.did,
      normalizedNumber: row.normalized_number,
      presentedNumber: row.presented_number,
      operatorName: row.operator_name,
      trunkId: row.trunk_id,
      description: row.description || '',
      status: row.status,
      assignedCompany: row.assigned_company || undefined,
      assignedCnpj: row.assigned_cnpj || undefined,
      assignedUser: row.assigned_user || undefined,
      monthlyFee: row.monthly_fee ? parseFloat(row.monthly_fee) : undefined,
      billingCycleDay: row.billing_cycle_day || undefined,
      destinationType: row.destination_type,
      destinationId: row.destination_id,
      destinationLabel: row.destination_label || undefined,
      timeConditionEnabled: row.time_condition_enabled,
      timeSchedule: row.time_schedule || undefined,
      afterHoursDestType: row.after_hours_dest_type || undefined,
      afterHoursDestId: row.after_hours_dest_id || undefined,
      fallbackType: row.fallback_type || undefined,
      fallbackTarget: row.fallback_target || undefined,
      didSourceHeader: row.did_source_header || 'to',
      customHeaderName: row.custom_header_name || undefined,
      unknownDidAction: row.unknown_did_action || 'reject_404',
      channelsInUse: row.channels_in_use || 0,
      totalCallsReceived: row.total_calls_received || 0,
      lastCallAt: row.last_call_at ? row.last_call_at.toISOString() : undefined,
      createdAt: row.created_at ? row.created_at.toISOString() : new Date().toISOString(),
      updatedAt: row.updated_at ? row.updated_at.toISOString() : new Date().toISOString(),
    };
  }

  public static async listAll(): Promise<Did[]> {
    try {
      const res = await postgresClient.query('SELECT * FROM dids ORDER BY did ASC');
      return res.rows.map(row => this.mapRow(row));
    } catch {
      return [...initialSeedData.dids];
    }
  }

  public static async listByTenant(tenantId: string): Promise<Did[]> {
    try {
      const res = await postgresClient.query(
        'SELECT * FROM dids WHERE tenant_id = $1 ORDER BY did ASC',
        [tenantId]
      );
      return res.rows.map(row => this.mapRow(row));
    } catch {
      return initialSeedData.dids.filter(d => d.tenantId === tenantId);
    }
  }

  public static async findByDidNumber(didNumber: string): Promise<Did | null> {
    try {
      const cleanNumber = didNumber.replace(/\D/g, '');
      const res = await postgresClient.query(
        'SELECT * FROM dids WHERE did = $1 OR normalized_number = $2 OR normalized_number = $3',
        [cleanNumber, `+55${cleanNumber}`, cleanNumber]
      );
      if (res.rows.length > 0) {
        return this.mapRow(res.rows[0]);
      }
      return null;
    } catch {
      const cleanNumber = didNumber.replace(/\D/g, '');
      const d = initialSeedData.dids.find(x => x.did.replace(/\D/g, '') === cleanNumber || x.normalizedNumber?.replace(/\D/g, '') === cleanNumber);
      return d ? { ...d } : null;
    }
  }

  public static async findById(arg1: string, arg2?: string): Promise<Did | null> {
    try {
      let query = 'SELECT * FROM dids WHERE ';
      const params: any[] = [];
      if (!arg2) {
        query += 'id = $1';
        params.push(arg1);
      } else if (arg1.startsWith('tenant-')) {
        query += 'tenant_id = $1 AND id = $2';
        params.push(arg1, arg2);
      } else {
        query += 'id = $1 AND tenant_id = $2';
        params.push(arg1, arg2);
      }
      const res = await postgresClient.query(query, params);
      if (res.rows.length > 0) {
        return this.mapRow(res.rows[0]);
      }
      return null;
    } catch {
      const did = initialSeedData.dids.find(d => {
        if (!arg2) return d.id === arg1;
        if (arg1.startsWith('tenant-')) return d.tenantId === arg1 && d.id === arg2;
        return d.id === arg1 && d.tenantId === arg2;
      });
      return did ? { ...did } : null;
    }
  }

  public static async save(did: Did): Promise<Did> {
    try {
      await postgresClient.query(
        `INSERT INTO dids (
          id, tenant_id, did, normalized_number, presented_number, operator_name,
          trunk_id, description, status, assigned_company, assigned_cnpj, assigned_user,
          monthly_fee, billing_cycle_day, destination_type, destination_id, destination_label,
          time_condition_enabled, time_schedule, after_hours_dest_type, after_hours_dest_id,
          fallback_type, fallback_target, did_source_header, custom_header_name,
          unknown_did_action, channels_in_use, total_calls_received, last_call_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15,
          $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29
        )
        ON CONFLICT (id) DO UPDATE SET
          did = EXCLUDED.did,
          normalized_number = EXCLUDED.normalized_number,
          presented_number = EXCLUDED.presented_number,
          operator_name = EXCLUDED.operator_name,
          trunk_id = EXCLUDED.trunk_id,
          description = EXCLUDED.description,
          status = EXCLUDED.status,
          assigned_company = EXCLUDED.assigned_company,
          assigned_cnpj = EXCLUDED.assigned_cnpj,
          assigned_user = EXCLUDED.assigned_user,
          monthly_fee = EXCLUDED.monthly_fee,
          billing_cycle_day = EXCLUDED.billing_cycle_day,
          destination_type = EXCLUDED.destination_type,
          destination_id = EXCLUDED.destination_id,
          destination_label = EXCLUDED.destination_label,
          time_condition_enabled = EXCLUDED.time_condition_enabled,
          time_schedule = EXCLUDED.time_schedule,
          after_hours_dest_type = EXCLUDED.after_hours_dest_type,
          after_hours_dest_id = EXCLUDED.after_hours_dest_id,
          fallback_type = EXCLUDED.fallback_type,
          fallback_target = EXCLUDED.fallback_target,
          did_source_header = EXCLUDED.did_source_header,
          custom_header_name = EXCLUDED.custom_header_name,
          unknown_did_action = EXCLUDED.unknown_did_action,
          channels_in_use = EXCLUDED.channels_in_use,
          total_calls_received = EXCLUDED.total_calls_received,
          last_call_at = EXCLUDED.last_call_at,
          updated_at = CURRENT_TIMESTAMP`,
        [
          did.id, did.tenantId, did.did, did.normalizedNumber, did.presentedNumber, did.operatorName,
          did.trunkId, did.description || '', did.status, did.assignedCompany || null,
          did.assignedCnpj || null, did.assignedUser || null, did.monthlyFee || null,
          did.billingCycleDay || null, did.destinationType, did.destinationId, did.destinationLabel || null,
          did.timeConditionEnabled ?? false, did.timeSchedule || null, did.afterHoursDestType || null,
          did.afterHoursDestId || null, did.fallbackType || null, did.fallbackTarget || null,
          did.didSourceHeader || 'to', did.customHeaderName || null, did.unknownDidAction || 'reject_404',
          did.channelsInUse || 0, did.totalCallsReceived || 0,
          did.lastCallAt ? new Date(did.lastCallAt) : null
        ]
      );
    } catch {
      const idx = initialSeedData.dids.findIndex(d => d.id === did.id);
      if (idx !== -1) {
        initialSeedData.dids[idx] = { ...did };
      } else {
        initialSeedData.dids.push({ ...did });
      }
    }
    return did;
  }

  public static async delete(arg1: string, arg2?: string): Promise<boolean> {
    try {
      let query = 'DELETE FROM dids WHERE ';
      const params: any[] = [];
      if (!arg2) {
        query += 'id = $1';
        params.push(arg1);
      } else if (arg1.startsWith('tenant-')) {
        query += 'tenant_id = $1 AND id = $2';
        params.push(arg1, arg2);
      } else {
        query += 'id = $1 AND tenant_id = $2';
        params.push(arg1, arg2);
      }
      const res = await postgresClient.query(query, params);
      return (res.rowCount ?? 0) > 0;
    } catch {
      const idx = initialSeedData.dids.findIndex(d => {
        if (!arg2) return d.id === arg1;
        if (arg1.startsWith('tenant-')) return d.tenantId === arg1 && d.id === arg2;
        return d.id === arg1 && d.tenantId === arg2;
      });
      if (idx !== -1) {
        initialSeedData.dids.splice(idx, 1);
        return true;
      }
      return false;
    }
  }
}
