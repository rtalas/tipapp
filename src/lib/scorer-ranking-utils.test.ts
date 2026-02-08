import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  getLeagueRankingsAtTime,
  getRankingHistory,
  getCurrentLeagueRankings,
} from './scorer-ranking-utils'
import { prisma } from '@/lib/prisma'

describe('Scorer Ranking Utils', () => {
  beforeEach(() => {
    vi.clearAllMocks()
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

})
