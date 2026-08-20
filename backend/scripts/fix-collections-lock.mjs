/**
 * One-shot remediation for the collections unique index:
 *   1. Terminate orphaned migration transactions (idle-in-transaction leftovers
 *      from crashed apply-migrations runs) holding locks on target tables.
 *      Scoped narrowly to sessions whose query touches "_prisma_migrations"
 *      (migration scripts do this; the app never does).
 *   2. Detect duplicate (collector_id, title) rows that would block the UNIQUE index.
 *   3. Apply the index.
 *   4. Verify.
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

const INDEX = 'collections_collector_id_title_key'
const INDEX_SQL = `CREATE UNIQUE INDEX IF NOT EXISTS "collections_collector_id_title_key" ON "collections"("collector_id", "title")`

async function main() {
  const client = new pg.Client({ connectionString: DATABASE_URL, connectionTimeoutMillis: 15000 })
  client.on('error', () => {})
  await client.connect()

  // 1. Terminate orphaned migration sessions
  const { rows } = await client.query(`
    SELECT pid, left(regexp_replace(query, '\\s+', ' ', 'g'), 100) AS query
    FROM pg_stat_activity
    WHERE datname = current_database()
      AND pid <> pg_backend_pid()
      AND state = 'idle in transaction'
      AND query ILIKE '%_prisma_migrations%'
  `)
  if (rows.length === 0) {
    console.log('No orphaned migration transactions found.')
  }
  for (const r of rows) {
    console.log(`Terminating orphaned migration tx pid=${r.pid}: ${r.query}`)
    await client.query(`SELECT pg_terminate_backend($1)`, [r.pid])
  }

  // 2. Detect duplicate (collector_id, title) that would block the UNIQUE index
  const dupes = await client.query(`
    SELECT "collector_id", "title", count(*)::int AS n
    FROM "collections"
    WHERE "title" IS NOT NULL AND "collector_id" IS NOT NULL
    GROUP BY "collector_id", "title"
    HAVING count(*) > 1
    ORDER BY n DESC
    LIMIT 20
  `)
  if (dupes.rows.length > 0) {
    console.log(`\nDUPLICATES FOUND (${dupes.rows.length} groups) — index will FAIL on these:`)
    for (const d of dupes.rows) {
      console.log(`  collector_id=${d.collector_id} title="${d.title}" x${d.n}`)
    }
  } else {
    console.log('\nNo duplicate (collector_id, title) rows — unique index is safe.')
  }

  // 3. Apply the index with lock/statement timeouts
  await client.query(`SET lock_timeout = '10s'`)
  await client.query(`SET statement_timeout = '30s'`)
  console.log('\nApplying collections unique index...')
  try {
    await client.query(INDEX_SQL)
    console.log('OK — index created')
  } catch (err) {
    console.log(`CREATE INDEX result: ${err.message}`)
  }

  // 4. Verify
  const check = await client.query(
    `SELECT 1 FROM pg_indexes WHERE schemaname = 'public' AND indexname = $1`,
    [INDEX],
  )
  console.log(`\n${INDEX}: ${check.rows.length > 0 ? 'PRESENT' : 'MISSING'}`)

  await client.end()
  console.log('Done')
}

main().catch((e) => { console.error(e); process.exit(1) })
