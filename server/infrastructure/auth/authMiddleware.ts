import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { User } from '../../../src/types/pbx.js';
import { UserRepository } from '../postgres/repositories/UserRepository.js';
import { TenantRepository } from '../postgres/repositories/TenantRepository.js';
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

// Matriz de Permissões RBAC Enterprise
export const ROLE_PERMISSIONS: Record<UserRole, string[]> = {
  super_admin: ['*'],
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
  };
  tenantId?: string;
}

/**
 * Middleware de Autenticação Obrigatória:
 * Rejeita qualquer requisição sem token JWT com status 401 Unauthorized.
 * Não permite passagem permissiva de requisições.
 */
export const requireAuth = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers['authorization'];
  const token = (authHeader && authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null) ||
                (typeof req.query?.token === 'string' ? req.query.token : null);

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

    if (req.user.role === 'super_admin') {
      return next();
    }

    const userPermissions = ROLE_PERMISSIONS[req.user.role] || [];
    if (userPermissions.includes('*') || userPermissions.includes(permission)) {
      return next();
    }

    return res.status(403).json({
      error: `Acesso proibido. Ação '${permission}' não autorizada para o perfil '${req.user.role}'.`,
      code: 'PERMISSION_DENIED'
    });
  };
};

export interface TenantContext {
  tenantId: string;
  actorUserId: string;
  actorRole: UserRole;
  isCrossTenantOperation: boolean;
}

/**
 * Função centralizada para determinar o contexto de tenant estrito.
 * Nunca confia no req.body.tenantId, req.query.tenantId ou cabeçalhos arbitrários de clientes comuns.
 * Somente 'super_admin' pode operar cross-tenant sob autorização explícita.
 */
export function resolveTenantContext(req: Request): TenantContext {
  const authReq = req as AuthenticatedRequest;
  if (!authReq.user) {
    throw new Error('AUTH_REQUIRED: Sessão não autenticada.');
  }

  const actorRole = authReq.user.role;
  const actorUserId = authReq.user.id;
  const userTenantId = authReq.user.tenantId;

  // Se super_admin, ele pode operar sobre outro tenant apenas se expressamente requisitado
  // via header 'x-target-tenant-id' ou query 'targetTenantId', validado previamente
  if (actorRole === 'super_admin') {
    const explicitTarget =
      (req.headers['x-target-tenant-id'] as string) ||
      (req.headers['x-tenant-id'] as string) ||
      (typeof req.query?.targetTenantId === 'string' ? req.query.targetTenantId : undefined) ||
      (authReq.tenantId !== userTenantId ? authReq.tenantId : undefined);

    if (explicitTarget && explicitTarget.trim() !== '' && explicitTarget.trim() !== userTenantId) {
      return {
        tenantId: explicitTarget.trim(),
        actorUserId,
        actorRole,
        isCrossTenantOperation: true,
      };
    }
  }

  // Para qualquer outro perfil, o tenant do usuário é a ÚNICA fonte de verdade imutável
  return {
    tenantId: userTenantId,
    actorUserId,
    actorRole,
    isCrossTenantOperation: false,
  };
}

/**
 * Middleware de Isolamento Rigoroso de Tenants:
 * Garante que usuários só acessem recursos do seu próprio tenant.
 * Super_admin pode acessar ou trocar para qualquer tenant válido existente.
 */
export const requireTenant = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Sessão não autenticada.', code: 'AUTH_REQUIRED' });
  }

  // Identifica o tenant solicitado na rota, query, headers ou body
  const requestedTenantId =
    (req.headers['x-target-tenant-id'] as string) ||
    (req.headers['x-tenant-id'] as string) ||
    req.params.tenantId ||
    (typeof req.query?.tenantId === 'string' ? req.query.tenantId : undefined) ||
    (typeof req.query?.targetTenantId === 'string' ? req.query.targetTenantId : undefined) ||
    req.body?.tenantId;

  if (req.user.role === 'super_admin') {
    if (requestedTenantId && requestedTenantId !== req.user.tenantId) {
      const tenant = await TenantRepository.findById(requestedTenantId);
      if (!tenant) {
        return res.status(404).json({ error: `Tenant informado (${requestedTenantId}) não existe.`, code: 'TENANT_NOT_FOUND' });
      }
      req.tenantId = requestedTenantId;
    } else {
      req.tenantId = req.user.tenantId;
    }
    return next();
  }

  // Para qualquer outro perfil, tentativas de especificar outro tenant são expressamente rejeitadas
  if (requestedTenantId && requestedTenantId !== req.user.tenantId) {
    return res.status(403).json({
      error: `Violação de Isolamento de Tenant. Você pertence ao tenant '${req.user.tenantId}' e não pode acessar recursos do tenant '${requestedTenantId}'.`,
      code: 'TENANT_ISOLATION_VIOLATION',
    });
  }

  req.tenantId = req.user.tenantId;
  if (req.body && typeof req.body === 'object') {
    // Sobrescreve com o tenant real da sessão
    req.body.tenantId = req.user.tenantId;
  }
  next();
};

/**
 * Retorna o tenantId autorizado estritamente a partir do contexto da sessão autenticada.
 * Nunca confia em dados não autenticados do frontend.
 */
export function getAuthorizedTenantId(req: Request): string {
  return resolveTenantContext(req).tenantId;
}

