import { canonicalJSON } from './canonical'

/** SHA-256 hex digest of a string or buffer. */
export function sha256Hex(data: string | Uint8Array): string {
  const hasher = new Bun.CryptoHasher('sha256')
  hasher.update(data)
  return hasher.digest('hex') as string
}

/** SHA-256 hex digest of file content at the given path. */
export async function sha256File(filePath: string): Promise<string> {
  const buffer = await Bun.file(filePath).arrayBuffer()
  return sha256Hex(new Uint8Array(buffer))
}

/**
 * Composite hash of multiple file hashes.
 * Sorts by filename, concatenates hex hashes, SHA-256 the result.
 * This becomes the new integrityHash — a fingerprint of all artwork files.
 */
export function compositeFileHash(fileHashes: Record<string, string>): string {
  const sorted = Object.keys(fileHashes).sort()
  const concatenated = sorted.map((k) => fileHashes[k]).join('')
  return sha256Hex(concatenated)
}

/** SHA-256 hex of a provenance payload (canonical JSON). */
export function hashPayload(payload: Record<string, unknown>): string {
  return sha256Hex(canonicalJSON(payload))
}
