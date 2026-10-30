import {logOperational} from '../../security/OperationalLog.js';
import '../../../config/loadEnvironment.js';
import pg from 'pg';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import bcrypt from 'bcrypt';
import { postgresClient } from '../client.js';
import { AuditLogRepository } from '../repositories/AuditLogRepository.js';
import {bootstrapCredentials} from '../../../config/environmentPolicy.mjs';

export class DatabaseMigrator {
  private static readonly MIGRATION_LOCK_ID = 7429184;

  /** No processo HTTP apenas valida o esquema; DDL exige execução administrativa separada. */
  public static async runMigrations(options: { apply?: boolean } = {}): Promise<{ success: boolean; applied: number; error?: string }> {
    let connection: pg.PoolClient | pg.Client | undefined;
    let locked = false;
    let applied = 0;
    try {
      const directory = path.join(process.cwd(), 'server/infrastructure/postgres/migrations');
      const files = fs.readdirSync(directory).filter(file => /^\d+[a-z]?_.*\.sql$/.test(file)).sort();
      if (!files.length) throw new Error('Nenhum arquivo de migração disponível.');
      if (options.apply) {
        const url = process.env.DATABASE_MIGRATION_URL;
        if (!url) throw new Error('DATABASE_MIGRATION_URL obrigatória na execução administrativa.');
        const client = new pg.Client({ connectionString: url, connectionTimeoutMillis: 5000 });
        connection = client;
        await client.connect();
        // Migração 007 concede acesso antes de criar a role: provisioná-la previamente, sem alterar o histórico.
        await client.query("SELECT pg_advisory_lock($1)", [this.MIGRATION_LOCK_ID]);
        locked = true;
        await client.query(`DO $$ BEGIN
          IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'enlace_app') THEN
            CREATE ROLE enlace_app LOGIN NOSUPERUSER NOBYPASSRLS NOCREATEDB NOCREATEROLE;
          END IF;
        END $$`);
        await client.query(`CREATE TABLE IF NOT EXISTS schema_migrations (
          version VARCHAR(64) PRIMARY KEY, name VARCHAR(255) NOT NULL,
          sha256 VARCHAR(64), applied_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
        ); ALTER TABLE schema_migrations ADD COLUMN IF NOT EXISTS sha256 VARCHAR(64)`);
      } else {
        const health = await postgresClient.checkHealth();
        if (health.status !== 'UP') return { success: false, applied: 0, error: health.error || 'PostgreSQL indisponível.' };
        if (!postgresClient.isConfigured) return { success: true, applied: 0 };
        connection = await postgresClient.getClient();
      }
      for (const file of files) {
        const version = file.split('_')[0];
        const sql = fs.readFileSync(path.join(directory, file), 'utf8');
        const sha = crypto.createHash('sha256').update(sql).digest('hex');
        const recorded = await connection.query('SELECT sha256 FROM schema_migrations WHERE version = $1', [version]);
        if (recorded.rows.length) {
          if (recorded.rows[0].sha256 !== sha) throw new Error(`MIGRATION DRIFT: ${file}. Checksum ausente ou diferente; revisão administrativa necessária.`);
          continue;
        }
        if (!options.apply) throw new Error(`Migração pendente: ${file}. Execute npm run db:migrate antes de iniciar.`);
        await connection.query('BEGIN');
        try {
          await connection.query(sql);
          await connection.query('INSERT INTO schema_migrations (version, name, sha256) VALUES ($1, $2, $3)', [version, file, sha]);
          await connection.query('COMMIT');
          applied++;
        } catch (error) {
          await connection.query('ROLLBACK');
          throw error;
        }
      }
      if (options.apply) {
        await connection.query('BEGIN');
        try {
          await connection.query("SELECT set_config('app.is_super_admin', 'true', true)");
          await this.bootstrapAdminIfRequested(connection);
          await connection.query('COMMIT');
        } catch (error) {
          await connection.query('ROLLBACK');
          throw error;
        }
      }
      return { success: true, applied };
    } catch (err: any) {
      return { success: false, applied, error: err.message };
    } finally {
      if (connection) {
        if (locked) await connection.query('SELECT pg_advisory_unlock($1)', [this.MIGRATION_LOCK_ID]).catch(() => {});
        if ('release' in connection) connection.release();
        else await connection.end();
      }
    }
  }

