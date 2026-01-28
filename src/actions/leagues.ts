'use server'

import { prisma } from '@/lib/prisma'
import { executeServerAction } from '@/lib/server-action-utils'
import { AppError } from '@/lib/error-handler'
import {
  createLeagueSchema,
  updateLeagueSchema,
  assignTeamSchema,
  assignPlayerSchema,
  updateTopScorerRankingSchema,
  updateLeagueChatSettingsSchema,
  deleteByIdSchema,
  type CreateLeagueInput,
  type UpdateLeagueInput,
  type AssignTeamInput,
  type AssignPlayerInput,
  type UpdateTopScorerRankingInput,
  type UpdateLeagueChatSettingsInput,
  type DeleteByIdInput,
} from '@/lib/validation/admin'

// Default scoring rules (T2: Automatic Evaluator Initialization)
const DEFAULT_EVALUATOR_POINTS: Record<string, number> = {
  'exact_score': 5,
  'winner': 2,
  'goal_difference': 3,
  'total_goals': 1,
  'scorer': 2,
}

export async function createLeague(input: CreateLeagueInput) {
  return executeServerAction(input, {
    validator: createLeagueSchema,
    handler: async (validated) => {
      const now = new Date()

      // Transaction: Create league + evaluators
      const result = await prisma.$transaction(async (tx) => {
        // Create the league
        const league = await tx.league.create({
          data: {
            name: validated.name,
            sportId: validated.sportId,
            seasonFrom: validated.seasonFrom,
            seasonTo: validated.seasonTo,
            isActive: validated.isActive,
            isPublic: validated.isPublic,
            createdAt: now,
            updatedAt: now,
          },
        })

        // Get all evaluator types for name mapping
        const evaluatorTypes = await tx.evaluatorType.findMany()
        const typeMap = new Map(evaluatorTypes.map((t) => [t.id, t.name]))

        // Create evaluators from selected rules or use defaults
        if (validated.evaluatorRules && validated.evaluatorRules.length > 0) {
          // Use selected evaluator rules
          await tx.evaluator.createMany({
            data: validated.evaluatorRules.map((rule: { evaluatorTypeId: number; points: number }) => ({
              evaluatorTypeId: rule.evaluatorTypeId,
              leagueId: league.id,
              points: rule.points,
              entity: 'match',
              name: typeMap.get(rule.evaluatorTypeId) || 'Rule',
              createdAt: now,
              updatedAt: now,
            })),
          })
        } else {
          // Fall back to defaults if no rules selected
          if (evaluatorTypes.length > 0) {
            await tx.evaluator.createMany({
              data: evaluatorTypes.map((type) => ({
                name: type.name,
                evaluatorTypeId: type.id,
                leagueId: league.id,
                points: DEFAULT_EVALUATOR_POINTS[type.name] ?? 1,
                entity: 'match',
                createdAt: now,
                updatedAt: now,
              })),
            })
          }
        }

        return league
      })

      return { leagueId: result.id }
    },
    revalidatePath: '/admin/leagues',
    requiresAdmin: true,
  })
}

export async function updateLeague(input: UpdateLeagueInput) {
  return executeServerAction(input, {
    validator: updateLeagueSchema,
    handler: async (validated) => {
      const { id, ...data } = validated

      await prisma.league.update({
        where: { id },
        data: {
          ...data,
          updatedAt: new Date(),
        },
      })

      return {}
    },
    revalidatePath: '/admin/leagues',
    requiresAdmin: true,
  })
}

export async function deleteLeague(input: DeleteByIdInput) {
  return executeServerAction(input, {
    validator: deleteByIdSchema,
    handler: async (validated) => {
      await prisma.league.update({
        where: { id: validated.id },
        data: { deletedAt: new Date() },
      })

      return {}
    },
    revalidatePath: '/admin/leagues',
    requiresAdmin: true,
  })
}

export async function assignTeamToLeague(input: AssignTeamInput) {
  return executeServerAction(input, {
    validator: assignTeamSchema,
    handler: async (validated) => {
      // Check if team is already assigned
      const existing = await prisma.leagueTeam.findFirst({
        where: {
          leagueId: validated.leagueId,
          teamId: validated.teamId,
          deletedAt: null,
        },
      })

      if (existing) {
        throw new AppError('Team is already assigned to this league', 'CONFLICT', 409)
      }

      const now = new Date()
      await prisma.leagueTeam.create({
        data: {
          leagueId: validated.leagueId,
          teamId: validated.teamId,
          group: validated.group,
          createdAt: now,
          updatedAt: now,
        },
      })

      return {}
    },
    revalidatePath: `/admin/leagues/${input.leagueId}/setup`,
    requiresAdmin: true,
  })
}

export async function removeTeamFromLeague(input: DeleteByIdInput) {
  return executeServerAction(input, {
    validator: deleteByIdSchema,
    handler: async (validated) => {
      await prisma.leagueTeam.update({
        where: { id: validated.id },
        data: { deletedAt: new Date() },
      })

      return {}
    },
    revalidatePath: '/admin/leagues',
    requiresAdmin: true,
  })
}

