import type { Context, Next } from 'hono';
import { verifyToken, type CustomJWTPayload } from '../lib/jwt';
import { responses } from '../lib/responses';
import { logger } from '../lib/logger';

// Estende o contexto do Hono para incluir dados do usuário
declare module 'hono' {
  interface ContextVariableMap {
    user: CustomJWTPayload;
  }
}

// Middleware que exige autenticação
export const requireAuth = async (c: Context, next: Next) => {
  try {
    // Pega o token do header Authorization
    const authHeader = c.req.header('Authorization');

    if (!authHeader) {
      logger.warn('Missing Authorization header', { path: c.req.path });
      return responses.unauthorized(c, 'Token de autenticação necessário');
    }

    // Formato esperado: "Bearer <token>"
    const [bearer, token] = authHeader.split(' ');

    if (bearer !== 'Bearer' || !token) {
      logger.warn('Invalid Authorization header format', { path: c.req.path });
      return responses.unauthorized(c, 'Formato de token inválido');
    }

    // Verifica o token
    const payload = await verifyToken(token);

    // Adiciona os dados do usuário no contexto
    c.set('user', payload);

    logger.debug('User authenticated', {
      userId: payload.userId,
      username: payload.username,
      path: c.req.path
    });

    await next();
  } catch (error) {
    logger.warn('Authentication failed', {
      error: error instanceof Error ? error.message : 'Unknown error',
      path: c.req.path
    });

    return responses.unauthorized(c, 'Token inválido ou expirado');
  }
};

// Middleware opcional de autenticação (não bloqueia se não tiver token)
export const optionalAuth = async (c: Context, next: Next) => {
  try {
    const authHeader = c.req.header('Authorization');

    if (authHeader) {
      const [bearer, token] = authHeader.split(' ');

      if (bearer === 'Bearer' && token) {
        const payload = await verifyToken(token);
        c.set('user', payload);
        logger.debug('Optional auth successful', { userId: payload.userId });
      }
    }

    await next();
  } catch (error) {
    // Ignora erros na autenticação opcional
    logger.debug('Optional auth failed (ignored)', { error });
    await next();
  }
};