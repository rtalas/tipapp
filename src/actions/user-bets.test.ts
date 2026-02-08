import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  getMatchesWithUserBets,
  createUserBet,
  updateUserBet,
  deleteUserBet,
} from './user-bets'
import { prisma } from '@/lib/prisma'
import * as authUtils from '@/lib/auth/auth-utils'

vi.mock('@/lib/auth/auth-utils', () => ({
  requireAdmin: vi.fn(),
}))

vi.mock('@/lib/query-builders', () => ({
  buildUserPicksWhere: vi.fn().mockReturnValue({}),
}))

const mockPrisma = vi.mocked(prisma, true)
const mockRequireAdmin = vi.mocked(authUtils.requireAdmin)

describe('User Bets Actions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockRequireAdmin.mockResolvedValue({ user: { id: '1', isSuperadmin: true } } as any)
  })

  describe('getMatchesWithUserBets', () => {
    it('should return matches with user bets', async () => {
      mockPrisma.leagueMatch.findMany.mockResolvedValue([{ id: 1 }] as any)

      const result = await getMatchesWithUserBets({ leagueId: 1 })

      expect(mockRequireAdmin).toHaveBeenCalled()
      expect(result).toHaveLength(1)
    })

    it('should require admin', async () => {
      mockRequireAdmin.mockRejectedValue(new Error('Unauthorized'))

      await expect(getMatchesWithUserBets()).rejects.toThrow('Unauthorized')
    })
  })

  describe('createUserBet', () => {
    it('should create bet in serializable transaction', async () => {
      const txMocks = {
        leagueMatch: {
          findUnique: vi.fn().mockResolvedValue({
            id: 1,
            leagueId: 1,
            Match: { homeTeamId: 10, awayTeamId: 20, deletedAt: null },
          }),
        },
        leagueUser: { findUnique: vi.fn().mockResolvedValue({ id: 5, leagueId: 1 }) },
        userBet: {
          findFirst: vi.fn().mockResolvedValue(null), // no existing bet
          create: vi.fn().mockResolvedValue({ id: 100 }),
        },
        leaguePlayer: { findUnique: vi.fn() },
      }
      mockPrisma.$transaction.mockImplementation(async (fn: any) => fn(txMocks))

      const result = await createUserBet({
        leagueMatchId: 1,
        leagueUserId: 5,
        homeScore: 2,
        awayScore: 1,
        overtime: false,
      })

      expect(result.success).toBe(true)
      expect((result as any).betId).toBe(100)
    })

    it('should reject duplicate bet', async () => {
      const txMocks = {
        leagueMatch: {
          findUnique: vi.fn().mockResolvedValue({
            id: 1,
            leagueId: 1,
            Match: { homeTeamId: 10, awayTeamId: 20, deletedAt: null },
          }),
        },
        leagueUser: { findUnique: vi.fn().mockResolvedValue({ id: 5, leagueId: 1 }) },
        userBet: {
          findFirst: vi.fn().mockResolvedValue({ id: 99 }), // existing bet
        },
        leaguePlayer: { findUnique: vi.fn() },
      }
      mockPrisma.$transaction.mockImplementation(async (fn: any) => fn(txMocks))

      const result = await createUserBet({
        leagueMatchId: 1,
        leagueUserId: 5,
        homeScore: 2,
        awayScore: 1,
        overtime: false,
      })

      expect(result.success).toBe(false)
      expect((result as any).error).toContain('already has a bet')
    })

    it('should reject when match not found', async () => {
      const txMocks = {
        leagueMatch: { findUnique: vi.fn().mockResolvedValue(null) },
        leagueUser: { findUnique: vi.fn() },
        userBet: { findFirst: vi.fn() },
        leaguePlayer: { findUnique: vi.fn() },
      }
      mockPrisma.$transaction.mockImplementation(async (fn: any) => fn(txMocks))

      const result = await createUserBet({
        leagueMatchId: 999,
        leagueUserId: 5,
        homeScore: 1,
        awayScore: 0,
        overtime: false,
      })

      expect(result.success).toBe(false)
      expect((result as any).error).toContain('Match not found')
    })

    it('should reject cross-league bet creation', async () => {
      const txMocks = {
        leagueMatch: {
          findUnique: vi.fn().mockResolvedValue({
            id: 1,
            leagueId: 1,
            Match: { homeTeamId: 10, awayTeamId: 20, deletedAt: null },
          }),
        },
        leagueUser: { findUnique: vi.fn().mockResolvedValue({ id: 5, leagueId: 2 }) },
        userBet: { findFirst: vi.fn() },
        leaguePlayer: { findUnique: vi.fn() },
      }
      mockPrisma.$transaction.mockImplementation(async (fn: any) => fn(txMocks))

      const result = await createUserBet({
        leagueMatchId: 1,
        leagueUserId: 5,
        homeScore: 2,
        awayScore: 1,
        overtime: false,
      })

      expect(result.success).toBe(false)
      expect((result as any).error).toContain('does not belong to the same league')
    })

    it('should validate scorer belongs to playing teams', async () => {
      const txMocks = {
        leagueMatch: {
          findUnique: vi.fn().mockResolvedValue({
            id: 1,
            leagueId: 1,
            Match: { homeTeamId: 10, awayTeamId: 20, deletedAt: null },
          }),
        },
        leagueUser: { findUnique: vi.fn().mockResolvedValue({ id: 5, leagueId: 1 }) },
        userBet: { findFirst: vi.fn().mockResolvedValue(null) },
        leaguePlayer: {
          findUnique: vi.fn().mockResolvedValue({ id: 30, leagueTeamId: 99 }), // wrong team
        },
      }
      mockPrisma.$transaction.mockImplementation(async (fn: any) => fn(txMocks))

      const result = await createUserBet({
        leagueMatchId: 1,
        leagueUserId: 5,
        homeScore: 1,
        awayScore: 0,
        overtime: false,
        scorerId: 30,
      })

      expect(result.success).toBe(false)
      expect((result as any).error).toContain('Scorer must belong')
    })
  })

  describe('updateUserBet', () => {
    it('should update bet', async () => {
      mockPrisma.userBet.findUnique.mockResolvedValue({
        id: 1,
        LeagueMatch: { Match: { isEvaluated: false, deletedAt: null } },
      } as any)
      mockPrisma.userBet.update.mockResolvedValue({ id: 1 } as any)

      const result = await updateUserBet({ id: 1, homeScore: 3 })

      expect(result.success).toBe(true)
    })

    it('should return error when bet not found', async () => {
      mockPrisma.userBet.findUnique.mockResolvedValue(null)

      const result = await updateUserBet({ id: 999, homeScore: 1 })

      expect(result.success).toBe(false)
      expect((result as any).error).toContain('Bet not found')
    })

    it('should reject scorer + noScorer combo', async () => {
      mockPrisma.userBet.findUnique.mockResolvedValue({
        id: 1,
        LeagueMatch: { Match: { isEvaluated: false, deletedAt: null } },
      } as any)

      const result = await updateUserBet({ id: 1, scorerId: 5, noScorer: true })

      expect(result.success).toBe(false)
      expect((result as any).error).toContain('Cannot set both')
    })
  })

  describe('deleteUserBet', () => {
    it('should soft delete bet', async () => {
      mockPrisma.userBet.findUnique.mockResolvedValue({ id: 1 } as any)
      mockPrisma.userBet.update.mockResolvedValue({ id: 1 } as any)

      const result = await deleteUserBet(1)

      expect(result.success).toBe(true)
      expect(mockPrisma.userBet.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { deletedAt: expect.any(Date) },
      })
    })

    it('should return error when bet not found', async () => {
      mockPrisma.userBet.findUnique.mockResolvedValue(null)

      const result = await deleteUserBet(999)

      expect(result.success).toBe(false)
      expect((result as any).error).toContain('Bet not found')
    })
  })
})
