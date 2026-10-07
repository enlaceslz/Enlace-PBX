import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { User } from '../../../src/types/pbx.js';
import { UserRepository } from '../postgres/repositories/UserRepository.js';
import { TenantRepository } from '../postgres/repositories/TenantRepository.js';
import { AuditLogRepository } from '../postgres/repositories/AuditLogRepository.js';
import { env } from '../../config/env.js';

export type UserRole = 'super_admin' | 'admin' | 'supervisor' | 'operator' | 'agent' | 'readonly';

// Normalização de roles legadas para a matriz de segurança oficial
export function normalizeRole(role: string): UserRole {
  switch (role) {
    case 'super_admin':
      return 'super_admin';
    case 'admin':
      return 'admin';
    case 'supervisor':
      return 'supervisor';
    case 'operator':
    case 'operador':
      return 'operator';
    case 'agent':
    case 'usuario':
      return 'agent';
    case 'readonly':
    case 'auditor':
      return 'readonly';
    default:
      return 'readonly';
  }
}

// Matriz de Permissões RBAC Enterprise com Capacidade Explícita Cross-Tenant
export const ROLE_PERMISSIONS: Record<UserRole, string[]> = {
  super_admin: [
    'platform:cross_tenant',
    '*',
  ],
  admin: [
    'extensions:read', 'extensions:write', 'extensions:delete',
    'trunks:read', 'trunks:write', 'trunks:delete',
    'dids:read', 'dids:write', 'dids:delete',
    'routes:read', 'routes:write', 'routes:delete',
    'queues:read', 'queues:write', 'queues:delete',
    'ivrs:read', 'ivrs:write', 'ivrs:delete',
    'ai:read', 'ai:write',
    'cdr:read', 'recordings:listen', 'recordings:download',
    'billing:read', 'billing:write',
    'users:read', 'users:write',
    'network:read', 'network:write',
    'asterisk:reload', 'asterisk:cli',
    'logs:read', 'audit:read',
  ],
  supervisor: [
    'extensions:read',
    'queues:read', 'queues:write',
    'campaigns:read', 'campaigns:write',
    'cdr:read', 'recordings:listen',
    'channels:spy', 'channels:whisper', 'channels:barge',
    'ai:read',
    'audit:read',
  ],
  operator: [
    'extensions:read',
    'webphone:use',
    'contacts:read', 'contacts:write',
    'channels:call', 'channels:hangup', 'channels:transfer',
    'cdr:read_self',
  ],
  agent: [
    'webphone:use',
    'contacts:read',
    'channels:call', 'channels:hangup',
  ],
  readonly: [
    'dashboard:read',
    'reports:read',
    'logs:read',
  ],
};

/**
 * Validação rigorosa de capacidade ou permissão explícita.
 * A permissão universal '*' não confere automaticamente 'platform:cross_tenant'
 * a menos que esteja explicitamente atribuída na matriz do perfil.
 */
export function hasCapability(
  user: { role: UserRole; permissions?: string[] } | undefined,
  capability: string
): boolean {
  if (!user) return false;
  if (user.permissions && Array.isArray(user.permissions) && user.permissions.includes(capability)) {
    return true;
  }
  const rolePerms = ROLE_PERMISSIONS[user.role] || [];
  return rolePerms.includes(capability);
}

export function getJwtSecret(): string {
  return env.JWT_SECRET;
}

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    tenantId: string;
    email: string;
    role: UserRole;
    name: string;
    extension?: string;
    permissions?: string[];
  };
  tenantId?: string;
  tenantContext?: TenantContext;
}

/**
 * Gerenciador de Tickets Efêmeros para SSE (Server-Sent Events) — P0-01
 * - Escopo estrito: 'sse'
 * - TTL ultracurto: 30 segundos
 * - Uso único (One-Time Ticket) consumido no handshake SSE (anti-replay)
 * - Vinculado ao usuário e tenant autenticados
 * - Rejeita sumariamente JWTs permanentes transmitidos em query strings
 */
