/**
 * Hard-delete artworks by ID with all cascading records.
 *
 * Usage:
 *   DATABASE_URL="postgresql://..." bun run scripts/delete-artworks.mjs <id1> <id2> ...
 *
 * Cascading deletes (via DB FK ON DELETE CASCADE):
 *   art_keys → transparency_log, provenance_records
 *   artworks → exhibition_artworks, sales, collection_artworks, inquiries
 */

import pg from 'pg'

const ids = process.argv.slice(2).filter(Boolean)
if (ids.length === 0) {
  console.error('Usage: DATABASE_URL="..." bun run scripts/delete-artworks.mjs <id1> <id2> ...')
  process.exit(1)
}

const dbUrl = process.env.DATABASE_URL
if (!dbUrl) {
  console.error('DATABASE_URL is not set')
  process.exit(1)
}

const { Pool } = pg
const pool = new Pool({ connectionString: dbUrl, max: 1 })

console.log(`Deleting ${ids.length} artwork(s)...`)

for (const id of ids) {
  try {
    const result = await pool.query('DELETE FROM artworks WHERE id = $1', [id])
    if (result.rowCount && result.rowCount > 0) {
      console.log(`  ${id} — deleted (${result.rowCount} row(s))`)
    } else {
      console.log(`  ${id} — not found`)
    }
  } catch (err) {
    console.error(`  ${id} — error: ${err.message}`)
  }
}

await pool.end()
console.log('Done.')
