import { readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { join, resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const backendRoot = resolve(__dirname, '..')
const migrationsDir = resolve(backendRoot, 'prisma/migrations')

const dirs = readdirSync(migrationsDir, { withFileTypes: true })
  .filter(d => d.isDirectory())
  .map(d => d.name)
  .sort()

let out = `-- DUO MESH ArtKey — all migrations (${dirs.length} total)\n`
out += `-- For Neon SQL Editor\n\n`

for (const name of dirs) {
  const sql = readFileSync(join(migrationsDir, name, 'migration.sql'), 'utf-8')
  out += `-- ============================\n`
  out += `-- ${name}\n`
  out += `-- ============================\n\n`
  out += sql + '\n\n'
}

const outPath = join(backendRoot, 'migrations-all.sql')
writeFileSync(outPath, out)
console.log(`Written ${dirs.length} migrations to ${outPath}`)
console.log(`Size: ${(out.length / 1024).toFixed(1)} KB`)
