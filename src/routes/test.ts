import { Hono } from 'hono';
import { z } from 'zod';
import { validateJSON } from '../middleware/validation';
import { responses } from '../lib/responses';
import { logger } from '../lib/logger';

const test = new Hono();

// Schema para testar validação
const TestSchema = z.object({
  name: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres'),
  email: z.string().email('Email inválido').optional()
});

// Route para testar validação
test.post('/validation', validateJSON(TestSchema), async (c) => {
  const data = c.req.valid('json');
  logger.info('Validation test successful', data);

  return responses.success(c, data, 'Validação funcionando!');
});

// Route para testar error handling
test.get('/error', async (c) => {
  throw new Error('Erro de teste proposital');
});

// Route para testar responses
test.get('/responses', async (c) => {
  const type = c.req.query('type') || 'success';

  switch (type) {
    case 'success':
      return responses.success(c, { test: true }, 'Sucesso!');
    case 'error':
      return responses.error(c, 'Erro de teste');
    case 'notfound':
      return responses.notFound(c, 'Item de teste');
    default:
      return responses.success(c, { availableTypes: ['success', 'error', 'notfound'] });
  }
});

export default test;