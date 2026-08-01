import { Hono } from 'hono'
import { authGuard } from '../guards/auth'

/**
 * Purchase endpoint — DISABLED for security (P0-12).
 *
 * The previous implementation created COMPLETED sales, transferred ownership,
 * and wrote provenance records directly from an unauthenticated client POST
 * without any payment confirmation. Re-enabling this requires:
 *
 * 1. Payment provider integration (trusted webhook as source of truth)
 * 2. Idempotency keys
 * 3. Purchase state machine (pending → paid → completed / expired)
 * 4. Currency/amount verification against listing
 *
 * See CODE_AUDIT_2026-08-01/02_FINDINGS.md P0-12 for full context.
 */
export function createPurchaseRoutes() {
  const routes = new Hono()

  routes.post('/art-keys/:keyCode/purchase', authGuard(), async (c) => {
    return c.json({
      error: 'NOT_IMPLEMENTED',
      message: 'Purchase functionality requires payment integration and is temporarily disabled.',
    }, 501)
  })

  return routes
}
