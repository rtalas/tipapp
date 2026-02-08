'use server'

import { revalidateTag } from 'next/cache'
import { prisma } from '@/lib/prisma'
import { nullableUniqueConstraint } from '@/lib/prisma-utils'
import { executeServerAction } from '@/lib/server-action-utils'
import { requireAdmin, parseSessionUserId } from '@/lib/auth/auth-utils'
import { AuditLogger } from '@/lib/logging/audit-logger'
import { AppError } from '@/lib/error-handler'
import { getEvaluatorEntity } from '@/lib/evaluators'
import {
  createLeagueSchema,
  updateLeagueSchema,
  assignTeamSchema,
  assignPlayerSchema,
  updateTopScorerRankingSchema,
  updateLeagueChatSettingsSchema,
  updateLeagueTeamGroupSchema,
  deleteByIdSchema,
  type CreateLeagueInput,
  type UpdateLeagueInput,
  type AssignTeamInput,
  type AssignPlayerInput,
  type UpdateTopScorerRankingInput,
  type UpdateLeagueChatSettingsInput,
  type UpdateLeagueTeamGroupInput,
  type DeleteByIdInput,
} from '@/lib/validation/admin'

// Default scoring rules (T2: Automatic Evaluator Initialization)
const DEFAULT_EVALUATOR_POINTS: Record<string, number> = {
  'exact_score': 10,
  'one_team_score': 1,
  'question': 6,
  'score_difference': 3,
  'scorer': 0, // Scorer uses config instead of points
  'series_exact': 14,
  'series_winner': 8,
  'winner': 5,
}

// Default scorer rank-based config
const DEFAULT_SCORER_CONFIG = {
  rankedPoints: {
    '1': 2,
    '2': 3,
    '3': 4,
    '4': 6,
  },
  unrankedPoints: 8,
}

export async function createLeague(input: CreateLeagueInput) {
  return executeServerAction(input, {
    validator: createLeagueSchema,
    handler: async (validated, session) => {
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
            data: validated.evaluatorRules.map((rule: { evaluatorTypeId: number; points: number }) => {
              const typeName = typeMap.get(rule.evaluatorTypeId) || 'Rule'
              return {
                evaluatorTypeId: rule.evaluatorTypeId,
                leagueId: league.id,
                points: rule.points,
                entity: getEvaluatorEntity(typeName),
                name: typeName,
                createdAt: now,
                updatedAt: now,
              }
            }),
          })
        } else {
          // Fall back to defaults if no rules selected
          if (evaluatorTypes.length > 0) {
            // Filter to only include types that have default points defined
            const defaultTypes = evaluatorTypes.filter(type =>
              DEFAULT_EVALUATOR_POINTS.hasOwnProperty(type.name)
            )

            const scorerType = defaultTypes.find(t => t.name === 'scorer')
            const nonScorerTypes = defaultTypes.filter(t => t.name !== 'scorer')

            // Batch create non-scorer evaluators
            if (nonScorerTypes.length > 0) {
              await tx.evaluator.createMany({
                data: nonScorerTypes.map(type => ({
                  name: type.name,
                  evaluatorTypeId: type.id,
                  leagueId: league.id,
                  points: DEFAULT_EVALUATOR_POINTS[type.name] ?? 1,
                  entity: getEvaluatorEntity(type.name),
                  createdAt: now,
                  updatedAt: now,
                })),
              })
            }

            // Create scorer separately (needs JSON config)
            if (scorerType) {
              await tx.evaluator.create({
                data: {
                  name: scorerType.name,
                  evaluatorTypeId: scorerType.id,
                  leagueId: league.id,
                  points: DEFAULT_EVALUATOR_POINTS[scorerType.name] ?? 1,
                  entity: getEvaluatorEntity(scorerType.name),
                  config: DEFAULT_SCORER_CONFIG,
                  createdAt: now,
                  updatedAt: now,
                },
              })
            }
          }
        }

        return league
      })

      // Invalidate league selector cache for all users
      revalidateTag('league-selector', 'max')

      AuditLogger.adminCreated(
        parseSessionUserId(session!.user!.id!), 'League', result.id,
        { name: validated.name, sportId: validated.sportId }
      ).catch(() => {})

      return { leagueId: result.id }
    },
    revalidatePath: '/admin/leagues',
    requiresAdmin: true,
  })
}

