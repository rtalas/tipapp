import { describe, it, expect } from 'vitest'
import { getPlayerDisplayName } from './user-display-utils'

describe('getPlayerDisplayName', () => {
  it('returns "FirstName LastName" when both present', () => {
    expect(getPlayerDisplayName({ firstName: 'Lamine', lastName: 'Yamal' })).toBe('Lamine Yamal')
  })

  it('returns only the last name when first name is missing (no "null")', () => {
    expect(getPlayerDisplayName({ firstName: null, lastName: 'Endrick' })).toBe('Endrick')
  })

  it('returns only the first name when last name is missing', () => {
    expect(getPlayerDisplayName({ firstName: 'Pelé', lastName: null })).toBe('Pelé')
  })

  it('returns the empty fallback by default when both are missing', () => {
    expect(getPlayerDisplayName({ firstName: null, lastName: null })).toBe('')
  })

  it('returns the provided fallback when both are missing', () => {
    expect(getPlayerDisplayName({ firstName: null, lastName: null }, 'Unknown')).toBe('Unknown')
  })
})
