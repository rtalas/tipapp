import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createMatch, updateMatch, updateMatchResult, deleteMatch, getMatches, getMatchById } from './matches'
import { prisma } from '@/lib/prisma'
import { updateTag } from 'next/cache'
import { requireAdmin } from '@/lib/auth/auth-utils'

vi.mock('@/lib/auth/auth-utils', () => ({
  requireAdmin: vi.fn().mockResolvedValue({ user: { id: '1', isSuperadmin: true } }),
  parseSessionUserId: vi.fn((id: string) => parseInt(id, 10)),
}))

vi.mock('@/lib/query-builders', () => ({
  buildLeagueMatchWhere: vi.fn().mockReturnValue({}),
}))

vi.mock('@/lib/prisma-helpers', () => ({
  leagueMatchWithBetsInclude: {},
}))

const mockPrisma = vi.mocked(prisma, true)
const mockUpdateTag = vi.mocked(updateTag)
const mockRequireAdmin = vi.mocked(requireAdmin)

describe('Matches Actions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('createMatch', () => {
    it('should create match when teams belong to league', async () => {
      mockPrisma.leagueTeam.findFirst
        .mockResolvedValueOnce({ id: 1, leagueId: 1 } as any) // home
        .mockResolvedValueOnce({ id: 2, leagueId: 1 } as any) // away

      const createdMatch = { id: 10 }
      mockPrisma.$transaction.mockImplementation(async (fn: any) => {
        const tx = {
          match: { create: vi.fn().mockResolvedValue(createdMatch) },
          leagueMatch: { create: vi.fn().mockResolvedValue({ id: 1 }) },
        }
        return fn(tx)
      })

      const result = await createMatch({
        leagueId: 1,
        homeTeamId: 1,
        awayTeamId: 2,
        dateTime: new Date('2026-06-01'),
        isPlayoffGame: false,
        isDoubled: false,
      })

      expect(mockRequireAdmin).toHaveBeenCalled()
      expect(result.success).toBe(true)
      expect((result as any).matchId).toBe(10)
    })

    it('should return error when home team not in league', async () => {
      mockPrisma.leagueTeam.findFirst
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({ id: 2 } as any)

      const result = await createMatch({
        leagueId: 1,
        homeTeamId: 99,
        awayTeamId: 2,
        dateTime: new Date('2026-06-01'),
        isPlayoffGame: false,
        isDoubled: false,
      })

      expect(result.success).toBe(false)
      expect((result as any).error).toContain('Teams must belong')
    })

    it('should validate match phase exists', async () => {
      mockPrisma.leagueTeam.findFirst
        .mockResolvedValueOnce({ id: 1 } as any)
        .mockResolvedValueOnce({ id: 2 } as any)
      mockPrisma.matchPhase.findFirst.mockResolvedValue(null)

      const result = await createMatch({
        leagueId: 1,
        homeTeamId: 1,
        awayTeamId: 2,
        dateTime: new Date('2026-06-01'),
        isPlayoffGame: false,
        isDoubled: false,
        matchPhaseId: 999,
      })

      expect(result.success).toBe(false)
      expect((result as any).error).toContain('Match phase not found')
    })

    it('should validate game number against bestOf', async () => {
      mockPrisma.leagueTeam.findFirst
        .mockResolvedValueOnce({ id: 1 } as any)
        .mockResolvedValueOnce({ id: 2 } as any)
      mockPrisma.matchPhase.findFirst.mockResolvedValue({ id: 1, bestOf: 5 } as any)

      const result = await createMatch({
        leagueId: 1,
        homeTeamId: 1,
        awayTeamId: 2,
        dateTime: new Date('2026-06-01'),
        isPlayoffGame: false,
        isDoubled: false,
        matchPhaseId: 1,
        gameNumber: 6,
      })

      expect(result.success).toBe(false)
      expect((result as any).error).toContain('Game number cannot exceed')
    })

    it('should reject past dateTime', async () => {
      const result = await createMatch({
        leagueId: 1,
        homeTeamId: 1,
        awayTeamId: 2,
        dateTime: new Date('2020-01-01'),
        isPlayoffGame: false,
        isDoubled: false,
      })

      expect(result.success).toBe(false)
      expect((result as any).error).toContain('Match date must be in the future')
    })

    it('should reject same team for home and away', async () => {
      const result = await createMatch({
        leagueId: 1,
        homeTeamId: 1,
        awayTeamId: 1,
        dateTime: new Date('2026-06-01'),
        isPlayoffGame: false,
        isDoubled: false,
      })

      expect(result.success).toBe(false)
      expect((result as any).error).toContain('Home and away teams must be different')
    })

    it('should invalidate match-data cache', async () => {
      mockPrisma.leagueTeam.findFirst
        .mockResolvedValueOnce({ id: 1 } as any)
        .mockResolvedValueOnce({ id: 2 } as any)
      mockPrisma.$transaction.mockImplementation(async (fn: any) =>
        fn({
          match: { create: vi.fn().mockResolvedValue({ id: 1 }) },
          leagueMatch: { create: vi.fn().mockResolvedValue({ id: 1 }) },
        })
      )

      await createMatch({
        leagueId: 1,
        homeTeamId: 1,
        awayTeamId: 2,
        dateTime: new Date('2026-06-01'),
        isPlayoffGame: false,
        isDoubled: false,
      })

      expect(mockUpdateTag).toHaveBeenCalledWith('match-data')
    })
  })

  describe('updateMatch', () => {
    it('should update match', async () => {
      mockPrisma.match.update.mockResolvedValue({ id: 1 } as any)

      const result = await updateMatch({
        matchId: 1,
        dateTime: new Date('2026-07-01'),
      })

      expect(result.success).toBe(true)
      expect(mockUpdateTag).toHaveBeenCalledWith('match-data')
    })

    it('should validate match phase if provided', async () => {
      mockPrisma.matchPhase.findFirst.mockResolvedValue(null)

      const result = await updateMatch({ matchId: 1, matchPhaseId: 999 })

      expect(result.success).toBe(false)
      expect((result as any).error).toContain('Match phase not found')
    })

    it('should reject game number exceeding bestOf', async () => {
      mockPrisma.matchPhase.findFirst.mockResolvedValue({ id: 1, bestOf: 5 } as any)

      const result = await updateMatch({ matchId: 1, matchPhaseId: 1, gameNumber: 6 })

      expect(result.success).toBe(false)
      expect((result as any).error).toContain('Game number cannot exceed')
    })

    it('should handle database error', async () => {
      mockPrisma.match.update.mockRejectedValue(new Error('DB error'))

      const result = await updateMatch({ matchId: 1, dateTime: new Date('2026-07-01') })

      expect(result.success).toBe(false)
    })
  })

  describe('updateMatchResult', () => {
    it('should update match scores in transaction', async () => {
      const txMocks = {
        match: { update: vi.fn() },
        matchScorer: { updateMany: vi.fn(), createMany: vi.fn() },
      }
      mockPrisma.$transaction.mockImplementation(async (fn: any) => fn(txMocks))

      const result = await updateMatchResult({
        matchId: 1,
        homeRegularScore: 2,
        awayRegularScore: 1,
        isOvertime: false,
        isShootout: false,
      })

      expect(result.success).toBe(true)
      expect(txMocks.match.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 1 },
          data: expect.objectContaining({
            homeRegularScore: 2,
            awayRegularScore: 1,
          }),
        })
      )
    })

    it('should handle scorers replacement', async () => {
      const txMocks = {
        match: { update: vi.fn() },
        matchScorer: { updateMany: vi.fn(), createMany: vi.fn() },
      }
      mockPrisma.$transaction.mockImplementation(async (fn: any) => fn(txMocks))

      await updateMatchResult({
        matchId: 1,
        homeRegularScore: 3,
        awayRegularScore: 0,
        isOvertime: false,
        isShootout: false,
        scorers: [
          { playerId: 10, numberOfGoals: 2 },
          { playerId: 11, numberOfGoals: 1 },
        ],
      })

      expect(txMocks.matchScorer.updateMany).toHaveBeenCalledWith({
        where: { matchId: 1, deletedAt: null },
        data: { deletedAt: expect.any(Date) },
      })
      expect(txMocks.matchScorer.createMany).toHaveBeenCalled()
    })

    it('should set final scores to regular when not provided', async () => {
      const txMocks = {
        match: { update: vi.fn() },
        matchScorer: { updateMany: vi.fn(), createMany: vi.fn() },
      }
      mockPrisma.$transaction.mockImplementation(async (fn: any) => fn(txMocks))

      await updateMatchResult({
        matchId: 1,
        homeRegularScore: 2,
        awayRegularScore: 2,
        isOvertime: false,
        isShootout: false,
      })

      expect(txMocks.match.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            homeFinalScore: 2,
            awayFinalScore: 2,
          }),
        })
      )
    })
  })

  describe('deleteMatch', () => {
    it('should soft delete match', async () => {
      mockPrisma.match.update.mockResolvedValue({ id: 1 } as any)

      const result = await deleteMatch(1)

      expect(result.success).toBe(true)
      expect(mockPrisma.match.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { deletedAt: expect.any(Date) },
      })
      expect(mockUpdateTag).toHaveBeenCalledWith('match-data')
    })

    it('should reject invalid id', async () => {
      const result = await deleteMatch(-1)
      expect(result.success).toBe(false)
    })
  })

  describe('getMatches', () => {
    it('should return league matches', async () => {
      mockPrisma.leagueMatch.findMany.mockResolvedValue([{ id: 1 }] as any)

      const result = await getMatches({ leagueId: 1 })

      expect(mockRequireAdmin).toHaveBeenCalled()
      expect(result).toHaveLength(1)
    })

    it('should reject non-admin users', async () => {
      mockRequireAdmin.mockRejectedValueOnce(new Error('Unauthorized'))

      await expect(getMatches()).rejects.toThrow('Unauthorized')
    })
  })

  describe('getMatchById', () => {
    it('should return match with full includes', async () => {
      mockPrisma.match.findUnique.mockResolvedValue({ id: 1 } as any)

      const result = await getMatchById(1)

      expect(mockRequireAdmin).toHaveBeenCalled()
      expect(result).toEqual({ id: 1 })
      expect(mockPrisma.match.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 1, deletedAt: null },
        })
      )
    })

    it('should reject non-admin users', async () => {
      mockRequireAdmin.mockRejectedValueOnce(new Error('Unauthorized'))

      await expect(getMatchById(1)).rejects.toThrow('Unauthorized')
    })
  })
})
