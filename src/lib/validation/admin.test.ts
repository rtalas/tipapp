import { describe, it, expect } from 'vitest'
import {
  createLeagueSchema,
  createMatchSchema,
  updateMatchResultSchema,
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
})