export async function assignPlayerToLeagueTeam(input: AssignPlayerInput) {
  return executeServerAction(input, {
    validator: assignPlayerSchema,
    handler: async (validated) => {
      // Check if player is already assigned to this league team
      const existing = await prisma.leaguePlayer.findFirst({
        where: {
          leagueTeamId: validated.leagueTeamId,
          playerId: validated.playerId,
          deletedAt: null,
        },
      })

      if (existing) {
        throw new AppError('Player is already assigned to this team in this league', 'CONFLICT', 409)
      }

      const now = new Date()
      await prisma.leaguePlayer.create({
        data: {
          leagueTeamId: validated.leagueTeamId,
          playerId: validated.playerId,
          seasonGames: validated.seasonGames,
          seasonGoals: validated.seasonGoals,
          clubName: validated.clubName,
          createdAt: now,
          updatedAt: now,
        },
      })

      return {}
    },
    revalidatePath: '/admin/leagues',
    requiresAdmin: true,
  })
}

export async function removePlayerFromLeagueTeam(input: DeleteByIdInput) {
  return executeServerAction(input, {
    validator: deleteByIdSchema,
    handler: async (validated) => {
      await prisma.leaguePlayer.update({
        where: { id: validated.id },
        data: { deletedAt: new Date() },
      })

      return {}
    },
    revalidatePath: '/admin/leagues',
    requiresAdmin: true,
  })
}

export async function updateTopScorerRanking(input: UpdateTopScorerRankingInput) {
  return executeServerAction(input, {
    validator: updateTopScorerRankingSchema,
    handler: async (validated, session) => {
      const now = new Date()

      // Get league context from the leaguePlayer
      const leaguePlayer = await prisma.leaguePlayer.findUniqueOrThrow({
        where: { id: validated.leaguePlayerId },
        include: { LeagueTeam: true },
      })
      const leagueId = leaguePlayer.LeagueTeam.leagueId

      await prisma.$transaction(async (tx) => {
        // 1. Close any existing current version for this player
        await tx.topScorerRankingVersion.updateMany({
          where: {
            leaguePlayerId: validated.leaguePlayerId,
            effectiveTo: null, // Only close current version
          },
          data: {
            effectiveTo: now,
          },
        })

        // 2. Create new version (only if ranking is not null)
        if (validated.topScorerRanking !== null) {
          await tx.topScorerRankingVersion.create({
            data: {
              leagueId,
              leaguePlayerId: validated.leaguePlayerId,
              ranking: validated.topScorerRanking,
              effectiveFrom: now,
              effectiveTo: null, // This is now the current version
              createdAt: now,
              createdByUserId: session?.user?.id ? parseInt(session.user.id) : null,
            },
          })
        }

        // 3. Update the materialized current state in LeaguePlayer
        await tx.leaguePlayer.update({
          where: { id: validated.leaguePlayerId },
          data: {
            topScorerRanking: validated.topScorerRanking,
            updatedAt: now,
          },
        })
      })

      return {}
    },
    revalidatePath: '/admin/leagues',
    requiresAdmin: true,
  })
}

// Query functions (can be used in Server Components)
export async function getLeagues() {
  return prisma.league.findMany({
    where: { deletedAt: null },
    include: {
      Sport: true,
      Evaluator: {
        include: { EvaluatorType: true },
      },
      _count: {
        select: {
          LeagueTeam: { where: { deletedAt: null } },
          LeagueUser: { where: { deletedAt: null } },
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  })
}

export async function getLeagueById(id: number) {
  return prisma.league.findUnique({
    where: { id, deletedAt: null },
    include: {
      Sport: true,
      Evaluator: {
        include: { EvaluatorType: true },
      },
      LeagueTeam: {
        where: { deletedAt: null },
        include: {
          Team: true,
          LeaguePlayer: {
            where: { deletedAt: null },
            include: { Player: true },
          },
        },
        orderBy: { Team: { name: 'asc' } },
      },
    },
  })
}

export async function getSports() {
  return prisma.sport.findMany({
    where: { deletedAt: null },
    orderBy: { name: 'asc' },
  })
}

/**
 * Update chat settings for a league.
 * - isChatEnabled: Enable or disable chat feature
 * - suspend: true to suspend chat, false to resume
 */
export async function updateLeagueChatSettings(input: UpdateLeagueChatSettingsInput) {
  return executeServerAction(input, {
    validator: updateLeagueChatSettingsSchema,
    handler: async (validated) => {
      const league = await prisma.league.findUnique({
        where: { id: validated.leagueId, deletedAt: null },
      })

      if (!league) {
        throw new AppError('League not found', 'NOT_FOUND', 404)
      }

      const updateData: { isChatEnabled?: boolean; chatSuspendedAt?: Date | null; updatedAt: Date } = {
        updatedAt: new Date(),
      }

      // Handle enable/disable
      if (validated.isChatEnabled !== undefined) {
        updateData.isChatEnabled = validated.isChatEnabled
        // If disabling chat, also clear suspension
        if (!validated.isChatEnabled) {
          updateData.chatSuspendedAt = null
        }
      }

      // Handle suspend/resume (only if chat is enabled)
      if (validated.suspend !== undefined && league.isChatEnabled) {
        updateData.chatSuspendedAt = validated.suspend ? new Date() : null
      }

      await prisma.league.update({
        where: { id: validated.leagueId },
        data: updateData,
      })

      return {}
    },
    revalidatePath: '/admin/leagues',
    requiresAdmin: true,
  })
}