export interface SseTicketData {
  ticket: string;
  userId: string;
  tenantId: string;
  email: string;
  role: UserRole;
  name: string;
  extension?: string;
  scope: 'sse';
  createdAt: number;
  expiresAt: number;
}

export class SseTicketManager {
  private static tickets: Map<string, SseTicketData> = new Map();
  private static consumedTickets: Set<string> = new Set();
  public static readonly TTL_MS = 30000; // 30 segundos

  public static generateTicket(
    user: {
      id: string;
      tenantId: string;
      email: string;
      role: UserRole;
      name: string;
      extension?: string;
    },
    tenantId?: string
  ): { ticket: string; expiresInSeconds: number } {
    this.cleanup();
    const ticketId = `sse_tkt_${crypto.randomBytes(24).toString('base64url')}`;
    const now = Date.now();
    const effectiveTenantId = tenantId || user.tenantId;

    const data: SseTicketData = {
      ticket: ticketId,
      userId: user.id,
      tenantId: effectiveTenantId,
      email: user.email,
      role: user.role,
      name: user.name,
      extension: user.extension,
      scope: 'sse',
      createdAt: now,
      expiresAt: now + this.TTL_MS,
    };

    this.tickets.set(ticketId, data);
    return { ticket: ticketId, expiresInSeconds: Math.round(this.TTL_MS / 1000) };
  }

  public static consumeTicket(ticketId: string): {
    user: NonNullable<AuthenticatedRequest['user']>;
    tenantId: string;
  } {
    this.cleanup();

    if (!ticketId || typeof ticketId !== 'string') {
      const err: any = new Error('Ticket SSE não informado.');
      err.code = 'SSE_TOKEN_INVALID';
      throw err;
    }

    // 1. Rejeição explícita do JWT permanente da aplicação em URL
    if (ticketId.startsWith('ey') && ticketId.includes('.')) {
      const err: any = new Error('O JWT permanente da aplicação é proibido em URLs SSE. Obtenha um ticket efêmero via POST /api/v1/auth/sse-ticket.');
      err.code = 'SSE_PERMANENT_JWT_FORBIDDEN';
      throw err;
    }

    // 2. Detecção de Replay (ticket já consumido)
    if (this.consumedTickets.has(ticketId)) {
      const err: any = new Error('Ticket SSE já foi utilizado anteriormente (replay detectado). Obtenha um novo ticket efêmero.');
      err.code = 'SSE_TOKEN_REPLAY';
      throw err;
    }

    const ticketData = this.tickets.get(ticketId);
    if (!ticketData) {
      const err: any = new Error('Ticket SSE inválido ou não localizado.');
      err.code = 'SSE_TOKEN_INVALID';
      throw err;
    }

    // 3. Validação de Escopo
    if (ticketData.scope !== 'sse') {
      const err: any = new Error(`Escopo inválido para conexão SSE: '${ticketData.scope}'. Esperado: 'sse'.`);
      err.code = 'SSE_INVALID_SCOPE';
      throw err;
    }

    // 4. Validação de Expiração
    if (Date.now() > ticketData.expiresAt) {
      this.tickets.delete(ticketId);
      const err: any = new Error('Ticket SSE expirado. O tempo de vida máximo é de 30 segundos.');
      err.code = 'SSE_TOKEN_EXPIRED';
      throw err;
    }

    // 5. Consome o ticket (One-Time Use) — remove do mapa ativo e adiciona aos consumidos
    this.tickets.delete(ticketId);
    this.consumedTickets.add(ticketId);

    return {
      user: {
        id: ticketData.userId,
        tenantId: ticketData.tenantId,
        email: ticketData.email,
        role: ticketData.role,
        name: ticketData.name,
        extension: ticketData.extension,
      },
      tenantId: ticketData.tenantId,
    };
  }

  private static cleanup(): void {
    const now = Date.now();
    for (const [id, t] of this.tickets.entries()) {
      if (now > t.expiresAt + 60000) {
        this.tickets.delete(id);
      }
    }
    if (this.consumedTickets.size > 5000) {
      this.consumedTickets.clear();
    }
  }

