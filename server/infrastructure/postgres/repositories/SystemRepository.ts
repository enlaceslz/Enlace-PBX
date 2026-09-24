import { postgresClient } from '../client.js';

export class SystemRepository {
  public static async getSetting<T>(key: string, defaultValue?: T): Promise<T | null> {
    try {
      const res = await postgresClient.query('SELECT value FROM system_settings WHERE key = $1', [key]);
      if (res.rows.length > 0) {
        const val = res.rows[0].value;
        return typeof val === 'string' ? JSON.parse(val) : val;
      }
    } catch (e: any) {
      console.warn(`[SystemRepository] Falha ao consultar configuração '${key}':`, e?.message || e);
    }
    return defaultValue !== undefined ? defaultValue : null;
  }

  public static async setSetting<T>(key: string, value: T, description?: string): Promise<T> {
    try {
      await postgresClient.query(
        `INSERT INTO system_settings (key, value, description, updated_at)
         VALUES ($1, $2, $3, CURRENT_TIMESTAMP)
         ON CONFLICT (key) DO UPDATE SET
           value = EXCLUDED.value,
           description = COALESCE(EXCLUDED.description, system_settings.description),
           updated_at = CURRENT_TIMESTAMP`,
        [key, JSON.stringify(value), description || null]
      );
    } catch (e: any) {
      console.error(`[SystemRepository] Falha ao salvar configuração '${key}':`, e?.message || e);
      throw e;
    }
    return value;
  }

  public static async deleteSetting(key: string): Promise<boolean> {
    try {
      const res = await postgresClient.query('DELETE FROM system_settings WHERE key = $1', [key]);
      return (res.rowCount ?? 0) > 0;
    } catch (e: any) {
      console.error(`[SystemRepository] Falha ao excluir configuração '${key}':`, e?.message || e);
      return false;
    }
  }

  public static async getInfraConfig(fallback?: any): Promise<any> {
    return (await this.getSetting('infra_config')) || fallback || null;
  }

  public static async setInfraConfig(config: any): Promise<any> {
    return this.setSetting('infra_config', config, 'Configurações de rede, NAT, portas e TLS/SSL');
  }

  public static async getWireguardConfig(fallback?: any): Promise<any> {
    return (await this.getSetting('wireguard_config')) || fallback || null;
  }

  public static async setWireguardConfig(config: any): Promise<any> {
    return this.setSetting('wireguard_config', config, 'Configurações de túneis e peers WireGuard');
  }

  public static async getZerotierConfig(fallback?: any): Promise<any> {
    return (await this.getSetting('zerotier_config')) || fallback || null;
  }

  public static async setZerotierConfig(config: any): Promise<any> {
    return this.setSetting('zerotier_config', config, 'Configurações de redes e nós ZeroTier');
  }

  public static async getVpnRouting(fallback?: any): Promise<any> {
    return (await this.getSetting('vpn_routing')) || fallback || null;
  }

  public static async setVpnRouting(routing: any): Promise<any> {
    return this.setSetting('vpn_routing', routing, 'Roteamento prioritário VPN e Failover automático');
  }

  public static async getFail2banConfig(fallback?: any): Promise<any> {
    return (await this.getSetting('fail2ban_config')) || fallback || null;
  }

  public static async setFail2banConfig(config: any): Promise<any> {
    return this.setSetting('fail2ban_config', config, 'Regras, Jails e Whitelist do Fail2ban');
  }

  public static async getSnapshots(): Promise<any[]> {
    return (await this.getSetting<any[]>('system_snapshots')) || [];
  }

  public static async setSnapshots(snapshots: any[]): Promise<any[]> {
    return this.setSetting('system_snapshots', snapshots, 'Snapshots e pontos de restauração');
  }

  public static async addSnapshot(snapshot: any): Promise<void> {
    const list = await this.getSnapshots();
    list.unshift(snapshot);
    if (list.length > 50) list.pop();
    await this.setSnapshots(list);
  }

  public static async takeSnapshot(tenantId: string, description: string): Promise<any> {
    const snapshot = {
      id: `snap-${Date.now()}`,
      tenantId,
      timestamp: new Date().toISOString(),
      description,
      state: {},
    };
    await this.addSnapshot(snapshot);
    return snapshot;
  }

  public static async rollbackSnapshot(snapshotId: string): Promise<boolean> {
    const snapshots = await this.getSnapshots();
    const snap = snapshots.find((s) => s.id === snapshotId);
    if (!snap) return false;
    return true;
  }

  public static async getWhatsappConfig(fallback?: any): Promise<any> {
    return (await this.getSetting('whatsapp_config')) || fallback || null;
  }

  public static async setWhatsappConfig(config: any): Promise<any> {
    return this.setSetting('whatsapp_config', config, 'Configurações da API oficial do WhatsApp');
  }

  public static async getCrmProviders(fallback?: any[]): Promise<any[]> {
    return (await this.getSetting<any[]>('crm_providers')) || fallback || [];
  }

  public static async setCrmProviders(providers: any[]): Promise<any[]> {
    return this.setSetting('crm_providers', providers, 'Provedores de CRM integrados');
  }

  public static async getEntitySchemas(fallback?: any[]): Promise<any[]> {
    return (await this.getSetting<any[]>('entity_schemas')) || fallback || [];
  }

  public static async setEntitySchemas(schemas: any[]): Promise<any[]> {
    return this.setSetting('entity_schemas', schemas, 'Esquemas de extração de entidades da IA');
  }

  public static async getWebhooks(fallback?: any[]): Promise<any[]> {
    return (await this.getSetting<any[]>('webhooks')) || fallback || [];
  }

  public static async setWebhooks(webhooks: any[]): Promise<any[]> {
    return this.setSetting('webhooks', webhooks, 'Configurações de webhooks');
  }

  public static async getAiSessions(fallback?: any[]): Promise<any[]> {
    return (await this.getSetting<any[]>('ai_sessions')) || fallback || [];
  }

  public static async setAiSessions(sessions: any[]): Promise<any[]> {
    return this.setSetting('ai_sessions', sessions, 'Sessões ativas de atendimento de IA MaIA');
  }
}
