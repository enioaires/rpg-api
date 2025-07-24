import type { Context } from 'hono';

// Helpers para padronizar respostas da API
export const responses = {
  success: (c: Context, data?: any, message?: string) => {
    return c.json({
      success: true,
      data,
      message,
      timestamp: Date.now()
    });
  },

  created: (c: Context, data?: any, message?: string) => {
    return c.json({
      success: true,
      data,
      message: message || 'Criado com sucesso',
      timestamp: Date.now()
    }, 201);
  },

  error: (c: Context, message: string, status: number = 500, details?: any) => {
    return c.json({
      success: false,
      error: message,
      details,
      timestamp: new Date().toISOString()
    }, status as any);
  },

  notFound: (c: Context, resource: string = 'Recurso') => {
    return c.json({
      success: false,
      error: `${resource} não encontrado`,
      timestamp: new Date().toISOString()
    }, 404);
  },

  unauthorized: (c: Context, message: string = 'Não autorizado') => {
    return c.json({
      success: false,
      error: message,
      timestamp: new Date().toISOString()
    }, 401);
  },

  forbidden: (c: Context, message: string = 'Acesso negado') => {
    return c.json({
      success: false,
      error: message,
      timestamp: new Date().toISOString()
    }, 403);
  }
};