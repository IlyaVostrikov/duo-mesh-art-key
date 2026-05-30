// Downloads CC0 images from Openverse API (aggregates Commons, museums, etc.)
// Run: cd backend && bun run scripts/download-openverse-posters.ts

import { writeFileSync, existsSync, readFileSync } from 'node:fs'

const OUT_DIR = '../webapp/public/assets/posters'
const API_BASE = 'https://api.openverse.org/v1/images'

// Only the 5 remaining slugs (neon-nocturne done)
const SEARCHES: Record<string, string> = {
  'data-ghosts':       'figures dream surreal',
  'metro-diptych':     'transit station subway',
  'threshold':         'dreamlike landscape painting',
  'found-silence':     'interior quiet room still life',
  'letters-never-sent':'paper collage abstract art',
}

async function searchOpenverse(term: string): Promise<{ title: string; imageUrl: string } | null> {
  // Try without source filter first for broader results
  for (const source of ['wikimedia', 'flickr', undefined]) {
    const params = new URLSearchParams({
      q: term,
      license: 'cc0,pdm',
      page_size: '5',
    })
    if (source) params.set('source', source)
    try {
      const res = await fetch(`${API_BASE}/?${params}`, {
        signal: AbortSignal.timeout(15000),
        headers: { 'User-Agent': 'DuoMeshArtKey/1.0' },
      })
      if (!res.ok) continue
      const json = await res.json()
      const results = json.results ?? []
      for (const r of results) {
        if (r.url) return { title: r.title || 'Untitled', imageUrl: r.url }
      }
    } catch {}
  }
  return null
}

async function main() {
  console.log('\n📥 Downloading CC0 posters from Openverse (round 2)...\n')

  let ok = 0
  let fail = 0

  for (const [slug, query] of Object.entries(SEARCHES)) {
    if (existsSync(`${OUT_DIR}/${slug}.jpg`)) {
      const sz = readFileSync(`${OUT_DIR}/${slug}.jpg`).length
      if (sz > 5000) {
        console.log(`  ✓ ${slug}: already exists (${(sz/1024).toFixed(0)} KB)`)
        ok++
        continue
      }
    }

    if (ok > 0 || fail > 0) await new Promise((r) => setTimeout(r, 1500))

    try {
      console.log(`  ... "${query}"`)
      const result = await searchOpenverse(query)
      if (!result) {
        console.log(`  ✗ ${slug}: no result`)
        fail++
        continue
      }

      await new Promise((r) => setTimeout(r, 800))

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
