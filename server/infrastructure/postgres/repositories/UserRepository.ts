import bcrypt from 'bcrypt';
import { postgresClient } from '../client';
import { User } from '../../../../src/types/pbx';

function parseIsoDate(val: any): string | undefined {
  if (!val) return undefined;
  if (val instanceof Date) return val.toISOString();
  if (typeof val === 'string') {
    const d = new Date(val);
    return isNaN(d.getTime()) ? undefined : d.toISOString();
  }
  return undefined;
}

export class UserRepository {
  public static async findByEmail(email: string, tenantId?: string): Promise<User | null> {
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
          passwordHash: row.password_hash || '',
          extension: row.extension || undefined,
          isActive: row.is_active,
          lastLogin: parseIsoDate(row.last_login),
        };
      }
      return null;
    } catch (err: any) {
      console.error('[UserRepository.findByEmail] Erro no PostgreSQL:', err?.message || err);
      throw err;
    }
  }

  public static async findById(id: string, tenantId?: string): Promise<User | null> {
    try {
      if (!tenantId || tenantId.trim() === '') {
        // Regra Fail-Closed CS-148/CS-199/CS-227: Tenant ausente produz recusa estrita de recurso
        return null;
      }
      const res = await postgresClient.query(
        'SELECT * FROM users WHERE id = $1 AND tenant_id = $2',
        [id, tenantId.trim()]
      );
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
          lastLogin: parseIsoDate(row.last_login),
        };
      }
      return null;
    } catch (err: any) {
      console.error('[UserRepository.findById] Erro no PostgreSQL:', err?.message || err);
      throw err;
    }
  }

  public static async findAnyByIdForSuperAdmin(id: string): Promise<User | null> {
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
          passwordHash: row.password_hash || '',
          extension: row.extension || undefined,
          isActive: row.is_active,
          lastLogin: parseIsoDate(row.last_login),
        };
      }
      return null;
    } catch (err: any) {
      console.error('[UserRepository.findAnyByIdForSuperAdmin] Erro no PostgreSQL:', err?.message || err);
      throw err;
    }
  }

  public static toSafeUser(user: User): User {
    const { passwordHash, ...safe } = user;
    return safe as User;
  }

  public static async listAllGlobalForSuperAdmin(): Promise<User[]> {
    return this.listAll();
  }

  public static async listAll(): Promise<User[]> {
    try {
      const res = await postgresClient.query('SELECT id, tenant_id, name, email, role, extension, is_active, last_login FROM users ORDER BY name ASC');
      return res.rows.map(row => ({
        id: row.id,
        tenantId: row.tenant_id,
        name: row.name,
        email: row.email,
        role: row.role,
        extension: row.extension || undefined,
        isActive: row.is_active,
        lastLogin: parseIsoDate(row.last_login),
      }));
    } catch (err: any) {
      console.error('[UserRepository.listAll] Erro no PostgreSQL:', err?.message || err);
      throw err;
    }
  }

  public static async listByTenant(tenantId: string): Promise<User[]> {
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
        lastLogin: parseIsoDate(row.last_login),
      }));
    } catch (err: any) {
      console.error('[UserRepository.listByTenant] Erro no PostgreSQL:', err?.message || err);
      throw err;
    }
  }

  public static async save(user: User): Promise<User> {
    try {
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
    } catch (err: any) {
      console.error('[UserRepository.save] Erro no PostgreSQL:', err?.message || err);
      throw err;
    }
  }

  public static async delete(id: string, tenantId: string): Promise<boolean> {
    if (!tenantId || tenantId.trim() === '') {
      throw new Error('TENANT_REQUIRED: tenantId é obrigatório para remover usuário.');
    }
    try {
      const res = await postgresClient.query(
        'DELETE FROM users WHERE id = $1 AND tenant_id = $2',
        [id, tenantId]
      );
      return (res.rowCount ?? 0) > 0;
    } catch (err: any) {
      console.error('[UserRepository.delete] Erro no PostgreSQL:', err?.message || err);
      throw err;
    }
  }

  public static async countAll(): Promise<number> {
    try {
      const res = await postgresClient.query('SELECT COUNT(*) as count FROM users');
      return parseInt(res.rows[0]?.count || '0', 10);
    } catch (err: any) {
      console.error('[UserRepository.countAll] Erro no PostgreSQL:', err?.message || err);
      throw err;
    }
  }

  public static async lookupForAuth(email: string): Promise<User | null> {
    const cleanEmail = (email || '').trim().toLowerCase();
    if (!cleanEmail) return null;

    try {
      // Tenta primeiro através da função controlada com SECURITY DEFINER
      try {
        const fnRes = await postgresClient.query(
          'SELECT id, tenant_id, name, email, password_hash, role, extension, is_active FROM authenticate_user_identity($1)',
          [cleanEmail]
        );
        if (fnRes.rows.length > 0) {
          const row = fnRes.rows[0];
          return {
            id: row.id,
            tenantId: row.tenant_id,
            name: row.name,
            email: row.email,
            role: row.role,
            passwordHash: row.password_hash || '',
            extension: row.extension || undefined,
            isActive: row.is_active,
            lastLogin: undefined,
          };
        }
      } catch {
        // Fallback para query direta se função ainda não tiver sido criada (ou no embeddedEngine)
      }

      return await this.findByEmail(cleanEmail);
    } catch (err: any) {
      console.error('[UserRepository.lookupForAuth] Erro ao buscar identidade:', err?.message || err);
      return null;
    }
  }

  public static async verifyPassword(user: User, plainPassword: string): Promise<boolean> {
    if (!user.passwordHash || typeof plainPassword !== 'string' || plainPassword.length === 0) {
      return false;
    }
    try {
      // Autenticação estritamente baseada em comparação criptográfica de hash bcrypt.
      // Proibido qualquer backdoor, senha mestra ou bypass em texto plano.
      return await bcrypt.compare(plainPassword, user.passwordHash);
    } catch (err: any) {
      console.error('[UserRepository.verifyPassword] Erro na verificação de hash bcrypt:', err?.message || err);
      return false;
    }
  }
}
