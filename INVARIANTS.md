# DUO MESH ArtKey Invariants

> Authoritative source of all invariants for the DUO MESH ArtKey provenance system.
> Graphify treats this file as a concept node and links each invariant to its implementing code.
> Query: `python -m graphify explain "DUO MESH ArtKey Invariants"` — returns the rules + files.

Context: DUO MESH is a digital art gallery. Each artwork carries an **ArtKey certificate** backed by a SHA-256 provenance hash-chain and Ed25519 signatures. The canonical spec is `docs/PROVENANCE_SPEC.md` (v1.0.0).

---

## 1. Canonical JSON (RFC 8785 / JCS-style)
- **Implements:** `backend/src/crypto/canonical.ts` (`canonicalJSON`, recursive key sort)
- **Duplicated in:** `packages/verifier/src/verify.ts` (`canonicalize`) — MUST stay byte-identical
- **Tests:** `backend/src/crypto/tamper.test.ts`
- **Rule:** Keys sorted alphabetically (case-sensitive, UTF-8 byte order) at every nesting level; `JSON.stringify` with no whitespace, no trailing commas. Any change to one canonicalizer must be mirrored in the other, or offline verification will reject genuine certificates.

## 2. SHA-256 hashing
- **Implements (backend):** `backend/src/crypto/hash.ts` (`sha256Hex` via `Bun.CryptoHasher`)
- **Implements (verifier):** `packages/verifier/src/verify.ts` (`sha256Hex` via `crypto.subtle.digest`)
- **Rule:** Provenance hashes are SHA-256 hex, lowercase, 64 chars. There are two implementations (Bun-only backend vs cross-platform WebCrypto verifier) — they must produce identical output for the same input.

## 3. integrityHash = composite file fingerprint
- **Implements:** `backend/src/crypto/hash.ts` (`compositeFileHash`)
- **Rule:** The certificate's `integrityHash` is SHA-256 over the concatenation of per-file hashes, sorted by filename. It fingerprints the artwork's files, not the record metadata. It is only meaningful when the verifier has access to the original files.

## 4. Ed25519 key formats
- **Implements:** `backend/src/crypto/keys.ts` (`generateEd25519KeyPair`, `importPublicKey`, `importPrivateKey`)
- **Rule:** Public key = raw 32 bytes (64 hex chars); private key = PKCS#8 DER 48 bytes (96 hex chars); signature = 64 bytes (128 hex chars). Bun WebCrypto cannot `raw`-export Ed25519 private keys, so storage always uses `pkcs8`.

## 5. Signing over the SHA-256 digest
- **Implements:** `backend/src/crypto/sign.ts` (`signDigest`, `signPayload`)
- **Rule:** Sign the SHA-256 hex digest of the canonical payload — never the raw payload. `signPayload` = `hashPayload` then `signDigest`.

## 6. Hash-chain continuity
- **Implements:** `docs/PROVENANCE_SPEC.md` (Hash Chain) + `packages/verifier/src/verify.ts` (CHAIN check)
- **Rule:** `recordHash = SHA-256(canonicalJSON(payload))`; `prevRecordHash` = the previous record's `recordHash`; the genesis record has `prevRecordHash` = 64 zero chars (32 zero bytes). Co-signatures share the `prevRecordHash` of the record they endorse and do not advance the chain.

## 7. Platform co-signature is the root of trust
- **Implements:** `packages/verifier/src/verify.ts` (`DUO_MESH_PLATFORM_PUBKEY`, pinned)
- **Rule:** At least one provenance record must carry `signerRole: 'PLATFORM'` with a valid Ed25519 signature over its `recordHash`, verified against the **pinned** `DUO_MESH_PLATFORM_PUBKEY`. The export's `platform.publicKey` field is informational and MUST NOT be used for verification.

