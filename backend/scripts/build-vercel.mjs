/**
 * Build script for Vercel deployment.
 *
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
import { mkdirSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawnSync } from 'node:child_process'

const __dirname = dirname(fileURLToPath(import.meta.url))
const backendRoot = resolve(__dirname, '..')
const apiDir = resolve(backendRoot, 'api')
const entry = resolve(backendRoot, 'src/vercel-entry.ts')
const outfile = resolve(apiDir, 'index.js')

// 1. Generate Prisma client
console.log('→ Generating Prisma client...')
const genResult = spawnSync('bun', ['run', 'prisma:generate'], {
  cwd: backendRoot,
  stdio: 'inherit',
  env: {
    ...process.env,
    // Dummy URL for generation — real URL comes from Vercel env vars at runtime
    DATABASE_URL: process.env.DATABASE_URL ?? 'postgresql://localhost:5432/dummy',
  },
})
if (genResult.status !== 0) {
  console.error('Prisma generate failed')
  process.exit(genResult.status ?? 1)
}

// 2. Bundle with esbuild
console.log('→ Bundling backend for Vercel...')

try {
  await build({
    entryPoints: [entry],
    outfile,
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
