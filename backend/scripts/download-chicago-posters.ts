// Downloads CC0 images from Art Institute of Chicago API
// CC0 filter: query[term][is_public_domain]=true
// Images via IIIF: {iiif_url}/{image_id}/full/843,/0/default.jpg
// Run: cd backend && bun run scripts/download-chicago-posters.ts

import { writeFileSync } from 'node:fs'

const OUT_DIR = '../webapp/public/assets/posters'
const API_BASE = 'https://api.artic.edu/api/v1'
const IIIF_BASE = 'https://www.artic.edu/iiif/2'

const SEARCHES: Record<string, string> = {
  'neon-nocturne':     'night city',
  'data-ghosts':       'figure dream',
  'metro-diptych':     'street photograph',
  'threshold':         'landscape',
  'found-silence':     'still life interior',
  'letters-never-sent':'collage',
  'map-of-departures': 'map abstract',
}

async function searchChicago(term: string): Promise<{ title: string; imageUrl: string } | null> {
  const params = new URLSearchParams({
    q: term,
    limit: '5',
    'fields': 'id,title,image_id,is_public_domain',
    'query[term][is_public_domain]': 'true',
  })
  const url = `${API_BASE}/artworks/search?${params}`
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(15000) })
    if (!res.ok) return null
    const json = await res.json()
    const items = json.data ?? []
    for (const item of items) {
      if (item.image_id) {
        return {
          title: item.title || 'Untitled',
          imageUrl: `${IIIF_BASE}/${item.image_id}/full/843,/0/default.jpg`,
        }
      }
    }
    return null
  } catch {
    return null
  }
}

async function main() {
  console.log('\n📥 Downloading CC0 posters from Art Institute of Chicago...\n')

  let ok = 0
  let fail = 0

  for (const [slug, query] of Object.entries(SEARCHES)) {
    try {
      const result = await searchChicago(query)
      if (!result) {
        console.log(`  ✗ ${slug}: no CC0 result for "${query}"`)
        fail++
        continue
      }

      const imgRes = await fetch(result.imageUrl, {
        signal: AbortSignal.timeout(30000),
        headers: { 'User-Agent': 'Mozilla/5.0', 'Referer': 'https://www.artic.edu/' },
      })
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

      writeFileSync(`${OUT_DIR}/${slug}.jpg`, buf)
      console.log(`  ✓ ${slug}: ${(buf.length / 1024).toFixed(0)} KB ← "${result.title.slice(0, 60)}"`)
      ok++
    } catch (err: any) {
      console.log(`  ✗ ${slug}: ${err.message}`)
      fail++
    }
    await new Promise((r) => setTimeout(r, 300))
  }

  console.log(`\n✅ ${ok} downloaded, ❌ ${fail} failed`)
  if (fail > 0) console.log('Failed slugs keep their existing poster.\n')
}

main().catch(console.error)