  /**
   * Bootstrap oficial e seguro do primeiro administrador.
   * Utiliza estritamente ADMIN_INITIAL_EMAIL e ADMIN_INITIAL_PASSWORD.
   * Regras:
   * - Se já existir qualquer super_admin no PostgreSQL: NÃO cria outro, NÃO atualiza senha, NÃO sobrescreve.
   * - Se o e-mail informado já existir no banco: ABORTA imediatamente com erro claro. Nunca sobrescreve dados de usuários.
   * - Cria super_admin com hash bcrypt (nunca texto plano).
   * - NUNCA imprime a senha em log.
   * - Registra log de auditoria no PostgreSQL.
   */
  public static async bootstrapAdminIfRequested(connection?: pg.Client | pg.PoolClient) {
    if (!connection && !postgresClient.isConfigured) {
      return;
    }

    const db: { query: (sql: string, params?: any[]) => Promise<{ rows: any[] }> } = connection || postgresClient;
    try {
      // 1. Checa se já existe qualquer usuário com papel super_admin no banco de dados
      const existingSuperAdmin = await db.query(
        "SELECT id, email, name FROM users WHERE role = 'super_admin' LIMIT 1"
      );

      if (existingSuperAdmin.rows.length > 0) {
        // Super admin já existe: não recriar, não alterar senha, manter integridade
        return;
      }

      // 2. Nenhum super_admin existe: Validação obrigatória de ambiente (Fail-Fast)
      const {email:adminEmail,password:adminPassword}=bootstrapCredentials(process.env.ADMIN_INITIAL_EMAIL,process.env.ADMIN_INITIAL_PASSWORD,true);

      // 3. Checagem de colisão com usuário existente: ABORTA se o e-mail já existir
      const existingUser = await db.query(
        'SELECT id, role, is_active FROM users WHERE LOWER(email) = LOWER($1)',
        [adminEmail.toLowerCase()]
      );

      if (existingUser.rows.length > 0) {
        const row = existingUser.rows[0];
        const errorCollision =
          `FATAL BOOTSTRAP: O e-mail de bootstrap '${adminEmail.toLowerCase()}' já pertence ao usuário ${row.id} (papel: ${row.role}). ` +
          `O Enlace-PBX recusa-se a sobrescrever silenciosamente senhas ou papéis de usuários existentes.`;
        logOperational('DB_OPERATION_FAILURE');
        throw new Error(errorCollision);
      }

      // 4. Criar tenant inicial caso não exista
      const defaultTenantId = process.env.DEFAULT_TENANT_ID || 'tenant-alpha-enterprise';
      await db.query(
        `INSERT INTO tenants (id, name, cnpj, plan, max_extensions, max_trunks, ai_credits_usd, anti_fraud)
         VALUES ($1, 'Enlace Telecom Corporativo', '00.000.000/0001-00', 'enterprise', 100, 10, 50, '{}')
         ON CONFLICT (id) DO NOTHING`,
        [defaultTenantId]
      );

      // 5. Gerar hash bcrypt com custo de 10 rounds
      const passwordHash = await bcrypt.hash(adminPassword, 10);
      const newAdminId = `user-admin-${crypto.randomUUID()}`;

      // Inserção estrita sem DO UPDATE (somente criação pura)
      await db.query(
        `INSERT INTO users (id, tenant_id, name, email, password_hash, role, is_active)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          newAdminId,
          defaultTenantId,
          'Administrador Master',
          adminEmail.toLowerCase(),
          passwordHash,
          'super_admin',
          true,
        ]
      );

      // Registro na mesma transação da criação: falha de auditoria desfaz o bootstrap.
      const auditId = `audit-${crypto.randomUUID()}`;
      const timestamp = new Date().toISOString();
      const previousHash = '0'.repeat(64);
      const action = 'BOOTSTRAP_SUPER_ADMIN_CREATED';
      const resource = `users/${newAdminId}`;
      const hash = AuditLogRepository.computeCanonicalHash({ previousHash, id: auditId,
        tenantId: defaultTenantId, userId: newAdminId, action, resource, timestamp });
      await db.query(`INSERT INTO audit_logs
        (id, tenant_id, user_id, user_name, action, resource, ip, timestamp, details, category, severity, sha256_hash, previous_hash, payload)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,'USER_MGMT','INFO',$10,$11,'{}')`,
        [auditId, defaultTenantId, newAdminId, 'Bootstrap do Sistema', action, resource,
          '127.0.0.1', timestamp, 'Criação do primeiro administrador.', hash, previousHash]);

      logOperational('BOOTSTRAP_COMPLETED');
    } catch (err: any) {
      logOperational('DB_OPERATION_FAILURE');
      throw err;
    }
  }
}
