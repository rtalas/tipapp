import { describe, it, expect, vi, beforeEach } from 'vitest'
import { prisma } from '@/lib/prisma'
import * as userAuthUtils from '@/lib/auth/user-auth-utils'
import { AppError } from '@/lib/error-handler'
import { SPORT_IDS } from '@/lib/constants'

vi.mock('@/lib/auth/user-auth-utils', () => ({
  requireLeagueMember: vi.fn(),
  isBettingOpen: vi.fn(),
}))

const mockPrisma = vi.mocked(prisma)
const mockRequireLeagueMember = vi.mocked(userAuthUtils.requireLeagueMember)
const mockIsBettingOpen = vi.mocked(userAuthUtils.isBettingOpen)

// Import after mocks are set up
const { getUserMatches, getMatchFriendPredictions, saveMatchBet } = await import('./matches')

const mockLeagueUser = {
  id: 10,
  leagueId: 1,
  userId: 5,
  admin: false,
  active: true,
  paid: true,
}

const mockMemberResult = {
  session: { user: { id: '5' } },
  leagueUser: mockLeagueUser,
  userId: 5,
} as any

describe('User Matches Actions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('getUserMatches', () => {
    it('should fetch matches with user bets merged', async () => {
      mockRequireLeagueMember.mockResolvedValue(mockMemberResult)
      mockIsBettingOpen.mockReturnValue(true)

      const matchData = [
        {
          id: 100,
          leagueId: 1,
          Match: { dateTime: new Date('2099-01-01') },
        },
      ]
      mockPrisma.leagueMatch.findMany.mockResolvedValue(matchData as any)
      mockPrisma.userBet.findMany.mockResolvedValue([
        { leagueMatchId: 100, homeScore: 2, awayScore: 1 },
      ] as any)

      const result = await getUserMatches(1)

      expect(result).toHaveLength(1)
      expect(result[0].userBet).toBeDefined()
      expect(result[0].userBet!.homeScore).toBe(2)
    })

    it('should set userBet to null when no bet exists', async () => {
      mockRequireLeagueMember.mockResolvedValue(mockMemberResult)
      mockIsBettingOpen.mockReturnValue(true)

      mockPrisma.leagueMatch.findMany.mockResolvedValue([
        { id: 200, Match: { dateTime: new Date('2099-01-01') } },
      ] as any)
      mockPrisma.userBet.findMany.mockResolvedValue([])

      const result = await getUserMatches(1)

      expect(result[0].userBet).toBeNull()
    })

    it('should include isBettingOpen status', async () => {
      mockRequireLeagueMember.mockResolvedValue(mockMemberResult)
      mockIsBettingOpen.mockReturnValue(false)

      mockPrisma.leagueMatch.findMany.mockResolvedValue([
        { id: 300, Match: { dateTime: new Date('2020-01-01') } },
      ] as any)
      mockPrisma.userBet.findMany.mockResolvedValue([])

      const result = await getUserMatches(1)

      expect(result[0].isBettingOpen).toBe(false)
    })

    it('should throw when user is not a league member', async () => {
      mockRequireLeagueMember.mockRejectedValue(
        new AppError('Unauthorized: Not a member of this league', 'FORBIDDEN', 403)
      )

      await expect(getUserMatches(1)).rejects.toThrow('Not a member')
    })
  })

  describe('getMatchFriendPredictions', () => {
    it('should return empty predictions when betting is open', async () => {
      mockPrisma.leagueMatch.findUnique.mockResolvedValue({
        id: 100,
        leagueId: 1,
        deletedAt: null,
        Match: { dateTime: new Date('2099-01-01') },
      } as any)
      mockRequireLeagueMember.mockResolvedValue(mockMemberResult)
      mockIsBettingOpen.mockReturnValue(true)

      const result = await getMatchFriendPredictions(100)

      expect(result.isLocked).toBe(false)
      expect(result.predictions).toHaveLength(0)
    })

    it('should return friend predictions when betting is closed', async () => {
      mockPrisma.leagueMatch.findUnique.mockResolvedValue({
        id: 100,
        leagueId: 1,
        deletedAt: null,
        Match: { dateTime: new Date('2020-01-01') },
      } as any)
      mockRequireLeagueMember.mockResolvedValue(mockMemberResult)
      mockIsBettingOpen.mockReturnValue(false)

      const friendBets = [
        {
          id: 1,
          leagueUserId: 20,
          homeScore: 3,
          awayScore: 1,
          LeagueUser: { User: { id: 2, firstName: 'Jan', lastName: 'Novak', username: 'jan' } },
        },
      ]
      mockPrisma.userBet.findMany.mockResolvedValue(friendBets as any)

      const result = await getMatchFriendPredictions(100)

      expect(result.isLocked).toBe(true)
      expect(result.predictions).toHaveLength(1)
    })

    it('should exclude current user predictions', async () => {
      mockPrisma.leagueMatch.findUnique.mockResolvedValue({
        id: 100,
        leagueId: 1,
        deletedAt: null,
        Match: { dateTime: new Date('2020-01-01') },
      } as any)
      mockRequireLeagueMember.mockResolvedValue(mockMemberResult)
      mockIsBettingOpen.mockReturnValue(false)
      mockPrisma.userBet.findMany.mockResolvedValue([])

      await getMatchFriendPredictions(100)

      expect(mockPrisma.userBet.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            leagueUserId: { not: mockLeagueUser.id },
          }),
        })
      )
    })

    it('should throw when match not found', async () => {
      mockPrisma.leagueMatch.findUnique.mockResolvedValue(null)

      await expect(getMatchFriendPredictions(999)).rejects.toThrow('Match not found')
    })
  })

  describe('saveMatchBet', () => {
    const validInput = {
      leagueMatchId: 100,
      homeScore: 2,
      awayScore: 1,
      scorerId: null,
      noScorer: null,
      overtime: false,
      homeAdvanced: null,
    }

    const mockLeagueMatch = {
      id: 100,
      leagueId: 1,
      deletedAt: null,
      League: { sportId: SPORT_IDS.FOOTBALL },
      Match: {
        dateTime: new Date('2099-01-01'),
        homeTeamId: 10,
        awayTeamId: 20,
        LeagueTeam_Match_homeTeamIdToLeagueTeam: { id: 10 },
        LeagueTeam_Match_awayTeamIdToLeagueTeam: { id: 20 },
      },
    }

    beforeEach(() => {
      // Default: match exists and user is a member
      mockPrisma.leagueMatch.findUnique.mockResolvedValue({
        leagueId: 1,
        ...mockLeagueMatch,
      } as any)
      mockRequireLeagueMember.mockResolvedValue(mockMemberResult)
      mockIsBettingOpen.mockReturnValue(true)
    })

    it('should create a new bet successfully', async () => {
      mockPrisma.$transaction.mockImplementation(async (fn: any) => {
        const tx = {
          leagueMatch: { findUnique: vi.fn().mockResolvedValue(mockLeagueMatch) },
          userBet: {
            findFirst: vi.fn().mockResolvedValue(null),
            create: vi.fn(),
          },
          leaguePlayer: { findUnique: vi.fn() },
        }
        return fn(tx)
      })

      const result = await saveMatchBet(validInput)

      expect(result.success).toBe(true)
    })

    it('should update an existing bet', async () => {
      const existingBet = { id: 50, leagueMatchId: 100, leagueUserId: 10 }

      mockPrisma.$transaction.mockImplementation(async (fn: any) => {
        const tx = {
          leagueMatch: { findUnique: vi.fn().mockResolvedValue(mockLeagueMatch) },
          userBet: {
            findFirst: vi.fn().mockResolvedValue(existingBet),
            update: vi.fn(),
          },
          leaguePlayer: { findUnique: vi.fn() },
        }
        return fn(tx)
      })

      const result = await saveMatchBet(validInput)

      expect(result.success).toBe(true)
    })

    it('should return error when match not found (pre-transaction)', async () => {
      mockPrisma.leagueMatch.findUnique.mockResolvedValue(null)

      const result = await saveMatchBet(validInput)

      expect(result.success).toBe(false)
      expect(result.error).toBe('Match not found')
    })

    it('should return error when betting is closed', async () => {
      mockIsBettingOpen.mockReturnValue(false)

      mockPrisma.$transaction.mockImplementation(async (fn: any) => {
        const tx = {
          leagueMatch: { findUnique: vi.fn().mockResolvedValue(mockLeagueMatch) },
          userBet: { findFirst: vi.fn() },
          leaguePlayer: { findUnique: vi.fn() },
        }
        // isBettingOpen is called inside saveMatchBet's transaction
        // but the mock controls it globally
        return fn(tx)
      })

      const result = await saveMatchBet(validInput)

      expect(result.success).toBe(false)
      expect(result.error).toContain('Betting is closed')
    })

    it('should reject invalid input (negative score)', async () => {
      const result = await saveMatchBet({
        ...validInput,
        homeScore: -1,
      })

      expect(result.success).toBe(false)
    })

    it('should reject invalid leagueMatchId', async () => {
      const result = await saveMatchBet({
        ...validInput,
        leagueMatchId: -5,
      })

      expect(result.success).toBe(false)
    })

    it('should reject both scorerId and noScorer set', async () => {
      const result = await saveMatchBet({
        ...validInput,
        scorerId: 42,
        noScorer: true,
      })

      expect(result.success).toBe(false)
      expect(result.error).toContain('Cannot set both scorer and no scorer')
    })

    it('should reject noScorer for non-football matches', async () => {
      const hockeyMatch = {
        ...mockLeagueMatch,
        League: { sportId: SPORT_IDS.HOCKEY },
      }

      mockPrisma.$transaction.mockImplementation(async (fn: any) => {
        const tx = {
          leagueMatch: { findUnique: vi.fn().mockResolvedValue(hockeyMatch) },
          userBet: { findFirst: vi.fn() },
          leaguePlayer: { findUnique: vi.fn() },
        }
        return fn(tx)
      })

      const result = await saveMatchBet({
        ...validInput,
        noScorer: true,
      })

      expect(result.success).toBe(false)
      expect(result.error).toContain('only available for soccer')
    })

    it('should reject scorer not belonging to playing teams', async () => {
      const invalidScorer = { id: 42, leagueTeamId: 999 } // wrong team

      mockPrisma.$transaction.mockImplementation(async (fn: any) => {
        const tx = {
          leagueMatch: { findUnique: vi.fn().mockResolvedValue(mockLeagueMatch) },
          userBet: { findFirst: vi.fn().mockResolvedValue(null) },
          leaguePlayer: { findUnique: vi.fn().mockResolvedValue(invalidScorer) },
        }
        return fn(tx)
      })

      const result = await saveMatchBet({
        ...validInput,
        scorerId: 42,
      })

      expect(result.success).toBe(false)
      expect(result.error).toContain('Scorer must belong to one of the teams')
    })

    it('should reject non-existent scorer', async () => {
      mockPrisma.$transaction.mockImplementation(async (fn: any) => {
        const tx = {
          leagueMatch: { findUnique: vi.fn().mockResolvedValue(mockLeagueMatch) },
          userBet: { findFirst: vi.fn().mockResolvedValue(null) },
          leaguePlayer: { findUnique: vi.fn().mockResolvedValue(null) },
        }
        return fn(tx)
      })

      const result = await saveMatchBet({
        ...validInput,
        scorerId: 999,
      })

      expect(result.success).toBe(false)
      expect(result.error).toContain('Scorer not found')
    })

    it('should accept valid scorer from home team', async () => {
      const homeScorer = { id: 42, leagueTeamId: 10 } // home team

      mockPrisma.$transaction.mockImplementation(async (fn: any) => {
        const tx = {
          leagueMatch: { findUnique: vi.fn().mockResolvedValue(mockLeagueMatch) },
          userBet: {
            findFirst: vi.fn().mockResolvedValue(null),
            create: vi.fn(),
          },
          leaguePlayer: { findUnique: vi.fn().mockResolvedValue(homeScorer) },
        }
        return fn(tx)
      })

      const result = await saveMatchBet({
        ...validInput,
        scorerId: 42,
      })

      expect(result.success).toBe(true)
    })

    it('should accept valid scorer from away team', async () => {
      const awayScorer = { id: 43, leagueTeamId: 20 } // away team

      mockPrisma.$transaction.mockImplementation(async (fn: any) => {
        const tx = {
          leagueMatch: { findUnique: vi.fn().mockResolvedValue(mockLeagueMatch) },
          userBet: {
            findFirst: vi.fn().mockResolvedValue(null),
            create: vi.fn(),
          },
          leaguePlayer: { findUnique: vi.fn().mockResolvedValue(awayScorer) },
        }
        return fn(tx)
      })

      const result = await saveMatchBet({
        ...validInput,
        scorerId: 43,
      })

      expect(result.success).toBe(true)
    })

    it('should use Serializable isolation level', async () => {
      mockPrisma.$transaction.mockImplementation(async (fn: any, opts: any) => {
        expect(opts.isolationLevel).toBe('Serializable')
        const tx = {
          leagueMatch: { findUnique: vi.fn().mockResolvedValue(mockLeagueMatch) },
          userBet: {
            findFirst: vi.fn().mockResolvedValue(null),
            create: vi.fn(),
          },
          leaguePlayer: { findUnique: vi.fn() },
        }
        return fn(tx)
      })

      await saveMatchBet(validInput)

      expect(mockPrisma.$transaction).toHaveBeenCalledWith(
        expect.any(Function),
        expect.objectContaining({
          isolationLevel: 'Serializable',
          maxWait: 5000,
          timeout: 10000,
        })
      )
    })

    it('should handle transaction failure', async () => {
      mockPrisma.$transaction.mockRejectedValue(new Error('Serialization failure'))

      await expect(saveMatchBet(validInput)).rejects.toThrow('Serialization failure')
    })

    it('should not throw for AppError inside transaction', async () => {
      mockPrisma.$transaction.mockRejectedValue(
        new AppError('Betting is closed for this match', 'BETTING_CLOSED', 400)
      )

      const result = await saveMatchBet(validInput)

      expect(result.success).toBe(false)
      expect(result.error).toBe('Betting is closed for this match')
    })
  })
})
