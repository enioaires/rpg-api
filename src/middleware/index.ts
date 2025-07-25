import type { Context, Next } from 'hono';
import { logger } from '../lib/logger';

// Middleware de logging para todas as requests
export const requestLogger = async (c: Context, next: Next) => {
  const start = Date.now();
  const method = c.req.method;
  const url = c.req.url;

  logger.info(`${method} ${url} - Started`);

  await next();

  const duration = Date.now() - start;
  const status = c.res.status;

  logger.info(`${method} ${url} - ${status} (${duration}ms)`);
};

// Middleware global de error handling
export const errorHandler = async (c: Context, next: Next) => {
  try {
    await next();
  } catch (error) {
    logger.error('Unhandled error', error);

    return c.json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, 500);
  }
};

// Middleware para validar JSON (apenas em métodos que podem ter body)
export const validateJSON = async (c: Context, next: Next) => {
  const method = c.req.method;
  const hasBody = ['POST', 'PUT', 'PATCH'].includes(method);

  // Só valida JSON se o método pode ter body E tem content-type JSON
  if (hasBody && c.req.header('content-type')?.includes('application/json')) {
    try {
      await c.req.json();
    } catch (error) {
      logger.warn('Invalid JSON in request body');
      return c.json({ error: 'Invalid JSON format' }, 400);
    }
  }

  await next();
};