import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createSpecialBet, updateSpecialBetResult, deleteSpecialBet } from './special-bets'
import { prisma } from '@/lib/prisma'
import { revalidateTag } from 'next/cache'
import { requireAdmin } from '@/lib/auth/auth-utils'

vi.mock('@/lib/auth/auth-utils', () => ({
  requireAdmin: vi.fn().mockResolvedValue({ user: { id: '1', isSuperadmin: true } }),
}))

vi.mock('@/lib/prisma-helpers', () => ({
  specialBetInclude: {},
}))

const mockPrisma = vi.mocked(prisma, true)
const mockRevalidateTag = vi.mocked(revalidateTag)
const mockRequireAdmin = vi.mocked(requireAdmin)

describe('Special Bets Actions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('createSpecialBet', () => {
    it('should create special bet when league and evaluator exist', async () => {
      mockPrisma.league.findFirst.mockResolvedValue({ id: 1 } as any)
      mockPrisma.evaluator.findFirst.mockResolvedValue({ id: 5, points: 3 } as any)
      mockPrisma.leagueSpecialBetSingle.create.mockResolvedValue({ id: 10 } as any)

      const result = await createSpecialBet({
        leagueId: 1,
        name: 'Top Scorer',
        evaluatorId: 5,
        dateTime: new Date('2026-06-01'),
      })

      expect(mockRequireAdmin).toHaveBeenCalled()
      expect(result.success).toBe(true)
      expect((result as any).specialBetId).toBe(10)
    })

    it('should return error when league not found', async () => {
      mockPrisma.league.findFirst.mockResolvedValue(null)

      const result = await createSpecialBet({
        leagueId: 999,
        name: 'Test',
        evaluatorId: 1,
        dateTime: new Date('2026-06-01'),
      })

      expect(result.success).toBe(false)
      expect((result as any).error).toContain('League not found')
    })

    it('should return error when evaluator not found', async () => {
      mockPrisma.league.findFirst.mockResolvedValue({ id: 1 } as any)
      mockPrisma.evaluator.findFirst.mockResolvedValue(null)

      const result = await createSpecialBet({
        leagueId: 1,
        name: 'Test',
        evaluatorId: 999,
        dateTime: new Date('2026-06-01'),
      })

      expect(result.success).toBe(false)
      expect((result as any).error).toContain('Evaluator not found')
    })

    it('should invalidate special-bet-data cache', async () => {
      mockPrisma.league.findFirst.mockResolvedValue({ id: 1 } as any)
      mockPrisma.evaluator.findFirst.mockResolvedValue({ id: 1, points: 2 } as any)
      mockPrisma.leagueSpecialBetSingle.create.mockResolvedValue({ id: 1 } as any)

      await createSpecialBet({
        leagueId: 1,
        name: 'T',
        evaluatorId: 1,
        dateTime: new Date('2026-06-01'),
      })

      expect(mockRevalidateTag).toHaveBeenCalledWith('special-bet-data', 'max')
    })
  })

  describe('updateSpecialBetResult', () => {
    it('should update team result', async () => {
      mockPrisma.leagueSpecialBetSingle.findUnique.mockResolvedValue({
        id: 1,
        leagueId: 1,
        isEvaluated: false,
      } as any)
      mockPrisma.leagueTeam.findFirst.mockResolvedValue({ id: 10, leagueId: 1 } as any)

      const txMocks = {
        leagueSpecialBetSingle: { update: vi.fn() },
        leagueSpecialBetSingleTeamAdvanced: { updateMany: vi.fn(), createMany: vi.fn() },
      }
      mockPrisma.$transaction.mockImplementation(async (fn: any) => fn(txMocks))

      const result = await updateSpecialBetResult({
        specialBetId: 1,
        specialBetTeamResultId: 10,
      })

      expect(result.success).toBe(true)
    })

    it('should update player result', async () => {
      mockPrisma.leagueSpecialBetSingle.findUnique.mockResolvedValue({
        id: 1,
        leagueId: 1,
        isEvaluated: false,
      } as any)
      mockPrisma.leaguePlayer.findFirst.mockResolvedValue({ id: 20 } as any)

      const txMocks = {
        leagueSpecialBetSingle: { update: vi.fn() },
        leagueSpecialBetSingleTeamAdvanced: { updateMany: vi.fn(), createMany: vi.fn() },
      }
      mockPrisma.$transaction.mockImplementation(async (fn: any) => fn(txMocks))

      const result = await updateSpecialBetResult({
        specialBetId: 1,
        specialBetPlayerResultId: 20,
      })

      expect(result.success).toBe(true)
    })

    it('should update value result', async () => {
      mockPrisma.leagueSpecialBetSingle.findUnique.mockResolvedValue({
        id: 1,
        leagueId: 1,
        isEvaluated: true,
      } as any)

      const txMocks = {
        leagueSpecialBetSingle: { update: vi.fn() },
        leagueSpecialBetSingleTeamAdvanced: { updateMany: vi.fn(), createMany: vi.fn() },
      }
      mockPrisma.$transaction.mockImplementation(async (fn: any) => fn(txMocks))

      const result = await updateSpecialBetResult({
        specialBetId: 1,
        specialBetValue: 42,
      })

      expect(result.success).toBe(true)
      expect((result as any).wasEvaluated).toBe(true)
    })

    it('should return error when special bet not found', async () => {
      mockPrisma.leagueSpecialBetSingle.findUnique.mockResolvedValue(null)

      const result = await updateSpecialBetResult({
        specialBetId: 999,
        specialBetValue: 1,
      })

      expect(result.success).toBe(false)
      expect((result as any).error).toContain('Special bet not found')
    })

    it('should validate team belongs to league', async () => {
      mockPrisma.leagueSpecialBetSingle.findUnique.mockResolvedValue({
        id: 1,
        leagueId: 1,
      } as any)
      mockPrisma.leagueTeam.findFirst.mockResolvedValue(null) // team not in league

      const result = await updateSpecialBetResult({
        specialBetId: 1,
        specialBetTeamResultId: 99,
      })

      expect(result.success).toBe(false)
      expect((result as any).error).toContain('team does not belong')
    })

    it('should invalidate cache', async () => {
      mockPrisma.leagueSpecialBetSingle.findUnique.mockResolvedValue({
        id: 1,
        leagueId: 1,
        isEvaluated: false,
      } as any)

      const txMocks = {
        leagueSpecialBetSingle: { update: vi.fn() },
        leagueSpecialBetSingleTeamAdvanced: { updateMany: vi.fn(), createMany: vi.fn() },
      }
      mockPrisma.$transaction.mockImplementation(async (fn: any) => fn(txMocks))

      await updateSpecialBetResult({ specialBetId: 1, specialBetValue: 5 })

      expect(mockRevalidateTag).toHaveBeenCalledWith('special-bet-data', 'max')
    })
  })

  describe('deleteSpecialBet', () => {
    it('should soft delete', async () => {
      mockPrisma.leagueSpecialBetSingle.update.mockResolvedValue({ id: 1 } as any)

      const result = await deleteSpecialBet(1)

      expect(result.success).toBe(true)
      expect(mockPrisma.leagueSpecialBetSingle.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { deletedAt: expect.any(Date) },
      })
      expect(mockRevalidateTag).toHaveBeenCalledWith('special-bet-data', 'max')
    })

    it('should reject invalid id', async () => {
      const result = await deleteSpecialBet(-1)
      expect(result.success).toBe(false)
    })
  })
})
