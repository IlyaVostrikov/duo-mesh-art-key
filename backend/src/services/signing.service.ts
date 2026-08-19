import type { DbClient } from '../db'
import type { Prisma } from '../generated/prisma/client'
import {
  generateEd25519KeyPair,
  signPayload,
  verifyProvenanceSignature,
  KeyStore,
} from '../crypto'
import type { StoreEntry } from '../crypto/keystore'

export interface ProvenancePayload {
  artworkId: string
  sequence: number
  eventType: string
  fromOwner: string | null
  toOwner: string
  occurredAt: string
  prevRecordHash: string
  [key: string]: unknown
}

export class SigningService {
  constructor(
    private prisma: DbClient,
    private keyStore: KeyStore,
  ) {}

  /** Ensure platform key exists and sync all keys from DB on cold start. */
  async ensureKeys(): Promise<void> {
    // 1. Run migration FIRST — Prisma schema expects encrypted_private_key column,
    //    so any query on signing_keys will fail until the column exists.
    try {
      await this.prisma.$executeRawUnsafe(
        `ALTER TABLE signing_keys ADD COLUMN IF NOT EXISTS encrypted_private_key JSONB`,
      )
    } catch { /* column may already exist from a prior run; ignore */ }

    // 2. Ensure platform signing key exists
    const existing = await this.prisma.signingKey.findFirst({
      where: { ownerType: 'PLATFORM', isActive: true },
    })
    // Determine whether we need to create a new platform key
    let mustCreatePlatformKey = false

    if (existing) {
      if (await this.keyStore.has(existing.id)) {
        // Key already in keystore — all good
      } else if (process.env.PLATFORM_PRIVATE_KEY_HEX) {
        // Recover from env var, persist encrypted form for future cold starts
        await this.keyStore.set(existing.id, process.env.PLATFORM_PRIVATE_KEY_HEX)
        const entry = await this.keyStore.getEntry(existing.id)
        if (entry && !existing.encryptedPrivateKey) {
          await this.prisma.signingKey.update({
            where: { id: existing.id },
            data: { encryptedPrivateKey: entry as unknown as Prisma.InputJsonValue },
          })
        }
      } else if (existing.encryptedPrivateKey) {
        // Recover from DB-encrypted key (cold start without env var)
        await this.keyStore.setEntry(existing.id, existing.encryptedPrivateKey as unknown as StoreEntry)
      } else {
        // Private key lost — deactivate old key and create new one
        console.warn(
          'Platform key exists but private key is unrecoverable. ' +
          'Deactivating old key and generating a new one.',
        )
        await this.prisma.signingKey.update({
          where: { id: existing.id },
          data: { isActive: false, revokedAt: new Date() },
        })
        mustCreatePlatformKey = true
      }
    } else {
      mustCreatePlatformKey = true
    }

    if (mustCreatePlatformKey) {
      const kp = await generateEd25519KeyPair()
      const key = await this.prisma.signingKey.create({
        data: {
          ownerType: 'PLATFORM',
          publicKey: kp.publicKey,
          keyAlias: 'DUO MESH Platform Key',
        },
      })
      await this.keyStore.set(key.id, kp.privateKey)
      const entry = await this.keyStore.getEntry(key.id)
      if (entry) {
        await this.prisma.signingKey.update({
          where: { id: key.id },
          data: { encryptedPrivateKey: entry as unknown as Prisma.InputJsonValue },
        })
      }
    }

    // 3. Sync all keys from DB into the keystore (cold-start recovery)
    const dbKeys = await this.prisma.signingKey.findMany({
      select: { id: true, encryptedPrivateKey: true },
    })
    for (const dbKey of dbKeys) {
      if (dbKey.encryptedPrivateKey != null && !(await this.keyStore.has(dbKey.id))) {
        await this.keyStore.setEntry(dbKey.id, dbKey.encryptedPrivateKey as unknown as StoreEntry)
      }
    }

    // 4. Revoke active keys whose private key was lost (no encryptedPrivateKey in DB)
    //    Uses raw SQL because Prisma JSONB columns don't accept plain `null` in filters.
    await this.prisma.$executeRawUnsafe(
      `UPDATE signing_keys SET is_active = false, revoked_at = NOW() WHERE is_active = true AND encrypted_private_key IS NULL AND owner_type != 'PLATFORM'`,
    )

    // Warm the PBKDF2 key derivation now (outside any transaction) so the first
    // getOrCreateArtistKey doesn't hold the artist row lock (FOR UPDATE) for the
    // ~600k-iteration CPU-bound KDF. Best-effort: a missing salt surfaces the
    // real error on first sign instead of aborting startup.
    try {
      await this.keyStore.warmKey()
    } catch { /* ignore — see above */ }
  }

  /**
   * Create and persist an artist key WITHOUT retiring any existing key.
   * Used by the first-use path, where there is by definition no old key to
   * retire. Deliberately does not deactivate anything: a concurrent first-use
   * (e.g. two artworks bulk-uploaded for the same new artist) that also creates
   * a key would otherwise have its deactivation step kill the concurrent
   * winner, leaving the artist with zero active keys.
   */
  private async createArtistKey(
    artistId: string,
    client: Pick<DbClient, 'signingKey'> = this.prisma,
  ): Promise<{ keyId: string; publicKey: string }> {
    const kp = await generateEd25519KeyPair()
    const key = await client.signingKey.create({
      data: {
        ownerType: 'ARTIST',
        ownerId: artistId,
        publicKey: kp.publicKey,
        keyAlias: `Artist key — ${artistId}`,
      },
    })
    // The keystore is a file, outside the DB transaction. If the enclosing
    // transaction later rolls back, this leaves an inert orphan entry (a keyId
    // with no signing_keys row) that is never read again. A compensating delete
    // would itself be racy, so orphans are tolerated and pruned by a separate
    // manual cleanup (no automated reconciler exists today).
    await this.keyStore.set(key.id, kp.privateKey)

    // Persist encrypted key in DB so it survives Vercel cold starts
    const entry = await this.keyStore.getEntry(key.id)
    if (entry) {
      await client.signingKey.update({
        where: { id: key.id },
        data: { encryptedPrivateKey: entry as unknown as Prisma.InputJsonValue },
      })
    }

    return { keyId: key.id, publicKey: kp.publicKey }
  }

