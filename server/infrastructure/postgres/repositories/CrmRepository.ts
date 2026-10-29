import {logOperational} from '../../security/OperationalLog.js';
import { postgresClient } from '../client.js';
import { toSafeIsoString } from '../dateUtils.js';
import { CrmContact, CustomerMemory } from '../../../../src/types/pbx.js';
import { TenantContext } from '../../auth/tenantContext.js';

export class CrmRepository {
  public static async listContacts(contextOrTenant: TenantContext | string): Promise<CrmContact[]> {
    return postgresClient.executeTenantScoped(contextOrTenant, async (client, ctx) => {
      try {
        const res = await client.query(
          'SELECT * FROM crm_contacts WHERE tenant_id = $1 ORDER BY name ASC',
          [ctx.tenantId]
        );
        return res.rows.map(row => ({
          id: row.id,
          tenantId: row.tenant_id,
          name: row.name,
          phone: row.phone,
          email: row.email || '',
          crmId: row.crm_id || undefined,
          lastInteraction: toSafeIsoString(row.last_interaction),
        }));
      } catch (err: any) {
        logOperational('DB_OPERATION_FAILURE');
        throw err;
      }
    });
  }

  public static async findContactById(id: string, contextOrTenant?: TenantContext | string): Promise<CrmContact | null> {
    if (!contextOrTenant || (typeof contextOrTenant === 'string' && contextOrTenant.trim() === '')) {
      // Regra Fail-Closed CS-148/CS-199: Tenant ausente produz recusa estrita de recurso
      return null;
    }
    return postgresClient.executeTenantScoped(contextOrTenant, async (client, ctx) => {
      try {
        const res = await client.query(
          'SELECT * FROM crm_contacts WHERE id = $1 AND tenant_id = $2',
          [id, ctx.tenantId]
        );
        if (res.rows.length > 0) {
          const row = res.rows[0];
          return {
            id: row.id,
            tenantId: row.tenant_id,
            name: row.name,
            phone: row.phone,
            email: row.email || '',
            crmId: row.crm_id || undefined,
            lastInteraction: toSafeIsoString(row.last_interaction),
          };
        }
        return null;
      } catch (err: any) {
        logOperational('DB_OPERATION_FAILURE');
        throw err;
      }
    });
  }

  public static async findAnyContactByIdForSuperAdmin(id: string): Promise<CrmContact | null> {
    return postgresClient.executeGlobalScoped(async (client) => {
      try {
        const res = await client.query('SELECT * FROM crm_contacts WHERE id = $1', [id]);
        if (res.rows.length > 0) {
          const row = res.rows[0];
          return {
            id: row.id,
            tenantId: row.tenant_id,
            name: row.name,
            phone: row.phone,
            email: row.email || '',
            crmId: row.crm_id || undefined,
            lastInteraction: toSafeIsoString(row.last_interaction),
          };
        }
        return null;
      } catch (err: any) {
        logOperational('DB_OPERATION_FAILURE');
        throw err;
      }
    });
  }

  public static async saveContact(contact: CrmContact, contextOrTenant?: TenantContext | string): Promise<CrmContact> {
    const target = contextOrTenant || contact.tenantId;
    return postgresClient.executeTenantScoped(target, async (client, ctx) => {
      try {
        await client.query(
          `INSERT INTO crm_contacts (id, tenant_id, name, phone, email, crm_id, last_interaction)
           VALUES ($1, $2, $3, $4, $5, $6, $7)
           ON CONFLICT (id) DO UPDATE SET
             name = EXCLUDED.name,
             phone = EXCLUDED.phone,
             email = EXCLUDED.email,
             crm_id = EXCLUDED.crm_id,
             last_interaction = EXCLUDED.last_interaction,
             updated_at = CURRENT_TIMESTAMP`,
          [
            contact.id,
            ctx.tenantId,
            contact.name,
            contact.phone,
            contact.email || '',
            contact.crmId || null,
            contact.lastInteraction ? new Date(contact.lastInteraction) : null
          ]
        );
        return contact;
      } catch (err: any) {
        logOperational('DB_OPERATION_FAILURE');
        throw err;
      }
    });
  }

