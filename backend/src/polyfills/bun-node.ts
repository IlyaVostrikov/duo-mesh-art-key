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
      hash(password: string, options: { algorithm: string; cost: number }) {
        const salt = randomBytes(16)
        const key = scryptSync(password, salt, 64, { N: 1 << options.cost, r: 8, p: 1 })
        // Return a bcrypt-like string for compatibility with Bun.password.verify
        const parts = [
          `$2b$${String(options.cost).padStart(2, '0')}$`,
          salt.toString('base64').replace(/=+$/, ''),
          key.toString('base64').replace(/=+$/, ''),
        ]
        return parts.join('')
      },
      verify(password: string, hash: string) {
        const [, , algorithm, costAndSalt, keyStr] = hash.split('$')
        const cost = parseInt(costAndSalt.slice(0, 2), 10)
        const saltB64 = costAndSalt.slice(2)
        const salt = Buffer.from(saltB64, 'base64')
        const expected = Buffer.from(keyStr, 'base64')
        const actual = scryptSync(password, salt, expected.length, { N: 1 << cost, r: 8, p: 1 })
        return timingSafeEqual(actual, expected)
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
