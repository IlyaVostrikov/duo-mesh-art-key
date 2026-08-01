import { Hono } from 'hono'
import { authGuard } from '../guards/auth'

/**
 * Manual transfer endpoint — DISABLED for security (P0-13).
 *
 * The previous implementation checked ownership outside a serializable
 * transaction, allowing concurrent transfers to fork the provenance chain.
 * There was also no unique (artKeyId, sequence) constraint.
 *
 * Re-enabling requires:
 * 1. Serializable transaction with re-check of current owner inside the lock
 * 2. Unique constraint on (artKeyId, sequence)
 * 3. Atomic write of transfer + provenance + transparency entry
 *
 * See CODE_AUDIT_2026-08-01/02_FINDINGS.md P0-13 for full context.
 */
export function createTransferRoutes() {
  const routes = new Hono()

  routes.post('/art-keys/:keyCode/transfer', authGuard(), async (c) => {
    return c.json({
      error: 'NOT_IMPLEMENTED',
      message: 'Manual transfers are temporarily disabled pending transaction integrity fixes.',
    }, 501)
  })

  return routes
}
