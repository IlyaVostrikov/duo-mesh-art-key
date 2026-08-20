/**
 * Apply Prisma migrations directly to Neon via pg (bypasses Prisma CLI engine issues on Windows).
 *
 * Resilient to Neon's serverless connection recycling: each migration uses a fresh
 * client and connection-level errors ("Connection terminated unexpectedly", resets,
 * socket hangups) are retried with backoff. SQL errors (e.g. "already exists" from
 * overlapping dev-history DDL) are NOT retried — they indicate the object already
 * exists, so the migration is left unrecorded and skipped on the next run.
 */

import { readFileSync, readdirSync } from 'node:fs'
import { join, resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { config } from 'dotenv'
import pg from 'pg'

const __dirname = dirname(fileURLToPath(import.meta.url))
const backendRoot = resolve(__dirname, '..')
const migrationsDir = resolve(backendRoot, 'prisma/migrations')

config({ path: resolve(__dirname, '../.env') })

const DATABASE_URL = process.env.DATABASE_URL
if (!DATABASE_URL) {
  console.error('ERROR: DATABASE_URL is required — set it explicitly, or use backend/.env (local dev)')
  process.exit(1)
}

const RETRIES = 4
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

function isConnectionError(err) {
  return /terminated unexpectedly|ECONNRESET|ECONNREFUSED|EPIPE|socket hang up|connection timeout|read ECONNRESET/i.test(
    err?.message ?? '',
  )
}

async function withClient(fn) {
  const client = new pg.Client({
    connectionString: DATABASE_URL,
    connectionTimeoutMillis: 10000,
    statement_timeout: 30000,
    query_timeout: 30000,
  })
  // A terminated connection surfaces on the client's 'error' event; without a
  // listener Node/Bun crashes on an unhandled error event. The actual query
  // rejection is caught in the retry loop below.
  client.on('error', () => {})
  await client.connect()
  try {
    return await fn(client)
  } finally {
    await client.end().catch(() => {})
  }
}

async function ensureMigrationsTable(client) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS "_prisma_migrations" (
      "id" VARCHAR(36) NOT NULL PRIMARY KEY,
      "checksum" VARCHAR(64) NOT NULL,
      "finished_at" TIMESTAMPTZ,
      "migration_name" VARCHAR(255) NOT NULL,
      "logs" TEXT,
      "rolled_back_at" TIMESTAMPTZ,
      "started_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
      "applied_steps_count" INTEGER NOT NULL DEFAULT 0
    )
  `)
}

async function isApplied(client, name) {
  const { rows } = await client.query(
    'SELECT id FROM "_prisma_migrations" WHERE "migration_name" = $1',
    [name],
  )
  return rows.length > 0
}

async function applyMigration(client, name, sql) {
  await client.query('BEGIN')
  await client.query(sql)
  await client.query(
    `INSERT INTO "_prisma_migrations" ("id", "checksum", "migration_name", "finished_at", "applied_steps_count")
     VALUES (gen_random_uuid(), $1, $2, now(), 1)`,
    ['manual', name],
  )
  await client.query('COMMIT')
}

async function main() {
  const dirs = readdirSync(migrationsDir, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name)
    .sort()

  console.log(`Found ${dirs.length} migrations`)

  await withClient(ensureMigrationsTable)

  for (const name of dirs) {
    let applied = false
    for (let attempt = 0; attempt < RETRIES; attempt++) {
      try {
        applied = await withClient((c) => isApplied(c, name))
        break
      } catch (err) {
        if (!isConnectionError(err) || attempt === RETRIES - 1) throw err
        await sleep(1000 * (attempt + 1))
      }
    }
    if (applied) {
      console.log(`  SKIP ${name} (already applied)`)
      continue
    }

    const sqlPath = join(migrationsDir, name, 'migration.sql')
    const sql = readFileSync(sqlPath, 'utf-8')
    console.log(`  APPLY ${name}...`)

    let lastErr = null
    for (let attempt = 0; attempt < RETRIES; attempt++) {
      try {
        await withClient((c) => applyMigration(c, name, sql))
        console.log(`    OK`)
        lastErr = null
        break
      } catch (err) {
        lastErr = err
        if (isConnectionError(err) && attempt < RETRIES - 1) {
          console.log(`    retry ${attempt + 1}/${RETRIES - 1} (${err.message})`)
          await sleep(1000 * (attempt + 1))
          continue
        }
        break
      }
    }
    if (lastErr) {
      console.error(`    FAILED: ${lastErr.message}`)
    }
  }

  console.log('\nDone')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
