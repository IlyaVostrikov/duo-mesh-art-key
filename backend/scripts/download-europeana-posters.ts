// Downloads CC0 images from Europeana API (European cultural heritage aggregator)
// Run: cd backend && bun run scripts/download-europeana-posters.ts

import { writeFileSync, existsSync, readFileSync } from 'node:fs'

const OUT_DIR = '../webapp/public/assets/posters'
const API_BASE = 'https://api.europeana.eu/record/v2/search.json'
// Europeana test key works for low-volume access
const API_KEY = 'APIKEY'

const SEARCHES: Record<string, string> = {
  'neon-nocturne':     'night city lights',
  'data-ghosts':       'surreal figure',
  'metro-diptych':     'subway metro station',
  'threshold':         'surreal landscape',
  'found-silence':     'still life room',
  'letters-never-sent':'collage paper',
}

async function searchEuropeana(term: string): Promise<{ title: string; imageUrl: string } | null> {
  const params = new URLSearchParams({
    wskey: API_KEY,
    query: term,
    rows: '5',
    qf: 'REUSABILITY:open',  // CC0 / PDM only
    media: 'true',
    profile: 'minimal',
  })
  try {
    const res = await fetch(`${API_BASE}?${params}`, {
      signal: AbortSignal.timeout(15000),
      headers: { 'User-Agent': 'DuoMeshArtKey/1.0 (demo)' },
    })
    if (!res.ok) {
      console.log(`    HTTP ${res.status}`)
      return null
    }
    const json = await res.json()
    const items = json.items ?? []
    for (const item of items) {
      const edmPreview = item.edmPreview?.[0]
      if (edmPreview) {
        return { title: item.title?.[0] || 'Untitled', imageUrl: edmPreview }
      }
    }
    return null
  } catch (err: any) {
    console.log(`    ${err.message}`)
    return null
  }
}

async function main() {
  console.log('\n📥 Downloading CC0 posters from Europeana...\n')

  let ok = 0
  let fail = 0

  for (const [slug, query] of Object.entries(SEARCHES)) {
    // Skip already downloaded
    if (existsSync(`${OUT_DIR}/${slug}.jpg`)) {
      const sz = readFileSync(`${OUT_DIR}/${slug}.jpg`).length
      if (sz > 5000) {
        console.log(`  ✓ ${slug}: already exists (${(sz/1024).toFixed(0)} KB)`)
        ok++
        continue
      }
    }

    // 2s between API calls
    if (ok > 0 || fail > 0) await new Promise((r) => setTimeout(r, 2000))

    try {
      console.log(`  ... searching: "${query}"`)
      const result = await searchEuropeana(query)
      if (!result) {
        console.log(`  ✗ ${slug}: no result`)
        fail++
        continue
      }

      await new Promise((r) => setTimeout(r, 1000))

      const imgRes = await fetch(result.imageUrl, {
        signal: AbortSignal.timeout(30000),
        headers: { 'User-Agent': 'DuoMeshArtKey/1.0' },
      })
      if (!imgRes.ok) {
        console.log(`  ✗ ${slug}: HTTP ${imgRes.status}`)
        fail++
        continue
      }

      const buf = Buffer.from(await imgRes.arrayBuffer())
      if (buf.length < 2000) {
        console.log(`  ✗ ${slug}: too small`)
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
  }

  console.log(`\n✅ ${ok} downloaded, ❌ ${fail} failed\n`)
}

main().catch(console.error)
