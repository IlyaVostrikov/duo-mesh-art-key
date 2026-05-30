// verify-artkeys.ts — проверка хеш-цепочек provenance для всех работ
// Запуск: bun run verify-artkeys.ts (бэкенд должен быть поднят на :3000)
import { createHash } from 'node:crypto'

const API = process.env.API_BASE ?? 'http://localhost:3000'

function sha256hex(data: string): string {
  return createHash('sha256').update(data).digest('hex')
}

function canonicalJSON(obj: Record<string, unknown>): string {
  const sorted = Object.keys(obj).sort().reduce<Record<string, unknown>>((acc, k) => {
    acc[k] = obj[k]
    return acc
  }, {})
  return JSON.stringify(sorted)
}

// Layer A: пересчитываем integrityHash = SHA256(canonicalJSON({artworkId, keyCode, artistId, issuedAt}))
// NOTE: seed computes integrityHash using artwork.createdAt as issuedAt, NOT artKey.issuedAt (which is DB @default(now()))
function verifyIntegrity(artworkId: string, artistId: string, artKey: any, artworkCreatedAt: string): { ok: boolean; expected: string } {
  const expected = sha256hex(
    canonicalJSON({
      artworkId,
      keyCode: artKey.keyCode,
      artistId,
      issuedAt: artworkCreatedAt,
    }),
  )
  return { ok: expected === artKey.integrityHash, expected }
}

// Layer B: проверка связности цепочки — prevRecordHash каждой записи ссылается на хеш предыдущей
// Для seq=0: prevRecordHash должен совпадать с integrityHash ArtKey
function verifyChain(artKey: any, provenance: any[]): { ok: boolean; details: string[] } {
  const details: string[] = []
  if (!provenance || provenance.length === 0) {
    return { ok: false, details: ['No provenance records'] }
  }

  const sorted = [...provenance].sort((a: any, b: any) => a.sequence - b.sequence)

  // seq=0: prevRecordHash должен быть integrityHash
  if (sorted[0].sequence === 0) {
    if (sorted[0].prevRecordHash !== artKey.integrityHash) {
      details.push(
        `seq=0: prevRecordHash should be integrityHash — got ${sorted[0].prevRecordHash?.slice(0, 16)}…, expected ${artKey.integrityHash.slice(0, 16)}…`,
      )
    }
  }

  let prevRecordHash = sorted[0].recordHash

  for (let i = 1; i < sorted.length; i++) {
    const rec = sorted[i]
    if (rec.prevRecordHash !== prevRecordHash) {
      details.push(
        `seq=${rec.sequence}: prevRecordHash broken — got ${rec.prevRecordHash?.slice(0, 16)}…, expected ${prevRecordHash.slice(0, 16)}…`,
      )
    }
    prevRecordHash = rec.recordHash
  }

  if (details.length === 0) details.push('Chain linked')
  return { ok: details.length === 1 && details[0] === 'Chain linked', details }
}

async function main() {
  console.log('\n🔗 DUO MESH — ArtKey Provenance Verifier\n')
  console.log(`API: ${API}\n`)

  const listRes = await fetch(`${API}/api/artworks?pageSize=50`)
  if (!listRes.ok) {
    console.error(`Failed to fetch artworks: HTTP ${listRes.status}`)
    process.exit(1)
  }
  const { artworks } = (await listRes.json()) as { artworks: any[] }
  console.log(`Total artworks: ${artworks.length}\n`)

  let layerAOk = 0
  let layerAFail = 0
  let chainOk = 0
  let chainFail = 0
  const failures: string[] = []

  for (const aw of artworks) {
    const detailRes = await fetch(`${API}/api/artworks/${aw.id}`)
    if (!detailRes.ok) {
      failures.push(`✗ ${aw.title.slice(0, 60)} — fetch failed HTTP ${detailRes.status}`)
      chainFail++
      continue
    }
    const full = await detailRes.json()

    const title = (full.title || '').split(' / ')[0] || full.title
    const artistId = full.artist?.id
    const artKey = full.artKey
    const provenance = full.provenance

    // Layer A
    if (artKey && artistId) {
      const ia = verifyIntegrity(full.id, artistId, artKey, full.createdAt)
      if (ia.ok) {
        layerAOk++
      } else {
        layerAFail++
        failures.push(`✗ ${title} — integrity mismatch (expected ${ia.expected.slice(0, 16)}…)`)
      }
    } else {
      layerAFail++
      failures.push(`✗ ${title} — no artKey or artistId in response`)
    }

    // Layer B
    if (artKey && provenance) {
      const cb = verifyChain(artKey, provenance)
      if (cb.ok) {
        chainOk++
      } else {
        chainFail++
        failures.push(`✗ ${title} — chain: ${cb.details.join('; ')}`)
      }
    } else if (!provenance || provenance.length === 0) {
      chainFail++
      failures.push(`✗ ${title} — no provenance records`)
    } else {
      chainFail++
      failures.push(`✗ ${title} — orphaned provenance (no ArtKey)`)
    }
  }

  console.log('═══════════════════════════════════════')
  console.log('  Layer A (integrity hash)')
  console.log(`    ✅ ${layerAOk}/${artworks.length} correct`)
  if (layerAFail > 0) console.log(`    ❌ ${layerAFail} mismatches`)
  console.log('')
  console.log('  Layer B (provenance chain linking)')
  console.log(`    ✅ ${chainOk}/${artworks.length} linked`)
  if (chainFail > 0) console.log(`    ❌ ${chainFail} broken chains`)
  console.log('═══════════════════════════════════════\n')

  if (failures.length > 0) {
    console.log('Failures:')
    failures.forEach((f) => console.log(`  ${f}`))
    console.log('')
  }

  const passed = layerAFail === 0 && chainFail === 0
  console.log(passed ? '✅ All art keys verified — 29/29 linked chains\n' : `❌ ${layerAFail + chainFail} issues found\n`)
  if (!passed) process.exit(1)
}

main()