  public static resetForTests(): void {
    this.tickets.clear();
    this.consumedTickets.clear();
  }
}

/**
 * Middleware de Autenticação Obrigatória:
 * Rejeita qualquer requisição sem token JWT com status 401 Unauthorized.
 * Não permite passagem permissiva de requisições.
 */
export const requireAuth = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers['authorization'];
  const token = (authHeader && authHeader.startsWith('Bearer ')) ? authHeader.slice(7).trim() : null;

  if (!token) {
    return res.status(401).json({
      error: 'Autenticação obrigatória. Token JWT não fornecido.',
      code: 'AUTH_TOKEN_MISSING'
    });
  }

  let secret: string;
  try {
    secret = getJwtSecret();
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }

  try {
    const decoded = jwt.verify(token, secret) as any;

    // Busca usuário atualizado no PostgreSQL através do repositório
    const user = (decoded.id ? await UserRepository.findById(decoded.id) : null) ||
                 (decoded.email ? await UserRepository.findByEmail(decoded.email) : null);

    if (!user) {
      return res.status(401).json({
        error: 'Usuário do token não localizado na base de dados.',
        code: 'AUTH_USER_NOT_FOUND'
      });
    }

    if (!user.isActive) {
      return res.status(403).json({
        error: 'Conta de usuário desativada pelo administrador.',
        code: 'AUTH_USER_INACTIVE'
      });
    }

    const normalizedRole = normalizeRole(user.role);

    req.user = {
      id: user.id,
      tenantId: user.tenantId,
      email: user.email,
      role: normalizedRole,
      name: user.name,
      extension: user.extension,
      permissions: ROLE_PERMISSIONS[normalizedRole] || [],
    };

    // Define o tenant inicial baseado na sessão autenticada (nunca no input do cliente)
    req.tenantId = user.tenantId;

    next();
  } catch {
    return res.status(401).json({
      error: 'Token JWT inválido ou expirado.',
      code: 'AUTH_TOKEN_INVALID'
    });
  }
};

/**
 * Middleware de Autenticação para Streams SSE (Server-Sent Events) — P0-01
 * Não aceita o JWT permanente na URL (?token=JWT).
 * Aceita:
 * 1. Header padrão 'Authorization: Bearer <jwt>' (quando suportado pelo cliente).
 * 2. Ticket efêmero de uso único via query string: ?ticket=<sse_ticket> ou ?token=<sse_ticket>.
 * Se o JWT permanente for detectado na URL, retorna HTTP 401 com SSE_PERMANENT_JWT_FORBIDDEN.
 */
export const requireSseAuth = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers['authorization'];
  const headerToken = (authHeader && authHeader.startsWith('Bearer ')) ? authHeader.slice(7).trim() : null;

  // 1. Conexão com Header padrão Authorization: Bearer
  if (headerToken) {
    let secret: string;
    try {
      secret = getJwtSecret();
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }

    try {
      const decoded = jwt.verify(headerToken, secret) as any;
      const user = (decoded.id ? await UserRepository.findById(decoded.id) : null) ||
                   (decoded.email ? await UserRepository.findByEmail(decoded.email) : null);

      if (!user) {
        return res.status(401).json({ error: 'Usuário não localizado.', code: 'AUTH_USER_NOT_FOUND' });
      }
      if (!user.isActive) {
        return res.status(403).json({ error: 'Conta de usuário desativada.', code: 'AUTH_USER_INACTIVE' });
      }

      req.user = {
        id: user.id,
        tenantId: user.tenantId,
        email: user.email,
        role: normalizeRole(user.role),
        name: user.name,
        extension: user.extension,
        permissions: ROLE_PERMISSIONS[normalizeRole(user.role)] || [],
      };
      req.tenantId = user.tenantId;
      return next();
    } catch {
      return res.status(401).json({ error: 'Token JWT inválido ou expirado.', code: 'AUTH_TOKEN_INVALID' });
    }
  }

  // 2. Conexão via Query Param (?ticket= ou ?token=)
  const queryTicket = (typeof req.query?.ticket === 'string' ? req.query.ticket.trim() : null) ||
                      (typeof req.query?.token === 'string' ? req.query.token.trim() : null);

  if (!queryTicket) {
    return res.status(401).json({
      error: 'Autenticação SSE obrigatória. Forneça o ticket efêmero (?ticket=) gerado via POST /api/v1/auth/sse-ticket ou header Authorization.',
      code: 'AUTH_TOKEN_MISSING'
    });
  }

  // 3. Validação estrita do ticket efêmero
  try {
    const session = SseTicketManager.consumeTicket(queryTicket);
    req.user = session.user;
    req.tenantId = session.tenantId;
    return next();
  } catch (err: any) {
    return res.status(401).json({
      error: err.message || 'Falha na validação do ticket SSE.',
      code: err.code || 'SSE_TOKEN_INVALID'
    });
  }
};

