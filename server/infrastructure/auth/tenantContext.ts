/**
 * Enlace-PBX Enterprise — Contrato Canônico de Autoridade de Tenant
 * Define as interfaces, tipos e normalizadores de TenantContext para isolamento multi-tenant real.
 */

export type UserRole = 'super_admin' | 'admin' | 'supervisor' | 'operator' | 'agent' | 'readonly';

export type TenantAccessMode = 'TENANT' | 'SUPER_ADMIN_TARGET' | 'GLOBAL';

export interface TenantContext {
  readonly tenantId: string;
  readonly actorUserId: string;
  readonly actorRole: UserRole;
  readonly accessMode: TenantAccessMode;
  readonly originTenantId?: string;
  readonly requestId?: string;
}

/**
 * Normaliza qualquer entrada (TenantContext canônico ou string de identificador de tenant)
 * para um TenantContext canônico estrito.
 * Aplica Fail-Closed: strings vazias ou nulas geram exceção imediata.
 */
export function toCanonicalTenantContext(
  input: TenantContext | string | undefined | null,
  fallbackRole: UserRole = 'admin'
): TenantContext {
  if (!input) {
    throw new Error('TENANT_REQUIRED: Contexto ou identificador de tenant ausente (Fail-Closed).');
  }

  if (typeof input === 'string') {
    const trimmed = input.trim();
    if (!trimmed) {
      throw new Error('TENANT_REQUIRED: Identificador de tenant não pode ser vazio (Fail-Closed).');
    }
    return {
      tenantId: trimmed,
      actorUserId: 'SYSTEM',
      actorRole: fallbackRole,
      accessMode: 'TENANT',
      originTenantId: trimmed,
    };
  }

  if (typeof input === 'object') {
    if (input.accessMode === 'GLOBAL') {
      return input;
    }
    if (!input.tenantId || typeof input.tenantId !== 'string' || input.tenantId.trim() === '') {
      throw new Error('TENANT_REQUIRED: TenantContext sem tenantId válido para operação não-global (Fail-Closed).');
    }
    return input;
  }

  throw new Error('TENANT_REQUIRED: Formato inválido de contexto de tenant (Fail-Closed).');
}

/**
 * Cria um TenantContext canônico com validações estritas
 */
export function createTenantContext(params: {
  tenantId: string;
  actorUserId?: string;
  actorRole?: UserRole;
  accessMode?: TenantAccessMode;
  originTenantId?: string;
  requestId?: string;
}): TenantContext {
  const accessMode = params.accessMode || 'TENANT';
  if (accessMode !== 'GLOBAL') {
    if (!params.tenantId || params.tenantId.trim() === '') {
      throw new Error('TENANT_REQUIRED: tenantId obrigatório para TenantContext (Fail-Closed).');
    }
  }

  return {
    tenantId: params.tenantId ? params.tenantId.trim() : '',
    actorUserId: params.actorUserId || 'SYSTEM',
    actorRole: params.actorRole || 'admin',
    accessMode,
    originTenantId: params.originTenantId || params.tenantId,
    requestId: params.requestId,
  };
}
