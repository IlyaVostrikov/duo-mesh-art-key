/**
 * Apply the two PR #11 unique indexes (idempotent) and verify they exist.
 *
 * Unlike apply-migrations-neon.mjs (which replays the full history including a
 * large init migration), this targets only the two additive indexes PR #11
 * introduces. Each is a single `CREATE UNIQUE INDEX IF NOT EXISTS`. We set
 * `lock_timeout` so a conflicting lock fails fast instead of hanging, and
 * `statement_timeout` as a backstop. Existence is checked first so a previous
 * partial run (index created server-side before the client lost the connection)
 * is treated as success.
 */

import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { config } from 'dotenv'
import pg from 'pg'

const __dirname = dirname(fileURLToPath(import.meta.url))
config({ path: resolve(__dirname, '../.env') })

const DATABASE_URL = process.env.DATABASE_URL
if (!DATABASE_URL) {
  console.error('ERROR: DATABASE_URL is required — set it explicitly, or use backend/.env (local dev)')
  process.exit(1)
}

const TARGETS = [
  {
    name: '20260818002000_add_provenance_unique_constraint',
    index: 'provenance_art_key_id_sequence_unique',
    sql: `CREATE UNIQUE INDEX IF NOT EXISTS "provenance_art_key_id_sequence_unique" ON "provenance_records"("art_key_id", "sequence")`,
  },
  {
    name: '20260819000000_add_collection_title_unique',
    index: 'collections_collector_id_title_key',
    sql: `CREATE UNIQUE INDEX IF NOT EXISTS "collections_collector_id_title_key" ON "collections"("collector_id", "title")`,
  },
]

const RETRIES = 4
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const isConnErr = (e) =>
  /terminated unexpectedly|ECONNRESET|ECONNREFUSED|EPIPE|socket hang up|timeout|read ECONNRESET/i.test(e?.message ?? '')

async function withClient(fn) {
  const client = new pg.Client({
    connectionString: DATABASE_URL,
    connectionTimeoutMillis: 15000,
  })
  client.on('error', () => {})
  await client.connect()
  try {
    return await fn(client)
  } finally {
    await client.end().catch(() => {})
  }
}

async function indexExists(client, index) {
  const { rows } = await client.query(
    `SELECT 1 FROM pg_indexes WHERE schemaname = 'public' AND indexname = $1`,
    [index],
  )
  return rows.length > 0
}

async function apply(client, name, sql) {
  await client.query(`SET lock_timeout = '8s'`)
  await client.query(`SET statement_timeout = '30s'`)
  await client.query('BEGIN')
  await client.query(sql)
  await client.query(
    `INSERT INTO "_prisma_migrations" ("id","checksum","migration_name","finished_at","applied_steps_count")
     VALUES (gen_random_uuid(), $1, $2, now(), 1)`,
    ['manual', name],
  )
  await client.query('COMMIT')
}

async function main() {
  for (const t of TARGETS) {
    let done = false
    for (let attempt = 0; attempt < RETRIES && !done; attempt++) {
      try {
        const exists = await withClient((c) => indexExists(c, t.index))
        if (exists) {
          console.log(`EXISTS  ${t.index} (already present)`)
          done = true
          break
        }
        await withClient((c) => apply(c, t.name, t.sql))
        console.log(`OK      ${t.name}`)
        done = true
      } catch (err) {
        if (isConnErr(err) && attempt < RETRIES - 1) {
          console.log(`  retry ${attempt + 1}/${RETRIES - 1} (${err.message})`)
          await sleep(1000 * (attempt + 1))
        } else {
          console.log(`FAILED  ${t.name}: ${err.message}`)
          break
        }
      }
    }
  }

  console.log('\n--- Final state ---')
  for (const t of TARGETS) {
    let exists = false
    try {
      exists = await withClient((c) => indexExists(c, t.index))
    } catch (err) {
      console.log(`${t.index}: UNKNOWN (${err.message})`)
      continue
    }
    console.log(`${t.index}: ${exists ? 'PRESENT' : 'MISSING'}`)
  }
  console.log('Done')
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
