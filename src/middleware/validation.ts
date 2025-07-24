import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import type { Context } from 'hono';
import { logger } from '../lib/logger';

// Helper para criar validador com logs
export const createValidator = (schema: z.ZodSchema, target: 'json' | 'query' | 'param' = 'json') => {
  return zValidator(target, schema, (result, c: Context) => {
    if (!result.success) {
      const errors = result.error.errors.map(err => ({
        field: err.path.join('.'),
        message: err.message
      }));

      logger.warn('Validation failed', {
        path: c.req.path,
        method: c.req.method,
        errors
      });

      return c.json({
        error: 'Dados inválidos',
        details: errors,
        timestamp: new Date().toISOString()
      }, 400);
    }
  });
};

// Validadores prontos para usar
export const validateJSON = (schema: z.ZodSchema) => createValidator(schema, 'json');
export const validateQuery = (schema: z.ZodSchema) => createValidator(schema, 'query');
export const validateParam = (schema: z.ZodSchema) => createValidator(schema, 'param');