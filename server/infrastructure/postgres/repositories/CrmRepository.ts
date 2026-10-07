import { postgresClient } from '../client';
import { toSafeIsoString } from '../dateUtils';
import { CrmContact, CustomerMemory } from '../../../../src/types/pbx';

export class CrmRepository {
  public static async listContacts(tenantId: string): Promise<CrmContact[]> {
    try {
      const res = await postgresClient.query(
        'SELECT * FROM crm_contacts WHERE tenant_id = $1 ORDER BY name ASC',
        [tenantId]
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
      console.error('[CrmRepository.listContacts] Erro no PostgreSQL:', err?.message || err);
      throw err;
    }
  }

  public static async findContactById(id: string, tenantId?: string): Promise<CrmContact | null> {
    try {
      if (!tenantId || tenantId.trim() === '') {
        // Regra Fail-Closed CS-148/CS-199: Tenant ausente produz recusa estrita de recurso
        return null;
      }
      const res = await postgresClient.query(
        'SELECT * FROM crm_contacts WHERE id = $1 AND tenant_id = $2',
        [id, tenantId.trim()]
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
      console.error('[CrmRepository.findContactById] Erro no PostgreSQL:', err?.message || err);
      throw err;
    }
  }

  public static async findAnyContactByIdForSuperAdmin(id: string): Promise<CrmContact | null> {
    try {
      const res = await postgresClient.query('SELECT * FROM crm_contacts WHERE id = $1', [id]);
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
      console.error('[CrmRepository.findAnyContactByIdForSuperAdmin] Erro no PostgreSQL:', err?.message || err);
      throw err;
    }
  }

  public static async saveContact(contact: CrmContact): Promise<CrmContact> {
    try {
      await postgresClient.query(
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
          contact.tenantId,
          contact.name,
          contact.phone,
          contact.email || '',
          contact.crmId || null,
          contact.lastInteraction ? new Date(contact.lastInteraction) : null
        ]
      );
      return contact;
    } catch (err: any) {
      console.error('[CrmRepository.saveContact] Erro no PostgreSQL:', err?.message || err);
      throw err;
    }
  }

  public static async deleteContact(id: string, tenantId?: string): Promise<boolean> {
    if (!tenantId || tenantId.trim() === '') {
      throw new Error('TENANT_REQUIRED: Deleção de contato CRM requer tenantId explícito (Fail-Closed).');
    }
    try {
      const res = await postgresClient.query(
        'DELETE FROM crm_contacts WHERE id = $1 AND tenant_id = $2',
        [id, tenantId.trim()]
      );
      return (res.rowCount ?? 0) > 0;
    } catch (err: any) {
      console.error('[CrmRepository.deleteContact] Erro no PostgreSQL:', err?.message || err);
      throw err;
    }
  }

  public static async deleteAnyContactForSuperAdmin(id: string): Promise<boolean> {
    try {
      const res = await postgresClient.query('DELETE FROM crm_contacts WHERE id = $1', [id]);
      return (res.rowCount ?? 0) > 0;
    } catch (err: any) {
      console.error('[CrmRepository.deleteAnyContactForSuperAdmin] Erro no PostgreSQL:', err?.message || err);
      throw err;
    }
  }

  // Customer Memories
  public static async listMemories(tenantId: string): Promise<CustomerMemory[]> {
    try {
      const res = await postgresClient.query(
        'SELECT * FROM customer_memories WHERE tenant_id = $1 ORDER BY updated_at DESC',
        [tenantId]
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
      console.error('[CrmRepository.listMemories] Erro no PostgreSQL:', err?.message || err);
      throw err;
    }
  }

  public static async findMemoryByPhone(phone: string, tenantId: string): Promise<CustomerMemory | null> {
    const cleanPhone = phone.replace(/\D/g, '');
    try {
      const res = await postgresClient.query(
        `SELECT * FROM customer_memories 
         WHERE tenant_id = $1 AND (phone = $2 OR phone LIKE $3)`,
        [tenantId, cleanPhone, `%${cleanPhone.slice(-8)}`]
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
      console.error('[CrmRepository.findMemoryByPhone] Erro no PostgreSQL:', err?.message || err);
      throw err;
    }
  }

  public static async saveMemory(memory: CustomerMemory): Promise<CustomerMemory> {
    try {
      await postgresClient.query(
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
          memory.tenantId,
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
      console.error('[CrmRepository.saveMemory] Erro no PostgreSQL:', err?.message || err);
      throw err;
    }
  }
}
