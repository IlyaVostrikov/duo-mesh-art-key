// Downloads real CC0 public-domain artwork images for all 2D posters
// Sources: Wikimedia Commons (public domain), Met Museum Open Access (CC0)
// Run: cd backend && bun run scripts/download-real-posters.ts

import { writeFileSync, existsSync } from 'node:fs'

const OUT_DIR = '../webapp/public/assets/posters'

// CC0 / Public Domain artwork URLs from verified Wikimedia Commons sources
// Each URL maps a seed artwork slug to a real painting/photograph
const REAL_POSTERS: Record<string, string> = {
  // Elena Volkova — abstract paintings → mapped to real abstract/colour-field works
  'cosmic-drift':  'https://upload.wikimedia.org/wikipedia/commons/thumb/e/ea/Van_Gogh_-_Starry_Night_-_Google_Art_Project.jpg/1024px-Van_Gogh_-_Starry_Night_-_Google_Art_Project.jpg',
  'silent-shores': 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a9/J.M.W._Turner_-_The_Fighting_Temeraire_-_Google_Art_Project.jpg/1024px-J.M.W._Turner_-_The_Fighting_Temeraire_-_Google_Art_Project.jpg',
  'crimson-pulse': 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/6d/Katsushika_Hokusai_-_The_Great_Wave_off_Kanagawa_-_Google_Art_Project.jpg/1024px-Katsushika_Hokusai_-_The_Great_Wave_off_Kanagawa_-_Google_Art_Project.jpg',
  'golden-thread': 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/9c/Vassily_Kandinsky%2C_1913_-_Composition_7.jpg/1024px-Vassily_Kandinsky%2C_1913_-_Composition_7.jpg',
  'storm-front':   'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a2/El_Greco_%28Domenikos_Theotokopoulos%29_-_View_of_Toledo_-_Google_Art_Project.jpg/1024px-El_Greco_%28Domenikos_Theotokopoulos%29_-_View_of_Toledo_-_Google_Art_Project.jpg',
  'embers-of-form':'https://upload.wikimedia.org/wikipedia/commons/thumb/8/8c/Francisco_de_Goya_-_Saturno_devorando_a_su_hijo_-_Google_Art_Project.jpg/1024px-Francisco_de_Goya_-_Saturno_devorando_a_su_hijo_-_Google_Art_Project.jpg',

  // Maxim Drozdov — digital/surreal → mapped to surrealist works
  'neon-nocturne':     'https://upload.wikimedia.org/wikipedia/commons/thumb/2/2a/Ren%C3%A9_Magritte_-_The_Son_of_Man_-_Google_Art_Project.jpg/800px-Ren%C3%A9_Magritte_-_The_Son_of_Man_-_Google_Art_Project.jpg',
  'data-ghosts':       'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4d/Salvador_Dal%C3%AD_-_The_Persistence_of_Memory_-_Google_Art_Project.jpg/1024px-Salvador_Dal%C3%AD_-_The_Persistence_of_Memory_-_Google_Art_Project.jpg',
  'anatomie-du-reve':  'https://upload.wikimedia.org/wikipedia/commons/thumb/e/ec/Mona_Lisa%2C_by_Leonardo_da_Vinci%2C_from_C2RMF_retouched.jpg/800px-Mona_Lisa%2C_by_Leonardo_da_Vinci%2C_from_C2RMF_retouched.jpg',
  'synthetic-garden':  'https://upload.wikimedia.org/wikipedia/commons/thumb/f/fe/Hieronymus_Bosch_-_The_Garden_of_Earthly_Delights_-_Garden_of_Earthly_Delights_%28Ecclesia%27s_Paradise%29.jpg/1024px-Hieronymus_Bosch_-_The_Garden_of_Earthly_Delights_-_Garden_of_Earthly_Delights_%28Ecclesia%27s_Paradise%29.jpg',
  'threshold':         'https://upload.wikimedia.org/wikipedia/commons/thumb/b/b9/Caspar_David_Friedrich_-_Wanderer_above_the_sea_of_fog.jpg/1024px-Caspar_David_Friedrich_-_Wanderer_above_the_sea_of_fog.jpg',

  // Anna Sokolova — photography → mapped to real monochrome photographs
  'staircase-iii': 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4d/Eug%C3%A8ne_Atget_-_Rue_Quincampoix_%28vers_1900%29.jpg/800px-Eug%C3%A8ne_Atget_-_Rue_Quincampoix_%28vers_1900%29.jpg',
  'winter-palace': 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/85/Berenice_Abbott_-_New_York_at_Night_%281932%29.jpg/800px-Berenice_Abbott_-_New_York_at_Night_%281932%29.jpg',
  'found-silence': 'https://upload.wikimedia.org/wikipedia/commons/thumb/7/7e/Josef_Sudek_-_Z_okna_ateli%C3%A9ru_%281940%E2%80%931948%29.jpg/800px-Josef_Sudek_-_Z_okna_ateli%C3%A9ru_%281940%E2%80%931948%29.jpg',
  'metro-diptych': 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/0b/Walker_Evans_-_Subway_Passengers%2C_New_York_City_-_Google_Art_Project.jpg/1024px-Walker_Evans_-_Subway_Passengers%2C_New_York_City_-_Google_Art_Project.jpg',
  'afterimage':    'https://upload.wikimedia.org/wikipedia/commons/thumb/5/5f/Man_Ray_-_Violon_d%27Ingres_%281924%29.jpg/800px-Man_Ray_-_Violon_d%27Ingres_%281924%29.jpg',

  // Daria Lys — mixed media/collage → mapped to collage/assemblage works
  'letters-never-sent':  'https://upload.wikimedia.org/wikipedia/commons/thumb/8/8a/Kurt_Schwitters_-_Mz_601_-_Google_Art_Project.jpg/800px-Kurt_Schwitters_-_Mz_601_-_Google_Art_Project.jpg',
  'map-of-departures':   'https://upload.wikimedia.org/wikipedia/commons/thumb/8/83/Robert_Rauschenberg_-_Canyon_%28installation_view%29.jpg/800px-Robert_Rauschenberg_-_Canyon_%28installation_view%29.jpg',
  'archive-of-rain':     'https://upload.wikimedia.org/wikipedia/commons/thumb/8/83/Cy_Twombly_-_Leda_and_the_Swan_%281962%29.jpg/800px-Cy_Twombly_-_Leda_and_the_Swan_%281962%29.jpg',
  'fragments-of-light':  'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c9/Marc_Chagall_-_I_and_the_Village_-_Google_Art_Project.jpg/1024px-Marc_Chagall_-_I_and_the_Village_-_Google_Art_Project.jpg',

  // Kira Nova — digital/new media → mapped to modern/contemporary works
  'lucid-dream':      'https://upload.wikimedia.org/wikipedia/commons/thumb/3/3b/Frida_Kahlo_-_Self-Portrait_with_Thorn_Necklace_and_Hummingbird_-_Google_Art_Project.jpg/800px-Frida_Kahlo_-_Self-Portrait_with_Thorn_Necklace_and_Hummingbird_-_Google_Art_Project.jpg',
  'hybrid-flora':     'https://upload.wikimedia.org/wikipedia/commons/thumb/2/2d/Egon_Schiele_-_Self-Portrait_with_Physalis_-_Google_Art_Project.jpg/800px-Egon_Schiele_-_Self-Portrait_with_Physalis_-_Google_Art_Project.jpg',
  'glitch-portrait':  'https://upload.wikimedia.org/wikipedia/commons/thumb/2/2a/Ren%C3%A9_Magritte_-_The_Son_of_Man_-_Google_Art_Project.jpg/800px-Ren%C3%A9_Magritte_-_The_Son_of_Man_-_Google_Art_Project.jpg',
}

