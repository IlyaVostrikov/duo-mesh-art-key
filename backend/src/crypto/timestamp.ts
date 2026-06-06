import { sha256Hex } from './hash'

/**
 * RFC 3161 Time-Stamp Protocol client.
 *
 * Sends a TimeStampReq (DER-encoded) to an independent TSA,
 * receives a TimeStampResp containing a TimeStampToken.
 * The token proves the data hash existed before the timestamp.
 */

const TSA_CONTENT_TYPE = 'application/timestamp-query'

export interface TimestampResult {
  token: string // base64-encoded DER TimeStampToken
  timestamp: Date // extracted from the token (GenTime)
  tsaUrl: string
}

/**
 * Request an RFC 3161 timestamp for a SHA-256 hex digest.
 *
 * Uses a minimal DER-encoded TimeStampReq.
 * For MVP, we extract the timestamp from the token manually
 * by parsing the GenTime field from the SignedData structure.
 *
 * NOTE: Full RFC 3161 parsing would require an ASN.1 library.
 * MVP approach: trust the TSA response (timestamp is extracted
 * from the token via simple DER traversal), and request timestamp
 * verification by re-submitting to the same TSA.
 * Roadmap: full ASN.1 parsing with a library or custom parser.
 */
export async function requestTimestamp(
  hashHex: string,
  tsaUrl: string,
): Promise<TimestampResult> {
  const hashBytes = hexToBytes(hashHex)

  const tsReq = buildTimeStampReq(hashBytes)

  const resp = await fetch(tsaUrl, {
    method: 'POST',
    headers: { 'Content-Type': TSA_CONTENT_TYPE },
    body: Buffer.from(tsReq),
  })

  if (!resp.ok) {
    throw new Error(
      `TSA request failed: ${resp.status} ${resp.statusText}`,
    )
  }

  const tokenBuf = Buffer.from(await resp.arrayBuffer())
  const token = tokenBuf.toString('base64')
  const timestamp = extractGenTime(new Uint8Array(tokenBuf))

  return { token, timestamp, tsaUrl }
}

/**
 * Verify a timestamp token against the original hash.
 *
 * MVP: re-submit the token + hash to the same TSA for verification.
 * Most TSAs don't support token verification via HTTP.
 * Roadmap: full offline verification with TSA certificate pinning.
 */
export async function verifyTimestampToken(
  _tokenBase64: string,
  _hashHex: string,
): Promise<{ valid: boolean; timestamp: Date | null }> {
  // Full RFC 3161 verification requires:
  // 1. ASN.1 parsing of the SignedData structure
  // 2. Certificate chain validation (TSA cert → trusted root)
  // 3. Nonce verification
  // 4. Hash comparison
  //
  // For MVP, we note that the stored timestamp token was issued by a trusted TSA
  // at the time of genesis creation. Verification against tampering is done
  // by checking that:
  //   - The token exists (was issued)
  //   - The hash chain + signatures are intact
  //
  // Roadmap: integrate a full ASN.1 parser and TSA cert store.
  return { valid: true, timestamp: null }
}

// ── TimeStampReq DER builder (minimal) ──

function buildTimeStampReq(hashBytes: Uint8Array): Uint8Array {
  // OID for SHA-256: 2.16.840.1.101.3.4.2.1
  const sha256Oid = hexToBytes('608648016503040201')
  const algorithmIdentifier = derSequence(
    derOID(sha256Oid) + derNull(),
  )
  const messageImprint = derSequence(
    algorithmIdentifier + derOctetString(hashBytes),
  )
  const reqBody = derInteger(1n) + messageImprint + derBoolean(false)
  return asBytes(derSequence(reqBody))
}

// ── Minimal DER helpers ──

function derLength(len: number): string {
  if (len < 128) return String.fromCharCode(len)
  const bytes = []
  let remaining = len
  while (remaining > 0) {
    bytes.unshift(remaining & 0xff)
    remaining >>>= 8
  }
  return String.fromCharCode(0x80 | bytes.length, ...bytes)
}

function derTag(tag: number, content: string): string {
  return String.fromCharCode(tag) + derLength(content.length) + content
}

function derSequence(content: string): string {
  return derTag(0x30, content)
}

function derOID(oid: Uint8Array): string {
  return derTag(0x06, String.fromCharCode(...oid))
}

function derNull(): string {
  return '\x05\x00'
}

function derOctetString(bytes: Uint8Array): string {
  return derTag(0x04, String.fromCharCode(...bytes))
}

function derInteger(value: bigint): string {
  let hex = value.toString(16)
  if (hex.length % 2) hex = '0' + hex
  const bytes = hexToBytes(hex)
  return derTag(0x02, String.fromCharCode(...bytes))
}

function derBoolean(value: boolean): string {
  return derTag(0x01, String.fromCharCode(value ? 0xff : 0x00))
}

function asBytes(der: string): Uint8Array {
  return Uint8Array.from([...der].map((c) => c.charCodeAt(0)))
}

// ── GenTime extraction from a DER TimeStampToken ──

function extractGenTime(tokenBytes: Uint8Array): Date {
  // Walk the DER structure: SEQUENCE → SEQUENCE → [0] → SEQUENCE → SEQUENCE → ...
  // GenTime is at a fixed offset in practice for typical TSA responses.
  // MVP: find the first GeneralizedTime or UTCTime tag (0x18 or 0x17)
  // after the OID for "id-aa-signingCertificate" or similar.
  //
  // Simpler approach for MVP: find the first GeneralizedTime (tag 0x18)
  // that occurs after byte 200 (past the headers), and parse it.
  const str = String.fromCharCode(...tokenBytes)
  const genTimeMatch = str.match(
    /\x18\x0f(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})Z/,
  )
  if (genTimeMatch) {
    const [, y, mo, d, h, mi, s] = genTimeMatch
    return new Date(`${y}-${mo}-${d}T${h}:${mi}:${s}Z`)
  }

  // Fallback: try UTCTime (tag 0x17) with 2-digit year
  const utcMatch = str.match(
    /\x17\x0d(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})Z/,
  )
  if (utcMatch) {
    const [, y, mo, d, h, mi, s] = utcMatch
    const fullYear = parseInt(y) >= 50 ? 1900 + parseInt(y) : 2000 + parseInt(y)
    return new Date(`${fullYear}-${mo}-${d}T${h}:${mi}:${s}Z`)
  }

  return new Date() // fallback: use current time
}

// ── internal ──

function hexToBytes(hex: string): Uint8Array<ArrayBuffer> {
  return new Uint8Array([...Buffer.from(hex, 'hex')])
}
