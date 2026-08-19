import { describe, expect, test } from 'bun:test'
import { verifyTimestampToken } from './timestamp'

describe('verifyTimestampToken', () => {
  test('throws with explicit roadmap message (P0-06: not yet implemented)', async () => {
    await expect(verifyTimestampToken('any-token', 'any-hash')).rejects.toThrow(
      'RFC 3161 timestamp verification is not yet implemented',
    )
  })

  test('throws for empty token input', async () => {
    await expect(verifyTimestampToken('', '')).rejects.toThrow(
      'RFC 3161 timestamp verification is not yet implemented',
    )
  })
})