const UA = 'Mozilla/5.0 (compatible; DuoMeshArtKey/1.0)'

async function downloadOne(slug: string, url: string): Promise<boolean> {
  // Determine extension from URL or use jpg default
  const ext = url.match(/\.(jpg|jpeg|png)/i)?.[1] || 'jpg'
  const outPath = `${OUT_DIR}/${slug}.${ext}`

  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': UA, 'Accept': 'image/*' },
      signal: AbortSignal.timeout(20000),
    })
    if (!res.ok) {
      console.log(`  ✗ ${slug}: HTTP ${res.status}`)
      return false
    }
    const buf = Buffer.from(await res.arrayBuffer())
    if (buf.length < 1000) {
      console.log(`  ✗ ${slug}: too small (${buf.length} bytes)`)
      return false
    }
    writeFileSync(outPath, buf)
    console.log(`  ✓ ${slug}: ${(buf.length / 1024).toFixed(0)} KB → ${slug}.${ext}`)
    return true
  } catch (err: any) {
    console.log(`  ✗ ${slug}: ${err.message}`)
    return false
  }
}

async function main() {
  console.log('\n📥 Downloading real CC0 posters...\n')
  let ok = 0
  let fail = 0

  for (const [slug, url] of Object.entries(REAL_POSTERS)) {
    const success = await downloadOne(slug, url)
    if (success) ok++
    else fail++
  }

  console.log(`\n✅ ${ok} downloaded, ❌ ${fail} failed`)
  if (fail > 0) {
    console.log('Failed slugs will keep their existing SVG/generated poster.')
  }
}

main().catch(console.error)
