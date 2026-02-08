import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  createLeague,
  updateLeague,
  deleteLeague,
  assignTeamToLeague,
  removeTeamFromLeague,
  updateLeagueTeamGroup,
  assignPlayerToLeagueTeam,
  removePlayerFromLeagueTeam,
  updateTopScorerRanking,
  getLeagues,
  getLeagueById,
  getSports,
  updateLeagueChatSettings,
} from './leagues'
import { prisma } from '@/lib/prisma'
import { revalidateTag } from 'next/cache'

vi.mock('@/lib/auth/auth-utils', () => ({
  requireAdmin: vi.fn().mockResolvedValue({ user: { id: '1', isSuperadmin: true } }),
  parseSessionUserId: vi.fn((id: string) => parseInt(id, 10)),
}))

vi.mock('@/lib/evaluators', () => ({
  getEvaluatorEntity: vi.fn((name: string) => {
    if (['series_exact', 'series_winner'].includes(name)) return 'series'
    if (['exact_player', 'exact_team', 'exact_value', 'closest_value', 'group_stage_team'].includes(name)) return 'special'
    if (name === 'question') return 'question'
    return 'match'
  }),
}))

const mockPrisma = vi.mocked(prisma, true)
const mockRevalidateTag = vi.mocked(revalidateTag)

