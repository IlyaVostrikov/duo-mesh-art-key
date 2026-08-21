/**
 * Build script for Vercel deployment.
 *
 * 0. Runs KDF migration (SHA-256 → PBKDF2) if salt doesn't exist
 * 1. Generates Prisma client
 * 2. Bundles api/index.ts → api/index.js with esbuild
 *
 * Externalised (not bundled, resolved from node_modules at runtime):
 *   - pg (native)
 *   - sharp (native binary)
 *   - puppeteer (Chromium, ~300MB)
 *   - @prisma/client (query engine)
 */

import { build } from 'esbuild'
import { existsSync, mkdirSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawnSync } from 'node:child_process'

const __dirname = dirname(fileURLToPath(import.meta.url))
const backendRoot = resolve(__dirname, '..')
// Always resolve the bundle from the backend root. esbuild embeds module
// paths in its generated wrapper; using the caller cwd made the committed
// bundle differ depending on whether the script ran from root or backend.
const bundleRoot = backendRoot
const apiDir = resolve(backendRoot, 'api')
const entry = resolve(backendRoot, 'src/vercel-entry.ts')
const outfile = resolve(apiDir, 'index.js')

// 1. Generate Prisma client (needed by migration script)
console.log('→ Generating Prisma client...')
const genResult = spawnSync('bun', ['run', 'prisma:generate'], {
  cwd: backendRoot,
  stdio: 'inherit',
  env: {
    ...process.env,
    DATABASE_URL: process.env.DATABASE_URL ?? 'postgresql://localhost:5432/dummy',
  },
})
if (genResult.status !== 0) {
  console.error('Prisma generate failed')
  process.exit(genResult.status ?? 1)
}

// 2. Run KDF migration if salt file doesn't exist yet (P1-12)
const saltPath = resolve(backendRoot, 'data', 'keystore.salt')

if (process.env.SECRET_STORE_KEY && process.env.DATABASE_URL && !existsSync(saltPath)) {
  mkdirSync(resolve(backendRoot, 'data'), { recursive: true })
  console.log('→ Running KDF migration: SHA-256 → PBKDF2...')
  const migResult = spawnSync('bun', ['run', 'scripts/migrate-kdf.ts'], {
    cwd: backendRoot,
    stdio: 'inherit',
    env: { ...process.env },
  })
  if (migResult.status !== 0) {
    console.error('KDF migration failed')
    process.exit(migResult.status ?? 1)
  }
  console.log('→ KDF migration complete')
} else {
  console.log('→ KDF migration skipped (salt exists or missing env vars)')
}

// 3. Bundle with esbuild
console.log('→ Bundling backend for Vercel...')

try {
  await build({
    absWorkingDir: bundleRoot,
    entryPoints: ['src/vercel-entry.ts'],
    outfile: 'api/index.js',
    bundle: true,
    platform: 'node',
    target: 'node20',
    format: 'esm',
    banner: {
      js: `
import { createRequire as __cjs_require } from 'node:module';
const require = __cjs_require(import.meta.url);
`,
    },
    // Vercel provides these as externals
    external: [
      'pg',
      'pg/*',
      'sharp',
      'puppeteer',
      '@prisma/client',
      '@prisma/adapter-pg',
      '@node-rs/argon2',
      // hono/bun is loaded dynamically and skipped on Vercel
      'hono/bun',
    ],
    // Prisma generated client path
    alias: {
      '@/generated/prisma/client': resolve(backendRoot, 'src/generated/prisma/client'),
    },
    minify: false,
    sourcemap: false,
    logLevel: 'info',
  })

  console.log(`→ Bundle written to ${outfile}`)
} catch (err) {
  console.error('Build failed:', err)
  process.exit(1)
}