## 8. Custodial key storage (AES-256-GCM + PBKDF2)
- **Implements:** `backend/src/crypto/keystore.ts` (`KeyStore`, `deriveKey`)
- **Rule:** Private keys are encrypted at rest (custodial MVP model). Encryption key = PBKDF2(SECRET_STORE_KEY, salt, 600_000 iter, SHA-256); the salt lives in `<storePath>.salt`; ciphertext + IV are base64.
- **⚠ KNOWN DEVIATION:** `backend/data/keystore.json` is still encrypted with the OLD SHA-256 KDF (migration to PBKDF2 incomplete). `KeyStore.get()` on the active PLATFORM key fails → `POST /artworks` 500. Fix by completing `scripts/migrate-kdf.ts` (also broken under Prisma 7.8 — needs `createPrisma()` from `src/db.ts`).

## 9. RFC 3161 timestamp (MVP)
- **Implements:** `backend/src/crypto/timestamp.ts` (`requestTimestamp`, `buildTimeStampReq`)
- **Rule:** The genesis hash gets a TimeStampToken from an independent TSA. **Gap:** `verifyTimestampToken` is not implemented (throws) — timestamp *existence* is claimed, offline *verification* is roadmap.

## 10. Provenance record contract
- **Implements:** `packages/contracts/src/art-keys.ts` (`provenanceRecordSchema`)
- **Rule:** `sequence` is a monotonic integer; `transferType` is a closed enum (`CREATION | PRIMARY_SALE | SECONDARY_SALE | GIFT | INHERITANCE | TRANSFER`); `prevRecordHash` is nullable only for the genesis record; `recordHash` is required.

## 11. ArtKey contract
- **Implements:** `packages/contracts/src/art-keys.ts` (`artKeySchema`, `artKeyVerificationSchema`)
- **Rule:** An ArtKey carries `integrityHash` (required), `timestampToken` (nullable), `platformSignature` (nullable), `issuedAt`, `revokedAt`. Verification returns `provenance[]` + `verified` + `currentOwner`.

## 12. Verification status semantics
- **Implements:** `packages/verifier/src/verify.ts` (`verifySignedExport`)
- **Rule:** Status is `valid` only when structural checks (INTEGRITY + CHAIN) AND crypto checks (all signatures + platform co-signature) AND `hasRequiredSigs` all pass. Empty provenance → `indeterminate`; unknown version → `unsupported-version`; otherwise `invalid`.

## 13. Trust-model boundaries
- **Implements:** `docs/PROVENANCE_SPEC.md` (Trust Model)
- **Rule:** Mathematically proven (zero trust): hash integrity, signature validity, chain continuity, timestamp existence. Requires trust via platform co-signature: issuance through DUO MESH, artist public-key ownership, key custody. NOT claimed: physical authenticity, post-hash tamper-proofing, file↔hash binding without the file, legal ownership.

---

## Load-Bearing Files (DO NOT BREAK)

Highest in-degree files in the dependency graph. Query the graph before changing any of them.

| # | File | Role | Query before changing |
|---|------|------|-----------------------|
| 1 | `backend/src/app.ts` | Hono app factory, wire-up of all routes | `python -m graphify explain "app.ts"` |
| 2 | `backend/src/http/errors.ts` | `AppError`, error responses | `python -m graphify explain "errors.ts"` |
| 3 | `backend/src/db.ts` | Prisma client | `python -m graphify explain "db.ts"` |
| 4 | `backend/src/env.ts` | Runtime config (Zod) | `python -m graphify explain "env.ts"` |
| 5 | `packages/contracts/src/index.ts` | Re-exports all Zod contracts | `python -m graphify explain "index.ts"` |
| 6 | `packages/verifier/src/verify.ts` | Offline provenance verification | `python -m graphify explain "verify.ts"` |
| 7 | `backend/src/crypto/keystore.ts` | Custodial key encryption | `python -m graphify explain "keystore.ts"` |
| 8 | `backend/src/crypto/canonical.ts` | Canonical JSON | `python -m graphify explain "canonical.ts"` |

## Known documentation gaps

- No map of which Prisma migration created which provenance constraint (`add_occurred_at` / `add_provenance_unique_constraint` are missing from `backend/prisma/migrations`).
- No ADR/CHANGELOG tracking the KDF migration decision (SHA-256 → PBKDF2).
- No contract spec per signing role (ARTIST vs PLATFORM vs REGISTRY) — note `REGISTRY` exists in data but not in the Prisma enum.
- The verifier duplicates canonicalization + SHA-256; there is no shared package to prevent drift.
