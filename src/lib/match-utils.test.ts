import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { getMatchStatus } from './match-utils'

describe('match-utils', () => {
  describe('getMatchStatus', () => {
    beforeEach(() => {
      // Mock current date to a fixed time for consistent testing
      vi.useFakeTimers()
      vi.setSystemTime(new Date('2024-06-15T15:00:00Z'))
    })

    afterEach(() => {
      vi.useRealTimers()
    })

    it('should return "evaluated" when match is evaluated', () => {
      const match = {
        dateTime: new Date('2024-06-14T12:00:00Z'),
        isEvaluated: true,
      }

      expect(getMatchStatus(match)).toBe('evaluated')
    })

    it('should return "evaluated" regardless of dateTime when isEvaluated is true', () => {
      // Even if match is in the future, if marked evaluated it should show evaluated
      const match = {
        dateTime: new Date('2024-06-20T12:00:00Z'),
        isEvaluated: true,
      }

      expect(getMatchStatus(match)).toBe('evaluated')
    })

    it('should return "scheduled" for future match', () => {
      const match = {
        dateTime: new Date('2024-06-20T12:00:00Z'), // 5 days in the future
        isEvaluated: false,
      }

      expect(getMatchStatus(match)).toBe('scheduled')
    })

    it('should return "live" for match that just started', () => {
      const match = {
        dateTime: new Date('2024-06-15T14:00:00Z'), // 1 hour ago
        isEvaluated: false,
      }

      expect(getMatchStatus(match)).toBe('live')
    })

    it('should return "live" for match within 3-hour window', () => {
      const match = {
        dateTime: new Date('2024-06-15T12:30:00Z'), // 2.5 hours ago
        isEvaluated: false,
      }

      expect(getMatchStatus(match)).toBe('live')
    })

    it('should return "finished" for match more than 3 hours ago', () => {
      const match = {
        dateTime: new Date('2024-06-15T11:00:00Z'), // 4 hours ago
        isEvaluated: false,
      }

      expect(getMatchStatus(match)).toBe('finished')
    })

    it('should return "finished" for match from yesterday', () => {
      const match = {
        dateTime: new Date('2024-06-14T12:00:00Z'), // yesterday
        isEvaluated: false,
      }

      expect(getMatchStatus(match)).toBe('finished')
    })

    it('should handle edge case at exact match start time', () => {
      const match = {
        dateTime: new Date('2024-06-15T15:00:00Z'), // exactly now
        isEvaluated: false,
      }

      expect(getMatchStatus(match)).toBe('live')
    })

    it('should handle edge case at 3-hour mark', () => {
      const match = {
        dateTime: new Date('2024-06-15T12:00:00Z'), // exactly 3 hours ago
        isEvaluated: false,
      }

      // At exactly 3 hours, it's still live (<=)
      expect(getMatchStatus(match)).toBe('live')
    })

    it('should handle match just after 3-hour window', () => {
      const match = {
        dateTime: new Date('2024-06-15T11:59:59Z'), // 3 hours and 1 second ago
        isEvaluated: false,
      }

      expect(getMatchStatus(match)).toBe('finished')
    })
  })
})
