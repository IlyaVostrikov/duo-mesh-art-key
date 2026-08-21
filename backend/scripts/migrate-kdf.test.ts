// Orchestration test for migrate-kdf.ts's brick-prevention: it must abort
// (exit 1) and write nothing when the configured secret cannot decrypt any
// keystore entry, and it must treat already-PBKDF2 entries as a no-op. This
// guards the "wrong SECRET_STORE_KEY silently bricking the backend" failure
// mode at the script level; the crypto-level verify-before-write property is
// covered in src/crypto/aes-gcm.test.ts.

import { describe, expect, test } from 'bun:test'
import { mkdtempSync, rmSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { derivePbkdf2Key, encryptString, bytesToHex } from '../src/crypto/aes-gcm'

const BACKEND_DIR = join(import.meta.dir, '..')
const SALT = new Uint8Array(32).fill(11)

async function writeFixture(dir: string, secret: string): Promise<string> {
  const key = await derivePbkdf2Key(secret, SALT)
  const entry = await encryptString(key, 'feedface-private-key-hex')
  const storePath = join(dir, 'keystore.json')
  writeFileSync(storePath, JSON.stringify({ 'test-key-1': entry }, null, 2))
  writeFileSync(join(dir, 'keystore.salt'), bytesToHex(SALT) + '\n')
  return storePath
}

function runScript(env: Record<string, string>, args: string[] = []): Promise<{ code: number; stdout: string; stderr: string }> {
  const proc = Bun.spawn([process.execPath, 'scripts/migrate-kdf.ts', ...args], {
    cwd: BACKEND_DIR,
    env: { ...process.env, DATABASE_URL: '', ...env },
    stdout: 'pipe',
    stderr: 'pipe',
  })
  return (async () => {
    const [stdout, stderr, code] = await Promise.all([
      new Response(proc.stdout).text(),
      new Response(proc.stderr).text(),
      proc.exited,
    ])
    return { code, stdout, stderr }
  })()
}

describe('migrate-kdf orchestration', () => {
  test('aborts (exit 1) and writes nothing when the secret decrypts no entry', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'migrate-kdf-abort-'))
    try {
      const storePath = await writeFixture(dir, 'correct-secret')
      const before = readFileSync(storePath, 'utf-8')

      const { code, stderr } = await runScript({
        SECRET_STORE_KEY: 'wrong-secret',
        KEYSTORE_PATH: storePath,
      }, ['--dry-run'])

      expect(code).toBe(1)
      expect(stderr).toMatch(/no entries decrypted with either/)
      expect(readFileSync(storePath, 'utf-8')).toBe(before)
    } finally {
      rmSync(dir, { recursive: true, force: true })
    }
  })

  test('treats already-PBKDF2 entries as a no-op (exit 0, no write)', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'migrate-kdf-idem-'))
    try {
      const storePath = await writeFixture(dir, 'correct-secret')
      const before = readFileSync(storePath, 'utf-8')

      const { code, stdout } = await runScript({
        SECRET_STORE_KEY: 'correct-secret',
        KEYSTORE_PATH: storePath,
      }, ['--dry-run'])

      expect(code).toBe(0)
      expect(stdout).toMatch(/already PBKDF2/)
      expect(readFileSync(storePath, 'utf-8')).toBe(before)
    } finally {
      rmSync(dir, { recursive: true, force: true })
    }
  })

  test('aborts (exit 1) when some entries are orphaned (neither KDF decrypts)', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'migrate-kdf-partial-'))
    try {
      const storePath = join(dir, 'keystore.json')
      const good = await encryptString(await derivePbkdf2Key('correct-secret', SALT), 'feedface-good')
      const orphan = await encryptString(await derivePbkdf2Key('other-secret', SALT), 'deadbeef-orphan')
      writeFileSync(storePath, JSON.stringify({ 'good-key': good, 'orphan-key': orphan }, null, 2))
      writeFileSync(join(dir, 'keystore.salt'), bytesToHex(SALT) + '\n')
      const before = readFileSync(storePath, 'utf-8')

      const { code, stderr } = await runScript({
        SECRET_STORE_KEY: 'correct-secret',
        KEYSTORE_PATH: storePath,
      }, ['--dry-run'])

      expect(code).toBe(1)
      expect(stderr).toMatch(/some entries could not be decrypted with either/)
      expect(readFileSync(storePath, 'utf-8')).toBe(before)
    } finally {
      rmSync(dir, { recursive: true, force: true })
    }
  })

  test('aborts on an invalid configured salt before touching the keystore', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'migrate-kdf-invalid-salt-'))
    try {
      const storePath = await writeFixture(dir, 'correct-secret')
      const before = readFileSync(storePath, 'utf-8')

      const { code, stderr } = await runScript({
        SECRET_STORE_KEY: 'correct-secret',
        KEYSTORE_PATH: storePath,
        KEYSTORE_SALT: 'not-a-valid-salt',
      }, ['--dry-run'])

      expect(code).toBe(1)
      expect(stderr).toMatch(/KEYSTORE_SALT must be exactly 64 hexadecimal characters/)
      expect(readFileSync(storePath, 'utf-8')).toBe(before)
    } finally {
      rmSync(dir, { recursive: true, force: true })
    }
  })
})
