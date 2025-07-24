// src/index.ts - Entry point da API com characters routes

import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { db } from './db'
import { users } from './db/schema'
import { config, validateConfig } from './lib/config'
import { logger } from './lib/logger'
import { requestLogger, errorHandler, validateJSON } from './middleware'
import { responses } from './lib/responses'
import testRoutes from './routes/test'
import authRoutes from './routes/auth'
import charactersRoutes from './routes/characters' // Nova linha

// Valida configurações na inicialização
validateConfig()

const app = new Hono()

// Middlewares globais
app.use('*', errorHandler)
app.use('*', requestLogger)
app.use('*', cors())
app.use('*', validateJSON)

// Routes
app.route('/test', testRoutes)
app.route('/auth', authRoutes)
app.route('/characters', charactersRoutes) // Nova linha

app.get('/', (c) => {
  logger.info('Root endpoint accessed')
  return c.json({
    message: 'RPG API funcionando!',
    version: '1.0.0',
    env: config.server.env,
    endpoints: [
      'GET /health - Health check',
      'GET /test-db - Teste do banco',
      'POST /auth/register - Criar conta',
      'POST /auth/login - Fazer login',
      'GET /auth/me - Dados do usuário (auth)',
      'GET /characters - Listar personagens (auth)',
      'POST /characters - Criar personagem (auth)',
      'GET /characters/:id - Buscar personagem bruto (auth)',
      'GET /characters/:id/calculated - Buscar personagem calculado (auth)',
      'PUT /characters/:id - Atualizar personagem (auth)',
      'DELETE /characters/:id - Deletar personagem (auth)'
    ]
  })
})

app.get('/health', (c) => {
  return responses.success(c, {
    status: 'healthy',
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    features: [
      'Autenticação JWT',
      'CRUD de Personagens RPG',
      'Cálculos de Atributos',
      'Validação Zod',
      'Logs Estruturados'
    ]
  }, 'API funcionando perfeitamente!')
})

// Endpoint para testar o banco
app.get('/test-db', async (c) => {
  try {
    logger.debug('Testing database connection')
    const userCount = await db.select().from(users);

    logger.info('Database test successful', { userCount: userCount.length })
    return responses.success(c, {
      status: 'database connected',
      userCount: userCount.length,
      tables: ['users', 'characters']
    }, 'Banco conectado com sucesso!');
  } catch (error) {
    logger.error('Database connection failed', error)
    return responses.error(c, 'Falha na conexão com o banco', 500, {
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
})

export default {
  port: config.server.port,
  fetch: app.fetch,
}