import { Hono } from 'hono'
import { createApp } from './app'
import { createBackendRuntime } from './runtime'

const runtime = createBackendRuntime()
const inner = await createApp({ env: runtime.env, prisma: runtime.prisma })
const app = new Hono().route('/api', inner)

const server = Bun.serve({
  port: runtime.env.PORT,
  fetch: app.fetch,
  maxRequestBodySize: 256 * 1024 * 1024, // 256 MB — above UPLOAD_MAX_3D_BYTES default (200 MB)
  idleTimeout: 30, // seconds — drop slow-loris / idle connections
})

console.log(`Backend listening on ${server.url}`)

let shuttingDown = false

async function shutdown(signal: string) {
  if (shuttingDown) return
  shuttingDown = true

  console.log(`Backend received ${signal}; shutting down`)
  await server.stop(true)
  await runtime.close()
}

process.on('SIGINT', () => {
  void shutdown('SIGINT')
})

process.on('SIGTERM', () => {
  void shutdown('SIGTERM')
})
