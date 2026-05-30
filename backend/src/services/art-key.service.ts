import crypto from 'node:crypto'
import type { DbClient } from '../db'

function canonicalJSON(obj: Record<string, unknown>): string {
  const sorted = Object.keys(obj)
    .sort()
    .reduce<Record<string, unknown>>((acc, key) => {
      acc[key] = obj[key]
      return acc
    }, {})
  return JSON.stringify(sorted)
}

export class ArtKeyService {
  constructor(private prisma: DbClient) {}

  async generate(artworkId: string, artistId: string, userId: string) {
    const existing = await this.prisma.artKey.findUnique({ where: { artworkId } })
    if (existing) return existing

    const year = new Date().getFullYear()
    const keyCode = `DUO-${year}-${crypto.randomBytes(4).toString('hex').toUpperCase()}`
    const ownerKey = `X${crypto.randomBytes(4).toString('hex').toUpperCase()}-${crypto.randomBytes(4).toString('hex').toUpperCase()}`
    const issuedAt = new Date()

    const integrityHash = crypto
      .createHash('sha256')
      .update(canonicalJSON({ artworkId, keyCode, artistId, issuedAt: issuedAt.toISOString() }))
      .digest('hex')

    const certificateHash = crypto
      .createHash('sha256')
      .update(`${artworkId}:${keyCode}:${ownerKey}:${Date.now()}`)
      .digest('hex')

    const artKey = await this.prisma.artKey.create({
      data: {
        artworkId,
        keyCode,
        ownerKey,
        certificateHash,
        integrityHash,
        issuedAt,
      },
    })

    // Genesis provenance record — anchored to Art Key integrityHash
    const genesisHash = crypto
      .createHash('sha256')
      .update(
        canonicalJSON({
          artworkId,
          sequence: 0,
          eventType: 'CREATION',
          actor: artistId,
          occurredAt: issuedAt.toISOString(),
          prevRecordHash: integrityHash,
        }),
      )
      .digest('hex')

    await this.prisma.provenanceRecord.create({
      data: {
        artworkId,
        artKeyId: artKey.id,
        sequence: 0,
        toUserId: userId,
        transferType: 'CREATION',
        recordHash: genesisHash,
        prevRecordHash: integrityHash,
      },
    })

    return artKey
  }

