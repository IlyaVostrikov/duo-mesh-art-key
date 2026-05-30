// Downloads CC0 images from Cleveland Museum of Art Open Access API
// to fill the 7 missing/duplicate posters (3 SVG fallbacks + 4 Met duplicates)
// Run: cd backend && bun run scripts/download-cleveland-posters.ts

import { writeFileSync, existsSync } from 'node:fs'

const OUT_DIR = '../webapp/public/assets/posters'
const API_BASE = 'https://openaccess-api.clevelandart.org/api/artworks'

// 7 problem artworks with search terms tuned for Cleveland's collection
const SEARCHES: Record<string, string> = {
  // 3 SVG fallbacks (Met failed)
  'neon-nocturne':    'night city abstract',           // surreal night cityscape
  'data-ghosts':      'surreal figure abstract',        // surreal dreamlike
  'metro-diptych':    'street urban photograph',        // urban scene photograph
  // 4 Met duplicates (same image returned for different searches)
  'threshold':        'landscape dreamlike surreal',    // surreal landscape
  'found-silence':    'still life interior quiet',     // quiet interior
  'letters-never-sent':'collage paper mixed media',    // collage/assemblage
  'map-of-departures':'map print abstract',             // map/cartography
}

async function searchCleveland(term: string): Promise<{ title: string; imageUrl: string } | null> {
  const params = new URLSearchParams({ q: term, cc0: '1', has_image: '1', limit: '3' })
  const url = `${API_BASE}/?${params}`
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(10000) })
    if (!res.ok) return null
    const json = await res.json()
    const items = json.data ?? []
    for (const item of items) {
      const imageUrl = item.images?.web?.url
      if (imageUrl) return { title: item.title || 'Untitled', imageUrl }
    }
    return null
  } catch {
    return null
  }
}

async function main() {
  console.log('\n📥 Downloading CC0 posters from Cleveland Museum of Art...\n')

  let ok = 0
  let fail = 0

  for (const [slug, query] of Object.entries(SEARCHES)) {
    try {
      const result = await searchCleveland(query)
      if (!result) {
        console.log(`  ✗ ${slug}: no CC0 result for "${query}"`)
        fail++
        continue
      }

      const imgRes = await fetch(result.imageUrl, { signal: AbortSignal.timeout(30000) })
      if (!imgRes.ok) {
        console.log(`  ✗ ${slug}: HTTP ${imgRes.status} downloading image`)
        fail++
        continue
      }

      const buf = Buffer.from(await imgRes.arrayBuffer())
      if (buf.length < 2000) {
        console.log(`  ✗ ${slug}: too small (${buf.length} bytes)`)
        fail++
        continue
      }

      // Overwrite existing file (SVG or duplicate JPG)
      writeFileSync(`${OUT_DIR}/${slug}.jpg`, buf)
      console.log(`  ✓ ${slug}: ${(buf.length / 1024).toFixed(0)} KB ← "${result.title.slice(0, 60)}"`)
      ok++
    } catch (err: any) {
      console.log(`  ✗ ${slug}: ${err.message}`)
      fail++
    }
    // Rate limit
    await new Promise((r) => setTimeout(r, 300))
  }

  console.log(`\n✅ ${ok} downloaded, ❌ ${fail} failed`)
  if (fail > 0) console.log('Failed slugs keep their existing poster.\n')
}

main().catch(console.error)
