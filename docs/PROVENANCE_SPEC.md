# ArtKey Provenance Specification v1.0.0

## Canonical JSON

Provenance payloads are canonicalized before hashing:

1. Sort keys alphabetically (case-sensitive, UTF-8 byte order)
2. `JSON.stringify` without whitespace (no indentation, no space after separators)
3. No trailing commas, no non-standard JSON extensions

Example:

```json
{"artworkId":"aw_001","eventType":"GENESIS","fromOwner":null,"occurredAt":"2026-06-06T12:00:00Z","prevRecordHash":"0000000000000000000000000000000000000000000000000000000000000000","sequence":1,"toOwner":"artist_001"}
```

## Hashing

- Algorithm: SHA-256 (FIPS 180-4)
- Input: canonical JSON string (UTF-8 encoded)
- Output: hex-encoded (lowercase), 64 characters

## Ed25519 Signatures

- Algorithm: Ed25519 (RFC 8032)
- Public key format: raw 32 bytes, hex-encoded (64 characters)
- Private key format: PKCS#8 (48 bytes for Ed25519), hex-encoded
- Signature format: 64 bytes, hex-encoded (128 characters)

Signing process:
1. Hash payload → SHA-256 hex digest
2. Sign digest with Ed25519 private key → 64-byte signature
3. Store signature as hex

Verification process:
1. Hash payload → SHA-256 hex digest
2. Verify Ed25519 signature over digest using public key

## Hash Chain

Each provenance record links to the previous one:

- `recordHash` = SHA-256(canonicalJSON(payload))
- `prevRecordHash` = previous record's `recordHash`
- Genesis record: `prevRecordHash` = 64 zero characters (representing 32 zero bytes)

## Export Format

The signed export is a JSON object:

```jsonc
{
  "version": "1.0.0",
  "exportedAt": "2026-06-06T12:00:00Z",
  "artKey": {
    "keyCode": "KC001",
    "integrityHash": "sha256...",
    "timestampToken": null,
    "platformSignature": null
  },
  "artist": {
    "id": "artist_001",
    "displayName": "Jane Doe",
    "publicKey": "hex..."
  },
  "platform": {
    "publicKey": "hex..."
  },
  "provenance": [
    {
      "payload": { /* canonical provenance fields */ },
      "recordHash": "sha256...",
      "signature": "hex..." | null,
      "signerPublicKey": "hex..." | null,
      "signerRole": "ARTIST" | "PLATFORM" | null
    }
  ],
  "verificationHints": {
    "canonicalization": "...",
    "hashing": "...",
    "signature": "..."
  }
}
```

## Verification Algorithm

1. Parse export JSON
2. For each provenance record:
   a. Build canonical JSON from `payload`
   b. Compute `expectedHash = SHA-256(canonicalJSON)`
   c. Assert `expectedHash == recordHash` (INTEGRITY check)
   d. If `signature` and `signerPublicKey` are present:
      - Verify Ed25519 signature over `recordHash` (SIGNATURE check)
   e. If `sequence > 1`:
      - Assert `payload.prevRecordHash == previous.recordHash` (CHAIN check)
3. Assert at least one record has `signerRole: PLATFORM` with a valid signature

## Trust Model

### What is MATHEMATICALLY PROVEN (requires zero trust)
- Hash integrity: the payload matches its SHA-256 hash
- Signature validity: the Ed25519 signature is valid for the given public key and hash
- Chain continuity: each record's prevRecordHash links to the previous recordHash
- Timestamp existence: an RFC 3161 token was issued by a TSA for the genesis hash

### What requires TRUST in DUO MESH (via platform co-signature)
- The artwork was issued through the DUO MESH platform
- The artist's public key belongs to the named artist
- At genesis time, the artist (or their delegate) controlled the private key
- The platform key has not been compromised
- MVP note: private keys are stored encrypted on the server (custodial model)

### What is NOT CLAIMED
- The physical artwork is authentic or valuable
- The artwork has not been tampered with since hashing
- The hash corresponds to a specific physical file (verification requires the file)
- Legal ownership or copyright transfer