  async verify(keyCode: string) {
    const artKey = await this.prisma.artKey.findUnique({
      where: { keyCode },
      include: {
        artwork: {
          include: { artist: { include: { user: true, hall: true } } },
        },
      },
    })
    if (!artKey) return null

    const provenance = await this.prisma.provenanceRecord.findMany({
      where: { artworkId: artKey.artworkId },
      include: { toOwner: true, fromOwner: true },
      orderBy: { sequence: 'asc' },
    })

    // ── Recalculate integrityHash ──
    const recalculatedIntegrity = crypto
      .createHash('sha256')
      .update(
        canonicalJSON({
          artworkId: artKey.artworkId,
          keyCode: artKey.keyCode,
          artistId: artKey.artwork.artistId,
          issuedAt: artKey.issuedAt.toISOString(),
        }),
      )
      .digest('hex')

    const integrityOk = recalculatedIntegrity === artKey.integrityHash
    const checks: Array<{ label: string; pass: boolean; detail: string }> = [
      {
        label: 'integrityHash',
        pass: integrityOk,
        detail: integrityOk
          ? 'Пересчитан и совпадает / Recalculated and matches'
          : `Не совпадает / Mismatch — stored ${artKey.integrityHash.slice(0, 16)}… vs recalculated ${recalculatedIntegrity.slice(0, 16)}…`,
      },
    ]

    // ── Verify provenance chain ──
    let chainOk = true
    const sortedProv = [...provenance].sort((a, b) => a.sequence - b.sequence)

    if (sortedProv.length === 0) {
      chainOk = false
      checks.push({ label: 'chain', pass: false, detail: 'Нет записей provenance / No provenance records' })
    } else {
      // Genesis: prevRecordHash + recordHash recalculation
      if (sortedProv[0].sequence === 0) {
        const genesisLinkOk = sortedProv[0].prevRecordHash === recalculatedIntegrity
        if (!genesisLinkOk) {
          chainOk = false
          checks.push({
            label: 'genesis-link',
            pass: false,
            detail: `seq=0 prevRecordHash ≠ recalculated integrityHash — got ${sortedProv[0].prevRecordHash?.slice(0, 16)}…`,
          })
        } else {
          checks.push({ label: 'genesis-link', pass: true, detail: 'seq=0 привязан к integrityHash / seq=0 anchored to integrityHash' })
        }

        // Recalculate genesis recordHash: occurredAt = artwork.createdAt (seed convention)
        const genesisHash = crypto
          .createHash('sha256')
          .update(
            canonicalJSON({
              artworkId: artKey.artworkId,
              sequence: 0,
              eventType: 'CREATION',
              actor: artKey.artwork.artistId,
              occurredAt: artKey.issuedAt.toISOString(),
              prevRecordHash: recalculatedIntegrity,
            }),
          )
          .digest('hex')
        const genesisRecordOk = genesisHash === sortedProv[0].recordHash
        if (!genesisRecordOk) {
          chainOk = false
          checks.push({
            label: 'genesis-record',
            pass: false,
            detail: `seq=0 recordHash tampered — stored ${sortedProv[0].recordHash.slice(0, 16)}… vs recalculated ${genesisHash.slice(0, 16)}…`,
          })
        } else {
          checks.push({ label: 'genesis-record', pass: true, detail: 'seq=0 recordHash пересчитан и совпадает / recalculated and matches' })
        }
      }

      // Chain: каждый prevRecordHash ссылается на recordHash предыдущей записи
      let prevRecordHash = sortedProv[0].recordHash
      for (let i = 1; i < sortedProv.length; i++) {
        const rec = sortedProv[i]
        if (rec.prevRecordHash !== prevRecordHash) {
          chainOk = false
          checks.push({
            label: `chain-seq-${rec.sequence}`,
            pass: false,
            detail: `seq=${rec.sequence} prevRecordHash broken — expected ${prevRecordHash.slice(0, 16)}…, got ${rec.prevRecordHash?.slice(0, 16)}…`,
          })
        } else {
          checks.push({ label: `chain-seq-${rec.sequence}`, pass: true, detail: `seq=${rec.sequence} linked` })
        }
        prevRecordHash = rec.recordHash
      }
    }

    const verified = integrityOk && chainOk && !artKey.revokedAt
    const currentOwner = sortedProv.at(-1)?.toOwner.displayName ?? null

    return {
      artKey: {
        keyCode: artKey.keyCode,
        ownerKey: artKey.ownerKey,
        integrityHash: artKey.integrityHash,
        certificateHash: artKey.certificateHash,
        issuedAt: artKey.issuedAt.toISOString(),
        revokedAt: artKey.revokedAt?.toISOString() ?? null,
      },
      artwork: {
        id: artKey.artwork.id,
        title: artKey.artwork.title,
        description: artKey.artwork.description,
        year: artKey.artwork.year,
        medium: artKey.artwork.medium,
        posterUrl: artKey.artwork.posterUrl,
        modelUrl: artKey.artwork.modelUrl,
        mediaType: artKey.artwork.mediaType,
        status: artKey.artwork.status,
        price: artKey.artwork.price?.toString() ?? null,
        currency: artKey.artwork.currency,
      },
      artist: {
        id: artKey.artwork.artist.id,
        displayName: artKey.artwork.artist.user.displayName,
        hallSlug: artKey.artwork.artist.hall?.slug ?? null,
      },
      provenance: sortedProv.map((p) => ({
        sequence: p.sequence,
        transferType: p.transferType,
        fromOwnerName: p.fromOwner?.displayName ?? null,
        toOwnerName: p.toOwner.displayName,
        price: p.price?.toString() ?? null,
        recordHash: p.recordHash,
        prevRecordHash: p.prevRecordHash,
        createdAt: p.createdAt.toISOString(),
      })),
      verified,
      checks,
      currentOwner,
    }
  }
}
