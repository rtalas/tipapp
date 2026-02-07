import { describe, it, expect, vi, beforeEach } from 'vitest'
import { getAllSeriesTypes, createSeriesType, updateSeriesType, deleteSeriesType } from './series-types'
import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import { requireAdmin } from '@/lib/auth/auth-utils'

vi.mock('@/lib/auth/auth-utils', () => ({
  requireAdmin: vi.fn().mockResolvedValue({ user: { id: '1', isSuperadmin: true } }),
}))

const mockPrisma = vi.mocked(prisma, true)
const mockRevalidatePath = vi.mocked(revalidatePath)
const mockRequireAdmin = vi.mocked(requireAdmin)

describe('Series Types Actions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('getAllSeriesTypes', () => {
    it('should return all non-deleted series types', async () => {
      const types = [{ id: 1, name: 'Best of 7', bestOf: 7, _count: { LeagueSpecialBetSerie: 2 } }]
      mockPrisma.specialBetSerie.findMany.mockResolvedValue(types as any)

      const result = await getAllSeriesTypes()

      expect(result).toEqual(types)
      expect(mockPrisma.specialBetSerie.findMany).toHaveBeenCalledWith({
        where: { deletedAt: null },
        include: { _count: { select: { LeagueSpecialBetSerie: true } } },
        orderBy: { name: 'asc' },
      })
    })
  })

  describe('createSeriesType', () => {
    it('should create series type', async () => {
      mockPrisma.specialBetSerie.create.mockResolvedValue({ id: 1, name: 'Best of 5', bestOf: 5 } as any)

      const result = await createSeriesType({ name: 'Best of 5', bestOf: 5 })

      expect(result.success).toBe(true)
      expect(mockPrisma.specialBetSerie.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ name: 'Best of 5', bestOf: 5 }),
      })
    })

    it('should revalidate path on success', async () => {
      mockPrisma.specialBetSerie.create.mockResolvedValue({ id: 1 } as any)

      await createSeriesType({ name: 'T', bestOf: 3 })

      expect(mockRevalidatePath).toHaveBeenCalledWith('/admin/series-types')
    })
  })

  describe('updateSeriesType', () => {
    it('should update series type', async () => {
      mockPrisma.specialBetSerie.update.mockResolvedValue({ id: 1 } as any)

      const result = await updateSeriesType({ id: 1, name: 'Updated' })

      expect(result.success).toBe(true)
    })

    it('should handle database error', async () => {
      mockPrisma.specialBetSerie.update.mockRejectedValue(new Error('Not found'))

      const result = await updateSeriesType({ id: 999, name: 'X' })

      expect(result.success).toBe(false)
    })
  })

  describe('deleteSeriesType', () => {
    it('should soft delete when not used in leagues', async () => {
      mockPrisma.leagueSpecialBetSerie.count.mockResolvedValue(0)
      mockPrisma.specialBetSerie.update.mockResolvedValue({ id: 1 } as any)

      const result = await deleteSeriesType(1)

      expect(result.success).toBe(true)
      expect(mockPrisma.specialBetSerie.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { deletedAt: expect.any(Date) },
      })
    })

    it('should block deletion when used in leagues', async () => {
      mockPrisma.leagueSpecialBetSerie.count.mockResolvedValue(3)

      const result = await deleteSeriesType(1)

      expect(result.success).toBe(false)
      expect((result as any).error).toBeDefined()
    })

    it('should reject invalid id', async () => {
      const result = await deleteSeriesType(-1)

      expect(result.success).toBe(false)
    })
  })
})
