import crypto from 'node:crypto'
import type { DbClient } from '../db'
import { canonicalJSON, compositeFileHash, hashPayload } from '../crypto'
import type { SigningService, ProvenancePayload } from './signing.service'
import { requestTimestamp } from '../crypto/timestamp'
import { TransparencyLogService } from './transparency-log.service'

export class ArtKeyService {
  constructor(
    private prisma: DbClient,
    private signingService?: SigningService,
    private tsaUrl?: string,
  ) {}

  async generate(params: {
    artworkId: string
    artistId: string
    userId: string
    fileHashes: Record<string, string>
  }) {
    const { artworkId, artistId, userId, fileHashes } = params
    const existing = await this.prisma.artKey.findUnique({ where: { artworkId } })
    if (existing) return existing

    const year = new Date().getFullYear()
    const keyCode = `DUO-${year}-${crypto.randomBytes(6).toString('hex').toUpperCase()}`
    const ownerKey = `X${crypto.randomBytes(4).toString('hex').toUpperCase()}-${crypto.randomBytes(4).toString('hex').toUpperCase()}`
    const issuedAt = new Date()

    // Integrity hash is now a composite hash of all artwork file hashes
    const integrityHash = Object.keys(fileHashes).length > 0
      ? compositeFileHash(fileHashes)
      : crypto.createHash('sha256').update(canonicalJSON({ artworkId, keyCode, artistId, issuedAt: issuedAt.toISOString() })).digest('hex')

    const certificateHash = crypto
      .createHash('sha256')
      .update(`${artworkId}:${keyCode}:${ownerKey}:${Date.now()}`)
      .digest('hex')

    // Build genesis provenance payload
    const genesisPayload: ProvenancePayload = {
      artworkId,
      sequence: 0,
      eventType: 'CREATION',
      fromOwner: null,
      toOwner: userId,
      occurredAt: issuedAt.toISOString(),
      prevRecordHash: integrityHash,
    }
    const genesisRecordHash = hashPayload(genesisPayload)

    // Sign genesis with artist's key (if signing service is available)
    let signature: string | null = null
    let signerPublicKey: string | null = null
    let signerRole: string | null = null
    let artistSigningKeyId: string | null = null
    let platformSignature: string | null = null
    let platformSigningKeyId: string | null = null

    if (this.signingService) {
      const artistKey = await this.signingService.getArtistActivePublicKey(artistId)
      if (artistKey) {
        const signed = await this.signingService.signProvRecord(genesisPayload, artistKey.keyId, 'ARTIST')
        signature = signed.signature
        signerPublicKey = signed.signerPublicKey
        signerRole = 'ARTIST'
        artistSigningKeyId = artistKey.keyId
      }

      // Platform co-signature
      const platformKey = await this.signingService.getPlatformActivePublicKey()
      if (platformKey) {
        const coSigned = await this.signingService.signProvRecord(genesisPayload, platformKey.keyId, 'PLATFORM')
        platformSignature = coSigned.signature
        platformSigningKeyId = platformKey.keyId
      }
    }

    // RFC 3161 timestamp on integrityHash (if TSA_URL is configured)
    let timestampToken: string | null = null
    if (this.tsaUrl) {
      try {
        const tsResult = await requestTimestamp(integrityHash, this.tsaUrl)
        timestampToken = tsResult.token
      } catch (err) {
        console.warn('RFC 3161 timestamp request failed (non-blocking):', err)
      }
    }

    // Atomic genesis: ArtKey + ProvenanceRecord + TransparencyLog
    return this.prisma.$transaction(async (tx) => {
      // Re-check inside transaction to prevent concurrent genesis TOCTOU race
      const existingInTx = await tx.artKey.findUnique({ where: { artworkId } })
      if (existingInTx) return existingInTx

      try {
        const artKey = await tx.artKey.create({
          data: {
            artworkId,
            keyCode,
            ownerKey,
            certificateHash,
            integrityHash,
            issuedAt,
            timestampToken,
            platformSignature,
            platformSigningKeyId,
            artistSigningKeyId,
          },
        })

        await tx.provenanceRecord.create({
          data: {
            artworkId,
            artKeyId: artKey.id,
            sequence: 0,
            toUserId: userId,
            transferType: 'CREATION',
            recordHash: genesisRecordHash,
            prevRecordHash: integrityHash,
            signature,
            signerPublicKey,
            signerRole,
            signingKeyId: artistSigningKeyId,
            occurredAt: issuedAt,
          },
        })

        await new TransparencyLogService(tx as unknown as DbClient).append({
          artKeyId: artKey.id,
          entryType: 'ARTKEY_CREATED',
          payload: {
            keyCode: artKey.keyCode,
            integrityHash,
            genesisRecordHash,
            certificateHash: artKey.certificateHash,
          },
        })

        return artKey
      } catch (err) {
        // P2002: unique constraint violation — handle based on which field
        if (
          err instanceof Error &&
          'code' in err &&
          (err as Record<string, unknown>).code === 'P2002'
        ) {
          const meta = (err as Record<string, unknown>).meta as { target?: string[] } | undefined
          if (meta?.target?.includes('artwork_id')) {
            // Concurrent genesis for the same artworkId — return the winner
            const winner = await tx.artKey.findUnique({ where: { artworkId } })
            if (winner) return winner
            // Conflicting transaction not yet committed — retry
            throw new Error('ArtKey genesis: concurrent conflict — retry')
          }
          // keyCode or ownerKey collision — extremely rare, re-throw for caller retry
          console.warn('ArtKey genesis: unique constraint collision on field(s)', meta?.target)
        }
        throw err
      }
    })
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

    const checks: Array<{
      label: string
      pass: boolean
      detail: string
      category: 'INTEGRITY' | 'CHAIN' | 'SIGNATURE' | 'TIMESTAMP'
    }> = []

    // ── Layer A: Integrity ──
    let integrityOk = false
    if (artKey.artwork.contentHashes && Object.keys(artKey.artwork.contentHashes as Record<string, string>).length > 0) {
      const fileHashes = artKey.artwork.contentHashes as Record<string, string>
      const recalculatedIntegrity = compositeFileHash(fileHashes)
      integrityOk = recalculatedIntegrity === artKey.integrityHash
      checks.push({
        label: 'integrityHash (file-based)',
        pass: integrityOk,
        detail: integrityOk
          ? 'Composite file hash matches stored integrityHash'
          : `Mismatch — stored ${artKey.integrityHash.slice(0, 16)}… vs recalculated ${recalculatedIntegrity.slice(0, 16)}…`,
        category: 'INTEGRITY',
      })
    } else {
      // Fallback: old-style metadata-based integrityHash
      const recalculatedIntegrity = crypto
        .createHash('sha256')
        .update(canonicalJSON({
          artworkId: artKey.artworkId,
          keyCode: artKey.keyCode,
          artistId: artKey.artwork.artistId,
          issuedAt: artKey.issuedAt.toISOString(),
        }))
        .digest('hex')
      integrityOk = recalculatedIntegrity === artKey.integrityHash
      checks.push({
        label: 'integrityHash (metadata, pre-upgrade)',
        pass: integrityOk,
        detail: integrityOk
          ? 'Metadata hash matches (legacy mode — no file hashes stored)'
          : `Mismatch — stored ${artKey.integrityHash.slice(0, 16)}… vs recalculated ${recalculatedIntegrity.slice(0, 16)}…`,
        category: 'INTEGRITY',
      })
    }

    // ── Layer B: Provenance chain + signatures ──
    let chainOk = true

    if (provenance.length === 0) {
      chainOk = false
      checks.push({ label: 'chain', pass: false, detail: 'No provenance records', category: 'CHAIN' })
    } else {
      const sortedProv = [...provenance].sort((a, b) => a.sequence - b.sequence)

      // Genesis linking
      if (sortedProv[0].sequence === 0) {
        const genesisLinkOk = sortedProv[0].prevRecordHash === artKey.integrityHash
        if (!genesisLinkOk) {
          chainOk = false
          checks.push({
            label: 'genesis-link',
            pass: false,
            detail: `seq=0 prevRecordHash ≠ integrityHash`,
            category: 'CHAIN',
          })
        } else {
          checks.push({ label: 'genesis-link', pass: true, detail: 'seq=0 anchored to integrityHash', category: 'CHAIN' })
        }
      }

      // Verify each record: hash + signature + chain
      let prevRecordHash = sortedProv[0].recordHash
      for (let i = 0; i < sortedProv.length; i++) {
        const rec = sortedProv[i]

        // Recalculate recordHash
        const payload: ProvenancePayload = {
          artworkId: rec.artworkId,
          sequence: rec.sequence,
          eventType: rec.transferType,
          fromOwner: rec.fromUserId ?? null,
          toOwner: rec.toUserId,
          occurredAt: rec.occurredAt.toISOString(),
          prevRecordHash: rec.prevRecordHash ?? '',
        }
        const recalculatedHash = hashPayload(payload)
        const hashOk = recalculatedHash === rec.recordHash

        if (!hashOk) {
          chainOk = false
          checks.push({
            label: `seq-${rec.sequence}-hash`,
            pass: false,
            detail: `recordHash tampered — stored ${rec.recordHash.slice(0, 16)}… vs recalculated ${recalculatedHash.slice(0, 16)}…`,
            category: 'CHAIN',
          })
        }

        // Verify signature (if present)
        if (rec.signature && rec.signerPublicKey && this.signingService) {
          const sigResult = await this.signingService.verifyProvRecordSignature(
            payload,
            rec.signature,
            rec.signerPublicKey,
          )
          if (!sigResult.valid) {
            chainOk = false
            checks.push({
              label: `seq-${rec.sequence}-signature`,
              pass: false,
              detail: `Ed25519 signature invalid for ${rec.signerRole ?? 'unknown'} signer`,
              category: 'SIGNATURE',
            })
          } else {
            checks.push({
              label: `seq-${rec.sequence}-signature`,
              pass: true,
              detail: `Ed25519 signature verified (${rec.signerRole ?? 'unknown'})`,
              category: 'SIGNATURE',
            })
          }
        } else if (rec.signature) {
          chainOk = false
          checks.push({
            label: `seq-${rec.sequence}-signature`,
            pass: false,
            detail: 'Signature present but verifier unavailable — check offline with export',
            category: 'SIGNATURE',
          })
        }

        // Chain linking (skip seq 0 which is checked above)
        if (i > 0 && rec.prevRecordHash !== prevRecordHash) {
          chainOk = false
          checks.push({
            label: `seq-${rec.sequence}-link`,
            pass: false,
            detail: `Chain broken — expected ${prevRecordHash.slice(0, 16)}…, got ${rec.prevRecordHash?.slice(0, 16)}…`,
            category: 'CHAIN',
          })
        } else if (i > 0) {
          checks.push({
            label: `seq-${rec.sequence}-link`,
            pass: true,
            detail: `Chain linked to seq-${rec.sequence - 1}`,
            category: 'CHAIN',
          })
        }

        prevRecordHash = rec.recordHash
      }
    }

    // ── Layer C: Platform co-signature ──
    if (artKey.platformSignature && this.signingService) {
      // Use HISTORICAL platform key (by platformSigningKeyId), not current active key.
      // After rotation, current active key won't verify old signatures.
      let platformPublicKey: string | null = null
      if (artKey.platformSigningKeyId) {
        platformPublicKey = await this.signingService.getPublicKey(artKey.platformSigningKeyId)
      }
      // Fallback: records created before platformSigningKeyId existed
      if (!platformPublicKey) {
        const activeKey = await this.signingService.getPlatformActivePublicKey()
        platformPublicKey = activeKey?.publicKey ?? null
      }
      if (platformPublicKey && provenance.length > 0) {
        const genesisPayload = {
          artworkId: provenance[0].artworkId,
          sequence: 0,
          eventType: 'CREATION',
          fromOwner: provenance[0].fromUserId ?? null,
          toOwner: provenance[0].toUserId,
          occurredAt: provenance[0].occurredAt.toISOString(),
          prevRecordHash: artKey.integrityHash,
        }
        const platResult = await this.signingService.verifyProvRecordSignature(
          genesisPayload,
          artKey.platformSignature,
          platformPublicKey,
        )
        checks.push({
          label: 'platform-co-signature',
          pass: platResult.valid,
          detail: platResult.valid
            ? 'Platform co-signature valid — issued through DUO MESH'
            : 'Platform co-signature INVALID',
          category: 'SIGNATURE',
        })
        if (!platResult.valid) chainOk = false
      }
    }

    // ── Layer D: Timestamp ──
    if (artKey.timestampToken) {
      checks.push({
        label: 'rfc3161-timestamp',
        pass: true,
        detail: 'RFC 3161 timestamp token present — full cryptographic verification requires offline verifier',
        category: 'TIMESTAMP',
      })
    }

    const verified = integrityOk && chainOk && !artKey.revokedAt
    const sortedProv = [...provenance].sort((a, b) => a.sequence - b.sequence)
    const currentOwner = sortedProv.at(-1)?.toOwner.displayName ?? null

    return {
      artKey: {
        id: artKey.id,
        keyCode: artKey.keyCode,
        ownerKey: artKey.ownerKey,
        integrityHash: artKey.integrityHash,
        certificateHash: artKey.certificateHash,
        issuedAt: artKey.issuedAt.toISOString(),
        revokedAt: artKey.revokedAt?.toISOString() ?? null,
        timestampToken: artKey.timestampToken,
        platformSignature: artKey.platformSignature,
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
        signature: p.signature,
        signerPublicKey: p.signerPublicKey,
        signerRole: p.signerRole,
        createdAt: p.createdAt.toISOString(),
      })),
      verified,
      checks,
      currentOwner,
    }
  }
}
