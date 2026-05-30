// Downloads real CC0 artwork images from Metropolitan Museum of Art Open Access API
// Maps each seed artwork slug to a relevant Met collection search term
// Run: cd backend && bun run scripts/download-met-posters.ts

import { writeFileSync } from 'node:fs'

const OUT_DIR = '../webapp/public/assets/posters'
const MET_BASE = 'https://collectionapi.metmuseum.org/public/collection/v1'

// Search terms matching seed artwork themes
const SEARCHES: Record<string, string> = {
  // Elena Volkova — abstract/colour-field
  'cosmic-drift':     'abstract painting blue cosmic field',
  'silent-shores':    'landscape seascape horizon minimalist',
  'crimson-pulse':    'abstract expressionist red dynamic painting',
  'golden-thread':    'gold abstract geometric composition',
  'storm-front':      'storm atmospheric landscape oil painting',
  'embers-of-form':   'dark abstract embers geometric painting',

  // Maxim Drozdov — digital/surreal
  'neon-nocturne':     'surreal night cityscape neon',
  'data-ghosts':       'surreal dreamlike figures ghostly',
  'anatomie-du-reve':  'anatomical drawing renaissance figure study',
  'synthetic-garden':  'botanical flowers garden painting',
  'threshold':         'surreal landscape threshold door',

  // Anna Sokolova — photography/monochrome
  'staircase-iii':    'photograph staircase architecture modernist',
  'winter-palace':    'photograph palace interior empty hall',
  'found-silence':    'photograph still life quiet workshop',
  'metro-diptych':    'photograph urban subway transit station',
  'afterimage':       'photograph portrait double exposure experimental',

  // Daria Lys — mixed media/collage
  'letters-never-sent': 'collage letters paper assemblage',
  'map-of-departures':  'map print cartography abstract',
  'archive-of-rain':    'print series rain abstract',
  'fragments-of-light': 'collage light fragments stained glass',

  // Kira Nova — digital/new media
  'lucid-dream':      'dreamlike surreal landscape painting',
  'hybrid-flora':     'botanical illustration flowers print',
  'glitch-portrait':  'portrait abstract distortion modern',
}

async function fetchJson(url: string) {
  const res = await fetch(url, { signal: AbortSignal.timeout(10000) })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()
}

async function searchMet(term: string): Promise<number[]> {
  const params = new URLSearchParams({ q: term, hasImages: 'true' })
  const data = await fetchJson(`${MET_BASE}/search?${params}`)
  return (data.objectIDs ?? []).slice(0, 3) // top 3 results
}

async function getObject(id: number): Promise<{ primaryImage: string; title: string; isPublicDomain: boolean }> {
  const data = await fetchJson(`${MET_BASE}/objects/${id}`)
  return {
    primaryImage: data.primaryImage || '',
    title: data.title || 'Untitled',
    isPublicDomain: data.isPublicDomain === true,
  }
}

async function main() {
  console.log('\n📥 Downloading CC0 artwork posters from Met Museum...\n')
  let ok = 0
  let fail = 0

  for (const [slug, query] of Object.entries(SEARCHES)) {
    let downloaded = false
    try {
      // Search for matching objects
      const ids = await searchMet(query)
      if (ids.length === 0) {
        console.log(`  ✗ ${slug}: no results for "${query}"`)
        fail++
        continue
      }

      // Try each result until we find a CC0 image
      for (const id of ids.slice(0, 5)) {
        try {
          const obj = await getObject(id)
          if (!obj.isPublicDomain || !obj.primaryImage) continue

          // Download
          const imgRes = await fetch(obj.primaryImage, {
            signal: AbortSignal.timeout(30000),
          })
          if (!imgRes.ok) continue

          const buf = Buffer.from(await imgRes.arrayBuffer())
          if (buf.length < 2000) continue

          const ext = obj.primaryImage.match(/\.(jpg|jpeg|png)/i)?.[1] || 'jpg'
          writeFileSync(`${OUT_DIR}/${slug}.${ext}`, buf)
          console.log(`  ✓ ${slug}: ${(buf.length / 1024).toFixed(0)} KB ← "${obj.title.slice(0, 50)}"`)
          ok++
          downloaded = true
          break
        } catch {
          continue
        }
      }

      if (!downloaded) {
        console.log(`  ✗ ${slug}: no CC0 image found`)
        fail++
      }

      // Rate limit: 500ms between searches
      await new Promise((r) => setTimeout(r, 500))
    } catch (err: any) {
      console.log(`  ✗ ${slug}: ${err.message}`)
      fail++
    }
  }

  console.log(`\n✅ ${ok} downloaded, ❌ ${fail} failed`)
  console.log('Failed slugs keep existing poster.\n')
}

main().catch(console.error)
