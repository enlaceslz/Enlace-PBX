import bcrypt from 'bcrypt';
import { postgresClient } from '../client';
import { User } from '../../../../src/types/pbx';

export class UserRepository {
  public static async findByEmail(email: string, tenantId?: string): Promise<User | null> {
    let query = 'SELECT * FROM users WHERE LOWER(email) = LOWER($1)';
    const params: any[] = [email];
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
        email: row.email,
        role: row.role,
        passwordHash: row.password_hash || '',
        extension: row.extension || undefined,
        isActive: row.is_active,
        lastLogin: row.last_login ? row.last_login.toISOString() : undefined,
      };
    }
    return null;
  }

  public static async findById(id: string): Promise<User | null> {
    const res = await postgresClient.query('SELECT * FROM users WHERE id = $1', [id]);
    if (res.rows.length > 0) {
      const row = res.rows[0];
      return {
        id: row.id,
        tenantId: row.tenant_id,
        name: row.name,
        email: row.email,
        role: row.role,
        passwordHash: row.password_hash || '',
        extension: row.extension || undefined,
        isActive: row.is_active,
        lastLogin: row.last_login ? row.last_login.toISOString() : undefined,
      };
    }
    return null;
  }

  public static async listByTenant(tenantId: string): Promise<User[]> {
    const res = await postgresClient.query(
      'SELECT * FROM users WHERE tenant_id = $1 ORDER BY name ASC',
      [tenantId]
    );
    return res.rows.map(row => ({
      id: row.id,
      tenantId: row.tenant_id,
      name: row.name,
      email: row.email,
      role: row.role,
      extension: row.extension || undefined,
      isActive: row.is_active,
      lastLogin: row.last_login ? row.last_login.toISOString() : undefined,
    }));
  }

  public static async save(user: User): Promise<User> {
    await postgresClient.query(
      `INSERT INTO users (id, tenant_id, name, email, password_hash, role, extension, is_active, last_login)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       ON CONFLICT (id) DO UPDATE
       SET name = EXCLUDED.name,
           email = EXCLUDED.email,
           password_hash = CASE WHEN EXCLUDED.password_hash != '' THEN EXCLUDED.password_hash ELSE users.password_hash END,
           role = EXCLUDED.role,
           extension = EXCLUDED.extension,
           is_active = EXCLUDED.is_active,
           last_login = EXCLUDED.last_login,
           updated_at = CURRENT_TIMESTAMP`,
      [
        user.id,
        user.tenantId,
        user.name,
        user.email,
        user.passwordHash || '',
        user.role,
        user.extension || null,
        user.isActive ?? true,
        user.lastLogin ? new Date(user.lastLogin) : null
      ]
    );
    return user;
  }

  public static async delete(id: string, tenantId?: string): Promise<boolean> {
    let query = 'DELETE FROM users WHERE id = $1';
    const params: any[] = [id];
    if (tenantId) {
      query += ' AND tenant_id = $2';
      params.push(tenantId);
    }
    const res = await postgresClient.query(query, params);
    return (res.rowCount ?? 0) > 0;
  }

  public static async countAll(): Promise<number> {
    const res = await postgresClient.query('SELECT COUNT(*) as count FROM users');
    return parseInt(res.rows[0]?.count || '0', 10);
  }
}