  /**
   * Return the artist's active key, creating one on first use. Never retires an
   * existing key, so it is safe for concurrent first-use (see createArtistKey).
   *
   * The row lock on the parent artist serializes concurrent first-use: two
   * bulk-uploaded artworks for the same brand-new artist can no longer each
   * mint an active key, which would otherwise leave multiple active keys.
   */
  async getOrCreateArtistKey(
    artistId: string,
  ): Promise<{ keyId: string; publicKey: string }> {
    return this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT "id" FROM "artists" WHERE "id" = ${artistId}::uuid FOR UPDATE`
      const existing = await tx.signingKey.findFirst({
        where: { ownerType: 'ARTIST', ownerId: artistId, isActive: true },
        orderBy: { createdAt: 'desc' },
      })
      if (existing) return { keyId: existing.id, publicKey: existing.publicKey }
      return this.createArtistKey(artistId, tx)
    })
  }

  /** Generate a new artist key and retire the old one (key rotation). */
  async generateArtistKeyPair(
    artistId: string,
  ): Promise<{ keyId: string; publicKey: string }> {
    return this.prisma.$transaction(async (tx) => {
      // Serialize rotation with first-use (getOrCreateArtistKey) and with
      // concurrent rotations via the same artist row lock: without it, two
      // racing rotations can interleave create/deactivate and leave the artist
      // with zero active keys.
      await tx.$queryRaw`SELECT "id" FROM "artists" WHERE "id" = ${artistId}::uuid FOR UPDATE`

      // Create the new key FIRST — if generation or persistence fails, the old key
      // remains active (no gap where the artist has zero active keys).
      const created = await this.createArtistKey(artistId, tx)

      // Deactivate old keys LAST — only after the new one is fully persisted.
      // If anything above throws, the artist still has their previous active key.
      await tx.signingKey.updateMany({
        where: { ownerType: 'ARTIST', ownerId: artistId, isActive: true, id: { not: created.keyId } },
        data: { isActive: false, revokedAt: new Date() },
      })

      return created
    })
  }

  /** Get all signing keys for an artist. */
  async getArtistKeys(artistId: string) {
    return this.prisma.signingKey.findMany({
      where: { ownerType: 'ARTIST', ownerId: artistId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        publicKey: true,
        keyAlias: true,
        isActive: true,
        createdAt: true,
        revokedAt: true,
      },
    })
  }

  /** Get the active public key for an artist. */
  async getArtistActivePublicKey(
    artistId: string,
  ): Promise<{ keyId: string; publicKey: string } | null> {
    const key = await this.prisma.signingKey.findFirst({
      where: { ownerType: 'ARTIST', ownerId: artistId, isActive: true },
      orderBy: { createdAt: 'desc' },
    })
    if (!key) return null
    return { keyId: key.id, publicKey: key.publicKey }
  }

  /** Get the active platform public key. */
  async getPlatformActivePublicKey(): Promise<{
    keyId: string
    publicKey: string
  } | null> {
    const key = await this.prisma.signingKey.findFirst({
      where: { ownerType: 'PLATFORM', isActive: true },
      orderBy: { createdAt: 'desc' },
    })
    if (!key) return null
    return { keyId: key.id, publicKey: key.publicKey }
  }

  /** Get a public key by its ID. */
  async getPublicKey(keyId: string): Promise<string | null> {
    const key = await this.prisma.signingKey.findUnique({
      where: { id: keyId },
    })
    return key?.publicKey ?? null
  }

  /**
   * Sign a provenance record payload.
   * Returns the recordHash, signature, and the signer's public key
   * (so the verifier doesn't need to look it up).
   */
  async signProvRecord(
    payload: ProvenancePayload,
    signerKeyId: string,
    signerRole: 'ARTIST' | 'PLATFORM',
  ): Promise<{
    recordHash: string
    signature: string
    signerPublicKey: string
  }> {
    const privateKey = await this.keyStore.get(signerKeyId)
    if (!privateKey) throw new Error(`Private key ${signerKeyId} not found in keystore`)
    const publicKey = await this.getPublicKey(signerKeyId)
    if (!publicKey) throw new Error(`Signing key ${signerKeyId} not found in DB`)

    const { recordHash, signature } = await signPayload(privateKey, payload)
    return { recordHash, signature, signerPublicKey: publicKey }
  }

  /** Verify a provenance record signature (for online verification). */
  async verifyProvRecordSignature(
    payload: Record<string, unknown>,
    signatureHex: string,
    publicKeyHex: string,
  ): Promise<{ recordHash: string; valid: boolean }> {
    return verifyProvenanceSignature(payload, signatureHex, publicKeyHex)
  }

  /** Rotate an artist's signing key. Old key is deactivated, new one created. */
  async rotateArtistKey(
    artistId: string,
  ): Promise<{ keyId: string; publicKey: string }> {
    return this.generateArtistKeyPair(artistId)
  }

  /** Revoke a signing key by ID. */
  async revokeKey(keyId: string): Promise<void> {
    await this.prisma.signingKey.update({
      where: { id: keyId },
      data: { isActive: false, revokedAt: new Date() },
    })
  }
}
