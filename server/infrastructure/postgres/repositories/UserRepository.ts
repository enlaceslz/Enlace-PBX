import bcrypt from 'bcrypt';
import { postgresClient } from '../client.js';
import { User } from '../../../../src/types/pbx.js';
import { TenantContext } from '../../auth/tenantContext.js';

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
  public static async findByEmail(email: string, contextOrTenant?: TenantContext | string): Promise<User | null> {
    const callback = async (client: any, currentTenantId?: string) => {
      try {
        let query = 'SELECT * FROM users WHERE LOWER(email) = LOWER($1)';
        const params: any[] = [email];
        if (currentTenantId) {
          query += ' AND tenant_id = $2';
          params.push(currentTenantId);
        }
        const res = await client.query(query, params);
        if (res.rows.length > 0) {
          const row = res.rows[0];
          return {
            id: row.id,
            tenantId: row.tenant_id,
            name: row.name,
            email: row.email,
            role: row.role,
            passwordHash: row.password_hash || '',
            authVersion:row.auth_version || 0,
            extension: row.extension || undefined,
            isActive: row.is_active,
            lastLogin: parseIsoDate(row.last_login),
          };
        }
        return null;
      } catch (err: any) {
        console.error('[UserRepository.findByEmail] Erro no PostgreSQL sob transação RLS:', err?.message || err);
        throw err;
      }
    };

    if (contextOrTenant) {
      return postgresClient.executeTenantScoped(contextOrTenant, (client, ctx) => callback(client, ctx.tenantId));
    }
    return postgresClient.executeGlobalScoped((client) => callback(client));
  }

  public static async findById(id: string, contextOrTenant?: TenantContext | string): Promise<User | null> {
    if (!contextOrTenant || (typeof contextOrTenant === 'string' && contextOrTenant.trim() === '')) {
      // Regra Fail-Closed CS-148/CS-199/CS-227: Tenant ausente produz recusa estrita de recurso
      return null;
    }
    return postgresClient.executeTenantScoped(contextOrTenant, async (client, ctx) => {
      try {
        const res = await client.query(
          'SELECT * FROM users WHERE id = $1 AND tenant_id = $2',
          [id, ctx.tenantId]
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
            authVersion:row.auth_version || 0,
            extension: row.extension || undefined,
            isActive: row.is_active,
            lastLogin: parseIsoDate(row.last_login),
          };
        }
        return null;
      } catch (err: any) {
        console.error('[UserRepository.findById] Erro no PostgreSQL sob transação RLS:', err?.message || err);
        throw err;
      }
    });
  }

  public static async findAnyByIdForSuperAdmin(id: string): Promise<User | null> {
    return postgresClient.executeGlobalScoped(async (client) => {
      try {
        const res = await client.query('SELECT * FROM users WHERE id = $1', [id]);
        if (res.rows.length > 0) {
          const row = res.rows[0];
          return {
            id: row.id,
            tenantId: row.tenant_id,
            name: row.name,
            email: row.email,
            role: row.role,
            passwordHash: row.password_hash || '',
            authVersion:row.auth_version || 0,
            extension: row.extension || undefined,
            isActive: row.is_active,
            lastLogin: parseIsoDate(row.last_login),
          };
        }
        return null;
      } catch (err: any) {
        console.error('[UserRepository.findAnyByIdForSuperAdmin] Erro no PostgreSQL sob transação RLS:', err?.message || err);
        throw err;
      }
    });
  }

  public static toSafeUser(user: User): User {
    const { passwordHash, ...safe } = user;
    return safe as User;
  }

  public static async listAllGlobalForSuperAdmin(): Promise<User[]> {
    return this.listAll();
  }

  public static async listAll(): Promise<User[]> {
    return postgresClient.executeGlobalScoped(async (client) => {
      try {
        const res = await client.query('SELECT id, tenant_id, name, email, role, extension, is_active, last_login FROM users ORDER BY name ASC');
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
        console.error('[UserRepository.listAll] Erro no PostgreSQL sob transação RLS:', err?.message || err);
        throw err;
      }
    });
  }

  public static async listByTenant(contextOrTenant: TenantContext | string): Promise<User[]> {
    return postgresClient.executeTenantScoped(contextOrTenant, async (client, ctx) => {
      try {
        const res = await client.query(
          'SELECT * FROM users WHERE tenant_id = $1 ORDER BY name ASC',
          [ctx.tenantId]
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
        console.error('[UserRepository.listByTenant] Erro no PostgreSQL sob transação RLS:', err?.message || err);
        throw err;
      }
    });
  }

  public static async save(user: User, contextOrTenant?: TenantContext | string): Promise<User> {
    const target = contextOrTenant || user.tenantId;
    return postgresClient.executeTenantScoped(target, async (client, ctx) => {
      try {
        await client.query(
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
            ctx.tenantId,
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
        console.error('[UserRepository.save] Erro no PostgreSQL sob transação RLS:', err?.message || err);
        throw err;
      }
    });
  }

  public static async delete(id: string, contextOrTenant: TenantContext | string): Promise<boolean> {
    return postgresClient.executeTenantScoped(contextOrTenant, async (client, ctx) => {
      try {
        const res = await client.query(
          'DELETE FROM users WHERE id = $1 AND tenant_id = $2',
          [id, ctx.tenantId]
        );
        return (res.rowCount ?? 0) > 0;
      } catch (err: any) {
        console.error('[UserRepository.delete] Erro no PostgreSQL sob transação RLS:', err?.message || err);
        throw err;
      }
    });
  }

  public static async countAll(): Promise<number> {
    return postgresClient.executeGlobalScoped(async (client) => {
      try {
        const res = await client.query('SELECT COUNT(*) as count FROM users');
        return parseInt(res.rows[0]?.count || '0', 10);
      } catch (err: any) {
        console.error('[UserRepository.countAll] Erro no PostgreSQL:', err?.message || err);
        throw err;
      }
    });
  }

  public static async lookupForAuth(email: string): Promise<User | null> {
    const cleanEmail = (email || '').trim().toLowerCase();
    if (!cleanEmail) return null;

    return postgresClient.executeGlobalScoped(async (client) => {
      try {
        // Tenta primeiro através da função controlada com SECURITY DEFINER
        try {
          const fnRes = await client.query(
            'SELECT id, tenant_id, name, email, password_hash, role, extension, is_active FROM authenticate_user_identity($1)',
            [cleanEmail]
          );
          if (fnRes.rows.length > 0) {
            const row = fnRes.rows[0];
            const version=await client.query('SELECT auth_version FROM users WHERE id=$1 AND tenant_id=$2',[row.id,row.tenant_id]);
            row.auth_version=version.rows[0]?.auth_version || 0;
            return {
              id: row.id,
              tenantId: row.tenant_id,
              name: row.name,
              email: row.email,
              role: row.role,
              passwordHash: row.password_hash || '',
            authVersion:row.auth_version || 0,
              extension: row.extension || undefined,
              isActive: row.is_active,
              lastLogin: undefined,
            };
          }
        } catch {
          // Fallback para consulta se função ainda não tiver sido criada
        }

        const res = await client.query('SELECT * FROM users WHERE LOWER(email) = LOWER($1)', [cleanEmail]);
        if (res.rows.length > 0) {
          const row = res.rows[0];
          return {
            id: row.id,
            tenantId: row.tenant_id,
            name: row.name,
            email: row.email,
            role: row.role,
            passwordHash: row.password_hash || '',
            authVersion:row.auth_version || 0,
            extension: row.extension || undefined,
            isActive: row.is_active,
            lastLogin: parseIsoDate(row.last_login),
          };
        }
        return null;
      } catch (err: any) {
        console.error('[UserRepository.lookupForAuth] Erro ao buscar identidade:', err?.message || err);
        return null;
      }
    });
  }

  public static async verifyPassword(user: User, plainPassword: string): Promise<boolean> {
    if (!user.passwordHash || typeof plainPassword !== 'string' || plainPassword.length === 0) {
      return false;
    }
    try {
      return await bcrypt.compare(plainPassword, user.passwordHash);
    } catch (err: any) {
      console.error('[UserRepository.verifyPassword] Erro na verificação de hash bcrypt:', err?.message || err);
      return false;
    }
  }
}
