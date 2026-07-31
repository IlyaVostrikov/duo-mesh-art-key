/**
 * One-shot fix for hall cover images in production.
 * Runs during Vercel build where DATABASE_URL is available.
 */
import { Pool } from 'pg'

const pool = new Pool({ connectionString: process.env.DATABASE_URL })

await pool.query(
  "UPDATE exhibition_halls SET cover_image_url = '/assets/posters/anatomie-du-reve.jpg' WHERE slug = 'drozdov-lab'"
)
await pool.query(
  "UPDATE exhibition_halls SET cover_image_url = '/assets/posters/frozen-gesture.svg' WHERE slug = 'iron-forge'"
)

const res = await pool.query(
  "SELECT slug, cover_image_url FROM exhibition_halls WHERE slug IN ('drozdov-lab', 'iron-forge')"
)
console.log('Hall covers updated:', JSON.stringify(res.rows))

await pool.end()
