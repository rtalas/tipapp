import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createPlayer, updatePlayer, deletePlayer } from './players'
import { prisma } from '@/lib/prisma'
import { revalidatePath, revalidateTag } from 'next/cache'
import { requireAdmin } from '@/lib/auth/auth-utils'

vi.mock('@/lib/auth/auth-utils', () => ({
  requireAdmin: vi.fn().mockResolvedValue({ user: { id: '1', isSuperadmin: true } }),
  parseSessionUserId: vi.fn((id: string) => parseInt(id, 10)),
}))

const mockPrisma = vi.mocked(prisma, true)
const mockRevalidatePath = vi.mocked(revalidatePath)
const mockRevalidateTag = vi.mocked(revalidateTag)
const mockRequireAdmin = vi.mocked(requireAdmin)

describe('Players Actions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('createPlayer', () => {
    it('should create player successfully', async () => {
      mockPrisma.player.create.mockResolvedValue({ id: 5, firstName: 'John', lastName: 'Doe' } as any)

      const result = await createPlayer({
        isActive: true,
        firstName: 'John',
        lastName: 'Doe',
        position: 'Forward',
      })

      expect(mockRequireAdmin).toHaveBeenCalled()
      expect(result.success).toBe(true)
      expect((result as any).playerId).toBe(5)
    })

    it('should trim names', async () => {
      mockPrisma.player.create.mockResolvedValue({ id: 1 } as any)

      await createPlayer({ isActive: true, firstName: '  John  ', lastName: '  Doe  ' })

      expect(mockPrisma.player.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ firstName: 'John', lastName: 'Doe' }),
        })
      )
    })

    it('should revalidate path and players cache on success', async () => {
      mockPrisma.player.create.mockResolvedValue({ id: 1 } as any)

      await createPlayer({ isActive: true, firstName: 'A', lastName: 'B' })

      expect(mockRevalidatePath).toHaveBeenCalledWith('/admin/players')
      expect(mockRevalidateTag).toHaveBeenCalledWith('special-bet-players', 'max')
    })

    it('should handle database error', async () => {
      mockPrisma.player.create.mockRejectedValue(new Error('DB error'))

      const result = await createPlayer({ isActive: true, firstName: 'A', lastName: 'B' })

      expect(result.success).toBe(false)
    })
  })

  describe('updatePlayer', () => {
    it('should update player when it exists', async () => {
      mockPrisma.player.findUnique.mockResolvedValue({ id: 1 } as any)
      mockPrisma.player.update.mockResolvedValue({ id: 1 } as any)

      const result = await updatePlayer({ id: 1, firstName: 'Updated' })

      expect(result.success).toBe(true)
      expect(mockRevalidateTag).toHaveBeenCalledWith('special-bet-players', 'max')
    })

    it('should return error when player not found', async () => {
      mockPrisma.player.findUnique.mockResolvedValue(null)

      const result = await updatePlayer({ id: 999, firstName: 'X' })

      expect(result.success).toBe(false)
      expect((result as any).error).toContain('Player not found')
    })
  })

  describe('deletePlayer', () => {
    it('should soft delete player when it exists', async () => {
      mockPrisma.player.findUnique.mockResolvedValue({
        id: 1,
        firstName: 'John',
        lastName: 'Doe',
        _count: { LeaguePlayer: 0 },
      } as any)
      mockPrisma.player.update.mockResolvedValue({ id: 1 } as any)

      const result = await deletePlayer(1)

      expect(result.success).toBe(true)
      expect(mockPrisma.player.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { deletedAt: expect.any(Date) },
      })
      expect(mockRevalidateTag).toHaveBeenCalledWith('special-bet-players', 'max')
    })

    it('should return error when player not found', async () => {
      mockPrisma.player.findUnique.mockResolvedValue(null)

      const result = await deletePlayer(999)

      expect(result.success).toBe(false)
      expect((result as any).error).toContain('Player not found')
    })

    it('should still delete when player is assigned to leagues', async () => {
      mockPrisma.player.findUnique.mockResolvedValue({
        id: 1,
        firstName: 'J',
        lastName: 'D',
        _count: { LeaguePlayer: 5 },
      } as any)
      mockPrisma.player.update.mockResolvedValue({ id: 1 } as any)

      const result = await deletePlayer(1)

      expect(result.success).toBe(true)
    })

    it('should reject invalid id', async () => {
      const result = await deletePlayer(0)

      expect(result.success).toBe(false)
    })
  })
})
