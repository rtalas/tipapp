import { describe, it, expect } from 'vitest'
import {
  createLeagueSchema,
  createMatchSchema,
  updateMatchResultSchema,
  updateLeaguePrizesSchema,
  createMatchPhaseSchema,
  updateMatchPhaseSchema,
} from '@/lib/validation/admin'

describe('Admin Validation Schemas', () => {
  describe('createLeagueSchema', () => {
    it('should accept valid league data', () => {
      const result = createLeagueSchema.safeParse({
        name: 'NHL 2024/25',
        sportId: 1,
        seasonFrom: 2024,
        seasonTo: 2025,
        isActive: true,
        isPublic: true,
      })

      expect(result.success).toBe(true)
    })

    it('should accept league with isActive and isPublic as false', () => {
      const result = createLeagueSchema.safeParse({
        name: 'Draft League',
        sportId: 2,
        seasonFrom: 2024,
        seasonTo: 2025,
        isActive: false,
        isPublic: false,
      })

      expect(result.success).toBe(true)
    })

    it('should reject empty league name', () => {
      const result = createLeagueSchema.safeParse({
        name: '',
        sportId: 1,
        seasonFrom: 2024,
        seasonTo: 2025,
        isActive: true,
        isPublic: true,
      })

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].path[0]).toBe('name')
      }
    })

    it('should reject missing sportId', () => {
      const result = createLeagueSchema.safeParse({
        name: 'NHL 2024/25',
        seasonFrom: 2024,
        seasonTo: 2025,
        isActive: true,
        isPublic: true,
      })

      expect(result.success).toBe(false)
    })

    it('should reject seasonTo less than seasonFrom', () => {
      const result = createLeagueSchema.safeParse({
        name: 'Invalid League',
        sportId: 1,
        seasonFrom: 2025,
        seasonTo: 2024,
        isActive: true,
        isPublic: true,
      })

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('Season end')
      }
    })

    it('should accept same year for seasonFrom and seasonTo', () => {
      const result = createLeagueSchema.safeParse({
        name: 'Short Season',
        sportId: 1,
        seasonFrom: 2024,
        seasonTo: 2024,
        isActive: true,
        isPublic: true,
      })

      expect(result.success).toBe(true)
    })
  })

  describe('createMatchSchema', () => {
    it('should accept valid match data', () => {
      const futureDate = new Date()
      futureDate.setDate(futureDate.getDate() + 7)

      const result = createMatchSchema.safeParse({
        leagueId: 1,
        homeTeamId: 10,
        awayTeamId: 20,
        dateTime: futureDate,
        isPlayoffGame: false,
        isDoubled: false,
      })

      expect(result.success).toBe(true)
    })

    it('should accept playoff game with doubled points', () => {
      const futureDate = new Date()
      futureDate.setDate(futureDate.getDate() + 7)

      const result = createMatchSchema.safeParse({
        leagueId: 1,
        homeTeamId: 10,
        awayTeamId: 20,
        dateTime: futureDate,
        isPlayoffGame: true,
        isDoubled: true,
      })

      expect(result.success).toBe(true)
    })

    it('should reject same home and away team', () => {
      const futureDate = new Date()
      futureDate.setDate(futureDate.getDate() + 7)

      const result = createMatchSchema.safeParse({
        leagueId: 1,
        homeTeamId: 10,
        awayTeamId: 10,
        dateTime: futureDate,
        isPlayoffGame: false,
        isDoubled: false,
      })

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('different')
      }
    })

    it('should reject missing leagueId', () => {
      const futureDate = new Date()
      futureDate.setDate(futureDate.getDate() + 7)

      const result = createMatchSchema.safeParse({
        homeTeamId: 10,
        awayTeamId: 20,
        dateTime: futureDate,
        isPlayoffGame: false,
        isDoubled: false,
      })

      expect(result.success).toBe(false)
    })

    it('should reject missing dateTime', () => {
      const result = createMatchSchema.safeParse({
        leagueId: 1,
        homeTeamId: 10,
        awayTeamId: 20,
        isPlayoffGame: false,
        isDoubled: false,
      })

      expect(result.success).toBe(false)
    })

    it('should accept match with phase and game number', () => {
      const futureDate = new Date()
      futureDate.setDate(futureDate.getDate() + 7)

      const result = createMatchSchema.safeParse({
        leagueId: 1,
        homeTeamId: 10,
        awayTeamId: 20,
        dateTime: futureDate,
        isPlayoffGame: false,
        isDoubled: false,
        matchPhaseId: 5,
        gameNumber: 3,
      })

      expect(result.success).toBe(true)
    })

    it('should accept match with phase but no game number', () => {
      const futureDate = new Date()
      futureDate.setDate(futureDate.getDate() + 7)

      const result = createMatchSchema.safeParse({
        leagueId: 1,
        homeTeamId: 10,
        awayTeamId: 20,
        dateTime: futureDate,
        isPlayoffGame: false,
        isDoubled: false,
        matchPhaseId: 5,
      })

      expect(result.success).toBe(true)
    })

    it('should reject game number without phase', () => {
      const futureDate = new Date()
      futureDate.setDate(futureDate.getDate() + 7)

      const result = createMatchSchema.safeParse({
        leagueId: 1,
        homeTeamId: 10,
        awayTeamId: 20,
        dateTime: futureDate,
        isPlayoffGame: false,
        isDoubled: false,
        gameNumber: 3,
      })

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('Game number requires a match phase')
      }
    })
  })

  describe('createMatchPhaseSchema', () => {
    it('should accept valid phase data', () => {
      const result = createMatchPhaseSchema.safeParse({
        name: 'Semifinals',
        rank: 30,
        bestOf: 7,
      })

      expect(result.success).toBe(true)
    })

    it('should accept phase without bestOf', () => {
      const result = createMatchPhaseSchema.safeParse({
        name: 'Group A',
        rank: 10,
      })

      expect(result.success).toBe(true)
    })

    it('should accept phase with bestOf as null', () => {
      const result = createMatchPhaseSchema.safeParse({
        name: 'Final',
        rank: 50,
        bestOf: null,
      })

      expect(result.success).toBe(true)
    })

    it('should default rank to 0', () => {
      const result = createMatchPhaseSchema.safeParse({
        name: 'Group Stage',
      })

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.rank).toBe(0)
      }
    })

    it('should reject empty name', () => {
      const result = createMatchPhaseSchema.safeParse({
        name: '',
        rank: 10,
      })

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].path[0]).toBe('name')
      }
    })

    it('should reject negative rank', () => {
      const result = createMatchPhaseSchema.safeParse({
        name: 'Quarterfinals',
        rank: -1,
      })

      expect(result.success).toBe(false)
    })

    it('should reject bestOf less than 1', () => {
      const result = createMatchPhaseSchema.safeParse({
        name: 'Finals',
        rank: 40,
        bestOf: 0,
      })

      expect(result.success).toBe(false)
    })

    it('should reject bestOf greater than 7', () => {
      const result = createMatchPhaseSchema.safeParse({
        name: 'Finals',
        rank: 40,
        bestOf: 8,
      })

      expect(result.success).toBe(false)
    })

    it('should accept bestOf values from 1 to 7', () => {
      for (let i = 1; i <= 7; i++) {
        const result = createMatchPhaseSchema.safeParse({
          name: `Best of ${i}`,
          rank: i * 10,
          bestOf: i,
        })

        expect(result.success).toBe(true)
      }
    })
  })

  describe('updateMatchPhaseSchema', () => {
    it('should accept valid update data', () => {
      const result = updateMatchPhaseSchema.safeParse({
        id: 1,
        name: 'Updated Semifinals',
        rank: 35,
      })

      expect(result.success).toBe(true)
    })

    it('should accept partial updates', () => {
      const result = updateMatchPhaseSchema.safeParse({
        id: 1,
        name: 'New Name',
      })

      expect(result.success).toBe(true)
    })

    it('should reject missing id', () => {
      const result = updateMatchPhaseSchema.safeParse({
        name: 'Semifinals',
        rank: 30,
      })

      expect(result.success).toBe(false)
    })

    it('should accept updating bestOf to null', () => {
      const result = updateMatchPhaseSchema.safeParse({
        id: 1,
        bestOf: null,
      })

      expect(result.success).toBe(true)
    })
  })

  describe('updateMatchResultSchema', () => {
    it('should accept valid result data', () => {
      const result = updateMatchResultSchema.safeParse({
        matchId: 1,
        homeRegularScore: 3,
        awayRegularScore: 2,
        isOvertime: false,
        isShootout: false,
      })

      expect(result.success).toBe(true)
    })

    it('should accept overtime result', () => {
      const result = updateMatchResultSchema.safeParse({
        matchId: 1,
        homeRegularScore: 3,
        awayRegularScore: 3,
        homeFinalScore: 4,
        awayFinalScore: 3,
        isOvertime: true,
        isShootout: false,
      })

      expect(result.success).toBe(true)
    })

    it('should accept shootout result', () => {
      const result = updateMatchResultSchema.safeParse({
        matchId: 1,
        homeRegularScore: 3,
        awayRegularScore: 3,
        homeFinalScore: 4,
        awayFinalScore: 3,
        isOvertime: true,
        isShootout: true,
      })

      expect(result.success).toBe(true)
    })

    it('should accept result with scorers', () => {
      const result = updateMatchResultSchema.safeParse({
        matchId: 1,
        homeRegularScore: 3,
        awayRegularScore: 2,
        isOvertime: false,
        isShootout: false,
        scorers: [
          { playerId: 101, numberOfGoals: 2 },
          { playerId: 102, numberOfGoals: 1 },
          { playerId: 201, numberOfGoals: 1 },
          { playerId: 202, numberOfGoals: 1 },
        ],
      })

      expect(result.success).toBe(true)
    })

    it('should reject negative scores', () => {
      const result = updateMatchResultSchema.safeParse({
        matchId: 1,
        homeRegularScore: -1,
        awayRegularScore: 2,
        isOvertime: false,
        isShootout: false,
      })

      expect(result.success).toBe(false)
    })

    it('should reject missing matchId', () => {
      const result = updateMatchResultSchema.safeParse({
        homeRegularScore: 3,
        awayRegularScore: 2,
        isOvertime: false,
        isShootout: false,
      })

      expect(result.success).toBe(false)
    })

    it('should reject scorers with zero or negative goals', () => {
      const result = updateMatchResultSchema.safeParse({
        matchId: 1,
        homeRegularScore: 3,
        awayRegularScore: 2,
        isOvertime: false,
        isShootout: false,
        scorers: [{ playerId: 101, numberOfGoals: 0 }],
      })

      expect(result.success).toBe(false)
    })
  })

  describe('updateLeaguePrizesSchema', () => {
    it('should accept valid prizes data', () => {
      const result = updateLeaguePrizesSchema.safeParse({
        leagueId: 1,
        prizes: [
          { rank: 1, amount: 100000, currency: 'CZK' },
          { rank: 2, amount: 60000, currency: 'CZK' },
          { rank: 3, amount: 20000, currency: 'CZK' },
        ],
      })

      expect(result.success).toBe(true)
    })

    it('should accept empty prizes array', () => {
      const result = updateLeaguePrizesSchema.safeParse({
        leagueId: 1,
        prizes: [],
      })

      expect(result.success).toBe(true)
    })

    it('should accept prizes with labels', () => {
      const result = updateLeaguePrizesSchema.safeParse({
        leagueId: 1,
        prizes: [
          { rank: 1, amount: 100000, currency: 'CZK', label: 'Champion' },
          { rank: 2, amount: 60000, currency: 'CZK', label: 'Runner-up' },
        ],
      })

      expect(result.success).toBe(true)
    })

    it('should reject duplicate ranks', () => {
      const result = updateLeaguePrizesSchema.safeParse({
        leagueId: 1,
        prizes: [
          { rank: 1, amount: 100000, currency: 'CZK' },
          { rank: 1, amount: 50000, currency: 'CZK' },
        ],
      })

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('unique')
      }
    })

    it('should reject rank less than 1', () => {
      const result = updateLeaguePrizesSchema.safeParse({
        leagueId: 1,
        prizes: [{ rank: 0, amount: 100000, currency: 'CZK' }],
      })

      expect(result.success).toBe(false)
    })

    it('should reject rank greater than 10', () => {
      const result = updateLeaguePrizesSchema.safeParse({
        leagueId: 1,
        prizes: [{ rank: 11, amount: 100000, currency: 'CZK' }],
      })

      expect(result.success).toBe(false)
    })

    it('should reject negative amount', () => {
      const result = updateLeaguePrizesSchema.safeParse({
        leagueId: 1,
        prizes: [{ rank: 1, amount: -1000, currency: 'CZK' }],
      })

      expect(result.success).toBe(false)
    })

    it('should reject invalid currency length', () => {
      const result = updateLeaguePrizesSchema.safeParse({
        leagueId: 1,
        prizes: [{ rank: 1, amount: 100000, currency: 'CZEK' }],
      })

      expect(result.success).toBe(false)
    })

    it('should reject more than 10 prize tiers', () => {
      const prizes = Array.from({ length: 11 }, (_, i) => ({
        rank: i + 1,
        amount: 10000,
        currency: 'CZK',
      }))

      const result = updateLeaguePrizesSchema.safeParse({
        leagueId: 1,
        prizes,
      })

      expect(result.success).toBe(false)
    })

    it('should reject label longer than 100 characters', () => {
      const result = updateLeaguePrizesSchema.safeParse({
        leagueId: 1,
        prizes: [
          {
            rank: 1,
            amount: 100000,
            currency: 'CZK',
            label: 'A'.repeat(101),
          },
        ],
      })

      expect(result.success).toBe(false)
    })

    it('should accept exactly 10 prize tiers', () => {
      const prizes = Array.from({ length: 10 }, (_, i) => ({
        rank: i + 1,
        amount: 10000 * (10 - i),
        currency: 'CZK',
      }))

      const result = updateLeaguePrizesSchema.safeParse({
        leagueId: 1,
        prizes,
      })

      expect(result.success).toBe(true)
    })
  })
})