describe('Leagues Actions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('createLeague', () => {
    it('creates league with default evaluators when no rules provided', async () => {
      const evaluatorTypes = [
        { id: 1, name: 'exact_score', description: null, deletedAt: null, createdAt: new Date(), updatedAt: new Date() },
        { id: 2, name: 'winner', description: null, deletedAt: null, createdAt: new Date(), updatedAt: new Date() },
        { id: 3, name: 'scorer', description: null, deletedAt: null, createdAt: new Date(), updatedAt: new Date() },
      ]

      const createdLeague = { id: 10, name: 'NHL 2026' }

      mockPrisma.$transaction.mockImplementation(async (fn: (tx: typeof prisma) => Promise<unknown>) => {
        return fn(mockPrisma)
      })
      mockPrisma.league.create.mockResolvedValue(createdLeague as never)
      mockPrisma.evaluatorType.findMany.mockResolvedValue(evaluatorTypes as never)
      mockPrisma.evaluator.createMany.mockResolvedValue({ count: 2 } as never)
      mockPrisma.evaluator.create.mockResolvedValue({} as never)

      const result = await createLeague({
        name: 'NHL 2026',
        sportId: 1,
        seasonFrom: 2025,
        seasonTo: 2026,
        isActive: true,
        isPublic: false,
      })

      expect(result.success).toBe(true)
      expect((result as Record<string, unknown>).leagueId).toBe(10)
      expect(mockPrisma.league.create).toHaveBeenCalled()
      // Non-scorer evaluators batched via createMany, scorer created individually
      expect(mockPrisma.evaluator.createMany).toHaveBeenCalledTimes(1)
      expect(mockPrisma.evaluator.create).toHaveBeenCalledTimes(1)
      expect(mockRevalidateTag).toHaveBeenCalledWith('league-selector', 'max')
    })

    it('creates league with custom evaluator rules', async () => {
      const evaluatorTypes = [
        { id: 1, name: 'exact_score', description: null, deletedAt: null, createdAt: new Date(), updatedAt: new Date() },
      ]

      mockPrisma.$transaction.mockImplementation(async (fn: (tx: typeof prisma) => Promise<unknown>) => {
        return fn(mockPrisma)
      })
      mockPrisma.league.create.mockResolvedValue({ id: 11, name: 'Custom' } as never)
      mockPrisma.evaluatorType.findMany.mockResolvedValue(evaluatorTypes as never)
      mockPrisma.evaluator.createMany.mockResolvedValue({ count: 1 } as never)

      const result = await createLeague({
        name: 'Custom League',
        sportId: 1,
        seasonFrom: 2025,
        seasonTo: 2026,
        isActive: true,
        isPublic: false,
        evaluatorRules: [{ evaluatorTypeId: 1, points: 15 }],
      })

      expect(result.success).toBe(true)
      expect(mockPrisma.evaluator.createMany).toHaveBeenCalled()
    })

    it('returns validation error for missing name', async () => {
      const result = await createLeague({
        name: '',
        sportId: 1,
        seasonFrom: 2025,
        seasonTo: 2026,
        isActive: true,
        isPublic: false,
      })

      expect(result.success).toBe(false)
    })
  })

  describe('updateLeague', () => {
    it('updates league and invalidates cache', async () => {
      mockPrisma.league.update.mockResolvedValue({ id: 1, name: 'Updated' } as never)

      const result = await updateLeague({
        id: 1,
        name: 'Updated League',
        sportId: 1,
        seasonFrom: 2025,
        seasonTo: 2026,
        isActive: true,
        isPublic: true,
      })

      expect(result.success).toBe(true)
      expect(mockPrisma.league.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 1 },
          data: expect.objectContaining({ name: 'Updated League' }),
        })
      )
      expect(mockRevalidateTag).toHaveBeenCalledWith('league-selector', 'max')
    })
  })

  describe('deleteLeague', () => {
    it('soft deletes league and invalidates cache', async () => {
      mockPrisma.league.update.mockResolvedValue({ id: 1 } as never)

      const result = await deleteLeague({ id: 1 })

      expect(result.success).toBe(true)
      expect(mockPrisma.league.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 1 },
          data: expect.objectContaining({ deletedAt: expect.any(Date) }),
        })
      )
      expect(mockRevalidateTag).toHaveBeenCalledWith('league-selector', 'max')
    })
  })

  describe('assignTeamToLeague', () => {
    it('assigns team when not already assigned', async () => {
      const now = new Date()
      mockPrisma.leagueTeam.upsert.mockResolvedValue({ id: 1, createdAt: now } as never)

      const result = await assignTeamToLeague({
        leagueId: 1,
        teamId: 5,
        group: 'A',
      })

      expect(result.success).toBe(true)
      expect(mockPrisma.leagueTeam.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          create: expect.objectContaining({
            leagueId: 1,
            teamId: 5,
            group: 'A',
          }),
        })
      )
      expect(mockRevalidateTag).toHaveBeenCalledWith('special-bet-teams', 'max')
    })

    it('returns error when team already assigned', async () => {
      mockPrisma.leagueTeam.upsert.mockResolvedValue({ id: 1, createdAt: new Date('2020-01-01') } as never)

      const result = await assignTeamToLeague({
        leagueId: 1,
        teamId: 5,
      })

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toContain('already assigned')
      }
    })
  })

  describe('removeTeamFromLeague', () => {
    it('soft deletes league team', async () => {
      mockPrisma.leagueTeam.update.mockResolvedValue({ id: 1 } as never)

      const result = await removeTeamFromLeague({ id: 1 })

      expect(result.success).toBe(true)
      expect(mockPrisma.leagueTeam.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 1 },
          data: expect.objectContaining({ deletedAt: expect.any(Date) }),
        })
      )
      expect(mockRevalidateTag).toHaveBeenCalledWith('special-bet-teams', 'max')
    })
  })

  describe('updateLeagueTeamGroup', () => {
    it('updates team group', async () => {
      mockPrisma.leagueTeam.update.mockResolvedValue({ id: 1 } as never)

      const result = await updateLeagueTeamGroup({
        leagueTeamId: 1,
        group: 'B',
      })

      expect(result.success).toBe(true)
      expect(mockPrisma.leagueTeam.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 1 },
          data: expect.objectContaining({ group: 'B' }),
        })
      )
      expect(mockRevalidateTag).toHaveBeenCalledWith('special-bet-teams', 'max')
    })

    it('clears team group with null', async () => {
      mockPrisma.leagueTeam.update.mockResolvedValue({ id: 1 } as never)

      const result = await updateLeagueTeamGroup({
        leagueTeamId: 1,
        group: null,
      })

      expect(result.success).toBe(true)
      expect(mockPrisma.leagueTeam.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ group: null }),
        })
      )
    })
  })

  describe('assignPlayerToLeagueTeam', () => {
    it('assigns player when not already assigned', async () => {
      vi.useFakeTimers()
      const now = new Date()
      mockPrisma.leaguePlayer.upsert.mockResolvedValue({ id: 1, createdAt: now } as never)

      const result = await assignPlayerToLeagueTeam({
        leagueTeamId: 1,
        playerId: 10,
        seasonGames: 82,
        seasonGoals: 30,
        clubName: 'Panthers',
      })

      expect(result.success).toBe(true)
      expect(mockPrisma.leaguePlayer.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          create: expect.objectContaining({
            leagueTeamId: 1,
            playerId: 10,
            seasonGames: 82,
            seasonGoals: 30,
            clubName: 'Panthers',
          }),
        })
      )
      expect(mockRevalidateTag).toHaveBeenCalledWith('special-bet-players', 'max')
      vi.useRealTimers()
    })

    it('returns error when player already assigned', async () => {
      mockPrisma.leaguePlayer.upsert.mockResolvedValue({ id: 1, createdAt: new Date('2020-01-01') } as never)

      const result = await assignPlayerToLeagueTeam({
        leagueTeamId: 1,
        playerId: 10,
      })

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toContain('already assigned')
      }
    })
  })

  describe('removePlayerFromLeagueTeam', () => {
    it('soft deletes league player', async () => {
      mockPrisma.leaguePlayer.update.mockResolvedValue({ id: 1 } as never)

      const result = await removePlayerFromLeagueTeam({ id: 1 })

      expect(result.success).toBe(true)
      expect(mockPrisma.leaguePlayer.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 1 },
          data: expect.objectContaining({ deletedAt: expect.any(Date) }),
        })
      )
      expect(mockRevalidateTag).toHaveBeenCalledWith('special-bet-players', 'max')
    })
  })

  describe('updateTopScorerRanking', () => {
    it('creates new ranking version and updates player', async () => {
      mockPrisma.leaguePlayer.findFirstOrThrow.mockResolvedValue({
        id: 1,
        LeagueTeam: { leagueId: 5 },
      } as never)

      mockPrisma.$transaction.mockImplementation(async (fn: (tx: typeof prisma) => Promise<unknown>) => {
        return fn(mockPrisma)
      })
      mockPrisma.topScorerRankingVersion.updateMany.mockResolvedValue({ count: 1 } as never)
      mockPrisma.topScorerRankingVersion.create.mockResolvedValue({ id: 1 } as never)
      mockPrisma.leaguePlayer.update.mockResolvedValue({ id: 1 } as never)

      const result = await updateTopScorerRanking({
        leaguePlayerId: 1,
        topScorerRanking: 3,
      })

      expect(result.success).toBe(true)
      // Should close existing version
      expect(mockPrisma.topScorerRankingVersion.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            leaguePlayerId: 1,
            effectiveTo: null,
          }),
        })
      )
      // Should create new version
      expect(mockPrisma.topScorerRankingVersion.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            leaguePlayerId: 1,
            ranking: 3,
            leagueId: 5,
          }),
        })
      )
      // Should update materialized state
      expect(mockPrisma.leaguePlayer.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 1 },
          data: expect.objectContaining({ topScorerRanking: 3 }),
        })
      )
    })

    it('does not create new version when ranking is null (unrank)', async () => {
      mockPrisma.leaguePlayer.findFirstOrThrow.mockResolvedValue({
        id: 1,
        LeagueTeam: { leagueId: 5 },
      } as never)

      mockPrisma.$transaction.mockImplementation(async (fn: (tx: typeof prisma) => Promise<unknown>) => {
        return fn(mockPrisma)
      })
      mockPrisma.topScorerRankingVersion.updateMany.mockResolvedValue({ count: 1 } as never)
      mockPrisma.leaguePlayer.update.mockResolvedValue({ id: 1 } as never)

      const result = await updateTopScorerRanking({
        leaguePlayerId: 1,
        topScorerRanking: null,
      })

      expect(result.success).toBe(true)
      expect(mockPrisma.topScorerRankingVersion.create).not.toHaveBeenCalled()
      expect(mockPrisma.leaguePlayer.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ topScorerRanking: null }),
        })
      )
    })
  })

  describe('getLeagues', () => {
    it('returns all non-deleted leagues with includes', async () => {
      const leagues = [{ id: 1, name: 'NHL 2026', Sport: { name: 'Hockey' } }]
      mockPrisma.league.findMany.mockResolvedValue(leagues as never)

      const result = await getLeagues()

      expect(result).toEqual(leagues)
      expect(mockPrisma.league.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { deletedAt: null },
          orderBy: { createdAt: 'desc' },
        })
      )
    })
  })

  describe('getLeagueById', () => {
    it('returns league with teams and players', async () => {
      const league = { id: 1, name: 'NHL 2026', LeagueTeam: [] }
      mockPrisma.league.findUnique.mockResolvedValue(league as never)

      const result = await getLeagueById(1)

      expect(result).toEqual(league)
      expect(mockPrisma.league.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 1, deletedAt: null },
        })
      )
    })

    it('returns null for non-existent league', async () => {
      mockPrisma.league.findUnique.mockResolvedValue(null)

      const result = await getLeagueById(999)

      expect(result).toBeNull()
    })
  })

  describe('getSports', () => {
    it('returns non-deleted sports ordered by name', async () => {
      const sports = [
        { id: 2, name: 'Football' },
        { id: 1, name: 'Hockey' },
      ]
      mockPrisma.sport.findMany.mockResolvedValue(sports as never)

      const result = await getSports()

      expect(result).toEqual(sports)
      expect(mockPrisma.sport.findMany).toHaveBeenCalledWith({
        where: { deletedAt: null },
        orderBy: { name: 'asc' },
      })
    })
  })

  describe('updateLeagueChatSettings', () => {
    it('enables chat for a league', async () => {
      mockPrisma.league.findUnique.mockResolvedValue({
        id: 1,
        isChatEnabled: false,
        chatSuspendedAt: null,
      } as never)
      mockPrisma.league.update.mockResolvedValue({ id: 1 } as never)

      const result = await updateLeagueChatSettings({
        leagueId: 1,
        isChatEnabled: true,
      })

      expect(result.success).toBe(true)
      expect(mockPrisma.league.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 1 },
          data: expect.objectContaining({ isChatEnabled: true }),
        })
      )
    })

    it('disabling chat also clears suspension', async () => {
      mockPrisma.league.findUnique.mockResolvedValue({
        id: 1,
        isChatEnabled: true,
        chatSuspendedAt: new Date(),
      } as never)
      mockPrisma.league.update.mockResolvedValue({ id: 1 } as never)

      const result = await updateLeagueChatSettings({
        leagueId: 1,
        isChatEnabled: false,
      })

      expect(result.success).toBe(true)
      expect(mockPrisma.league.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            isChatEnabled: false,
            chatSuspendedAt: null,
          }),
        })
      )
    })

    it('suspends chat when enabled', async () => {
      mockPrisma.league.findUnique.mockResolvedValue({
        id: 1,
        isChatEnabled: true,
        chatSuspendedAt: null,
      } as never)
      mockPrisma.league.update.mockResolvedValue({ id: 1 } as never)

      const result = await updateLeagueChatSettings({
        leagueId: 1,
        suspend: true,
      })

      expect(result.success).toBe(true)
      expect(mockPrisma.league.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            chatSuspendedAt: expect.any(Date),
          }),
        })
      )
    })

    it('resumes chat (clears suspension)', async () => {
      mockPrisma.league.findUnique.mockResolvedValue({
        id: 1,
        isChatEnabled: true,
        chatSuspendedAt: new Date(),
      } as never)
      mockPrisma.league.update.mockResolvedValue({ id: 1 } as never)

      const result = await updateLeagueChatSettings({
        leagueId: 1,
        suspend: false,
      })

      expect(result.success).toBe(true)
      expect(mockPrisma.league.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ chatSuspendedAt: null }),
        })
      )
    })

    it('returns error when league not found', async () => {
      mockPrisma.league.findUnique.mockResolvedValue(null)

      const result = await updateLeagueChatSettings({
        leagueId: 999,
        isChatEnabled: true,
      })

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toContain('not found')
      }
    })

    it('ignores suspend when chat is disabled', async () => {
      mockPrisma.league.findUnique.mockResolvedValue({
        id: 1,
        isChatEnabled: false,
        chatSuspendedAt: null,
      } as never)
      mockPrisma.league.update.mockResolvedValue({ id: 1 } as never)

      const result = await updateLeagueChatSettings({
        leagueId: 1,
        suspend: true,
      })

      expect(result.success).toBe(true)
      // chatSuspendedAt should NOT be set since chat is disabled
      expect(mockPrisma.league.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.not.objectContaining({ chatSuspendedAt: expect.any(Date) }),
        })
      )
    })
  })
})
