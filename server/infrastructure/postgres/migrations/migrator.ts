import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import bcrypt from 'bcrypt';
import { postgresClient } from '../client';

export class DatabaseMigrator {
  public static async runMigrations(): Promise<{ success: boolean; applied: number; error?: string }> {
    const health = await postgresClient.checkHealth();
    if (health.status !== 'UP') {
      console.log(`[DatabaseMigrator] PostgreSQL status: ${health.status} (${health.error || 'Aguardando configuração'}). Migrations adiadas.`);
      return { success: false, applied: 0, error: health.error };
    }

    try {
      console.log('[DatabaseMigrator] Conectado ao PostgreSQL. Verificando integridade das migrações...');

      // Cria tabela de migrações se não existir
      await postgresClient.query(`
        CREATE TABLE IF NOT EXISTS schema_migrations (
          version VARCHAR(64) PRIMARY KEY,
          name VARCHAR(255) NOT NULL,
          applied_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );
      `);

      const migrationsDir = path.join(process.cwd(), 'server', 'infrastructure', 'postgres', 'migrations');
      let files: string[] = [];

      if (fs.existsSync(migrationsDir)) {
        files = fs.readdirSync(migrationsDir).filter(f => f.endsWith('.sql')).sort();
      } else {
        const altDir = __dirname;
        if (fs.existsSync(altDir)) {
          files = fs.readdirSync(altDir).filter(f => f.endsWith('.sql')).sort();
        }
      }

      let appliedCount = 0;
      for (const file of files) {
        const version = file.split('_')[0];
        const checkRes = await postgresClient.query(
          'SELECT version FROM schema_migrations WHERE version = $1',
          [version]
        );

        if (checkRes.rows.length === 0) {
          console.log(`[DatabaseMigrator] Executando migração: ${file}...`);
          let filePath = path.join(migrationsDir, file);
          if (!fs.existsSync(filePath)) {
            filePath = path.join(__dirname, file);
          }
          const sql = fs.readFileSync(filePath, 'utf8');
          await postgresClient.query(sql);

          await postgresClient.query(
            'INSERT INTO schema_migrations (version, name) VALUES ($1, $2) ON CONFLICT (version) DO NOTHING',
            [version, file]
          );
          console.log(`[DatabaseMigrator] Migração ${file} aplicada e registrada.`);
          appliedCount++;
        }
      }

      // Bootstrap explícito do administrador mestre
      await this.bootstrapAdminIfRequested();

      return { success: true, applied: appliedCount };
    } catch (err: any) {
      console.error('[DatabaseMigrator] Erro ao aplicar migrações:', err.message);
      return { success: false, applied: 0, error: err.message };
    }
  }

  /**
   * Bootstrap oficial e seguro do primeiro administrador.
   * Utiliza estritamente ADMIN_INITIAL_EMAIL e ADMIN_INITIAL_PASSWORD.
   * Sem fallback de senha fraca ou dados fictícios.
   */
  public static async bootstrapAdminIfRequested() {
    const adminEmail = process.env.ADMIN_INITIAL_EMAIL || 'admin@enlace.slz.br';
    const defaultTenantId = process.env.DEFAULT_TENANT_ID || 'tenant-default';
    let adminPassword = process.env.ADMIN_INITIAL_PASSWORD;

    if (!adminPassword) {
      if (process.env.NODE_ENV === 'production') {
        console.warn('[BOOTSTRAP] ADMIN_INITIAL_PASSWORD não definido no ambiente de produção. Provisionamento automático de admin ignorado por segurança.');
        return;
      }
      adminPassword = crypto.randomBytes(12).toString('base64url');
      console.log(`[BOOTSTRAP] ADMIN_INITIAL_PASSWORD não definido. Gerada senha inicial segura para '${adminEmail}': ${adminPassword}`);
    }

    try {
      const res = await postgresClient.query('SELECT id FROM users WHERE LOWER(email) = LOWER($1)', [adminEmail.toLowerCase()]);
      const passwordHash = await bcrypt.hash(adminPassword, 10);

      // Garante tenant padrão
      await postgresClient.query(`
        INSERT INTO tenants (id, name, cnpj, plan, max_extensions, max_trunks, ai_credits_usd, anti_fraud)
        VALUES ($1, 'Enlace Telecom Corporativo', '00.000.000/0001-00', 'enterprise', 100, 10, 50, '{}')
        ON CONFLICT (id) DO NOTHING
      `, [defaultTenantId]);

      if (res.rows.length === 0) {
        console.log(`[BOOTSTRAP] Criando administrador inicial provisionado: ${adminEmail}`);
        await postgresClient.query(`
          INSERT INTO users (id, tenant_id, name, email, password_hash, role, is_active)
          VALUES ($1, $2, $3, $4, $5, $6, $7)
          ON CONFLICT (tenant_id, email) DO UPDATE
          SET password_hash = EXCLUDED.password_hash, is_active = true
        `, [
          `user-admin-${Date.now()}`,
          defaultTenantId,
          'Administrador Master',
          adminEmail.toLowerCase(),
          passwordHash,
          'super_admin',
          true
        ]);
        console.log(`[BOOTSTRAP] Administrador inicial provisionado com hash criptográfico bcrypt.`);
      } else {
        await postgresClient.query(`
          UPDATE users SET password_hash = $1 WHERE LOWER(email) = LOWER($2)
        `, [passwordHash, adminEmail.toLowerCase()]);
        console.log(`[BOOTSTRAP] Senha do administrador ${adminEmail} atualizada com hash criptográfico bcrypt.`);
      }
    } catch (err: any) {
      console.error('[BOOTSTRAP] Erro ao provisionar administrador:', err.message);
    }
  }
}
