import { Hono } from 'hono'
import { ArtKeyService } from '../services/art-key.service'
import { SigningService } from '../services/signing.service'
import { generateCertificatePdf } from '../services/certificate-pdf'
import { authGuard, requireRole } from '../guards/auth'
import type { DbClient } from '../db'
import { TransparencyLogService } from '../services/transparency-log.service'

type ArtKeyRouteEnv = {
  Variables: {
    artKeyService: ArtKeyService
    signingService: SigningService
    prisma: DbClient
  }
}

export function createArtKeyRoutes() {
  const routes = new Hono<ArtKeyRouteEnv>()

  // Public: download PDF certificate
  routes.get('/:keyCode/certificate.pdf', async (c) => {
    const svc = c.get('artKeyService')
    const result = await svc.verify(c.req.param('keyCode'))
    if (!result) return c.json({ error: 'NOT_FOUND', message: 'ArtKey not found' }, 404)

    try {
      const pdf = await generateCertificatePdf({
        ...result,
        artist: { displayName: result.artist.displayName ?? 'Unknown Artist' },
      })
      return new Response(pdf, {
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename="artkey-${result.artKey.keyCode}.pdf"`,
        },
      })
    } catch (err) {
      console.error('PDF generation failed:', err)
      return c.json({ error: 'PDF_GENERATION_FAILED', message: 'Could not generate certificate' }, 500)
    }
  })

  // Public: export signed provenance for offline verification
  routes.get('/:keyCode/export', async (c) => {
    const svc = c.get('artKeyService')
    const signingSvc = c.get('signingService')

    const result = await svc.verify(c.req.param('keyCode'))
    if (!result) return c.json({ error: 'NOT_FOUND', message: 'ArtKey not found' }, 404)

    // Get public keys for the export
    const artistKey = await signingSvc.getArtistActivePublicKey(result.artist.id)
    const platformKey = await signingSvc.getPlatformActivePublicKey()

    // Build provenance entries: actual chain records + platform co-signature if present
    const provenanceEntries = result.provenance.map((p) => ({
      payload: {
        artworkId: result.artwork.id,
        sequence: p.sequence,
        eventType: p.transferType,
        fromOwner: p.fromOwnerName,
        toOwner: p.toOwnerName,
        occurredAt: p.createdAt,
        prevRecordHash: p.prevRecordHash ?? '',
      },
      recordHash: p.recordHash,
      signature: p.signature,
      signerPublicKey: p.signerPublicKey,
      signerRole: p.signerRole,
    }))

    // If platform co-signature exists and isn't already in provenance, add it
    if (result.artKey.platformSignature && platformKey && !provenanceEntries.some((e) => e.signerRole === 'PLATFORM')) {
      const genesisEntry = provenanceEntries[0]
      if (genesisEntry) {
        provenanceEntries.splice(1, 0, {
          payload: { ...genesisEntry.payload },
          recordHash: genesisEntry.recordHash,
          signature: result.artKey.platformSignature,
          signerPublicKey: platformKey.publicKey,
          signerRole: 'PLATFORM',
        })
      }
    }

    const exportData = {
      version: '1.0.0',
      exportedAt: new Date().toISOString(),
      artKey: {
        keyCode: result.artKey.keyCode,
        integrityHash: result.artKey.integrityHash,
        timestampToken: result.artKey.timestampToken ?? null,
        platformSignature: result.artKey.platformSignature ?? null,
      },
      artist: {
        id: result.artist.id,
        displayName: result.artist.displayName,
        publicKey: artistKey?.publicKey ?? null,
      },
      platform: {
        publicKey: platformKey?.publicKey ?? null,
      },
      provenance: provenanceEntries,
      verificationHints: {
        canonicalization: 'Keys sorted alphabetically, JSON.stringify without whitespace',
        hashing: 'SHA-256 of canonical JSON',
        signature: 'Ed25519 (RFC 8032) over SHA-256 hash',
      },
    }

    return c.json(exportData)
  })

  // Admin: revoke an ArtKey
  routes.post('/:keyCode/revoke', authGuard(), requireRole('ADMIN'), async (c) => {
    const prisma = c.get('prisma')

    const artKey = await prisma.artKey.findUnique({
      where: { keyCode: c.req.param('keyCode') },
    })
    if (!artKey) return c.json({ error: 'NOT_FOUND', message: 'ArtKey not found' }, 404)
    if (artKey.revokedAt) {
      return c.json({ error: 'ALREADY_REVOKED', message: 'ArtKey is already revoked' }, 409)
    }

    const revoked = await prisma.artKey.update({
      where: { id: artKey.id },
      data: { revokedAt: new Date() },
    })

    // Append to transparency log
    const tls = new TransparencyLogService(prisma)
    await tls.append({
      artKeyId: artKey.id,
      entryType: 'ARTKEY_REVOKED',
      payload: {
        keyCode: artKey.keyCode,
        revokedAt: revoked.revokedAt!.toISOString(),
      },
    })

    return c.json({
      keyCode: revoked.keyCode,
      revokedAt: revoked.revokedAt?.toISOString() ?? null,
    })
  })

  // Public: verify an ArtKey by keyCode
  routes.get('/:keyCode', async (c) => {
    const svc = c.get('artKeyService')
    const result = await svc.verify(c.req.param('keyCode'))
    if (!result) return c.json({ error: 'NOT_FOUND', message: 'ArtKey not found' }, 404)
    return c.json(result)
  })

  return routes
}
