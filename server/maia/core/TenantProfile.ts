import { TenantRepository } from '../../infrastructure/postgres/repositories/TenantRepository.js';

export interface TenantProfile {
  tenantId: string;
  companyName: string;
  brand: string;
  slogan: string;
  phone: string;
  timezone: string;
  businessHours: string;
  rules: string[];
  contactInfo: string;
  transferExtension: string;
}

/**
 * TenantProfileResolver — Desacopla o nome da empresa e parâmetros regionais da MaIA
 * Garante que a identidade central permaneça MaIA PBX, enquanto os dados da organização
 * são carregados dinamicamente do perfil do tenant.
 */
export class TenantProfileResolver {
  private static cache: Map<string, { profile: TenantProfile; expiresAt: number }> = new Map();

  public static async getProfile(tenantId: string): Promise<TenantProfile> {
    const now = Date.now();
    const cached = this.cache.get(tenantId);
    if (cached && cached.expiresAt > now) {
      return cached.profile;
    }

    let companyName = 'Central Corporativa';
    let brand = 'Enlace-PBX';
    let slogan = 'Telefonia Inteligente';
    let phone = '0800';
    let transferExtension = '4101';

    try {
      const tenant = await TenantRepository.findById(tenantId);
      if (tenant) {
        companyName = tenant.name || companyName;
        brand = tenant.name ? tenant.name.split(' ')[0] : brand;
      }
    } catch {}

    const profile: TenantProfile = {
      tenantId,
      companyName,
      brand,
      slogan,
      phone,
      timezone: 'America/Sao_Paulo',
      businessHours: 'Segunda a Sexta das 08h às 18h',
      rules: [
        `Identifique-se como MaIA, atendente virtual da ${companyName}.`,
        `Para transbordo ou suporte humano, utilize o ramal ${transferExtension}.`,
        'Mantenha respostas concisas com no máximo 2 ou 3 frases para áudio em tempo real.',
      ],
      contactInfo: `Telefone: ${phone} | Suporte: ramal ${transferExtension}`,
      transferExtension,
    };

    this.cache.set(tenantId, { profile, expiresAt: now + 60000 }); // Cache de 1 minuto
    return profile;
  }
}
