import { describe, it, expect, vi, beforeEach } from 'vitest'
import { getLeaguePrizes, updateLeaguePrizes } from './league-prizes'
import { prisma } from '@/lib/prisma'
import * as authUtils from '@/lib/auth/auth-utils'
import { updateTag, revalidatePath } from 'next/cache'

vi.mock('@/lib/auth/auth-utils', () => ({
  requireAdmin: vi.fn().mockResolvedValue({ user: { id: '1', isSuperadmin: true } }),
  parseSessionUserId: vi.fn((id: string) => parseInt(id, 10)),
}))

const mockPrisma = vi.mocked(prisma, true)
const mockRequireAdmin = vi.mocked(authUtils.requireAdmin)
const mockUpdateTag = vi.mocked(updateTag)
const mockRevalidatePath = vi.mocked(revalidatePath)

describe('League Prizes Actions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('getLeaguePrizes', () => {
    it('should fetch and separate prizes and fines', async () => {
      mockRequireAdmin.mockResolvedValue({ user: { id: '1', isSuperadmin: true } } as any)
      mockPrisma.leaguePrize.findMany.mockResolvedValue([
        { id: 1, rank: 1, amount: 10000, currency: 'CZK', label: null, type: 'prize' },
        { id: 2, rank: 2, amount: 5000, currency: 'CZK', label: null, type: 'prize' },
        { id: 3, rank: 1, amount: 2000, currency: 'CZK', label: null, type: 'fine' },
      ] as any)

      const result = await getLeaguePrizes(1)

      expect(mockRequireAdmin).toHaveBeenCalled()
      expect(result.success).toBe(true)
      expect((result as any).prizes).toHaveLength(2)
      expect((result as any).fines).toHaveLength(1)
      expect((result as any).prizes[0].type).toBe('prize')
      expect((result as any).fines[0].type).toBe('fine')
    })

    it('should query with correct filters', async () => {
      mockRequireAdmin.mockResolvedValue({ user: { id: '1', isSuperadmin: true } } as any)
      mockPrisma.leaguePrize.findMany.mockResolvedValue([])

      await getLeaguePrizes(42)

      expect(mockPrisma.leaguePrize.findMany).toHaveBeenCalledWith({
        where: { leagueId: 42, deletedAt: null },
        orderBy: { rank: 'asc' },
        select: {
          id: true,
          rank: true,
          amount: true,
          currency: true,
          label: true,
          type: true,
        },
      })
    })

    it('should return empty arrays when no prizes exist', async () => {
      mockRequireAdmin.mockResolvedValue({ user: { id: '1', isSuperadmin: true } } as any)
      mockPrisma.leaguePrize.findMany.mockResolvedValue([])

      const result = await getLeaguePrizes(1)

      expect(result.success).toBe(true)
      expect((result as any).prizes).toHaveLength(0)
      expect((result as any).fines).toHaveLength(0)
    })

    it('should return error when not admin', async () => {
      mockRequireAdmin.mockRejectedValue(new Error('Unauthorized: Admin access required'))

      const result = await getLeaguePrizes(1)

      expect(result.success).toBe(false)
      expect((result as any).error).toContain('Unauthorized')
    })

    it('should return error for invalid leagueId', async () => {
      mockRequireAdmin.mockResolvedValue({ user: { id: '1', isSuperadmin: true } } as any)

      const result = await getLeaguePrizes(-1)

      expect(result.success).toBe(false)
    })

    it('should return error for zero leagueId', async () => {
      mockRequireAdmin.mockResolvedValue({ user: { id: '1', isSuperadmin: true } } as any)

      const result = await getLeaguePrizes(0)

      expect(result.success).toBe(false)
    })

    it('should handle database error gracefully', async () => {
      mockRequireAdmin.mockResolvedValue({ user: { id: '1', isSuperadmin: true } } as any)
      mockPrisma.leaguePrize.findMany.mockRejectedValue(new Error('Connection failed'))

      const result = await getLeaguePrizes(1)

      expect(result.success).toBe(false)
      expect((result as any).error).toContain('Connection failed')
    })
  })

  describe('updateLeaguePrizes', () => {
    it('should delete old and create new prizes atomically', async () => {
      mockRequireAdmin.mockResolvedValue({ user: { id: '1', isSuperadmin: true } } as any)
      mockPrisma.$transaction.mockImplementation(async (fn: any) => {
        const tx = {
          leaguePrize: {
            deleteMany: vi.fn(),
            createMany: vi.fn(),
          },
        }
        return fn(tx)
      })

      const result = await updateLeaguePrizes({
        leagueId: 1,
        prizes: [{ rank: 1, amount: 10000, currency: 'CZK', type: 'prize' }],
        fines: [{ rank: 1, amount: 2000, currency: 'CZK', type: 'fine' }],
      })

      expect(result.success).toBe(true)
    })

    it('should call transaction with hard delete then create', async () => {
      mockRequireAdmin.mockResolvedValue({ user: { id: '1', isSuperadmin: true } } as any)

      const txMocks = {
        leaguePrize: {
          deleteMany: vi.fn(),
          createMany: vi.fn(),
        },
      }
      mockPrisma.$transaction.mockImplementation(async (fn: any) => fn(txMocks))

      await updateLeaguePrizes({
        leagueId: 5,
        prizes: [{ rank: 1, amount: 10000, currency: 'CZK', type: 'prize' }],
        fines: [],
      })

      // Hard delete existing
      expect(txMocks.leaguePrize.deleteMany).toHaveBeenCalledWith({
        where: { leagueId: 5 },
      })

      // Create new prizes with type 'prize'
      expect(txMocks.leaguePrize.createMany).toHaveBeenCalledWith({
        data: [
          expect.objectContaining({
            leagueId: 5,
            rank: 1,
            amount: 10000,
            currency: 'CZK',
            type: 'prize',
          }),
        ],
      })
    })

    it('should create fines with type fine', async () => {
      mockRequireAdmin.mockResolvedValue({ user: { id: '1', isSuperadmin: true } } as any)

      const txMocks = {
        leaguePrize: {
          deleteMany: vi.fn(),
          createMany: vi.fn(),
        },
      }
      mockPrisma.$transaction.mockImplementation(async (fn: any) => fn(txMocks))

      await updateLeaguePrizes({
        leagueId: 1,
        prizes: [],
        fines: [{ rank: 1, amount: 3000, currency: 'CZK', label: 'Loser pays', type: 'fine' }],
      })

      expect(txMocks.leaguePrize.createMany).toHaveBeenCalledWith({
        data: [
          expect.objectContaining({
            rank: 1,
            amount: 3000,
            type: 'fine',
            label: 'Loser pays',
          }),
        ],
      })
    })

    it('should skip createMany when arrays are empty', async () => {
      mockRequireAdmin.mockResolvedValue({ user: { id: '1', isSuperadmin: true } } as any)

      const txMocks = {
        leaguePrize: {
          deleteMany: vi.fn(),
          createMany: vi.fn(),
        },
      }
      mockPrisma.$transaction.mockImplementation(async (fn: any) => fn(txMocks))

      await updateLeaguePrizes({
        leagueId: 1,
        prizes: [],
        fines: [],
      })

      // Hard delete always happens
      expect(txMocks.leaguePrize.deleteMany).toHaveBeenCalledTimes(1)
      // No createMany since both arrays empty
      expect(txMocks.leaguePrize.createMany).not.toHaveBeenCalled()
    })

    it('should succeed with prizes and no fines', async () => {
      mockRequireAdmin.mockResolvedValue({ user: { id: '1', isSuperadmin: true } } as any)
      mockPrisma.$transaction.mockImplementation(async (fn: any) => {
        return fn({
          leaguePrize: { deleteMany: vi.fn(), createMany: vi.fn() },
        })
      })

      await updateLeaguePrizes({
        leagueId: 1,
        prizes: [{ rank: 1, amount: 10000, currency: 'CZK', type: 'prize' }],
        fines: [],
      })

    })

    it('should revalidate admin leagues path', async () => {
      mockRequireAdmin.mockResolvedValue({ user: { id: '1', isSuperadmin: true } } as any)
      mockPrisma.$transaction.mockImplementation(async (fn: any) => {
        return fn({
          leaguePrize: { deleteMany: vi.fn(), createMany: vi.fn() },
        })
      })

      await updateLeaguePrizes({
        leagueId: 1,
        prizes: [],
        fines: [],
      })

      expect(mockRevalidatePath).toHaveBeenCalledWith('/admin/leagues')
    })

    it('should return error for invalid input', async () => {
      const result = await updateLeaguePrizes({
        leagueId: -1,
        prizes: [],
        fines: [],
      })

      expect(result.success).toBe(false)
    })

    it('should return error when not admin', async () => {
      mockRequireAdmin.mockRejectedValue(new Error('Unauthorized'))

      const result = await updateLeaguePrizes({
        leagueId: 1,
        prizes: [],
        fines: [],
      })

      expect(result.success).toBe(false)
      expect((result as any).error).toBeDefined()
    })

    it('should reject duplicate prize ranks', async () => {
      const result = await updateLeaguePrizes({
        leagueId: 1,
        prizes: [
          { rank: 1, amount: 10000, currency: 'CZK', type: 'prize' },
          { rank: 1, amount: 5000, currency: 'CZK', type: 'prize' },
        ],
        fines: [],
      })

      expect(result.success).toBe(false)
    })

    it('should reject duplicate fine ranks', async () => {
      const result = await updateLeaguePrizes({
        leagueId: 1,
        prizes: [],
        fines: [
          { rank: 1, amount: 2000, currency: 'CZK', type: 'fine' },
          { rank: 1, amount: 1000, currency: 'CZK', type: 'fine' },
        ],
      })

      expect(result.success).toBe(false)
    })

    it('should handle transaction failure', async () => {
      mockRequireAdmin.mockResolvedValue({ user: { id: '1', isSuperadmin: true } } as any)
      mockPrisma.$transaction.mockRejectedValue(new Error('Deadlock detected'))

      const result = await updateLeaguePrizes({
        leagueId: 1,
        prizes: [{ rank: 1, amount: 10000, currency: 'CZK', type: 'prize' }],
        fines: [],
      })

      expect(result.success).toBe(false)
      expect((result as any).error).toBeDefined()
    })

    it('should set null label when not provided', async () => {
      mockRequireAdmin.mockResolvedValue({ user: { id: '1', isSuperadmin: true } } as any)

      const txMocks = {
        leaguePrize: {
          deleteMany: vi.fn(),
          createMany: vi.fn(),
        },
      }
      mockPrisma.$transaction.mockImplementation(async (fn: any) => fn(txMocks))

      await updateLeaguePrizes({
        leagueId: 1,
        prizes: [{ rank: 1, amount: 10000, currency: 'CZK', type: 'prize' }],
        fines: [],
      })

      expect(txMocks.leaguePrize.createMany).toHaveBeenCalledWith({
        data: [
          expect.objectContaining({ label: null }),
        ],
      })
    })
  })
})