export async function updateLeague(input: UpdateLeagueInput) {
  return executeServerAction(input, {
    validator: updateLeagueSchema,
    handler: async (validated, session) => {
      const { id, ...data } = validated

      await prisma.league.update({
        where: { id },
        data: {
          ...data,
          updatedAt: new Date(),
        },
      })

      // Invalidate league selector cache (name, isActive, etc. could change)
      revalidateTag('league-selector', 'max')

      AuditLogger.adminUpdated(
        parseSessionUserId(session!.user!.id!), 'League', id, data, id
      ).catch(() => {})

      return {}
    },
    revalidatePath: '/admin/leagues',
    requiresAdmin: true,
  })
}

export async function deleteLeague(input: DeleteByIdInput) {
  return executeServerAction(input, {
    validator: deleteByIdSchema,
    handler: async (validated, session) => {
      await prisma.league.update({
        where: { id: validated.id },
        data: { deletedAt: new Date() },
      })

      // Invalidate league selector cache
      revalidateTag('league-selector', 'max')

      AuditLogger.adminDeleted(
        parseSessionUserId(session!.user!.id!), 'League', validated.id
      ).catch(() => {})

      return {}
    },
    revalidatePath: '/admin/leagues',
    requiresAdmin: true,
  })
}

export async function assignTeamToLeague(input: AssignTeamInput) {
  return executeServerAction(input, {
    validator: assignTeamSchema,
    handler: async (validated, session) => {
      const now = new Date()
      const result = await prisma.leagueTeam.upsert({
        where: {
          leagueId_teamId_deletedAt: nullableUniqueConstraint({
            leagueId: validated.leagueId,
            teamId: validated.teamId,
            deletedAt: null,
          }),
        },
        update: {
          // Already exists — no-op, will throw below
          updatedAt: now,
        },
        create: {
          leagueId: validated.leagueId,
          teamId: validated.teamId,
          group: validated.group,
          createdAt: now,
          updatedAt: now,
        },
      })

      if (result.createdAt.getTime() !== now.getTime()) {
        throw new AppError('Team is already assigned to this league', 'CONFLICT', 409)
      }

      revalidateTag('special-bet-teams', 'max')

      AuditLogger.adminCreated(
        parseSessionUserId(session!.user!.id!), 'LeagueTeam', result.id,
        { leagueId: validated.leagueId, teamId: validated.teamId },
        validated.leagueId
      ).catch(() => {})

      return {}
    },
    revalidatePath: `/admin/leagues/${input.leagueId}/setup`,
    requiresAdmin: true,
  })
}

export async function removeTeamFromLeague(input: DeleteByIdInput) {
  return executeServerAction(input, {
    validator: deleteByIdSchema,
    handler: async (validated, session) => {
      await prisma.leagueTeam.update({
        where: { id: validated.id },
        data: { deletedAt: new Date() },
      })

      revalidateTag('special-bet-teams', 'max')

      AuditLogger.adminDeleted(
        parseSessionUserId(session!.user!.id!), 'LeagueTeam', validated.id
      ).catch(() => {})

      return {}
    },
    revalidatePath: '/admin/leagues',
    requiresAdmin: true,
  })
}

