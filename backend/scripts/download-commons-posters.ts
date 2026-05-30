// Downloads CC0 images from Wikimedia Commons with sequential rate limiting
// Each search+download takes ~5s due to 2.5s pauses
// Run: cd backend && bun run scripts/download-commons-posters.ts

import { writeFileSync, existsSync, readFileSync } from 'node:fs'

const OUT_DIR = '../webapp/public/assets/posters'
const COMMONS_API = 'https://commons.wikimedia.org/w/api.php'
const UA = 'DuoMeshArtKey/1.0'

// Simple broader terms to avoid overloading Commons search
const SEARCHES: Record<string, string> = {
  'neon-nocturne':     'nocturne night city painting',
  'data-ghosts':       'surrealist figure dream painting',
  'metro-diptych':     'subway metro station photograph',
  'threshold':         'surreal landscape painting dreamlike',
  'found-silence':     'still life quiet room painting',
  'letters-never-sent':'paper collage mixed media artwork',
  'map-of-departures': 'antique world map cartography print',
}

async function searchCommons(term: string): Promise<{ title: string; imageUrl: string } | null> {
  const params = new URLSearchParams({
    action: 'query',
    format: 'json',
    origin: '*',
    generator: 'search',
    gsrsearch: term,
    gsrnamespace: '6',
    gsrlimit: '5',
    prop: 'imageinfo',
    iiprop: 'url|size|extmetadata',
    iiurlwidth: '800',
  })
  const res = await fetch(`${COMMONS_API}?${params}`, {
    signal: AbortSignal.timeout(15000),
    headers: { 'User-Agent': UA },
  })
  if (!res.ok) {
    if (res.status === 429) console.log(`    (rate limited, will retry next run)`)
    return null
  }
  const json = await res.json()
  const pages = json.query?.pages ?? {}
  for (const page of Object.values(pages) as any[]) {
    const ii = page.imageinfo?.[0]
    if (!ii?.thumburl) continue
    const restricted = ii.extmetadata?.Restrictions?.value
    if (restricted) continue
    return { title: page.title || 'Untitled', imageUrl: ii.thumburl }
  }
  return null
}

async function main() {
  console.log('\n📥 Downloading CC0 posters from Wikimedia Commons...\n')

  let ok = 0
  let fail = 0

  for (const [slug, query] of Object.entries(SEARCHES)) {
    // 3s pause between API calls to avoid 429
    if (ok > 0 || fail > 0) {
      await new Promise((r) => setTimeout(r, 3000))
    }

    // Skip if already downloaded
    if (existsSync(`${OUT_DIR}/${slug}.jpg`)) {
      const sz = readFileSync(`${OUT_DIR}/${slug}.jpg`).length
      if (sz > 5000) {
        console.log(`  ✓ ${slug}: already exists (${(sz/1024).toFixed(0)} KB)`)
        ok++
        continue
      }
    }

    try {
      console.log(`  ... searching: "${query}"`)
      const result = await searchCommons(query)
      if (!result) {
        console.log(`  ✗ ${slug}: no result`)
        fail++
        continue
      }

      // 1s pause before download
      await new Promise((r) => setTimeout(r, 1000))

      const imgRes = await fetch(result.imageUrl, {
        signal: AbortSignal.timeout(30000),
        headers: { 'User-Agent': UA },
      })
      if (!imgRes.ok) {
        console.log(`  ✗ ${slug}: HTTP ${imgRes.status}`)
        fail++
        continue
      }

      const buf = Buffer.from(await imgRes.arrayBuffer())
      if (buf.length < 2000) {
        console.log(`  ✗ ${slug}: too small (${buf.length} bytes)`)
        fail++
        continue
      }

      writeFileSync(existingJpg, buf)
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
