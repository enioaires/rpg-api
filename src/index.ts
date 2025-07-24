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

app.get('/', (c) => {
  logger.info('Root endpoint accessed')
  return c.json({
    message: 'RPG API funcionando!',
    version: '1.0.0',
    env: config.server.env
  })
})

app.get('/health', (c) => {
  return responses.success(c, {
    status: 'healthy',
    uptime: process.uptime(),
    memory: process.memoryUsage()
  }, 'API funcionando perfeitamente!')
})

// Novo endpoint para testar o banco
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