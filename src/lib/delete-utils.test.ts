import { describe, it, expect } from 'vitest'
import { buildDeletionErrorMessage } from './delete-utils'

describe('delete-utils', () => {
  describe('buildDeletionErrorMessage', () => {
    it('returns singular noun for count of 1', () => {
      expect(buildDeletionErrorMessage('series type', 1)).toBe(
        'Cannot delete: This series type is used in 1 league'
      )
    })

    it('returns plural noun for count greater than 1', () => {
      expect(buildDeletionErrorMessage('series type', 3)).toBe(
        'Cannot delete: This series type is used in 3 leagues'
      )
    })

    it('returns plural noun for count of 0', () => {
      expect(buildDeletionErrorMessage('team', 0)).toBe(
        'Cannot delete: This team is used in 0 leagues'
      )
    })

    it('uses custom singular noun', () => {
      expect(buildDeletionErrorMessage('player', 2, 'team')).toBe(
        'Cannot delete: This player is used in 2 teams'
      )
    })

    it('uses custom singular noun with count 1', () => {
      expect(buildDeletionErrorMessage('player', 1, 'team')).toBe(
        'Cannot delete: This player is used in 1 team'
      )
    })

    it('defaults singularNoun to "league"', () => {
      const msg = buildDeletionErrorMessage('evaluator', 5)
      expect(msg).toContain('5 leagues')
    })

    it('handles various item names', () => {
      expect(buildDeletionErrorMessage('special bet type', 2)).toBe(
        'Cannot delete: This special bet type is used in 2 leagues'
      )
      expect(buildDeletionErrorMessage('match phase', 1)).toBe(
        'Cannot delete: This match phase is used in 1 league'
      )
    })
  })
})
