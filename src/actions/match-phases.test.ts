import { describe, it, expect, vi, beforeEach } from 'vitest'
import { getMatchPhases, createMatchPhase, updateMatchPhase, deleteMatchPhase } from './match-phases'
import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import * as authUtils from '@/lib/auth/auth-utils'

vi.mock('@/lib/auth/auth-utils', () => ({
  requireAdmin: vi.fn().mockResolvedValue({ user: { id: '1', isSuperadmin: true } }),
  parseSessionUserId: vi.fn((id: string) => parseInt(id, 10)),
}))

const mockPrisma = vi.mocked(prisma, true)
const mockRevalidatePath = vi.mocked(revalidatePath)
const mockRequireAdmin = vi.mocked(authUtils.requireAdmin)

describe('Match Phases Actions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('getMatchPhases', () => {
    it('should return all non-deleted match phases', async () => {
      const phases = [{ id: 1, name: 'Quarter-Final', rank: 1, _count: { Match: 4 } }]
      mockPrisma.matchPhase.findMany.mockResolvedValue(phases as any)

      const result = await getMatchPhases()

      expect(result).toEqual(phases)
      expect(mockRequireAdmin).toHaveBeenCalled()
      expect(mockPrisma.matchPhase.findMany).toHaveBeenCalledWith({
        where: { deletedAt: null },
        include: { _count: { select: { Match: true } } },
        orderBy: { rank: 'asc' },
      })
    })

    it('should reject non-admin users', async () => {
      mockRequireAdmin.mockRejectedValueOnce(new Error('Unauthorized'))

      await expect(getMatchPhases()).rejects.toThrow('Unauthorized')
      expect(mockPrisma.matchPhase.findMany).not.toHaveBeenCalled()
    })
  })

  describe('createMatchPhase', () => {
    it('should create match phase', async () => {
      mockPrisma.matchPhase.create.mockResolvedValue({
        id: 1,
        name: 'Semi-Final',
        rank: 2,
        _count: { Match: 0 },
      } as any)

      const result = await createMatchPhase({ name: 'Semi-Final', rank: 2 })

      expect(result.success).toBe(true)
      expect(mockPrisma.matchPhase.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ name: 'Semi-Final', rank: 2 }),
        })
      )
    })

    it('should default rank to 0 when not provided', async () => {
      mockPrisma.matchPhase.create.mockResolvedValue({ id: 1 } as any)

      await createMatchPhase({ name: 'Phase', rank: 0 })

      expect(mockPrisma.matchPhase.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ rank: 0 }),
        })
      )
    })

    it('should revalidate path', async () => {
      mockPrisma.matchPhase.create.mockResolvedValue({ id: 1 } as any)

      await createMatchPhase({ name: 'P', rank: 0 })

      expect(mockRevalidatePath).toHaveBeenCalledWith('/admin/match-phases')
    })
  })

  describe('updateMatchPhase', () => {
    it('should update match phase', async () => {
      mockPrisma.matchPhase.update.mockResolvedValue({ id: 1 } as any)

      const result = await updateMatchPhase({ id: 1, name: 'Updated', rank: 5 })

      expect(result.success).toBe(true)
    })

    it('should only update provided fields', async () => {
      mockPrisma.matchPhase.update.mockResolvedValue({ id: 1 } as any)

      await updateMatchPhase({ id: 1, name: 'Only Name' })

      expect(mockPrisma.matchPhase.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ name: 'Only Name' }),
        })
      )
    })
  })

  describe('deleteMatchPhase', () => {
    it('should soft delete when not used in matches', async () => {
      mockPrisma.match.count.mockResolvedValue(0)
      mockPrisma.matchPhase.update.mockResolvedValue({ id: 1 } as any)

      const result = await deleteMatchPhase(1)

      expect(result.success).toBe(true)
      expect(mockPrisma.matchPhase.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { deletedAt: expect.any(Date) },
      })
    })

    it('should block deletion when used in matches', async () => {
      mockPrisma.match.count.mockResolvedValue(5)

      const result = await deleteMatchPhase(1)

      expect(result.success).toBe(false)
      expect((result as any).error).toBeDefined()
    })

    it('should reject invalid id', async () => {
      const result = await deleteMatchPhase(0)

      expect(result.success).toBe(false)
    })
  })
})
