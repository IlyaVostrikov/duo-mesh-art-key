/**
 * Apply Prisma migrations directly to Neon via pg (bypasses Prisma CLI engine issues on Windows).
 */

import { readFileSync, readdirSync } from 'node:fs'
import { join, resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import pg from 'pg'

const __dirname = dirname(fileURLToPath(import.meta.url))
const backendRoot = resolve(__dirname, '..')
const migrationsDir = resolve(backendRoot, 'prisma/migrations')

const DATABASE_URL = 'postgresql://neondb_owner:npg_6mi5BZNACGed@ep-raspy-voice-axuj2b63.c-4.us-east-2.aws.neon.tech/neondb?sslmode=require'

const pool = new pg.Pool({ connectionString: DATABASE_URL, max: 1 })

async function main() {
  // Get sorted migration directories
  const dirs = readdirSync(migrationsDir, { withFileTypes: true })
    .filter(d => d.isDirectory())
    .map(d => d.name)
    .sort()

  console.log(`Found ${dirs.length} migrations`)

  // Ensure _prisma_migrations table exists
  await pool.query(`
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

  for (const name of dirs) {
    // Skip if already applied
    const { rows } = await pool.query(
      'SELECT id FROM "_prisma_migrations" WHERE "migration_name" = $1',
      [name],
    )
    if (rows.length > 0) {
      console.log(`  SKIP ${name} (already applied)`)
      continue
    }

    const sqlPath = join(migrationsDir, name, 'migration.sql')
    const sql = readFileSync(sqlPath, 'utf-8')
    console.log(`  APPLY ${name}...`)

    try {
      await pool.query('BEGIN')
      await pool.query(sql)
      // Record the migration
      await pool.query(
        `INSERT INTO "_prisma_migrations" ("id", "checksum", "migration_name", "finished_at", "applied_steps_count")
         VALUES (gen_random_uuid(), $1, $2, now(), 1)`,
        ['manual', name],
      )
      await pool.query('COMMIT')
      console.log(`    OK`)
    } catch (err) {
      await pool.query('ROLLBACK')
      console.error(`    FAILED: ${err.message}`)
      // Continue — some migrations may have overlapping DDL due to dev history
      // Try to apply remaining migrations
    }
  }

  await pool.end()
  console.log('\nDone')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
