import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  getLeagueEvaluators,
  updateEvaluatorPoints,
  createEvaluator,
  updateEvaluatorName,
  updateEvaluator,
  deleteEvaluator,
} from './evaluators'
import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'

vi.mock('@/lib/auth/auth-utils', () => ({
  requireAdmin: vi.fn().mockResolvedValue({ user: { id: '1', isSuperadmin: true } }),
  parseSessionUserId: vi.fn((id: string) => parseInt(id, 10)),
}))

vi.mock('@/lib/evaluators', () => ({
  getEvaluatorEntity: vi.fn().mockReturnValue('match'),
}))

const mockPrisma = vi.mocked(prisma, true)
const mockRevalidatePath = vi.mocked(revalidatePath)

describe('Evaluators Actions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('getLeagueEvaluators', () => {
    it('should return evaluators for league', async () => {
      const evaluators = [{ id: 1, name: 'Exact Score', leagueId: 1 }]
      mockPrisma.evaluator.findMany.mockResolvedValue(evaluators as any)

      const result = await getLeagueEvaluators(1)

      expect(result).toEqual(evaluators)
      expect(mockPrisma.evaluator.findMany).toHaveBeenCalledWith({
        where: { leagueId: 1, deletedAt: null },
        include: { EvaluatorType: true, League: true },
        orderBy: { EvaluatorType: { name: 'asc' } },
      })
    })
  })

  describe('updateEvaluatorPoints', () => {
    it('should update points', async () => {
      mockPrisma.evaluator.update.mockResolvedValue({ id: 1 } as any)

      const result = await updateEvaluatorPoints({ evaluatorId: 1, points: 5 })

      expect(result.success).toBe(true)
      expect(mockPrisma.evaluator.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { points: 5, updatedAt: expect.any(Date) },
      })
    })

    it('should revalidate path', async () => {
      mockPrisma.evaluator.update.mockResolvedValue({ id: 1 } as any)

      await updateEvaluatorPoints({ evaluatorId: 1, points: 3 })

      expect(mockRevalidatePath).toHaveBeenCalledWith('/admin/evaluators')
    })
  })

  describe('createEvaluator', () => {
    it('should create evaluator with entity from type', async () => {
      mockPrisma.evaluatorType.findUniqueOrThrow.mockResolvedValue({
        id: 1,
        name: 'exact-score',
      } as any)
      mockPrisma.evaluator.create.mockResolvedValue({ id: 10 } as any)

      const result = await createEvaluator({
        leagueId: 1,
        evaluatorTypeId: 1,
        name: 'Exact Score',
        points: 5,
      })

      expect(result.success).toBe(true)
      expect((result as any).evaluatorId).toBe(10)
      expect(mockPrisma.evaluator.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          leagueId: 1,
          evaluatorTypeId: 1,
          name: 'Exact Score',
          points: 5,
          entity: 'match',
        }),
      })
    })

    it('should handle evaluator type not found', async () => {
      mockPrisma.evaluatorType.findUniqueOrThrow.mockRejectedValue(new Error('Not found'))

      const result = await createEvaluator({
        leagueId: 1,
        evaluatorTypeId: 999,
        name: 'Test',
        points: 1,
      })

      expect(result.success).toBe(false)
    })
  })

  describe('updateEvaluatorName', () => {
    it('should update name with trim', async () => {
      mockPrisma.evaluator.update.mockResolvedValue({ id: 1 } as any)

      const result = await updateEvaluatorName({ evaluatorId: 1, name: '  New Name  ' })

      expect(result.success).toBe(true)
      expect(mockPrisma.evaluator.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { name: 'New Name', updatedAt: expect.any(Date) },
      })
    })
  })

  describe('updateEvaluator', () => {
    it('should update name and points', async () => {
      mockPrisma.evaluator.update.mockResolvedValue({ id: 1 } as any)

      const result = await updateEvaluator({
        evaluatorId: 1,
        name: 'Updated',
        points: 10,
      })

      expect(result.success).toBe(true)
      expect(mockPrisma.evaluator.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: expect.objectContaining({ name: 'Updated', points: 10 }),
      })
    })

    it('should handle config with null value', async () => {
      mockPrisma.evaluator.update.mockResolvedValue({ id: 1 } as any)

      await updateEvaluator({
        evaluatorId: 1,
        name: 'Test',
        points: 5,
        config: null,
      })

      // Prisma.JsonNull is used when config is null
      expect(mockPrisma.evaluator.update).toHaveBeenCalled()
    })

    it('should handle config with object value', async () => {
      mockPrisma.evaluator.update.mockResolvedValue({ id: 1 } as any)

      await updateEvaluator({
        evaluatorId: 1,
        name: 'Scorer',
        points: 0,
        config: { rankedPoints: { '1': 2, '2': 4 }, unrankedPoints: 8 },
      })

      expect(mockPrisma.evaluator.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: expect.objectContaining({
          config: { rankedPoints: { '1': 2, '2': 4 }, unrankedPoints: 8 },
        }),
      })
    })
  })

  describe('deleteEvaluator', () => {
    it('should soft delete evaluator', async () => {
      mockPrisma.evaluator.update.mockResolvedValue({ id: 1 } as any)

      const result = await deleteEvaluator({ id: 1 })

      expect(result.success).toBe(true)
      expect(mockPrisma.evaluator.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { deletedAt: expect.any(Date) },
      })
    })

    it('should revalidate path', async () => {
      mockPrisma.evaluator.update.mockResolvedValue({ id: 1 } as any)

      await deleteEvaluator({ id: 1 })

      expect(mockRevalidatePath).toHaveBeenCalledWith('/admin/evaluators')
    })
  })
})
