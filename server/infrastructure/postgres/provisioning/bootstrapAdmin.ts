import crypto from 'node:crypto';
import bcrypt from 'bcrypt';
import type { PoolClient } from 'pg';
import { AuditLogRepository } from '../repositories/AuditLogRepository.js';

/** Exclusivo do provisionamento administrativo; não é chamado pelo servidor web. */
export async function bootstrapAdmin(client: PoolClient, environment: NodeJS.ProcessEnv): Promise<'created' | 'exists'> {
  await client.query('BEGIN');
  try {
    const identity = await client.query('SELECT rolsuper FROM pg_roles WHERE rolname = current_user');
    if (identity.rows[0]?.rolsuper !== true) throw new Error('BOOTSTRAP_ADMIN_REQUIRED');
    // Mesmo identificador do migrador: serializa provisionamento e instalação do esquema.
    await client.query('SELECT pg_advisory_xact_lock($1)', [7429184]);
    const existing = await client.query("SELECT id FROM public.users WHERE role = 'super_admin' LIMIT 1");
    if (existing.rows.length) {
      await client.query('COMMIT');
      return 'exists';
    }
    const email = environment.ADMIN_INITIAL_EMAIL?.trim().toLowerCase();
    const password = environment.ADMIN_INITIAL_PASSWORD;
    const tenantId = environment.DEFAULT_TENANT_ID?.trim() || 'tenant-alpha-enterprise';
    if (!email || email.length > 255 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error('BOOTSTRAP_EMAIL_INVALID');
    // bcrypt usa no máximo 72 bytes; rejeitar truncamento silencioso.
    if (!password || password.trim().length < 12 || Buffer.byteLength(password, 'utf8') > 72 || /^(admin|password|123456|enlace|asterisk|root)/i.test(password)) throw new Error('BOOTSTRAP_PASSWORD_INVALID');
    if (tenantId.length > 64) throw new Error('BOOTSTRAP_TENANT_INVALID');
    const collision = await client.query('SELECT id FROM public.users WHERE LOWER(email) = $1 LIMIT 1', [email]);
    if (collision.rows.length) throw new Error('BOOTSTRAP_EMAIL_EXISTS');
    const passwordHash = await bcrypt.hash(password, 12);
    const userId = `user-admin-${crypto.randomUUID()}`;
    await client.query(`INSERT INTO public.tenants (id, name) VALUES ($1, 'Enlace Telecom Corporativo') ON CONFLICT (id) DO NOTHING`, [tenantId]);
    await client.query(`INSERT INTO public.users (id, tenant_id, name, email, password_hash, role, is_active)
      VALUES ($1, $2, 'Administrador Master', $3, $4, 'super_admin', true)`, [userId, tenantId, email, passwordHash]);
    // Serializa a leitura do último hash com escritores concorrentes de auditoria.
    await client.query('LOCK TABLE public.audit_logs IN SHARE ROW EXCLUSIVE MODE');
    const previous = await client.query('SELECT sha256_hash FROM public.audit_logs WHERE tenant_id = $1 ORDER BY timestamp DESC LIMIT 1', [tenantId]);
    const previousHash = previous.rows[0]?.sha256_hash || '0'.repeat(64);
    const timestamp = new Date().toISOString();
    const id = `audit-${crypto.randomUUID()}`;
    const action = 'BOOTSTRAP_SUPER_ADMIN_CREATED';
    const resource = `users/${userId}`;
    const hash = AuditLogRepository.computeCanonicalHash({ previousHash, id, tenantId, userId, action, resource, timestamp });
    await client.query(`INSERT INTO public.audit_logs
      (id, tenant_id, user_id, user_name, action, resource, ip, timestamp, details, category, severity, sha256_hash, previous_hash)
      VALUES ($1, $2, $3, 'Bootstrap do Sistema', $4, $5, '127.0.0.1', $6, 'Primeiro administrador criado pelo provisionamento administrativo.', 'USER_MGMT', 'INFO', $7, $8)`,
      [id, tenantId, userId, action, resource, timestamp, hash, previousHash]);
    await client.query('COMMIT');
    return 'created';
  } catch (error) {
    try { await client.query('ROLLBACK'); } catch {}
    throw error;
  }
}
