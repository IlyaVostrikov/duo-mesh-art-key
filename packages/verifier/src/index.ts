#!/usr/bin/env bun
/**
 * Offline ArtKey provenance verifier CLI.
 *
 * Usage:
 *   bun run packages/verifier/src/index.ts ./export.json
 *   bun run packages/verifier/src/index.ts https://example.com/api/art-keys/KC001/export
 *
 * Zero dependencies — verifies Ed25519 signatures and hash-chain integrity
 * without trusting the server that issued the export.
 */

import { verifySignedExport, type SignedExport } from './verify'

async function main() {
  const arg = process.argv[2]
  if (!arg) {
    console.error('Usage: bun run src/index.ts <export.json | URL>')
    process.exit(1)
  }

  let data: SignedExport

  try {
    if (arg.startsWith('http://') || arg.startsWith('https://')) {
      const resp = await fetch(arg)
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`)
      data = (await resp.json()) as SignedExport
      console.log(`Fetched export from ${arg}`)
    } else {
      const file = Bun.file(arg)
      data = (await file.json()) as SignedExport
      console.log(`Loaded export from ${arg}`)
    }
  } catch (err) {
    console.error(`Failed to load export: ${(err as Error).message}`)
    process.exit(1)
  }

  if (data.version !== '1.0.0') {
    console.warn(`Warning: unknown export version ${data.version}, expected 1.0.0`)
  }

  console.log(`\nArtKey: ${data.artKey.keyCode}`)
  console.log(`Artist: ${data.artist.displayName} (${data.artist.id})`)
  console.log(`Integrity Hash: ${data.artKey.integrityHash}`)
  console.log(`Provenance Records: ${data.provenance.length}\n`)

  const result = await verifySignedExport(data)

  console.log('─'.repeat(60))

  for (const check of result.checks) {
    const icon = check.pass ? '✓' : '✗'
    console.log(`  ${icon} [${check.category.padEnd(11)}] ${check.detail}`)
  }

  console.log('─'.repeat(60))

  if (result.verified) {
    console.log('\n✓ VERIFIED — All checks passed. Provenance is cryptographically valid.')
  } else {
    console.log('\n✗ VERIFICATION FAILED — Some checks did not pass. Provenance is NOT valid.')
  }

  console.log(`\nChain length: ${result.chainLength}`)
  console.log('Remember: verification proves hash-chain integrity and Ed25519 signatures.')
  console.log('Custody of private keys and file authenticity require additional trust.')
}

main().catch(console.error)
