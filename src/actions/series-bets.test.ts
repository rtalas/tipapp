import { describe, it, expect, vi, beforeEach } from 'vitest'
import { getSeriesWithUserBets, createUserSeriesBet, updateUserSeriesBet, deleteUserSeriesBet } from './series-bets'
import { prisma } from '@/lib/prisma'
import * as authUtils from '@/lib/auth/auth-utils'

vi.mock('@/lib/auth/auth-utils', () => ({
  requireAdmin: vi.fn(),
}))

vi.mock('@/lib/query-builders', () => ({
  buildSeriesPicksWhere: vi.fn().mockReturnValue({}),
}))

const mockPrisma = vi.mocked(prisma, true)
const mockRequireAdmin = vi.mocked(authUtils.requireAdmin)

describe('Series Bets Actions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockRequireAdmin.mockResolvedValue({ user: { id: '1', isSuperadmin: true } } as any)
  })

  describe('getSeriesWithUserBets', () => {
    it('should return series with user bets', async () => {
      mockPrisma.leagueSpecialBetSerie.findMany.mockResolvedValue([{ id: 1 }] as any)

      const result = await getSeriesWithUserBets({ leagueId: 1 })

      expect(mockRequireAdmin).toHaveBeenCalled()
      expect(result).toHaveLength(1)
    })

    it('should require admin', async () => {
      mockRequireAdmin.mockRejectedValue(new Error('Unauthorized'))

      await expect(getSeriesWithUserBets()).rejects.toThrow('Unauthorized')
    })
  })

  describe('createUserSeriesBet', () => {
    it('should create bet in serializable transaction', async () => {
      const txMocks = {
        leagueSpecialBetSerie: { findUnique: vi.fn().mockResolvedValue({ id: 1, leagueId: 1 }) },
        leagueUser: { findUnique: vi.fn().mockResolvedValue({ id: 5, leagueId: 1 }) },
        userSpecialBetSerie: {
          findFirst: vi.fn().mockResolvedValue(null),
          create: vi.fn().mockResolvedValue({ id: 100 }),
        },
      }
      mockPrisma.$transaction.mockImplementation(async (fn: any) => fn(txMocks))

      const result = await createUserSeriesBet({
        leagueSpecialBetSerieId: 1,
        leagueUserId: 5,
        homeTeamScore: 4,
        awayTeamScore: 2,
      })

      expect(result.success).toBe(true)
      expect((result as any).betId).toBe(100)
    })

    it('should reject cross-league bet creation', async () => {
      const txMocks = {
        leagueSpecialBetSerie: { findUnique: vi.fn().mockResolvedValue({ id: 1, leagueId: 1 }) },
        leagueUser: { findUnique: vi.fn().mockResolvedValue({ id: 5, leagueId: 2 }) },
        userSpecialBetSerie: { findFirst: vi.fn() },
      }
      mockPrisma.$transaction.mockImplementation(async (fn: any) => fn(txMocks))

      const result = await createUserSeriesBet({
        leagueSpecialBetSerieId: 1,
        leagueUserId: 5,
        homeTeamScore: 4,
        awayTeamScore: 2,
      })

      expect(result.success).toBe(false)
      expect((result as any).error).toContain('does not belong to the same league')
    })

    it('should reject duplicate bet', async () => {
      const txMocks = {
        leagueSpecialBetSerie: { findUnique: vi.fn().mockResolvedValue({ id: 1, leagueId: 1 }) },
        leagueUser: { findUnique: vi.fn().mockResolvedValue({ id: 5, leagueId: 1 }) },
        userSpecialBetSerie: {
          findFirst: vi.fn().mockResolvedValue({ id: 99 }),
        },
      }
      mockPrisma.$transaction.mockImplementation(async (fn: any) => fn(txMocks))

      const result = await createUserSeriesBet({
        leagueSpecialBetSerieId: 1,
        leagueUserId: 5,
        homeTeamScore: 4,
        awayTeamScore: 2,
      })

      expect(result.success).toBe(false)
      expect((result as any).error).toContain('already has a bet')
    })
  })

  describe('updateUserSeriesBet', () => {
    it('should update series bet', async () => {
      mockPrisma.userSpecialBetSerie.findFirst.mockResolvedValue({ id: 1 } as any)
      mockPrisma.userSpecialBetSerie.update.mockResolvedValue({ id: 1 } as any)

      const result = await updateUserSeriesBet({ id: 1, homeTeamScore: 4 })

      expect(result.success).toBe(true)
      expect(mockPrisma.userSpecialBetSerie.findFirst).toHaveBeenCalledWith({
        where: { id: 1, deletedAt: null },
      })
    })

    it('should return error when bet not found or deleted', async () => {
      mockPrisma.userSpecialBetSerie.findFirst.mockResolvedValue(null)

      const result = await updateUserSeriesBet({ id: 999, homeTeamScore: 4 })

      expect(result.success).toBe(false)
      expect((result as any).error).toContain('Bet not found')
    })
  })

  describe('deleteUserSeriesBet', () => {
    it('should soft delete series bet', async () => {
      mockPrisma.userSpecialBetSerie.update.mockResolvedValue({ id: 1 } as any)

      const result = await deleteUserSeriesBet(1)

      expect(result.success).toBe(true)
      expect(mockPrisma.userSpecialBetSerie.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { deletedAt: expect.any(Date) },
      })
    })
  })
})
