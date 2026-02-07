import { describe, it, expect, vi, beforeEach } from 'vitest'
import { getAllTeams, createTeam, updateTeam, deleteTeam } from './teams'
import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'

vi.mock('@/lib/auth/auth-utils', () => ({
  requireAdmin: vi.fn().mockResolvedValue({ user: { id: '1', isSuperadmin: true } }),
}))

const mockPrisma = vi.mocked(prisma, true)
const mockRevalidatePath = vi.mocked(revalidatePath)

describe('Teams Actions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('getAllTeams', () => {
    it('should return all non-deleted teams with sport and count', async () => {
      const teams = [
        { id: 1, name: 'Team A', Sport: { id: 1, name: 'Hockey' }, _count: { LeagueTeam: 2 } },
      ]
      mockPrisma.team.findMany.mockResolvedValue(teams as any)

      const result = await getAllTeams()

      expect(result).toEqual(teams)
      expect(mockPrisma.team.findMany).toHaveBeenCalledWith({
        where: { deletedAt: null },
        include: { Sport: true, _count: { select: { LeagueTeam: true } } },
        orderBy: { name: 'asc' },
      })
    })
  })

  describe('createTeam', () => {
    it('should create team when sport exists', async () => {
      mockPrisma.sport.findUnique.mockResolvedValue({ id: 1, name: 'Hockey' } as any)
      mockPrisma.team.create.mockResolvedValue({ id: 10, name: 'New Team' } as any)

      const result = await createTeam({
        name: 'New Team',
        shortcut: 'NT',
        sportId: 1,
        flagType: 'icon',
      })

      expect(result.success).toBe(true)
      expect((result as any).teamId).toBe(10)
      expect(mockPrisma.team.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ name: 'New Team', shortcut: 'NT', sportId: 1 }),
        })
      )
    })

    it('should return error when sport not found', async () => {
      mockPrisma.sport.findUnique.mockResolvedValue(null)

      const result = await createTeam({
        name: 'New Team',
        shortcut: 'NT',
        sportId: 999,
        flagType: 'icon',
      })

      expect(result.success).toBe(false)
      expect((result as any).error).toContain('Sport not found')
    })

    it('should revalidate path on success', async () => {
      mockPrisma.sport.findUnique.mockResolvedValue({ id: 1 } as any)
      mockPrisma.team.create.mockResolvedValue({ id: 1 } as any)

      await createTeam({ name: 'T', shortcut: 'T', sportId: 1, flagType: 'icon' })

      expect(mockRevalidatePath).toHaveBeenCalledWith('/admin/teams')
    })

    it('should trim name and shortcut', async () => {
      mockPrisma.sport.findUnique.mockResolvedValue({ id: 1 } as any)
      mockPrisma.team.create.mockResolvedValue({ id: 1 } as any)

      await createTeam({ name: '  Team  ', shortcut: '  TM  ', sportId: 1, flagType: 'icon' })

      expect(mockPrisma.team.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ name: 'Team', shortcut: 'TM' }),
        })
      )
    })
  })

  describe('updateTeam', () => {
    it('should update team when it exists', async () => {
      mockPrisma.team.findUnique.mockResolvedValue({ id: 1 } as any)
      mockPrisma.team.update.mockResolvedValue({ id: 1 } as any)

      const result = await updateTeam({ id: 1, name: 'Updated' })

      expect(result.success).toBe(true)
      expect(mockPrisma.team.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 1 },
          data: expect.objectContaining({ name: 'Updated' }),
        })
      )
    })

    it('should return error when team not found', async () => {
      mockPrisma.team.findUnique.mockResolvedValue(null)

      const result = await updateTeam({ id: 999, name: 'X' })

      expect(result.success).toBe(false)
      expect((result as any).error).toContain('Team not found')
    })

    it('should check sport when sportId provided', async () => {
      mockPrisma.sport.findUnique.mockResolvedValue(null)

      const result = await updateTeam({ id: 1, sportId: 999 })

      expect(result.success).toBe(false)
      expect((result as any).error).toContain('Sport not found')
    })
  })

  describe('deleteTeam', () => {
    it('should soft delete team when it exists', async () => {
      mockPrisma.team.findUnique.mockResolvedValue({
        id: 1,
        name: 'Team',
        _count: { LeagueTeam: 0 },
      } as any)
      mockPrisma.team.update.mockResolvedValue({ id: 1 } as any)

      const result = await deleteTeam(1)

      expect(result.success).toBe(true)
      expect(mockPrisma.team.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { deletedAt: expect.any(Date) },
      })
    })

    it('should return error when team not found', async () => {
      mockPrisma.team.findUnique.mockResolvedValue(null)

      const result = await deleteTeam(999)

      expect(result.success).toBe(false)
      expect((result as any).error).toContain('Team not found')
    })

    it('should still delete when team is assigned to leagues', async () => {
      mockPrisma.team.findUnique.mockResolvedValue({
        id: 1,
        name: 'Team',
        _count: { LeagueTeam: 3 },
      } as any)
      mockPrisma.team.update.mockResolvedValue({ id: 1 } as any)

      const result = await deleteTeam(1)

      expect(result.success).toBe(true)
    })

    it('should reject invalid id', async () => {
      const result = await deleteTeam(-1)

      expect(result.success).toBe(false)
    })
  })
})
