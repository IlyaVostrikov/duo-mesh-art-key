import type { APIRoute } from 'astro'

// DUO MESH registry public key — intentionally public (RFC 8615).
// Anyone can verify provenance signatures independently,
// without trusting the server or having access to secrets.
//
// Source of truth: env DUO_MESH_REGISTRY_PUBLIC_KEY.
// Hardcoded fallback is the canonical key; if env changes, the fallback
// MUST be updated to match (or set the env var at build/deploy).
const FALLBACK_KEY = 'LS0tLS1CRUdJTiBQVUJMSUMgS0VZLS0tLS0KTUNvd0JRWURLMlZ3QXlFQU9GUEhUaE1WUWVqQnRoblZWdHIvbFh5aEx4elgyVGpzdWhqd0dGM3JGcUU9Ci0tLS0tRU5EIFBVQkxJQyBLRVktLS0tLQo='
const PUBLIC_KEY = import.meta.env.PUBLIC_DUO_MESH_REGISTRY_PUBLIC_KEY || FALLBACK_KEY

export const GET: APIRoute = () => {
  return new Response(
    JSON.stringify({ algorithm: 'Ed25519', publicKey: PUBLIC_KEY }),
    {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    },
  )
}
