import { describe, it, expect, vi, beforeEach } from 'vitest'
import { getAllTournaments, createTournament, updateTournament, deleteTournament } from './tournaments'
import { prisma } from '@/lib/prisma'
import { revalidatePath, updateTag } from 'next/cache'
import * as authUtils from '@/lib/auth/auth-utils'

vi.mock('@/lib/auth/auth-utils', () => ({
  requireAdmin: vi.fn().mockResolvedValue({ user: { id: '1', isSuperadmin: true } }),
  parseSessionUserId: vi.fn((id: string) => parseInt(id, 10)),
}))

const mockPrisma = vi.mocked(prisma, true)
const mockRevalidatePath = vi.mocked(revalidatePath)
const mockUpdateTag = vi.mocked(updateTag)
const mockRequireAdmin = vi.mocked(authUtils.requireAdmin)

describe('Tournaments Actions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('getAllTournaments', () => {
    it('should return all non-deleted tournaments with team count', async () => {
      const tournaments = [
        { id: 1, name: 'NHL Playoff', _count: { LeagueTeam: 16 } },
        { id: 2, name: 'MS 2026', _count: { LeagueTeam: 16 } },
      ]
      mockPrisma.tournament.findMany.mockResolvedValue(tournaments as any)

      const result = await getAllTournaments()

      expect(result).toEqual(tournaments)
      expect(mockRequireAdmin).toHaveBeenCalled()
      expect(mockPrisma.tournament.findMany).toHaveBeenCalledWith({
        where: { deletedAt: null },
        include: { _count: { select: { LeagueTeam: true } } },
        orderBy: { name: 'asc' },
      })
    })

    it('should reject non-admin users', async () => {
      mockRequireAdmin.mockRejectedValueOnce(new Error('Unauthorized'))

      await expect(getAllTournaments()).rejects.toThrow('Unauthorized')
      expect(mockPrisma.tournament.findMany).not.toHaveBeenCalled()
    })
  })

  describe('createTournament', () => {
    it('should create a tournament', async () => {
      mockPrisma.tournament.create.mockResolvedValue({ id: 1, name: 'NHL Playoff' } as any)

      const result = await createTournament({ name: 'NHL Playoff' })

      expect(result.success).toBe(true)
      expect((result as any).tournamentId).toBe(1)
      expect(mockPrisma.tournament.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ name: 'NHL Playoff' }),
        })
      )
      expect(mockUpdateTag).toHaveBeenCalledWith('special-bet-teams')
      expect(mockRevalidatePath).toHaveBeenCalledWith('/admin/tournaments')
    })

    it('should trim whitespace from name', async () => {
      mockPrisma.tournament.create.mockResolvedValue({ id: 2, name: 'MS 2026' } as any)

      await createTournament({ name: '  MS 2026  ' })

      expect(mockPrisma.tournament.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ name: 'MS 2026' }),
        })
      )
    })

    it('should reject empty name', async () => {
      const result = await createTournament({ name: '' })

      expect(result.success).toBe(false)
      expect(mockPrisma.tournament.create).not.toHaveBeenCalled()
    })
  })

  describe('updateTournament', () => {
    it('should update tournament name', async () => {
      mockPrisma.tournament.findFirst.mockResolvedValue({ id: 1, name: 'Old Name' } as any)
      mockPrisma.tournament.update.mockResolvedValue({ id: 1 } as any)

      const result = await updateTournament({ id: 1, name: 'NHL Playoff 2026' })

      expect(result.success).toBe(true)
      expect(mockPrisma.tournament.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 1 },
          data: expect.objectContaining({ name: 'NHL Playoff 2026' }),
        })
      )
      expect(mockUpdateTag).toHaveBeenCalledWith('special-bet-teams')
    })

    it('should return error when tournament not found', async () => {
      mockPrisma.tournament.findFirst.mockResolvedValue(null)

      const result = await updateTournament({ id: 999, name: 'New Name' })

      expect(result.success).toBe(false)
      expect((result as any).error).toContain('Tournament not found')
      expect(mockPrisma.tournament.update).not.toHaveBeenCalled()
    })
  })

  describe('deleteTournament', () => {
    it('should soft-delete tournament when not assigned to any team', async () => {
      mockPrisma.tournament.findFirst.mockResolvedValue({
        id: 1,
        name: 'NHL Playoff',
        _count: { LeagueTeam: 0 },
      } as any)
      mockPrisma.tournament.update.mockResolvedValue({ id: 1 } as any)

      const result = await deleteTournament(1)

      expect(result.success).toBe(true)
      expect(mockPrisma.tournament.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 1 },
          data: expect.objectContaining({ deletedAt: expect.any(Date) }),
        })
      )
      expect(mockUpdateTag).toHaveBeenCalledWith('special-bet-teams')
    })

    it('should reject deletion when tournament has assigned teams', async () => {
      mockPrisma.tournament.findFirst.mockResolvedValue({
        id: 1,
        name: 'NHL Playoff',
        _count: { LeagueTeam: 5 },
      } as any)

      const result = await deleteTournament(1)

      expect(result.success).toBe(false)
      expect((result as any).error).toContain('Cannot delete tournament assigned to 5 team(s)')
      expect(mockPrisma.tournament.update).not.toHaveBeenCalled()
    })

    it('should return error when tournament not found', async () => {
      mockPrisma.tournament.findFirst.mockResolvedValue(null)

      const result = await deleteTournament(999)

      expect(result.success).toBe(false)
      expect((result as any).error).toContain('Tournament not found')
    })
  })
})