  public static async deleteContact(id: string, contextOrTenant?: TenantContext | string): Promise<boolean> {
    if (!contextOrTenant || (typeof contextOrTenant === 'string' && contextOrTenant.trim() === '')) {
      throw new Error('TENANT_REQUIRED: Deleção de contato CRM requer tenantId explícito (Fail-Closed).');
    }
    return postgresClient.executeTenantScoped(contextOrTenant, async (client, ctx) => {
      try {
        const res = await client.query(
          'DELETE FROM crm_contacts WHERE id = $1 AND tenant_id = $2',
          [id, ctx.tenantId]
        );
        return (res.rowCount ?? 0) > 0;
      } catch (err: any) {
        logOperational('DB_OPERATION_FAILURE');
        throw err;
      }
    });
  }

  public static async deleteAnyContactForSuperAdmin(id: string): Promise<boolean> {
    return postgresClient.executeGlobalScoped(async (client) => {
      try {
        const res = await client.query('DELETE FROM crm_contacts WHERE id = $1', [id]);
        return (res.rowCount ?? 0) > 0;
      } catch (err: any) {
        logOperational('DB_OPERATION_FAILURE');
        throw err;
      }
    });
  }

  // Customer Memories
  public static async listMemories(contextOrTenant: TenantContext | string): Promise<CustomerMemory[]> {
    return postgresClient.executeTenantScoped(contextOrTenant, async (client, ctx) => {
      try {
        const res = await client.query(
          'SELECT * FROM customer_memories WHERE tenant_id = $1 ORDER BY updated_at DESC',
          [ctx.tenantId]
        );
        return res.rows.map(row => ({
          id: row.id,
          tenantId: row.tenant_id,
          contactId: row.contact_id,
          phone: row.phone,
          summary: row.summary,
          preferences: typeof row.preferences === 'string' ? JSON.parse(row.preferences) : (row.preferences || []),
          sentimentHistory: row.sentiment_history as any,
          churnRisk: row.churn_risk || 0,
        }));
      } catch (err: any) {
        logOperational('DB_OPERATION_FAILURE');
        throw err;
      }
    });
  }

  public static async findMemoryByPhone(phone: string, contextOrTenant: TenantContext | string): Promise<CustomerMemory | null> {
    const cleanPhone = phone.replace(/\D/g, '');
    return postgresClient.executeTenantScoped(contextOrTenant, async (client, ctx) => {
      try {
        const res = await client.query(
          `SELECT * FROM customer_memories 
           WHERE tenant_id = $1 AND (phone = $2 OR phone LIKE $3)`,
          [ctx.tenantId, cleanPhone, `%${cleanPhone.slice(-8)}`]
        );
        if (res.rows.length > 0) {
          const row = res.rows[0];
          return {
            id: row.id,
            tenantId: row.tenant_id,
            contactId: row.contact_id,
            phone: row.phone,
            summary: row.summary,
            preferences: typeof row.preferences === 'string' ? JSON.parse(row.preferences) : (row.preferences || []),
            sentimentHistory: row.sentiment_history as any,
            churnRisk: row.churn_risk || 0,
          };
        }
        return null;
      } catch (err: any) {
        logOperational('DB_OPERATION_FAILURE');
        throw err;
      }
    });
  }

  public static async saveMemory(memory: CustomerMemory, contextOrTenant?: TenantContext | string): Promise<CustomerMemory> {
    const target = contextOrTenant || memory.tenantId;
    return postgresClient.executeTenantScoped(target, async (client, ctx) => {
      try {
        await client.query(
          `INSERT INTO customer_memories (id, tenant_id, contact_id, phone, summary, preferences, sentiment_history, churn_risk)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
           ON CONFLICT (id) DO UPDATE SET
             summary = EXCLUDED.summary,
             preferences = EXCLUDED.preferences,
             sentiment_history = EXCLUDED.sentiment_history,
             churn_risk = EXCLUDED.churn_risk,
             updated_at = CURRENT_TIMESTAMP`,
          [
            memory.id,
            ctx.tenantId,
            memory.contactId,
            memory.phone,
            memory.summary,
            JSON.stringify(memory.preferences || []),
            memory.sentimentHistory || 'neutral',
            memory.churnRisk || 0
          ]
        );
        return memory;
      } catch (err: any) {
        logOperational('DB_OPERATION_FAILURE');
        throw err;
      }
    });
  }
}
