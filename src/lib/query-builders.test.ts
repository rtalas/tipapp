import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  buildLeagueMatchWhere,
  buildLeagueUserWhere,
  buildUserPicksWhere,
  buildSeriesWhere,
  buildSeriesPicksWhere,
  buildSpecialBetsWhere,
  buildSpecialBetPicksWhere,
  buildQuestionWhere,
  buildQuestionPicksWhere,
} from './query-builders'

describe('query-builders', () => {
  let mockNow: Date

  beforeEach(() => {
    // Mock current date to 2024-01-15 12:00:00
    mockNow = new Date('2024-01-15T12:00:00Z')
    vi.setSystemTime(mockNow)
  })

  describe('buildLeagueMatchWhere', () => {
    it('should return base where with deletedAt null', () => {
      const where = buildLeagueMatchWhere()

      expect(where.deletedAt).toBeNull()
      expect(where.Match).toEqual({ deletedAt: null })
    })

    it('should filter by leagueId', () => {
      const where = buildLeagueMatchWhere({ leagueId: 123 })

      expect(where.leagueId).toBe(123)
    })

    it('should filter by userId', () => {
      const where = buildLeagueMatchWhere({ userId: 456 })

      expect(where.UserBet).toEqual({
        some: {
          deletedAt: null,
          LeagueUser: {
            userId: 456,
          },
        },
      })
    })

    it('should filter scheduled matches', () => {
      const where = buildLeagueMatchWhere({ status: 'scheduled' })

      expect(where.Match?.dateTime).toEqual({ gt: mockNow })
      expect(where.Match?.isEvaluated).toBe(false)
    })

    it('should filter finished matches', () => {
      const where = buildLeagueMatchWhere({ status: 'finished' })

      expect(where.Match?.dateTime).toEqual({ lt: mockNow })
      expect(where.Match?.isEvaluated).toBe(false)
    })

    it('should filter evaluated matches', () => {
      const where = buildLeagueMatchWhere({ status: 'evaluated' })

      expect(where.Match?.isEvaluated).toBe(true)
      expect(where.Match?.dateTime).toBeUndefined()
    })

    it('should handle all status (no filter)', () => {
      const where = buildLeagueMatchWhere({ status: 'all' })

      expect(where.Match?.isEvaluated).toBeUndefined()
      expect(where.Match?.dateTime).toBeUndefined()
    })

    it('should combine leagueId and status filters', () => {
      const where = buildLeagueMatchWhere({ leagueId: 123, status: 'scheduled' })

      expect(where.leagueId).toBe(123)
      expect(where.Match?.dateTime).toEqual({ gt: mockNow })
      expect(where.Match?.isEvaluated).toBe(false)
    })

    it('should combine all filters', () => {
      const where = buildLeagueMatchWhere({
        leagueId: 123,
        userId: 456,
        status: 'finished',
      })

      expect(where.leagueId).toBe(123)
      expect(where.UserBet).toBeDefined()
      expect(where.Match?.dateTime).toEqual({ lt: mockNow })
    })
  })

  describe('buildLeagueUserWhere', () => {
    it('should return base where with deletedAt null', () => {
      const where = buildLeagueUserWhere()

      expect(where.deletedAt).toBeNull()
    })

    it('should filter by leagueId', () => {
      const where = buildLeagueUserWhere({ leagueId: 123 })

      expect(where.leagueId).toBe(123)
    })
  })

  describe('buildUserPicksWhere', () => {
    it('should return base where with deletedAt null', () => {
      const where = buildUserPicksWhere()

      expect(where.deletedAt).toBeNull()
      expect(where.Match).toEqual({ deletedAt: null })
    })

    it('should filter by leagueId', () => {
      const where = buildUserPicksWhere({ leagueId: 123 })

      expect(where.leagueId).toBe(123)
    })

    it('should filter evaluated picks', () => {
      const where = buildUserPicksWhere({ status: 'evaluated' })

      expect(where.Match.isEvaluated).toBe(true)
    })

    it('should filter unevaluated picks', () => {
      const where = buildUserPicksWhere({ status: 'unevaluated' })

      expect(where.Match.isEvaluated).toBe(false)
    })

    it('should handle all status', () => {
      const where = buildUserPicksWhere({ status: 'all' })

      expect(where.Match.isEvaluated).toBeUndefined()
    })
  })

  describe('buildSeriesWhere', () => {
    it('should return base where with deletedAt null', () => {
      const where = buildSeriesWhere()

      expect(where.deletedAt).toBeNull()
    })

    it('should filter by leagueId', () => {
      const where = buildSeriesWhere({ leagueId: 123 })

      expect(where.leagueId).toBe(123)
    })

    it('should filter scheduled series', () => {
      const where = buildSeriesWhere({ status: 'scheduled' })

      expect(where.dateTime).toEqual({ gt: mockNow })
      expect(where.isEvaluated).toBe(false)
    })

    it('should filter finished series', () => {
      const where = buildSeriesWhere({ status: 'finished' })

      expect(where.dateTime).toEqual({ lt: mockNow })
      expect(where.isEvaluated).toBe(false)
      expect(where.homeTeamScore).toEqual({ not: null })
      expect(where.awayTeamScore).toEqual({ not: null })
    })

    it('should filter evaluated series', () => {
      const where = buildSeriesWhere({ status: 'evaluated' })

      expect(where.isEvaluated).toBe(true)
      expect(where.dateTime).toBeUndefined()
    })

    it('should handle all status', () => {
      const where = buildSeriesWhere({ status: 'all' })

      expect(where.isEvaluated).toBeUndefined()
      expect(where.dateTime).toBeUndefined()
    })
  })

  describe('buildSeriesPicksWhere', () => {
    it('should return base where with deletedAt null', () => {
      const where = buildSeriesPicksWhere()

      expect(where.deletedAt).toBeNull()
    })

    it('should filter by leagueId', () => {
      const where = buildSeriesPicksWhere({ leagueId: 123 })

      expect(where.leagueId).toBe(123)
    })

    it('should filter evaluated picks', () => {
      const where = buildSeriesPicksWhere({ status: 'evaluated' })

      expect(where.isEvaluated).toBe(true)
    })

    it('should filter unevaluated picks', () => {
      const where = buildSeriesPicksWhere({ status: 'unevaluated' })

      expect(where.isEvaluated).toBe(false)
    })

    it('should handle all status', () => {
      const where = buildSeriesPicksWhere({ status: 'all' })

      expect(where.isEvaluated).toBeUndefined()
    })
  })

  describe('buildSpecialBetsWhere', () => {
    it('should return base where with deletedAt null', () => {
      const where = buildSpecialBetsWhere()

      expect(where.deletedAt).toBeNull()
    })

    it('should filter by leagueId', () => {
      const where = buildSpecialBetsWhere({ leagueId: 123 })

      expect(where.leagueId).toBe(123)
    })

    it('should filter scheduled special bets', () => {
      const where = buildSpecialBetsWhere({ status: 'scheduled' })

      expect(where.dateTime).toEqual({ gt: mockNow })
      expect(where.isEvaluated).toBe(false)
    })

    it('should filter finished special bets', () => {
      const where = buildSpecialBetsWhere({ status: 'finished' })

      expect(where.dateTime).toEqual({ lt: mockNow })
      expect(where.isEvaluated).toBe(false)
    })

    it('should filter evaluated special bets', () => {
      const where = buildSpecialBetsWhere({ status: 'evaluated' })

      expect(where.isEvaluated).toBe(true)
      expect(where.dateTime).toBeUndefined()
    })

    it('should filter by team type', () => {
      const where = buildSpecialBetsWhere({ type: 'team' })

      expect(where.specialBetTeamResultId).toEqual({ not: null })
    })

    it('should filter by player type', () => {
      const where = buildSpecialBetsWhere({ type: 'player' })

      expect(where.specialBetPlayerResultId).toEqual({ not: null })
    })

    it('should filter by value type', () => {
      const where = buildSpecialBetsWhere({ type: 'value' })

      expect(where.specialBetValue).toEqual({ not: null })
    })

    it('should handle all type', () => {
      const where = buildSpecialBetsWhere({ type: 'all' })

      expect(where.specialBetTeamResultId).toBeUndefined()
      expect(where.specialBetPlayerResultId).toBeUndefined()
      expect(where.specialBetValue).toBeUndefined()
    })

    it('should combine leagueId, status, and type filters', () => {
      const where = buildSpecialBetsWhere({
        leagueId: 123,
        status: 'finished',
        type: 'team',
      })

      expect(where.leagueId).toBe(123)
      expect(where.dateTime).toEqual({ lt: mockNow })
      expect(where.isEvaluated).toBe(false)
      expect(where.specialBetTeamResultId).toEqual({ not: null })
    })
  })

  describe('buildSpecialBetPicksWhere', () => {
    it('should return base where with deletedAt null', () => {
      const where = buildSpecialBetPicksWhere()

      expect(where.deletedAt).toBeNull()
    })

    it('should filter by leagueId', () => {
      const where = buildSpecialBetPicksWhere({ leagueId: 123 })

      expect(where.leagueId).toBe(123)
    })

    it('should filter evaluated picks', () => {
      const where = buildSpecialBetPicksWhere({ status: 'evaluated' })

      expect(where.isEvaluated).toBe(true)
    })

    it('should filter unevaluated picks', () => {
      const where = buildSpecialBetPicksWhere({ status: 'unevaluated' })

      expect(where.isEvaluated).toBe(false)
    })

    it('should handle all status', () => {
      const where = buildSpecialBetPicksWhere({ status: 'all' })

      expect(where.isEvaluated).toBeUndefined()
    })
  })

  describe('buildQuestionWhere', () => {
    it('should return base where with deletedAt null', () => {
      const where = buildQuestionWhere()

      expect(where.deletedAt).toBeNull()
    })

    it('should filter by leagueId', () => {
      const where = buildQuestionWhere({ leagueId: 123 })

      expect(where.leagueId).toBe(123)
    })

    it('should filter scheduled questions', () => {
      const where = buildQuestionWhere({ status: 'scheduled' })

      expect(where.dateTime).toEqual({ gt: mockNow })
      expect(where.isEvaluated).toBe(false)
    })

    it('should filter finished questions', () => {
      const where = buildQuestionWhere({ status: 'finished' })

      expect(where.dateTime).toEqual({ lt: mockNow })
      expect(where.isEvaluated).toBe(false)
      expect(where.result).toEqual({ not: null })
    })

    it('should filter evaluated questions', () => {
      const where = buildQuestionWhere({ status: 'evaluated' })

      expect(where.isEvaluated).toBe(true)
      expect(where.dateTime).toBeUndefined()
    })

    it('should handle all status', () => {
      const where = buildQuestionWhere({ status: 'all' })

      expect(where.isEvaluated).toBeUndefined()
      expect(where.dateTime).toBeUndefined()
    })

    it('should combine leagueId and status filters', () => {
      const where = buildQuestionWhere({ leagueId: 123, status: 'scheduled' })

      expect(where.leagueId).toBe(123)
      expect(where.dateTime).toEqual({ gt: mockNow })
      expect(where.isEvaluated).toBe(false)
    })
  })

  describe('buildQuestionPicksWhere', () => {
    it('should return base where with deletedAt null', () => {
      const where = buildQuestionPicksWhere()

      expect(where.deletedAt).toBeNull()
    })

    it('should filter by leagueId', () => {
      const where = buildQuestionPicksWhere({ leagueId: 123 })

      expect(where.leagueId).toBe(123)
    })

    it('should filter evaluated picks', () => {
      const where = buildQuestionPicksWhere({ status: 'evaluated' })

      expect(where.isEvaluated).toBe(true)
    })

    it('should filter unevaluated picks', () => {
      const where = buildQuestionPicksWhere({ status: 'unevaluated' })

      expect(where.isEvaluated).toBe(false)
    })

    it('should handle all status', () => {
      const where = buildQuestionPicksWhere({ status: 'all' })

      expect(where.isEvaluated).toBeUndefined()
    })
  })

  describe('edge cases', () => {
    it('should handle undefined filters', () => {
      expect(() => buildLeagueMatchWhere(undefined)).not.toThrow()
      expect(() => buildSeriesWhere(undefined)).not.toThrow()
      expect(() => buildSpecialBetsWhere(undefined)).not.toThrow()
      expect(() => buildQuestionWhere(undefined)).not.toThrow()
    })

    it('should handle empty filters', () => {
      expect(() => buildLeagueMatchWhere({})).not.toThrow()
      expect(() => buildSeriesWhere({})).not.toThrow()
      expect(() => buildSpecialBetsWhere({})).not.toThrow()
      expect(() => buildQuestionWhere({})).not.toThrow()
    })

    it('should handle leagueId 0', () => {
      // LeagueId 0 is falsy, so it should not be added
      const where = buildLeagueMatchWhere({ leagueId: 0 })
      expect(where.leagueId).toBeUndefined()
    })

    it('should handle negative leagueId', () => {
      // Negative leagueId should be added (truthy value)
      const where = buildLeagueMatchWhere({ leagueId: -1 })
      expect(where.leagueId).toBe(-1)
    })
  })

  describe('date-based filtering consistency', () => {
    it('should use consistent date comparisons across builders', () => {
      const matchWhere = buildLeagueMatchWhere({ status: 'scheduled' })
      const seriesWhere = buildSeriesWhere({ status: 'scheduled' })
      const specialBetWhere = buildSpecialBetsWhere({ status: 'scheduled' })
      const questionWhere = buildQuestionWhere({ status: 'scheduled' })

      // All should use gt (greater than) for scheduled
      expect(matchWhere.Match?.dateTime).toEqual({ gt: mockNow })
      expect(seriesWhere.dateTime).toEqual({ gt: mockNow })
      expect(specialBetWhere.dateTime).toEqual({ gt: mockNow })
      expect(questionWhere.dateTime).toEqual({ gt: mockNow })
    })

    it('should use consistent date comparisons for finished status', () => {
      const matchWhere = buildLeagueMatchWhere({ status: 'finished' })
      const seriesWhere = buildSeriesWhere({ status: 'finished' })
      const specialBetWhere = buildSpecialBetsWhere({ status: 'finished' })
      const questionWhere = buildQuestionWhere({ status: 'finished' })

      // All should use lt (less than) for finished
      expect(matchWhere.Match?.dateTime).toEqual({ lt: mockNow })
      expect(seriesWhere.dateTime).toEqual({ lt: mockNow })
      expect(specialBetWhere.dateTime).toEqual({ lt: mockNow })
      expect(questionWhere.dateTime).toEqual({ lt: mockNow })
    })
  })
})
