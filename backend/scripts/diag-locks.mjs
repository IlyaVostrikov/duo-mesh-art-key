/**
 * Diagnose what is holding locks on the PR #11 tables. Read-only.
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

async function main() {
  const client = new pg.Client({ connectionString: DATABASE_URL, connectionTimeoutMillis: 15000 })
  client.on('error', () => {})
  await client.connect()

  console.log('--- Active sessions (non-idle) ---')
  const act = await client.query(`
    SELECT pid, state, now() - query_start AS age, wait_event_type, wait_event,
           left(regexp_replace(query, '\\s+', ' ', 'g'), 120) AS query
    FROM pg_stat_activity
    WHERE datname = current_database() AND pid <> pg_backend_pid()
      AND state <> 'idle'
    ORDER BY query_start
  `)
  if (act.rows.length === 0) console.log('  (none)')
  for (const r of act.rows) {
    console.log(`  pid=${r.pid} state=${r.state} age=${r.age} wait=${r.wait_event_type}/${r.wait_event}`)
    console.log(`    ${r.query}`)
  }

  console.log('\n--- Locks on target tables ---')
  const locks = await client.query(`
    SELECT l.pid, l.mode, l.granted,
           a.state, now() - a.query_start AS age,
           left(regexp_replace(a.query, '\\s+', ' ', 'g'), 120) AS query
    FROM pg_locks l
    JOIN pg_class c ON c.oid = l.relation
    LEFT JOIN pg_stat_activity a ON a.pid = l.pid
    WHERE c.relname IN ('collections', 'provenance_records', 'collection_artworks')
    ORDER BY c.relname, l.granted DESC, l.pid
  `)
  if (locks.rows.length === 0) console.log('  (none)')
  for (const r of locks.rows) {
    console.log(`  pid=${r.pid} granted=${r.granted} mode=${r.mode} state=${r.state} age=${r.age}`)
    console.log(`    ${r.query ?? '(idle)'}`)
  }

  await client.end()
  console.log('\nDone')
}

main().catch((e) => { console.error(e); process.exit(1) })