/**
 * Middleware RBAC: Exige que o usuário possua um dos papéis informados.
 */
export const requireRole = (...allowedRoles: UserRole[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Sessão não autenticada.' });
    }

    if (req.user.role === 'super_admin') {
      return next();
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        error: `Acesso proibido. Seu perfil (${req.user.role}) não tem permissão para este recurso. Perfis autorizados: ${allowedRoles.join(', ')}.`,
        code: 'RBAC_FORBIDDEN'
      });
    }

    next();
  };
};

/**
 * Middleware RBAC: Exige que o usuário possua a permissão pontual especificada.
 */
export const requirePermission = (permission: string) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Sessão não autenticada.' });
    }

    if (req.user.role === 'super_admin' && permission !== 'platform:cross_tenant') {
      return next();
    }

    if (hasCapability(req.user, permission)) {
      return next();
    }

    return res.status(403).json({
      error: `Acesso proibido. Ação '${permission}' não autorizada para o perfil '${req.user.role}'.`,
      code: 'PERMISSION_DENIED'
    });
  };
};

export interface TenantContext {
  readonly tenantId: string;
  readonly actorUserId: string;
  readonly actorRole: UserRole;
  readonly accessMode: 'TENANT' | 'SUPER_ADMIN_TARGET' | 'GLOBAL';
  readonly originTenantId?: string;
  readonly requestId?: string;
}

/**
 * Função centralizada para determinar o contexto de tenant estrito — Canonical Tenant Authority
 * Nunca confia no req.body.tenantId, req.query.tenantId ou cabeçalhos arbitrários para alterar autoridade.
 * Somente usuários com a capacidade explícita 'platform:cross_tenant' podem operar cross-tenant.
 */
export function resolveTenantContext(req: Request): TenantContext {
  const authReq = req as AuthenticatedRequest;
  if (!authReq.user) {
    const err: any = new Error('AUTH_REQUIRED: Sessão não autenticada.');
    err.code = 'AUTH_REQUIRED';
    throw err;
  }

  const actorRole = authReq.user.role;
  const actorUserId = authReq.user.id;
  const originTenantId = authReq.user.tenantId;
  const requestId = (req.headers['x-request-id'] as string) || `req-${Date.now()}`;

  // Se o contexto já foi computado nesta requisição pelo middleware requireTenant
  if (authReq.tenantContext) {
    return authReq.tenantContext;
  }

  // Avaliação de solicitação explícita de target tenant
  const explicitTarget =
    (req.headers['x-target-tenant-id'] as string) ||
    (req.headers['x-tenant-id'] as string) ||
    (typeof req.query?.targetTenantId === 'string' ? req.query.targetTenantId : undefined) ||
    (typeof req.query?.tenantId === 'string' && actorRole === 'super_admin' ? (req.query.tenantId as string) : undefined);

  if (explicitTarget && explicitTarget.trim() !== '' && explicitTarget.trim() !== originTenantId) {
    const targetTenant = explicitTarget.trim();

    // Usuário normal tentando especificar outro tenant é sumariamente bloqueado
    if (!hasCapability(authReq.user, 'platform:cross_tenant')) {
      const err: any = new Error(`TENANT_CROSS_OPERATION_FORBIDDEN: Usuário (${actorRole}) não possui a capacidade explícita 'platform:cross_tenant' para acessar o tenant '${targetTenant}'.`);
      err.code = 'TENANT_CROSS_OPERATION_FORBIDDEN';
      err.status = 403;
      throw err;
    }

    const context: TenantContext = {
      tenantId: targetTenant,
      actorUserId,
      actorRole,
      accessMode: 'SUPER_ADMIN_TARGET',
      originTenantId,
      requestId,
    };
    authReq.tenantContext = context;
    authReq.tenantId = targetTenant;
    return context;
  }

  // O tenant do usuário é a ÚNICA autoridade canônica imutável para operações normais
  const context: TenantContext = {
    tenantId: originTenantId,
    actorUserId,
    actorRole,
    accessMode: 'TENANT',
    originTenantId,
    requestId,
  };
  authReq.tenantContext = context;
  authReq.tenantId = originTenantId;
  return context;
}

