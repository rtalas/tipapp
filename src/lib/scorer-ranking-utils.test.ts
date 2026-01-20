import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  getScorerRankingAtTime,
  getLeagueRankingsAtTime,
  getRankingHistory,
  getCurrentLeagueRankings,
} from './scorer-ranking-utils'
import { prisma } from '@/lib/prisma'

// Mock Prisma
vi.mock('@/lib/prisma', () => ({
  prisma: {
    topScorerRankingVersion: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
    },
  },
}))

describe('Scorer Ranking Utils', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('getScorerRankingAtTime', () => {
    it('should return ranking when version is current (effectiveTo is null)', async () => {
      const mockVersion = {
        ranking: 1,
      }

      vi.mocked(prisma.topScorerRankingVersion.findFirst).mockResolvedValue(mockVersion as any)

      const result = await getScorerRankingAtTime(100, new Date('2024-06-15'))

      expect(result).toBe(1)
      expect(prisma.topScorerRankingVersion.findFirst).toHaveBeenCalledWith({
        where: {
          leaguePlayerId: 100,
          effectiveFrom: { lte: new Date('2024-06-15') },
          OR: [
            { effectiveTo: null },
            { effectiveTo: { gt: new Date('2024-06-15') } },
          ],
        },
        orderBy: { effectiveFrom: 'desc' },
        select: { ranking: true },
      })
    })

    it('should return ranking when atTime is within version range', async () => {
      const mockVersion = {
        ranking: 2,
      }

      vi.mocked(prisma.topScorerRankingVersion.findFirst).mockResolvedValue(mockVersion as any)

      const result = await getScorerRankingAtTime(100, new Date('2024-06-10'))

      expect(result).toBe(2)
    })

    it('should return null when no version exists at the given time', async () => {
      vi.mocked(prisma.topScorerRankingVersion.findFirst).mockResolvedValue(null)

      const result = await getScorerRankingAtTime(100, new Date('2024-01-01'))

      expect(result).toBeNull()
    })

    it('should return null when player has no ranking history', async () => {
      vi.mocked(prisma.topScorerRankingVersion.findFirst).mockResolvedValue(null)

      const result = await getScorerRankingAtTime(999, new Date('2024-06-15'))

      expect(result).toBeNull()
    })
  })

  describe('getLeagueRankingsAtTime', () => {
    it('should return map of all rankings for league at given time', async () => {
      const mockVersions = [
        { leaguePlayerId: 100, ranking: 1 },
        { leaguePlayerId: 101, ranking: 2 },
        { leaguePlayerId: 102, ranking: 3 },
        { leaguePlayerId: 103, ranking: 4 },
      ]

      vi.mocked(prisma.topScorerRankingVersion.findMany).mockResolvedValue(mockVersions as any)

      const result = await getLeagueRankingsAtTime(1, new Date('2024-06-15'))

      expect(result).toBeInstanceOf(Map)
      expect(result.size).toBe(4)
      expect(result.get(100)).toBe(1)
      expect(result.get(101)).toBe(2)
      expect(result.get(102)).toBe(3)
      expect(result.get(103)).toBe(4)
    })

    it('should return empty map when no rankings exist at given time', async () => {
      vi.mocked(prisma.topScorerRankingVersion.findMany).mockResolvedValue([])

      const result = await getLeagueRankingsAtTime(1, new Date('2024-01-01'))

      expect(result).toBeInstanceOf(Map)
      expect(result.size).toBe(0)
    })

    it('should use distinct to get most recent per player', async () => {
      vi.mocked(prisma.topScorerRankingVersion.findMany).mockResolvedValue([])

      await getLeagueRankingsAtTime(1, new Date('2024-06-15'))

      expect(prisma.topScorerRankingVersion.findMany).toHaveBeenCalledWith({
        where: {
          leagueId: 1,
          effectiveFrom: { lte: new Date('2024-06-15') },
          OR: [
            { effectiveTo: null },
            { effectiveTo: { gt: new Date('2024-06-15') } },
          ],
        },
        orderBy: { effectiveFrom: 'desc' },
        distinct: ['leaguePlayerId'],
        select: {
          leaguePlayerId: true,
          ranking: true,
        },
      })
    })
  })

  describe('getRankingHistory', () => {
    it('should return all versions for a player ordered by effectiveFrom desc', async () => {
      const mockHistory = [
        {
          id: 3,
          leaguePlayerId: 100,
          ranking: 2,
          effectiveFrom: new Date('2024-06-15'),
          effectiveTo: null,
          User: { id: 1, username: 'admin', firstName: 'John', lastName: 'Doe' },
        },
        {
          id: 2,
          leaguePlayerId: 100,
          ranking: 1,
          effectiveFrom: new Date('2024-06-01'),
          effectiveTo: new Date('2024-06-15'),
          User: { id: 1, username: 'admin', firstName: 'John', lastName: 'Doe' },
        },
      ]

      vi.mocked(prisma.topScorerRankingVersion.findMany).mockResolvedValue(mockHistory as any)

      const result = await getRankingHistory(100)

      expect(result).toHaveLength(2)
      expect(result[0].ranking).toBe(2) // Most recent first
      expect(result[1].ranking).toBe(1)
      expect(prisma.topScorerRankingVersion.findMany).toHaveBeenCalledWith({
        where: { leaguePlayerId: 100 },
        orderBy: { effectiveFrom: 'desc' },
        include: {
          User: {
            select: {
              id: true,
              username: true,
              firstName: true,
              lastName: true,
            },
          },
        },
      })
    })

    it('should return empty array for player with no history', async () => {
      vi.mocked(prisma.topScorerRankingVersion.findMany).mockResolvedValue([])

      const result = await getRankingHistory(999)

      expect(result).toHaveLength(0)
    })
  })

  describe('getCurrentLeagueRankings', () => {
    it('should return only current rankings (effectiveTo is null)', async () => {
      const mockCurrent = [
        {
          id: 1,
          leaguePlayerId: 100,
          ranking: 1,
          effectiveTo: null,
          LeaguePlayer: {
            Player: { id: 10, firstName: 'Player', lastName: 'One' },
          },
        },
        {
          id: 2,
          leaguePlayerId: 101,
          ranking: 2,
          effectiveTo: null,
          LeaguePlayer: {
            Player: { id: 11, firstName: 'Player', lastName: 'Two' },
          },
        },
      ]

      vi.mocked(prisma.topScorerRankingVersion.findMany).mockResolvedValue(mockCurrent as any)

      const result = await getCurrentLeagueRankings(1)

      expect(result).toHaveLength(2)
      expect(prisma.topScorerRankingVersion.findMany).toHaveBeenCalledWith({
        where: {
          leagueId: 1,
          effectiveTo: null,
        },
        include: {
          LeaguePlayer: {
            include: {
              Player: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                },
              },
            },
          },
        },
        orderBy: { ranking: 'asc' },
      })
    })

    it('should return empty array when league has no current rankings', async () => {
      vi.mocked(prisma.topScorerRankingVersion.findMany).mockResolvedValue([])

      const result = await getCurrentLeagueRankings(999)

      expect(result).toHaveLength(0)
    })
  })

  describe('Time-based lookup scenarios', () => {
    it('should handle scenario: player ranking changed mid-tournament', async () => {
      // Scenario: Player was rank 1 from June 1-15, then changed to rank 2 after June 15
      // Query for June 10 should return rank 1
      // Query for June 20 should return rank 2

      const mockVersionJune10 = { ranking: 1 }
      const mockVersionJune20 = { ranking: 2 }

      vi.mocked(prisma.topScorerRankingVersion.findFirst)
        .mockResolvedValueOnce(mockVersionJune10 as any)
        .mockResolvedValueOnce(mockVersionJune20 as any)

      const rankAtJune10 = await getScorerRankingAtTime(100, new Date('2024-06-10'))
      const rankAtJune20 = await getScorerRankingAtTime(100, new Date('2024-06-20'))

      expect(rankAtJune10).toBe(1)
      expect(rankAtJune20).toBe(2)
    })

    it('should handle scenario: player ranking removed mid-tournament', async () => {
      // Scenario: Player had rank 1 but was removed (injured)
      // Query before removal should return rank 1
      // Query after removal should return null

      const mockVersionBefore = { ranking: 1 }

      vi.mocked(prisma.topScorerRankingVersion.findFirst)
        .mockResolvedValueOnce(mockVersionBefore as any)
        .mockResolvedValueOnce(null) // No active version after removal

      const rankBefore = await getScorerRankingAtTime(100, new Date('2024-06-01'))
      const rankAfter = await getScorerRankingAtTime(100, new Date('2024-06-20'))

      expect(rankBefore).toBe(1)
      expect(rankAfter).toBeNull()
    })
  })
})
