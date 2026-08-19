// Backfill: generate an Ed25519 signing key for every artist that has none.
//
// Fixes P1-5 — artists onboarded before key generation existed have no key,
// so their genesis provenance records were silently signed platform-only.
//
// Usage:
//   bun run scripts/backfill-artist-keys.ts

import { resolve } from 'node:path'
import { createBackendRuntime } from '../src/runtime'
import { KeyStore } from '../src/crypto/keystore'
import { SigningService } from '../src/services/signing.service'

const runtime = createBackendRuntime()
const { env, prisma } = runtime

const dataDir = resolve(import.meta.dir ?? __dirname, '../data')
const keyStore = new KeyStore(resolve(dataDir, 'keystore.json'), env.SECRET_STORE_KEY)
const signing = new SigningService(prisma, keyStore)

const artists = await prisma.artist.findMany({
  select: { id: true, user: { select: { displayName: true } } },
})

let created = 0
let existed = 0

for (const artist of artists) {
  const active = await signing.getArtistActivePublicKey(artist.id)
  if (active) {
    console.log(`  ⏭  ${artist.user.displayName} — already has an active key`)
    existed++
    continue
  }
  await signing.generateArtistKeyPair(artist.id)
  console.log(`  ✅ ${artist.user.displayName} (${artist.id.slice(0, 8)}…) — key generated`)
  created++
}

console.log(`\nArtists: ${artists.length} | keys created: ${created} | already had key: ${existed}`)
await runtime.close()
