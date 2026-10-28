import { postgresClient } from '../client.js';
import type { createQualityAnalysis } from '../../../maia/integrations/QualityReview.js';
export class QualityReviewRepository {
  static async list(tenantId:string) {
    return postgresClient.executeTenantScoped(tenantId,async client=>(await client.query(
      'SELECT id,source_reference,channel,status,created_at,reviewed_at FROM quality_reviews WHERE tenant_id=$1 ORDER BY created_at DESC LIMIT 100',[tenantId])).rows);
  }
  static async find(tenantId:string,id:string) {
    return postgresClient.executeTenantScoped(tenantId,async client=>(await client.query('SELECT * FROM quality_reviews WHERE tenant_id=$1 AND id=$2',[tenantId,id])).rows[0]);
  }
  static async create(tenantId:string,actorId:string,analysis:Awaited<ReturnType<typeof createQualityAnalysis>>) {
    return postgresClient.executeTenantScoped(tenantId,async client=>(await client.query(
      'INSERT INTO quality_reviews(id,tenant_id,source_reference,channel,evidence,rejected_fields,model,provider,created_by) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *',
      [analysis.id,tenantId,analysis.sourceReference,analysis.channel,JSON.stringify(analysis.evidence),JSON.stringify(analysis.rejectedFields),analysis.model,analysis.provider,actorId])).rows[0]);
  }
  static async review(tenantId:string,id:string,actorId:string,note:string) {
    return postgresClient.executeTenantScoped(tenantId,async client=>(await client.query(
      "UPDATE quality_reviews SET status='REVIEWED',reviewed_by=$3,review_note=$4,reviewed_at=CURRENT_TIMESTAMP WHERE tenant_id=$1 AND id=$2 AND status='PENDING' RETURNING *",
      [tenantId,id,actorId,note])).rows[0]);
  }
}
