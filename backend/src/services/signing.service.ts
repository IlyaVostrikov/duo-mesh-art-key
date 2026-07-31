import type { DbClient } from '../db'
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
    // 1. Ensure platform signing key exists
    const existing = await this.prisma.signingKey.findFirst({
      where: { ownerType: 'PLATFORM', isActive: true },
    })
    if (existing) {
      // On serverless (Vercel), the keystore file is empty after cold start.
      // Try to restore the private key from env var if missing.
      if (!(await this.keyStore.has(existing.id))) {
        const hex = process.env.PLATFORM_PRIVATE_KEY_HEX
        if (hex) {
          await this.keyStore.set(existing.id, hex)
          // Persist encrypted key in DB for future cold starts
          const entry = await this.keyStore.getEntry(existing.id)
          if (entry && !existing.encryptedPrivateKey) {
            await this.prisma.signingKey.update({
              where: { id: existing.id },
              data: { encryptedPrivateKey: entry },
            })
          }
        } else {
          console.warn(
            'Platform key exists in DB but private key is missing from keystore. ' +
            'Set PLATFORM_PRIVATE_KEY_HEX env var for serverless deployments.',
          )
        }
      }
    } else {
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
          data: { encryptedPrivateKey: entry },
        })
      }
    }

    // 2. Run migration: add encrypted_private_key column if missing
    try {
      await this.prisma.$executeRawUnsafe(
        `ALTER TABLE signing_keys ADD COLUMN IF NOT EXISTS encrypted_private_key JSONB`,
      )
    } catch { /* column may already exist from a prior run; ignore */ }

    // 3. Sync all keys from DB into the keystore (cold-start recovery)
    const dbKeys = await this.prisma.signingKey.findMany({
      where: { encryptedPrivateKey: { not: null } },
      select: { id: true, encryptedPrivateKey: true },
    })
    for (const dbKey of dbKeys) {
      if (!(await this.keyStore.has(dbKey.id))) {
        await this.keyStore.setEntry(dbKey.id, dbKey.encryptedPrivateKey as unknown as StoreEntry)
      }
    }

    // 4. Revoke active keys whose private key was lost (no encryptedPrivateKey in DB)
    await this.prisma.signingKey.updateMany({
      where: {
        isActive: true,
        encryptedPrivateKey: null,
        ownerType: { not: 'PLATFORM' },
      },
      data: { isActive: false, revokedAt: new Date() },
    })
  }

  /** Generate an Ed25519 keypair for an artist at onboarding. */
  async generateArtistKeyPair(
    artistId: string,
  ): Promise<{ keyId: string; publicKey: string }> {
    // Deactivate any existing active key
    await this.prisma.signingKey.updateMany({
      where: { ownerType: 'ARTIST', ownerId: artistId, isActive: true },
      data: { isActive: false, revokedAt: new Date() },
    })

    const kp = await generateEd25519KeyPair()
    const key = await this.prisma.signingKey.create({
      data: {
        ownerType: 'ARTIST',
        ownerId: artistId,
        publicKey: kp.publicKey,
        keyAlias: `Artist key — ${artistId}`,
      },
    })
    await this.keyStore.set(key.id, kp.privateKey)

    // Persist encrypted key in DB so it survives Vercel cold starts
    const entry = await this.keyStore.getEntry(key.id)
    if (entry) {
      await this.prisma.signingKey.update({
        where: { id: key.id },
        data: { encryptedPrivateKey: entry },
      })
    }

    return { keyId: key.id, publicKey: kp.publicKey }
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
