import { writeFileSync, existsSync } from 'node:fs'
import { createHash } from 'node:crypto'

const OUT_DIR = '../webapp/public/assets/posters'

// ─── All artwork slugs with display titles (RU) ───
const ARTWORKS: [string, string][] = [
  ['cosmic-drift', 'Космический дрейф'],
  ['silent-shores', 'Тихие берега'],
  ['crimson-pulse', 'Багровый пульс'],
  ['golden-thread', 'Золотая нить'],
  ['storm-front', 'Штормовой фронт'],
  ['neon-nocturne', 'Неоновый ноктюрн'],
  ['data-ghosts', 'Призраки данных'],
  ['anatomie-du-reve', 'Анатомия сна'],
  ['synthetic-garden', 'Синтетический сад'],
  ['threshold', 'Порог'],
  ['staircase-iii', 'Лестница III'],
  ['winter-palace', 'Зимний дворец'],
  ['found-silence', 'Найденная тишина'],
  ['metro-diptych', 'Метро-диптих'],
  ['afterimage', 'Послеобраз'],
  ['letters-never-sent', 'Неотправленные письма'],
  ['map-of-departures', 'Карта уходов'],
  ['archive-of-rain', 'Архив дождя'],
  ['fragments-of-light', 'Фрагменты света'],
  ['lucid-dream', 'Осознанный сон'],
  ['hybrid-flora', 'Гибридная флора'],
  ['glitch-portrait', 'Глитч-портрет'],
  ['bronze-echo', 'Бронзовое эхо'],
  ['scanned-figure', 'Сканированная фигура'],
  ['digital-double', 'Цифровой двойник'],
  ['frozen-gesture', 'Замёрзший жест'],
  ['portal-v2', 'Портал v2'],
  ['mesh-poem', 'Меш-поэма'],
]

function hashColor(slug: string): [string, string] {
  const h = createHash('sha256').update(slug).digest('hex')
  // Two complementary HSL-like colors derived from the hash
  const hue1 = parseInt(h.slice(0, 2), 16)
  const hue2 = (hue1 + 137) % 256
  return [
    `hsl(${hue1}, 55%, 45%)`,
    `hsl(${hue2}, 60%, 50%)`,
  ]
}

function generatePosterSVG(slug: string, title: string): string {
  const [c1, c2] = hashColor(slug)
  return `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600" viewBox="0 0 800 600">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:${c1}"/>
      <stop offset="100%" style="stop-color:${c2}"/>
    </linearGradient>
  </defs>
  <rect width="800" height="600" fill="url(#bg)"/>
  <text x="400" y="280" text-anchor="middle" font-family="sans-serif" font-size="24" fill="white" opacity="0.8">${title}</text>
  <text x="400" y="320" text-anchor="middle" font-family="monospace" font-size="12" fill="white" opacity="0.4">${slug}</text>
</svg>`
}

// ─── Also download the working GitHub screenshots (real 3D previews) ───
const GITHUB_SCREENSHOTS: Record<string, string> = {
  'bronze-echo':    'https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Assets/main/Models/DamagedHelmet/screenshot/screenshot.png',
  'scanned-figure': 'https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Assets/main/Models/SciFiHelmet/screenshot/screenshot.jpg',
  'digital-double': 'https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Assets/main/Models/DamagedHelmet/screenshot/screenshot.png',
  'frozen-gesture': 'https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Assets/main/Models/Suzanne/screenshot/screenshot.jpg',
  'portal-v2':      'https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Assets/main/Models/FlightHelmet/screenshot/screenshot.jpg',
  'mesh-poem':      'https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Assets/main/Models/Fox/screenshot/screenshot.jpg',
}

// ─── Also try the 4 working Wikimedia URLs we found ───
const WIKI_WORKING: Record<string, string> = {
  'cosmic-drift':     'https://upload.wikimedia.org/wikipedia/commons/thumb/e/ea/Van_Gogh_-_Starry_Night_-_Google_Art_Project.jpg/800px-Van_Gogh_-_Starry_Night_-_Google_Art_Project.jpg',
  'golden-thread':    'https://upload.wikimedia.org/wikipedia/commons/thumb/9/9c/Vassily_Kandinsky,_1913_-_Composition_7.jpg/800px-Vassily_Kandinsky,_1913_-_Composition_7.jpg',
  'anatomie-du-reve': 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/ec/Mona_Lisa,_by_Leonardo_da_Vinci,_from_C2RMF_retouched.jpg/800px-Mona_Lisa,_by_Leonardo_da_Vinci,_from_C2RMF_retouched.jpg',
  'threshold':        'https://upload.wikimedia.org/wikipedia/commons/thumb/b/b9/Caspar_David_Friedrich_-_Wanderer_above_the_sea_of_fog.jpg/800px-Caspar_David_Friedrich_-_Wanderer_above_the_sea_of_fog.jpg',
}

const UA = 'Mozilla/5.0 (compatible; DuoMeshArtKey/1.0)'

async function tryDownload(slug: string, url: string): Promise<boolean> {
  const ext = url.match(/\.(jpg|jpeg|png)/i)?.[1] || 'jpg'
  const outPath = `${OUT_DIR}/${slug}.${ext}`
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': UA, 'Accept': 'image/*' },
      signal: AbortSignal.timeout(15000),
    })
    if (!res.ok) return false
    const buf = Buffer.from(await res.arrayBuffer())
    if (buf.length < 500) return false // too small, likely error page
    writeFileSync(outPath, buf)
    return true
  } catch {
    return false
  }
}

// ─── Main ───
let localSvg = 0
let downloaded = 0

for (const [slug, title] of ARTWORKS) {
  // 1. Try GitHub screenshot
  if (GITHUB_SCREENSHOTS[slug]) {
    const ok = await tryDownload(slug, GITHUB_SCREENSHOTS[slug])
    if (ok) {
      console.log(`  [3D] ${slug} ← GitHub`)
      downloaded++
      continue
    }
  }

  // 2. Try known working Wikimedia
  if (WIKI_WORKING[slug]) {
    const ok = await tryDownload(slug, WIKI_WORKING[slug])
    if (ok) {
      console.log(`  [WM] ${slug} ← Wikimedia`)
      downloaded++
      continue
    }
  }

  // 3. Generate local SVG
  if (!existsSync(`${OUT_DIR}/${slug}.svg`)) {
    const svg = generatePosterSVG(slug, title)
    writeFileSync(`${OUT_DIR}/${slug}.svg`, svg)
  }
  console.log(`  [SVG] ${slug} ← local generation`)
  localSvg++
}

console.log(`\nDone: ${downloaded} real images, ${localSvg} SVG placeholders`)
if (localSvg > 0) console.log('SVGs are self-sufficient — no internet needed for demo.')
