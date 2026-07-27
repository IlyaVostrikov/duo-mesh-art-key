/**
 * Vercel serverless entry point for DUO MESH backend.
 */

import './polyfills/bun-node'
import { handle } from 'hono/vercel'
import { createBackendRuntime } from './runtime'
import { createApp } from './app'
import { Hono } from 'hono'

function buildApp() {
  try {
    const runtime = createBackendRuntime(process.env as Record<string, string | undefined>)
    const inner = createApp({ env: runtime.env, prisma: runtime.prisma })
    // Mount under /api for Vercel function routing
    const app = new Hono().route('/api', inner)
    return { app }
  } catch (err) {
    // Gracefully return validation errors for debugging
    const debugApp = new Hono()
    debugApp.all('*', (c) => {
      let body: any = { error: 'Init failed', message: err instanceof Error ? err.message : String(err) }
      if (err instanceof Error && 'issues' in err) {
        body.issues = (err as any).issues
      }
      return c.json(body, 500)
    })
    return { app: debugApp }
  }
}

const { app } = buildApp()

export const GET = handle(app)
export const POST = handle(app)
export const PUT = handle(app)
export const PATCH = handle(app)
export const DELETE = handle(app)
export const OPTIONS = handle(app)
export const HEAD = handle(app)
