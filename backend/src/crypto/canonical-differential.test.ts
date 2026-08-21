import { describe, expect, test } from 'bun:test'
import { canonicalJSON as backendCanonicalJSON } from './canonical'
import { sha256Hex as backendSha256Hex } from './hash'
import { canonicalJSON as verifierCanonicalJSON, sha256Hex as verifierSha256Hex } from '@duo-mesh/verifier'

// The backend and the offline verifier must canonicalize and hash byte-identically
// (INVARIANTS.md). A silent drift here breaks offline verification with no explicit error.
const trickyInputs: Array<[string, unknown]> = [
  ['flat object, shuffled keys', { z: 1, a: 2, m: 3 }],
  ['nested objects', { nested: { b: 1, a: { y: 2, x: 1 } } }],
  ['array of primitives', [3, 1, 2]],
  ['array of objects', [{ c: 3, a: 1 }, { b: 2 }]],
  ['unicode keys and values', { 'ключ-с-дефисом': 'значение', 'ключ': 'значение2' }],
  ['numeric edges', { int: 9007199254740991, neg: -0, float: 1.5, zero: 0 }],
  ['null and empty string', { empty: {}, nil: null, str: '' }],
  ['booleans', { t: true, f: false }],
  ['undefined value inside object', { a: undefined, b: 1 }],
  ['deeply nested mixed', { a: [{ x: { y: [1, 2, 3] } }], b: null }],
]

describe('canonicalJSON + sha256 differential (backend ↔ verifier)', () => {
  test('canonicalJSON is byte-identical', () => {
    for (const [label, input] of trickyInputs) {
      expect(verifierCanonicalJSON(input), label).toBe(backendCanonicalJSON(input))
    }
  })

  test('sha256Hex of canonical JSON is identical', async () => {
    for (const [label, input] of trickyInputs) {
      const json = backendCanonicalJSON(input)
      const backendHash = backendSha256Hex(json)
      const verifierHash = await verifierSha256Hex(json)
      expect(verifierHash, label).toBe(backendHash)
    }
  })
})
