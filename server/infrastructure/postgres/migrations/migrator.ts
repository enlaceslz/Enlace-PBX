import fs from 'fs';
import path from 'path';
import bcrypt from 'bcrypt';
import { postgresClient } from '../client';
import { initialSeedData as db } from '../seedData';

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

      // Sincronização inicial se o banco estiver limpo
      await this.seedInitialDataIfEmpty();

      return { success: true, applied: appliedCount };
    } catch (err: any) {
      console.error('[DatabaseMigrator] Erro ao aplicar migrações:', err.message);
      return { success: false, applied: 0, error: err.message };
    }
  }

  private static async seedInitialDataIfEmpty() {
    try {
      const res = await postgresClient.query('SELECT COUNT(*) as count FROM tenants');
      const count = parseInt(res.rows[0]?.count || '0');

      if (count === 0) {
        console.log('[DatabaseMigrator] Banco de dados vazio detectado. Sincronizando dados corporativos padrão...');
        
        // 1. Tenants
        for (const t of db.tenants) {
          await postgresClient.query(
            `INSERT INTO tenants (id, name, cnpj, plan, max_extensions, max_trunks, ai_credits_usd, anti_fraud)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
             ON CONFLICT (id) DO NOTHING`,
            [t.id, t.name, t.cnpj, t.plan, t.maxExtensions, t.maxTrunks, t.aiCreditsUsd, JSON.stringify(t.antiFraud || {})]
          );
        }

        // 2. Users com hash de senha seguro gerado com bcrypt (salt 10)
        // A senha mestra corporativa inicial padrão é provisionada com hash real
        const defaultPassword = process.env.ADMIN_INITIAL_PASSWORD || 'Enlace#Secure2026!';
        const defaultHash = bcrypt.hashSync(defaultPassword, 10);

        for (const u of db.users) {
          const passwordHash = (u as any).passwordHash || defaultHash;
          const role = u.role === 'operador' ? 'operator' : u.role === 'auditor' ? 'readonly' : u.role;
          await postgresClient.query(
            `INSERT INTO users (id, tenant_id, name, email, password_hash, role, extension, is_active, last_login)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
             ON CONFLICT (tenant_id, email) DO NOTHING`,
            [u.id, u.tenantId, u.name, u.email, passwordHash, role, u.extension || null, u.isActive, u.lastLogin ? new Date(u.lastLogin) : null]
          );
        }

        // 3. Extensions
        for (const ext of db.extensions) {
          await postgresClient.query(
            `INSERT INTO extensions (id, tenant_id, number, name, sip_secret, context, caller_id, cli_caller_id, codecs, nat, webrtc, recording, voicemail, dnd, status, allow_ai_transfer)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
             ON CONFLICT (tenant_id, number) DO NOTHING`,
            [
              ext.id, ext.tenantId, ext.number, ext.name, ext.sipSecret, ext.context, ext.callerId,
              ext.cliCallerId || null, JSON.stringify(ext.codecs), ext.nat, ext.webrtc, ext.recording,
              ext.voicemail, ext.dnd, ext.status, ext.allowAiTransfer
            ]
          );
        }

        // 4. Trunks
        for (const trk of db.trunks) {
          await postgresClient.query(
            `INSERT INTO trunks (id, tenant_id, name, provider_name, host, port, username, secret_masked, transport, caller_id, codecs, context, register, status, channels_max, channels_in_use, auth_mode, authorized_ips, send_pai, send_rpid, direct_media)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21)
             ON CONFLICT (id) DO NOTHING`,
            [
              trk.id, trk.tenantId, trk.name, trk.providerName, trk.host, trk.port || 5060,
              trk.username || '', trk.secretMasked || '', trk.transport || 'UDP', trk.callerId || '',
              JSON.stringify(trk.codecs || []), trk.context || 'from-trunk', trk.register || false,
              trk.status || 'unregistered', trk.channelsMax || 30, trk.channelsInUse || 0,
              trk.authMode || 'ip', JSON.stringify(trk.authorizedIps || []), trk.sendPai || false,
              trk.sendRpid || false, trk.directMedia || false
            ]
          );
        }

        // 5. DIDs
        for (const d of db.dids) {
          await postgresClient.query(
            `INSERT INTO dids (id, tenant_id, did, normalized_number, presented_number, operator_name, trunk_id, description, status, destination_type, destination_id, channels_in_use, total_calls_received)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
             ON CONFLICT (tenant_id, did) DO NOTHING`,
            [
              d.id, d.tenantId, d.did, d.normalizedNumber, d.presentedNumber, d.operatorName,
              d.trunkId, d.description || '', d.status || 'active', d.destinationType,
              d.destinationId, d.channelsInUse || 0, d.totalCallsReceived || 0
            ]
          );
        }

        console.log('[DatabaseMigrator] Sincronização de dados corporativos concluída com sucesso.');
      }
    } catch (err: any) {
      console.warn('[DatabaseMigrator] Aviso ao sincronizar dados iniciais:', err.message);
    }
  }
}