export async function updateLeagueTeamGroup(input: UpdateLeagueTeamGroupInput) {
  return executeServerAction(input, {
    validator: updateLeagueTeamGroupSchema,
    handler: async (validated, session) => {
      await prisma.leagueTeam.update({
        where: { id: validated.leagueTeamId },
        data: {
          group: validated.group,
          updatedAt: new Date(),
        },
      })

      revalidateTag('special-bet-teams', 'max')

      AuditLogger.adminUpdated(
        parseSessionUserId(session!.user!.id!), 'LeagueTeam', validated.leagueTeamId,
        { group: validated.group }
      ).catch(() => {})

      return {}
    },
    revalidatePath: '/admin/leagues',
    requiresAdmin: true,
  })
}

export async function assignPlayerToLeagueTeam(input: AssignPlayerInput) {
  return executeServerAction(input, {
    validator: assignPlayerSchema,
    handler: async (validated, session) => {
      const now = new Date()
      const result = await prisma.leaguePlayer.upsert({
        where: {
          leagueTeamId_playerId_deletedAt: nullableUniqueConstraint({
            leagueTeamId: validated.leagueTeamId,
            playerId: validated.playerId,
            deletedAt: null,
          }),
        },
        update: {
          // Already exists — no-op, will throw below
          updatedAt: now,
        },
        create: {
          leagueTeamId: validated.leagueTeamId,
          playerId: validated.playerId,
          seasonGames: validated.seasonGames,
          seasonGoals: validated.seasonGoals,
          clubName: validated.clubName,
          createdAt: now,
          updatedAt: now,
        },
      })

      if (result.createdAt.getTime() !== now.getTime()) {
        throw new AppError('Player is already assigned to this team in this league', 'CONFLICT', 409)
      }

      revalidateTag('special-bet-players', 'max')

      AuditLogger.adminCreated(
        parseSessionUserId(session!.user!.id!), 'LeaguePlayer', result.id,
        { leagueTeamId: validated.leagueTeamId, playerId: validated.playerId }
      ).catch(() => {})

      return {}
    },
    revalidatePath: '/admin/leagues',
    requiresAdmin: true,
  })
}

export async function removePlayerFromLeagueTeam(input: DeleteByIdInput) {
  return executeServerAction(input, {
    validator: deleteByIdSchema,
    handler: async (validated, session) => {
      await prisma.leaguePlayer.update({
        where: { id: validated.id },
        data: { deletedAt: new Date() },
      })

      revalidateTag('special-bet-players', 'max')

      AuditLogger.adminDeleted(
        parseSessionUserId(session!.user!.id!), 'LeaguePlayer', validated.id
      ).catch(() => {})

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
      const leaguePlayer = await prisma.leaguePlayer.findFirstOrThrow({
        where: { id: validated.leaguePlayerId, deletedAt: null },
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
              createdByUserId: session?.user?.id ? parseSessionUserId(session.user.id) : null,
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

      AuditLogger.adminUpdated(
        parseSessionUserId(session!.user!.id!), 'LeaguePlayer', validated.leaguePlayerId,
        { topScorerRanking: validated.topScorerRanking },
        leagueId
      ).catch(() => {})

      return {}
    },
    revalidatePath: '/admin/leagues',
    requiresAdmin: true,
  })
}

// Query functions (can be used in Server Components)
export async function getLeagues() {
  await requireAdmin()
  return prisma.league.findMany({
    where: { deletedAt: null },
    include: {
      Sport: true,
      Evaluator: {
        where: { deletedAt: null },
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
  await requireAdmin()
  return prisma.league.findUnique({
    where: { id, deletedAt: null },
    include: {
      Sport: true,
      Evaluator: {
        where: { deletedAt: null },
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
  await requireAdmin()
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
    handler: async (validated, session) => {
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

      AuditLogger.adminUpdated(
        parseSessionUserId(session!.user!.id!), 'League', validated.leagueId,
        { isChatEnabled: validated.isChatEnabled, suspend: validated.suspend },
        validated.leagueId
      ).catch(() => {})

      return {}
    },
    revalidatePath: '/admin/leagues',
    requiresAdmin: true,
  })
}
