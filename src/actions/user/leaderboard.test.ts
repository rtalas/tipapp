import { describe, it, expect, vi, beforeEach } from 'vitest'
import { getLeaderboard, getUserPicks } from './leaderboard'
import { prisma } from '@/lib/prisma'
import * as userAuthUtils from '@/lib/auth/user-auth-utils'

vi.mock('@/lib/auth/auth-utils', () => ({
  requireAdmin: vi.fn(),
}))

vi.mock('@/lib/auth/user-auth-utils', () => ({
  requireLeagueMember: vi.fn(),
}))

const mockPrisma = vi.mocked(prisma, true)
const mockRequireLeagueMember = vi.mocked(userAuthUtils.requireLeagueMember)

describe('User Leaderboard Actions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockRequireLeagueMember.mockResolvedValue({
      userId: 5,
      leagueUser: { id: 10, userId: 5, leagueId: 1 },
    } as any)
  })

  describe('getLeaderboard', () => {
    it('should return leaderboard with ranked entries', async () => {
      // unstable_cache is pass-through in tests
      mockPrisma.leagueUser.findMany.mockResolvedValue([
        { id: 10, User: { id: 5, username: 'alice', firstName: 'Alice', lastName: 'A', avatarUrl: null } },
        { id: 11, User: { id: 6, username: 'bob', firstName: 'Bob', lastName: 'B', avatarUrl: null } },
      ] as any)

      // groupBy mocks for 4 bet types
      mockPrisma.userBet.groupBy.mockResolvedValue([
        { leagueUserId: 10, _sum: { totalPoints: 30 } },
        { leagueUserId: 11, _sum: { totalPoints: 20 } },
      ] as any)
      mockPrisma.userSpecialBetSerie.groupBy.mockResolvedValue([
        { leagueUserId: 10, _sum: { totalPoints: 5 } },
      ] as any)
      mockPrisma.userSpecialBetSingle.groupBy.mockResolvedValue([] as any)
      mockPrisma.userSpecialBetQuestion.groupBy.mockResolvedValue([
        { leagueUserId: 11, _sum: { totalPoints: 10 } },
      ] as any)

      mockPrisma.leaguePrize.findMany.mockResolvedValue([
        { rank: 1, amount: 10000, currency: 'CZK', label: null, type: 'prize' },
        { rank: 1, amount: 2000, currency: 'CZK', label: null, type: 'fine' },
      ] as any)

      const result = await getLeaderboard(1)

      expect(result.entries).toHaveLength(2)
      // Alice: 30 + 5 + 0 + 0 = 35 (rank 1)
      expect(result.entries[0].rank).toBe(1)
      expect(result.entries[0].totalPoints).toBe(35)
      expect(result.entries[0].isCurrentUser).toBe(true) // userId 5
      // Bob: 20 + 0 + 0 + 10 = 30 (rank 2)
      expect(result.entries[1].rank).toBe(2)
      expect(result.entries[1].totalPoints).toBe(30)
      expect(result.prizes).toHaveLength(1)
      expect(result.fines).toHaveLength(1)
    })

    it('should require league membership', async () => {
      mockRequireLeagueMember.mockRejectedValue(new Error('Not a member'))

      await expect(getLeaderboard(1)).rejects.toThrow('Not a member')
    })

    it('should assign sequential ranks to tied scores (no shared ranks)', async () => {
      mockPrisma.leagueUser.findMany.mockResolvedValue([
        { id: 10, User: { id: 5, username: 'alice', firstName: 'Alice', lastName: 'A', avatarUrl: null } },
        { id: 11, User: { id: 6, username: 'bob', firstName: 'Bob', lastName: 'B', avatarUrl: null } },
        { id: 12, User: { id: 7, username: 'charlie', firstName: 'Charlie', lastName: 'C', avatarUrl: null } },
      ] as any)

      // Alice and Bob both have 20 match points, Charlie has 10
      mockPrisma.userBet.groupBy.mockResolvedValue([
        { leagueUserId: 10, _sum: { totalPoints: 20 } },
        { leagueUserId: 11, _sum: { totalPoints: 20 } },
        { leagueUserId: 12, _sum: { totalPoints: 10 } },
      ] as any)
      mockPrisma.userSpecialBetSerie.groupBy.mockResolvedValue([] as any)
      mockPrisma.userSpecialBetSingle.groupBy.mockResolvedValue([] as any)
      mockPrisma.userSpecialBetQuestion.groupBy.mockResolvedValue([] as any)
      mockPrisma.leaguePrize.findMany.mockResolvedValue([] as any)

      const result = await getLeaderboard(1)

      expect(result.entries).toHaveLength(3)
      // Tied users get sequential ranks (1, 2) not shared rank (1, 1)
      expect(result.entries[0].totalPoints).toBe(20)
      expect(result.entries[0].rank).toBe(1)
      expect(result.entries[1].totalPoints).toBe(20)
      expect(result.entries[1].rank).toBe(2)
      expect(result.entries[2].totalPoints).toBe(10)
      expect(result.entries[2].rank).toBe(3)
    })

    it('should handle all users with zero points', async () => {
      mockPrisma.leagueUser.findMany.mockResolvedValue([
        { id: 10, User: { id: 5, username: 'alice', firstName: 'Alice', lastName: 'A', avatarUrl: null } },
        { id: 11, User: { id: 6, username: 'bob', firstName: 'Bob', lastName: 'B', avatarUrl: null } },
      ] as any)

      // No bets placed yet — all groupBy return empty
      mockPrisma.userBet.groupBy.mockResolvedValue([] as any)
      mockPrisma.userSpecialBetSerie.groupBy.mockResolvedValue([] as any)
      mockPrisma.userSpecialBetSingle.groupBy.mockResolvedValue([] as any)
      mockPrisma.userSpecialBetQuestion.groupBy.mockResolvedValue([] as any)
      mockPrisma.leaguePrize.findMany.mockResolvedValue([] as any)

      const result = await getLeaderboard(1)

      expect(result.entries).toHaveLength(2)
      expect(result.entries[0].totalPoints).toBe(0)
      expect(result.entries[1].totalPoints).toBe(0)
      // Still get sequential ranks even at 0 points
      expect(result.entries[0].rank).toBe(1)
      expect(result.entries[1].rank).toBe(2)
    })

    it('should correctly separate prizes and fines from prize records', async () => {
      mockPrisma.leagueUser.findMany.mockResolvedValue([
        { id: 10, User: { id: 5, username: 'alice', firstName: 'Alice', lastName: 'A', avatarUrl: null } },
      ] as any)
      mockPrisma.userBet.groupBy.mockResolvedValue([] as any)
      mockPrisma.userSpecialBetSerie.groupBy.mockResolvedValue([] as any)
      mockPrisma.userSpecialBetSingle.groupBy.mockResolvedValue([] as any)
      mockPrisma.userSpecialBetQuestion.groupBy.mockResolvedValue([] as any)

      mockPrisma.leaguePrize.findMany.mockResolvedValue([
        { rank: 1, amount: 10000, currency: 'CZK', label: '1st', type: 'prize' },
        { rank: 2, amount: 5000, currency: 'CZK', label: '2nd', type: 'prize' },
        { rank: 3, amount: 2000, currency: 'CZK', label: '3rd', type: 'prize' },
        { rank: 1, amount: 3000, currency: 'CZK', label: 'Last place', type: 'fine' },
        { rank: 2, amount: 1500, currency: 'CZK', label: '2nd to last', type: 'fine' },
      ] as any)

      const result = await getLeaderboard(1)

      expect(result.prizes).toHaveLength(3)
      expect(result.prizes[0]).toEqual({ rank: 1, amount: 10000, currency: 'CZK', label: '1st' })
      expect(result.prizes[2]).toEqual({ rank: 3, amount: 2000, currency: 'CZK', label: '3rd' })
      expect(result.fines).toHaveLength(2)
      expect(result.fines[0]).toEqual({ rank: 1, amount: 3000, currency: 'CZK', label: 'Last place' })
      expect(result.fines[1]).toEqual({ rank: 2, amount: 1500, currency: 'CZK', label: '2nd to last' })
    })

    it('should rank users correctly with points across all bet types', async () => {
      // 14 participants to test fines-from-bottom edge case with realistic data
      const users = Array.from({ length: 14 }, (_, i) => ({
        id: 100 + i,
        User: { id: 200 + i, username: `user${i}`, firstName: `User`, lastName: `${i}`, avatarUrl: null },
      }))
      mockPrisma.leagueUser.findMany.mockResolvedValue(users as any)

      // Varying match points so we get a spread
      mockPrisma.userBet.groupBy.mockResolvedValue(
        users.map((u, i) => ({
          leagueUserId: u.id,
          _sum: { totalPoints: (14 - i) * 10 }, // 140, 130, ..., 10
        })) as any
      )
      mockPrisma.userSpecialBetSerie.groupBy.mockResolvedValue([] as any)
      mockPrisma.userSpecialBetSingle.groupBy.mockResolvedValue([] as any)
      mockPrisma.userSpecialBetQuestion.groupBy.mockResolvedValue([] as any)

      mockPrisma.leaguePrize.findMany.mockResolvedValue([
        { rank: 1, amount: 10000, currency: 'CZK', label: null, type: 'prize' },
        { rank: 1, amount: 2000, currency: 'CZK', label: null, type: 'fine' },
      ] as any)

      const result = await getLeaderboard(1)

      expect(result.entries).toHaveLength(14)
      // First place: user0 with 140 points
      expect(result.entries[0].rank).toBe(1)
      expect(result.entries[0].totalPoints).toBe(140)
      // Last place: user13 with 10 points (rank 14)
      expect(result.entries[13].rank).toBe(14)
      expect(result.entries[13].totalPoints).toBe(10)

      // Fine rank 1 maps to leaderboard rank 14 (last place)
      // positionFromBottom = totalEntries - rank + 1 = 14 - 14 + 1 = 1
      // This is the calculation the component uses in getFine()
      const lastPlace = result.entries[13]
      const positionFromBottom = result.entries.length - lastPlace.rank + 1
      expect(positionFromBottom).toBe(1)
      const fine = result.fines.find((f) => f.rank === positionFromBottom)
      expect(fine).toBeDefined()
      expect(fine!.amount).toBe(2000)

      // Second-to-last (rank 13) should NOT get fine rank 1
      const secondToLast = result.entries[12]
      const secondFromBottom = result.entries.length - secondToLast.rank + 1
      expect(secondFromBottom).toBe(2)
      // No fine for rank 2 from bottom (only rank 1 fine configured)
      const noFine = result.fines.find((f) => f.rank === secondFromBottom)
      expect(noFine).toBeUndefined()
    })

    it('should handle single participant league', async () => {
      mockPrisma.leagueUser.findMany.mockResolvedValue([
        { id: 10, User: { id: 5, username: 'solo', firstName: 'Solo', lastName: 'Player', avatarUrl: null } },
      ] as any)
      mockPrisma.userBet.groupBy.mockResolvedValue([
        { leagueUserId: 10, _sum: { totalPoints: 42 } },
      ] as any)
      mockPrisma.userSpecialBetSerie.groupBy.mockResolvedValue([] as any)
      mockPrisma.userSpecialBetSingle.groupBy.mockResolvedValue([] as any)
      mockPrisma.userSpecialBetQuestion.groupBy.mockResolvedValue([] as any)
      mockPrisma.leaguePrize.findMany.mockResolvedValue([
        { rank: 1, amount: 10000, currency: 'CZK', label: null, type: 'prize' },
        { rank: 1, amount: 2000, currency: 'CZK', label: null, type: 'fine' },
      ] as any)

      const result = await getLeaderboard(1)

      expect(result.entries).toHaveLength(1)
      expect(result.entries[0].rank).toBe(1)
      expect(result.entries[0].totalPoints).toBe(42)

      // Single participant: rank 1, positionFromBottom = 1 - 1 + 1 = 1
      // They would qualify for BOTH prize rank 1 AND fine rank 1
      const posFromBottom = result.entries.length - result.entries[0].rank + 1
      expect(posFromBottom).toBe(1)
    })

    it('should handle empty league (no active users)', async () => {
      mockPrisma.leagueUser.findMany.mockResolvedValue([] as any)
      mockPrisma.userBet.groupBy.mockResolvedValue([] as any)
      mockPrisma.userSpecialBetSerie.groupBy.mockResolvedValue([] as any)
      mockPrisma.userSpecialBetSingle.groupBy.mockResolvedValue([] as any)
      mockPrisma.userSpecialBetQuestion.groupBy.mockResolvedValue([] as any)
      mockPrisma.leaguePrize.findMany.mockResolvedValue([] as any)

      const result = await getLeaderboard(1)

      expect(result.entries).toHaveLength(0)
      expect(result.prizes).toHaveLength(0)
      expect(result.fines).toHaveLength(0)
    })
  })

  describe('getUserPicks', () => {
    it('should return picks across all bet types', async () => {
      // Mock all 4 parallel queries returning empty arrays
      mockPrisma.userBet.findMany.mockResolvedValue([])
      mockPrisma.userSpecialBetSerie.findMany.mockResolvedValue([])
      mockPrisma.userSpecialBetSingle.findMany.mockResolvedValue([])
      mockPrisma.userSpecialBetQuestion.findMany.mockResolvedValue([])

      const result = await getUserPicks(1, 10)

      expect(result.matches).toEqual([])
      expect(result.series).toEqual([])
      expect(result.specialBets).toEqual([])
      expect(result.questions).toEqual([])
    })

    it('should require league membership', async () => {
      mockRequireLeagueMember.mockRejectedValue(new Error('Not a member'))

      await expect(getUserPicks(1, 10)).rejects.toThrow('Not a member')
    })

    it('should transform match bets correctly', async () => {
      mockPrisma.userBet.findMany.mockResolvedValue([
        {
          id: 1,
          homeScore: 2,
          awayScore: 1,
          overtime: false,
          totalPoints: 5,
          scorerId: null,
          LeaguePlayer: null,
          LeagueMatch: {
            Match: {
              dateTime: new Date('2026-06-01'),
              homeFinalScore: 2,
              awayFinalScore: 1,
              isOvertime: false,
              isShootout: false,
              isEvaluated: true,
              MatchScorer: [],
              LeagueTeam_Match_homeTeamIdToLeagueTeam: {
                Team: { name: 'Team A', flagIcon: 'flag-a' },
              },
              LeagueTeam_Match_awayTeamIdToLeagueTeam: {
                Team: { name: 'Team B', flagIcon: 'flag-b' },
              },
            },
          },
        },
      ] as any)
      mockPrisma.userSpecialBetSerie.findMany.mockResolvedValue([])
      mockPrisma.userSpecialBetSingle.findMany.mockResolvedValue([])
      mockPrisma.userSpecialBetQuestion.findMany.mockResolvedValue([])

      const result = await getUserPicks(1, 10)

      expect(result.matches).toHaveLength(1)
      expect(result.matches[0].homeScore).toBe(2)
      expect(result.matches[0].awayScore).toBe(1)
      expect(result.matches[0].totalPoints).toBe(5)
      expect(result.matches[0].homeTeamName).toBe('Team A')
    })
  })
})
