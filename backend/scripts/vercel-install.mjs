/**
 * Vercel install helper.
 *
 * The backend lives in a bun monorepo. On Vercel only the backend/ directory
 * is uploaded — the workspace root with bun.lock and workspace:* packages
 * does not exist. esbuild already bundles @duo-mesh/contracts and
 * @duo-mesh/verifier inline, so we patch them out of package.json before
 * bun install to keep the resolution local.
 */

import { readFileSync, writeFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const backendRoot = resolve(__dirname, '..')
const pkgPath = resolve(backendRoot, 'package.json')

const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'))
delete pkg.dependencies['@duo-mesh/contracts']
delete pkg.dependencies['@duo-mesh/verifier']
writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n')

console.log('→ Patched package.json (removed workspace deps)')
console.log('→ Running bun install...')

const result = spawnSync('bun', ['install'], {
  cwd: backendRoot,
  stdio: 'inherit',
})

process.exit(result.status ?? 1)
