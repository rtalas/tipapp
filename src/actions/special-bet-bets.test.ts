import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  getSpecialBetsWithUserBets,
  createUserSpecialBet,
  updateUserSpecialBet,
  deleteUserSpecialBet,
} from './special-bet-bets'
import { prisma } from '@/lib/prisma'
import * as authUtils from '@/lib/auth/auth-utils'

vi.mock('@/lib/auth/auth-utils', () => ({
  requireAdmin: vi.fn(),
}))

vi.mock('@/lib/query-builders', () => ({
  buildSpecialBetPicksWhere: vi.fn().mockReturnValue({}),
}))

const mockPrisma = vi.mocked(prisma, true)
const mockRequireAdmin = vi.mocked(authUtils.requireAdmin)

describe('Special Bet Bets Actions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockRequireAdmin.mockResolvedValue({ user: { id: '1', isSuperadmin: true } } as any)
  })

  describe('getSpecialBetsWithUserBets', () => {
    it('should return special bets with user bets', async () => {
      mockPrisma.leagueSpecialBetSingle.findMany.mockResolvedValue([{ id: 1 }] as any)

      const result = await getSpecialBetsWithUserBets({ leagueId: 1 })

      expect(mockRequireAdmin).toHaveBeenCalled()
      expect(result).toHaveLength(1)
    })

    it('should require admin', async () => {
      mockRequireAdmin.mockRejectedValue(new Error('Unauthorized'))

      await expect(getSpecialBetsWithUserBets()).rejects.toThrow('Unauthorized')
    })
  })

  describe('createUserSpecialBet', () => {
    it('should create special bet with team prediction', async () => {
      const txMocks = {
        leagueSpecialBetSingle: { findUnique: vi.fn().mockResolvedValue({ id: 1, leagueId: 1 }) },
        leagueUser: { findUnique: vi.fn().mockResolvedValue({ id: 5, leagueId: 1 }) },
        userSpecialBetSingle: {
          findFirst: vi.fn().mockResolvedValue(null),
          create: vi.fn().mockResolvedValue({ id: 100 }),
        },
        leagueTeam: { findFirst: vi.fn().mockResolvedValue({ id: 10 }) },
        leaguePlayer: { findFirst: vi.fn() },
      }
      mockPrisma.$transaction.mockImplementation(async (fn: any) => fn(txMocks))

      const result = await createUserSpecialBet({
        leagueSpecialBetSingleId: 1,
        leagueUserId: 5,
        teamResultId: 10,
      })

      expect(result.success).toBe(true)
    })

    it('should reject duplicate bet', async () => {
      const txMocks = {
        leagueSpecialBetSingle: { findUnique: vi.fn().mockResolvedValue({ id: 1, leagueId: 1 }) },
        leagueUser: { findUnique: vi.fn().mockResolvedValue({ id: 5, leagueId: 1 }) },
        userSpecialBetSingle: {
          findFirst: vi.fn().mockResolvedValue({ id: 99 }),
        },
        leagueTeam: { findFirst: vi.fn() },
        leaguePlayer: { findFirst: vi.fn() },
      }
      mockPrisma.$transaction.mockImplementation(async (fn: any) => fn(txMocks))

      const result = await createUserSpecialBet({
        leagueSpecialBetSingleId: 1,
        leagueUserId: 5,
        teamResultId: 10,
      })

      expect(result.success).toBe(false)
      expect((result as any).error).toContain('already has a bet')
    })

    it('should reject cross-league bet creation', async () => {
      const txMocks = {
        leagueSpecialBetSingle: { findUnique: vi.fn().mockResolvedValue({ id: 1, leagueId: 1 }) },
        leagueUser: { findUnique: vi.fn().mockResolvedValue({ id: 5, leagueId: 2 }) },
        userSpecialBetSingle: { findFirst: vi.fn() },
        leagueTeam: { findFirst: vi.fn() },
        leaguePlayer: { findFirst: vi.fn() },
      }
      mockPrisma.$transaction.mockImplementation(async (fn: any) => fn(txMocks))

      const result = await createUserSpecialBet({
        leagueSpecialBetSingleId: 1,
        leagueUserId: 5,
        teamResultId: 10,
      })

      expect(result.success).toBe(false)
      expect((result as any).error).toContain('does not belong to the same league')
    })

    it('should validate team belongs to league', async () => {
      const txMocks = {
        leagueSpecialBetSingle: { findUnique: vi.fn().mockResolvedValue({ id: 1, leagueId: 1 }) },
        leagueUser: { findUnique: vi.fn().mockResolvedValue({ id: 5, leagueId: 1 }) },
        userSpecialBetSingle: { findFirst: vi.fn().mockResolvedValue(null) },
        leagueTeam: { findFirst: vi.fn().mockResolvedValue(null) }, // team not found
        leaguePlayer: { findFirst: vi.fn() },
      }
      mockPrisma.$transaction.mockImplementation(async (fn: any) => fn(txMocks))

      const result = await createUserSpecialBet({
        leagueSpecialBetSingleId: 1,
        leagueUserId: 5,
        teamResultId: 99,
      })

      expect(result.success).toBe(false)
      expect((result as any).error).toContain('team does not belong')
    })
  })

  describe('updateUserSpecialBet', () => {
    it('should update special bet', async () => {
      mockPrisma.userSpecialBetSingle.findUnique.mockResolvedValue({
        id: 1,
        LeagueSpecialBetSingle: { leagueId: 1 },
      } as any)
      mockPrisma.userSpecialBetSingle.update.mockResolvedValue({ id: 1 } as any)

      const result = await updateUserSpecialBet({ id: 1, value: 42 })

      expect(result.success).toBe(true)
    })

    it('should return error when bet not found', async () => {
      mockPrisma.userSpecialBetSingle.findUnique.mockResolvedValue(null)

      const result = await updateUserSpecialBet({ id: 999, value: 1 })

      expect(result.success).toBe(false)
      expect((result as any).error).toContain('Bet not found')
    })
  })

  describe('deleteUserSpecialBet', () => {
    it('should soft delete', async () => {
      mockPrisma.userSpecialBetSingle.update.mockResolvedValue({ id: 1 } as any)

      const result = await deleteUserSpecialBet(1)

      expect(result.success).toBe(true)
    })
  })
})
