import { postgresClient } from '../client';
import { db, User } from '../../../db';

export class UserRepository {
  public static async findByEmail(email: string, tenantId?: string): Promise<User | null> {
    if (postgresClient.isConnected()) {
      try {
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
            passwordHash: row.password_hash,
            extension: row.extension || undefined,
            isActive: row.is_active,
            lastLogin: row.last_login ? row.last_login.toISOString() : new Date().toISOString(),
          };
        }
        return null;
      } catch (err: any) {
        console.error('[UserRepository] Erro ao consultar usuário no Postgres:', err.message);
      }
    }

    // Fallback de memória
    return db.users.find(u => {
      const matchEmail = u.email.toLowerCase() === email.toLowerCase();
      return tenantId ? matchEmail && u.tenantId === tenantId : matchEmail;
    }) || null;
  }

  public static async findById(id: string): Promise<User | null> {
    if (postgresClient.isConnected()) {
      try {
        const res = await postgresClient.query('SELECT * FROM users WHERE id = $1', [id]);
        if (res.rows.length > 0) {
          const row = res.rows[0];
          return {
            id: row.id,
            tenantId: row.tenant_id,
            name: row.name,
            email: row.email,
            role: row.role,
            passwordHash: row.password_hash,
            extension: row.extension || undefined,
            isActive: row.is_active,
            lastLogin: row.last_login ? row.last_login.toISOString() : new Date().toISOString(),
          };
        }
        return null;
      } catch (err: any) {
        console.error('[UserRepository] Erro ao consultar usuário por id:', err.message);
      }
    }

    return db.users.find(u => u.id === id) || null;
  }

  public static async listByTenant(tenantId: string): Promise<User[]> {
    if (postgresClient.isConnected()) {
      try {
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
          lastLogin: row.last_login ? row.last_login.toISOString() : new Date().toISOString(),
        }));
      } catch (err: any) {
        console.error('[UserRepository] Erro ao listar usuários por tenant:', err.message);
      }
    }

    return db.users.filter(u => u.tenantId === tenantId);
  }

  public static async save(user: User): Promise<User> {
    if (postgresClient.isConnected()) {
      try {
        await postgresClient.query(
          `INSERT INTO users (id, tenant_id, name, email, password_hash, role, extension, is_active, last_login)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
           ON CONFLICT (id) DO UPDATE
           SET name = EXCLUDED.name,
               email = EXCLUDED.email,
               password_hash = COALESCE(EXCLUDED.password_hash, users.password_hash),
               role = EXCLUDED.role,
               extension = EXCLUDED.extension,
               is_active = EXCLUDED.is_active,
               last_login = EXCLUDED.last_login,
               updated_at = CURRENT_TIMESTAMP`,
          [
            user.id, user.tenantId, user.name, user.email,
            user.passwordHash || '', user.role, user.extension || null,
            user.isActive, user.lastLogin ? new Date(user.lastLogin) : null
          ]
        );
      } catch (err: any) {
        console.error('[UserRepository] Erro ao salvar usuário no Postgres:', err.message);
      }
    }

    const idx = db.users.findIndex(u => u.id === user.id);
    if (idx >= 0) {
      db.users[idx] = user;
    } else {
      db.users.push(user);
    }
    return user;
  }
}
