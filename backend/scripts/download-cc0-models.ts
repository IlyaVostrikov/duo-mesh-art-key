// Downloads CC0 3D models from Polygonal Mind open-source assets
// Models are CC0 licensed — free for any use, no attribution required
// Source: https://github.com/ToxSam/open-source-3D-assets
// Run: cd backend && bun run scripts/download-cc0-models.ts

import { writeFileSync, existsSync, mkdirSync } from 'node:fs'

const OUT_DIR = '../webapp/public/assets/models'
const GH_BASE = 'https://raw.githubusercontent.com/ToxSam/cc0-models-Polygonal-Mind/main/projects'

// 6 models selected for DUO MESH 3D artworks:
// Viktor Iron (sculptural/industrial): Greek statues + Egyptian god + bust
// Kira Nova (digital/surreal): Floating islands
const MODELS: Record<string, string> = {
  'bronze-echo':    `${GH_BASE}/MomusPark/Statue_greek_01_Art.glb`,
  'scanned-figure': `${GH_BASE}/MomusPark/Statue_greek_02_Art.glb`,
  'digital-double': `${GH_BASE}/ca-world/AvatarBust_01.glb`,
  'frozen-gesture': `${GH_BASE}/tomb-chaser-1/GodAnubis_Art.glb`,
  'portal-v2':      `${GH_BASE}/MomusPark/Floating_Island_01_Art.glb`,
  'mesh-poem':      `${GH_BASE}/MomusPark/Floating_Island_02_Art.glb`,
}

async function main() {
  console.log('\n📥 Downloading CC0 3D models...\n')

  if (!existsSync(OUT_DIR)) mkdirSync(OUT_DIR, { recursive: true })

  let ok = 0
  let fail = 0

  for (const [slug, url] of Object.entries(MODELS)) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(60000) })
      if (!res.ok) {
        console.log(`  ✗ ${slug}: HTTP ${res.status}`)
        fail++
        continue
      }
      const buf = Buffer.from(await res.arrayBuffer())
      const sizeMB = (buf.length / (1024 * 1024)).toFixed(1)
      writeFileSync(`${OUT_DIR}/${slug}.glb`, buf)
      console.log(`  ✓ ${slug}: ${sizeMB} MB`)
      ok++
    } catch (err: any) {
      console.log(`  ✗ ${slug}: ${err.message}`)
      fail++
    }
  }

  console.log(`\n✅ ${ok} downloaded, ❌ ${fail} failed\n`)
}

main().catch(console.error)
