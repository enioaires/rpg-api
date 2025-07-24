import { Hono } from 'hono'
import { cors } from 'hono/cors'

const app = new Hono()

app.use('*', cors())

app.get('/', (c) => c.json({ message: 'RPG API funcionando!' }))

app.get('/health', (c) => c.json({ status: 'ok', timestamp: Date.now() }))

export default {
  port: 3001,
  fetch: app.fetch,
}