import { randomUUID } from 'node:crypto';
import { postgresClient } from '../client.js';
import type { ExtractionDefinition } from '../../../maia/integrations/EntityExtraction.js';
export class EntitySchemaRepository {
  static async list(tenantId: string) {
    return postgresClient.executeTenantScoped(tenantId, async client => (await client.query(
      'SELECT id,name,description,fields,is_active AS "isActive" FROM entity_extraction_schemas WHERE tenant_id=$1 ORDER BY created_at DESC LIMIT 100', [tenantId])).rows);
  }
  static async find(tenantId: string, id: string) {
    return postgresClient.executeTenantScoped(tenantId, async client => (await client.query(
      'SELECT id,name,description,fields,is_active AS "isActive" FROM entity_extraction_schemas WHERE tenant_id=$1 AND id=$2', [tenantId, id])).rows[0]);
  }
  static async save(tenantId: string, input: ExtractionDefinition, id = randomUUID()) {
    return postgresClient.executeTenantScoped(tenantId, async client => (await client.query(
      `INSERT INTO entity_extraction_schemas(id,tenant_id,name,description,fields,is_active) VALUES($1,$2,$3,$4,$5,$6)
       ON CONFLICT(id) DO UPDATE SET name=EXCLUDED.name,description=EXCLUDED.description,fields=EXCLUDED.fields,is_active=EXCLUDED.is_active
       WHERE entity_extraction_schemas.tenant_id=EXCLUDED.tenant_id RETURNING id,name,description,fields,is_active AS "isActive"`,
      [id, tenantId, input.name, input.description, JSON.stringify(input.fields), input.isActive])).rows[0]);
  }
}
