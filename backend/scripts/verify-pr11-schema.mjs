/** Read-only: verify the three PR #11 schema objects exist in prod. */
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

const CHECKS = [
  {
    label: 'signing_keys.encrypted_private_key (column)',
    sql: `SELECT 1 FROM information_schema.columns WHERE table_name = 'signing_keys' AND column_name = 'encrypted_private_key'`,
  },
  {
    label: 'provenance_art_key_id_sequence_unique (index)',
    sql: `SELECT 1 FROM pg_indexes WHERE schemaname = 'public' AND indexname = 'provenance_art_key_id_sequence_unique'`,
  },
  {
    label: 'collections_collector_id_title_key (index)',
    sql: `SELECT 1 FROM pg_indexes WHERE schemaname = 'public' AND indexname = 'collections_collector_id_title_key'`,
  },
]

async function main() {
  const client = new pg.Client({ connectionString: DATABASE_URL, connectionTimeoutMillis: 15000 })
  client.on('error', () => {})
  await client.connect()
  for (const c of CHECKS) {
    try {
      const { rows } = await client.query(c.sql)
      console.log(`${rows.length > 0 ? 'PRESENT' : 'MISSING'}  ${c.label}`)
    } catch (e) {
      console.log(`ERROR     ${c.label}: ${e.message}`)
    }
  }
  await client.end().catch(() => {})
  console.log('Done')
}

main().catch((e) => { console.error(e.message); process.exit(1) })