/**
 * Middleware de Isolamento Rigoroso de Tenants com Auditoria Fail-Closed
 * Garante que usuários só acessem recursos do seu próprio tenant.
 * Rejeita qualquer tentativa de elevação de autoridade por body, query ou headers não autorizados.
 * Não altera req.body.
 */
export const requireTenant = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Sessão não autenticada.', code: 'AUTH_REQUIRED' });
  }

  let tenantCtx: TenantContext;
  try {
    tenantCtx = resolveTenantContext(req);
  } catch (err: any) {
    if (err.code === 'TENANT_CROSS_OPERATION_FORBIDDEN') {
      return res.status(403).json({
        error: err.message,
        code: 'TENANT_CROSS_OPERATION_FORBIDDEN',
      });
    }
    return res.status(401).json({ error: err.message || 'Sessão não autorizada.', code: err.code || 'AUTH_REQUIRED' });
  }

  // Caso seja operação cross-tenant autorizada para o Super Admin
  if (tenantCtx.accessMode === 'SUPER_ADMIN_TARGET') {
    // 1. Valida existência do tenant alvo no PostgreSQL
    const tenant = await TenantRepository.findById(tenantCtx.tenantId);
    if (!tenant) {
      return res.status(404).json({
        error: `Tenant informado (${tenantCtx.tenantId}) não existe.`,
        code: 'TENANT_NOT_FOUND',
      });
    }

    // 2. Auditoria OBRIGATÓRIA FAIL-CLOSED
    try {
      await AuditLogRepository.logStrict({
        tenantId: tenantCtx.tenantId,
        userId: req.user.id,
        userName: req.user.name,
        action: 'CROSS_TENANT_ACCESS',
        resource: `tenant/${tenantCtx.tenantId}`,
        details: `Operador com capacidade platform:cross_tenant alternou contexto do tenant de origem '${tenantCtx.originTenantId}' para o tenant '${tenantCtx.tenantId}'.`,
        category: 'SECURITY',
        severity: 'WARNING',
        ip: req.ip || '127.0.0.1',
      });
    } catch (auditErr: any) {
      console.error('[requireTenant] Falha na auditoria obrigatória cross-tenant (FAIL-CLOSED):', auditErr?.message || auditErr);
      return res.status(503).json({
        error: 'Operação cross-tenant cancelada: falha ao persistir auditoria obrigatória de conformidade (FAIL-CLOSED).',
        code: 'AUDIT_REQUIRED_FAILURE',
      });
    }
  }

  // Anexa o contexto canônico imutável à requisição (sem mutação no req.body)
  req.tenantContext = tenantCtx;
  req.tenantId = tenantCtx.tenantId;
  next();
};

/**
 * Retorna o tenantId autorizado estritamente a partir da autoridade canônica da sessão autenticada.
 * Nunca confia em dados não autenticados do frontend ou payload HTTP.
 */
export function getAuthorizedTenantId(req: Request): string {
  return resolveTenantContext(req).tenantId;
}

