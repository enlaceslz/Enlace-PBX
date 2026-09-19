import fs from 'fs';
import path from 'path';
import bcrypt from 'bcrypt';
import { postgresClient } from '../client';
import { db } from '../../../db';

export class DatabaseMigrator {
  public static async runMigrations(): Promise<{ success: boolean; applied: number; error?: string }> {
    const health = await postgresClient.checkHealth();
    if (health.status !== 'UP') {
      console.log(`[DatabaseMigrator] PostgreSQL status: ${health.status} (${health.error || 'Aguardando configuração'}). Migrations adiadas.`);
      return { success: false, applied: 0, error: health.error };
    }

    try {
      console.log('[DatabaseMigrator] Conectado ao PostgreSQL. Verificando integridade das tabelas...');
      const sqlPath = path.join(process.cwd(), 'server', 'infrastructure', 'postgres', 'migrations', '001_initial_schema.sql');
      
      let sqlContent = '';
      if (fs.existsSync(sqlPath)) {
        sqlContent = fs.readFileSync(sqlPath, 'utf8');
      } else {
        // Fallback para caminho de compilação
        const altPath = path.join(__dirname, '001_initial_schema.sql');
        if (fs.existsSync(altPath)) {
          sqlContent = fs.readFileSync(altPath, 'utf8');
        }
      }

      if (sqlContent) {
        await postgresClient.query(sqlContent);
        console.log('[DatabaseMigrator] Migrações DDL aplicadas com sucesso.');
      }

      // Sincronização inicial se o banco estiver limpo
      await this.seedInitialDataIfEmpty();

      return { success: true, applied: 1 };
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
