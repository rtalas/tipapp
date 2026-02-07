import { describe, it, expect, vi, beforeEach } from 'vitest'
import { getEvaluatorTypes, getAllPlayers, getTeamsBySport, getLeaguesWithTeams } from './shared-queries'
import { prisma } from '@/lib/prisma'
import * as authUtils from '@/lib/auth/auth-utils'

vi.mock('@/lib/auth/auth-utils', () => ({
  requireAdmin: vi.fn(),
}))

const mockPrisma = vi.mocked(prisma, true)
const mockRequireAdmin = vi.mocked(authUtils.requireAdmin)

describe('Shared Queries', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockRequireAdmin.mockResolvedValue({ user: { id: '1', isSuperadmin: true } } as any)
  })

  describe('getEvaluatorTypes', () => {
    it('should return evaluator types', async () => {
      const types = [{ id: 1, name: 'exact-score' }, { id: 2, name: 'winner' }]
      mockPrisma.evaluatorType.findMany.mockResolvedValue(types as any)

      const result = await getEvaluatorTypes()

      expect(mockRequireAdmin).toHaveBeenCalled()
      expect(result).toEqual(types)
      expect(mockPrisma.evaluatorType.findMany).toHaveBeenCalledWith({
        where: { deletedAt: null },
        orderBy: { name: 'asc' },
      })
    })

    it('should require admin', async () => {
      mockRequireAdmin.mockRejectedValue(new Error('Unauthorized'))

      await expect(getEvaluatorTypes()).rejects.toThrow('Unauthorized')
    })
  })

  describe('getAllPlayers', () => {
    it('should return players with league count', async () => {
      const players = [{ id: 1, lastName: 'Doe', _count: { LeaguePlayer: 2 } }]
      mockPrisma.player.findMany.mockResolvedValue(players as any)

      const result = await getAllPlayers()

      expect(result).toEqual(players)
      expect(mockPrisma.player.findMany).toHaveBeenCalledWith({
        where: { deletedAt: null },
        include: { _count: { select: { LeaguePlayer: true } } },
        orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
      })
    })

    it('should require admin', async () => {
      mockRequireAdmin.mockRejectedValue(new Error('Unauthorized'))

      await expect(getAllPlayers()).rejects.toThrow('Unauthorized')
    })
  })

  describe('getTeamsBySport', () => {
    it('should return teams filtered by sport', async () => {
      const teams = [{ id: 1, name: 'Team A', Sport: { id: 1, name: 'Hockey' } }]
      mockPrisma.team.findMany.mockResolvedValue(teams as any)

      const result = await getTeamsBySport(1)

      expect(result).toEqual(teams)
      expect(mockPrisma.team.findMany).toHaveBeenCalledWith({
        where: { sportId: 1, deletedAt: null },
        include: { Sport: true },
        orderBy: { name: 'asc' },
      })
    })

    it('should require admin', async () => {
      mockRequireAdmin.mockRejectedValue(new Error('Unauthorized'))

      await expect(getTeamsBySport(1)).rejects.toThrow('Unauthorized')
    })
  })

  describe('getLeaguesWithTeams', () => {
    it('should return active leagues with teams and players', async () => {
      const leagues = [{ id: 1, name: 'League A', LeagueTeam: [] }]
      mockPrisma.league.findMany.mockResolvedValue(leagues as any)

      const result = await getLeaguesWithTeams()

      expect(result).toEqual(leagues)
      expect(mockPrisma.league.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { deletedAt: null, isActive: true },
        })
      )
    })

    it('should require admin', async () => {
      mockRequireAdmin.mockRejectedValue(new Error('Unauthorized'))

      await expect(getLeaguesWithTeams()).rejects.toThrow('Unauthorized')
    })
  })
})
