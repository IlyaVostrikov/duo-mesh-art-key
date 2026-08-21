/**
 * Node.js polyfills for Bun APIs used across the codebase.
 * Loaded via esbuild banner — runs before any bundled code.
 */
import { createHash, randomBytes, scryptSync, timingSafeEqual } from 'node:crypto'
import { readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const _Bun = (globalThis as any).Bun

if (!_Bun) {
  const __filename = fileURLToPath(import.meta.url)
  const __dirname = new URL('.', import.meta.url).pathname

  // Minimal CryptoHasher shim
  class CryptoHasher {
    private hash: ReturnType<typeof createHash>
    constructor(algo: string) {
      this.hash = createHash(algo === 'sha256' ? 'sha256' : algo)
    }
    update(data: string | Buffer) { this.hash.update(data); return this }
    digest(format: 'hex' | 'base64' | 'base64url') {
      return this.hash.digest(format === 'base64url' ? 'base64' : format)
    }
  }

  ;(globalThis as any).Bun = {
    ...(_Bun ?? {}),
    password: {
      hash(password: string, options?: { algorithm?: string; cost?: number }) {
        // Legacy compatibility format for code paths that still call Bun.password
        // directly on Node. New auth hashes use the native Argon2 implementation.
        const cost = options?.cost ?? 12
        const salt = randomBytes(16)
        const key = scryptSync(password, salt, 64, { N: 1 << cost, r: 8, p: 1 })
        return [
          `$2b$${String(cost).padStart(2, '0')}$`,
          salt.toString('base64').replace(/=+$/, ''),
          '$',
          key.toString('base64').replace(/=+$/, ''),
        ].join('')
      },
      verify(password: string, hash: string) {
        const parts = hash.split('$')
        if (parts[1] !== '2b') return false

        const cost = parseInt(parts[2] ?? '', 10)
        if (!Number.isInteger(cost) || cost < 1 || cost > 20) return false

        let saltB64: string
        let keyB64: string
        if (parts.length === 5) {
          // Correct format: $2b$<cost>$<salt>$<key>
          saltB64 = parts[3] ?? ''
          keyB64 = parts[4] ?? ''
        } else if (parts.length === 4) {
          // Recover hashes emitted by the old shim, which concatenated salt and
          // key without a separator. The salt is always 16 bytes / 22 chars.
          const combined = parts[3] ?? ''
          saltB64 = combined.slice(0, 22)
          keyB64 = combined.slice(22)
        } else {
          return false
        }

        const salt = Buffer.from(saltB64, 'base64')
        const expected = Buffer.from(keyB64, 'base64')
        if (salt.length !== 16 || expected.length === 0) return false

        try {
          const actual = scryptSync(password, salt, expected.length, { N: 1 << cost, r: 8, p: 1 })
          return actual.length === expected.length && timingSafeEqual(actual, expected)
        } catch {
          return false
        }
      },
    },
    CryptoHasher,
    file(path: string) {
      const resolved = resolve(path)
      return {
        arrayBuffer() { return readFileSync(resolved).buffer },
        text() { return readFileSync(resolved, 'utf-8') },
        exists() { try { readFileSync(resolved); return true } catch { return false } },
      }
    },
    write(path: string, data: Uint8Array | string) {
      writeFileSync(path, data)
    },
    env: process.env,
    argv: process.argv,
  }
}
