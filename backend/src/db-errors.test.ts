import { describe, expect, it } from 'bun:test'
import { isUniqueConstraintError, isUniqueConstraintOn } from './db-errors'

describe('isUniqueConstraintError', () => {
  it('matches a P2002 code', () => {
    expect(isUniqueConstraintError({ code: 'P2002' })).toBe(true)
  })

  it('rejects non-P2002 errors', () => {
    expect(isUniqueConstraintError(new Error('boom'))).toBe(false)
    expect(isUniqueConstraintError(null)).toBe(false)
    expect(isUniqueConstraintError('P2002')).toBe(false)
  })
})

describe('isUniqueConstraintOn', () => {
  const fields: readonly [string, string] = ['artKeyId', 'sequence']

  it('matches modelName (adapter-pg)', () => {
    expect(isUniqueConstraintOn({ code: 'P2002', meta: { modelName: 'ProvenanceRecord' } }, 'ProvenanceRecord', fields)).toBe(true)
  })

  it('matches snake_case driver constraint fields', () => {
    const err = {
      code: 'P2002',
      meta: { driverAdapterError: { cause: { constraint: { fields: ['art_key_id', 'sequence'] } } } },
    }
    expect(isUniqueConstraintOn(err, 'ProvenanceRecord', fields)).toBe(true)
  })

  it('matches Prisma target array', () => {
    const err = { code: 'P2002', meta: { target: ['artKeyId', 'sequence'] } }
    expect(isUniqueConstraintOn(err, 'ProvenanceRecord', fields)).toBe(true)
  })

  it('rejects a different model', () => {
    const err = { code: 'P2002', meta: { modelName: 'CollectionArtwork' } }
    expect(isUniqueConstraintOn(err, 'ProvenanceRecord', fields)).toBe(false)
  })

  it('rejects non-P2002', () => {
    expect(isUniqueConstraintOn(new Error('boom'), 'ProvenanceRecord', fields)).toBe(false)
  })
})
