import crypto from 'node:crypto';
import type { RequestHandler, ErrorRequestHandler } from 'express';

/** Abrange autenticação, erros de parsing, rejeições e respostas de dados. */
export const privateApiResponse: RequestHandler = (_req, res, next) => {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  // Identidade gerada pelo servidor, sem copiar cabeçalhos controlados pelo cliente.
  res.locals.requestId = crypto.randomUUID();
  res.setHeader('X-Request-Id', res.locals.requestId);
  next();
};

export function telephonyFailure(error: unknown) {
  const denied = error instanceof Error && error.message.startsWith('ACCESS_DENIED');
  return denied ? { status: 403, error: 'Acesso à operação de telefonia negado.' }
    : { status: 500, error: 'Falha ao executar operação de telefonia. Consulte o administrador.' };
}

/** Erros inesperados não devem serializar corpo recebido, SQL, caminhos ou segredos. */
export const unexpectedHttpError: ErrorRequestHandler = (error, _req, res, next) => {
  if (res.headersSent) return next(error);
  const status = error?.type === 'entity.too.large' ? 413 : error?.type === 'entity.parse.failed' ? 400 : 500;
  const requestId = res.locals.requestId;
  console.error('[HTTP] Falha na requisição', { status, requestId });
  res.status(status).json({ error: status === 500 ? 'Erro interno do servidor.' : 'Corpo da requisição inválido ou acima do limite.',
    ...(requestId ? { requestId } : {}) });
};
