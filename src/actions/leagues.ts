'use server'

import { updateTag } from 'next/cache'
import { prisma } from '@/lib/prisma'
import { executeServerAction } from '@/lib/server-action-utils'
import { requireAdmin, parseSessionUserId } from '@/lib/auth/auth-utils'
import { AuditLogger } from '@/lib/logging/audit-logger'
import { AppError } from '@/lib/error-handler'
import { getEvaluatorEntity } from '@/lib/evaluators'
import { SPORT_IDS } from '@/lib/constants'
import {
  createLeagueSchema,
  updateLeagueSchema,
  assignTeamSchema,
  assignPlayerSchema,
  updateTopScorerRankingSchema,
  updateLeagueChatSettingsSchema,
  updateLeagueTeamGroupSchema,
  updateLeagueTeamTournamentSchema,
  deleteByIdSchema,
  type CreateLeagueInput,
  type UpdateLeagueInput,
  type AssignTeamInput,
  type AssignPlayerInput,
  type UpdateTopScorerRankingInput,
  type UpdateLeagueChatSettingsInput,
  type UpdateLeagueTeamGroupInput,
  type UpdateLeagueTeamTournamentInput,
  type DeleteByIdInput,
} from '@/lib/validation/admin'

// Default scoring rules per sport.
//
// Hockey: tier-based — higher tiers suppress lower (see MATCH_EXCLUSIONS_HOCKEY
// in match-evaluator.ts). exact_score (10) "contains" score_difference (3) and
// one_team_score (1); winner (5) always stacks. series_* used in playoff series.
//
// Football: fully additive — every match evaluator stacks. `winner` is strict
// non-draw and `draw` is strict draw, so they are mutually exclusive by
// construction (no exclusion table needed). A perfect non-draw tip yields
// exact(3) + score_diff(1) + winner(3) = 7. A correct non-exact draw yields
// draw(3) + score_diff(1) = 4. An exact draw yields exact(3) + draw(3) +
// score_diff(1) = 7. No one_team_score, no series_*. Playoff advancement uses
// soccer_playoff_advance.
const DEFAULTS_HOCKEY: Record<string, number> = {
  'exact_score': 10,
  'one_team_score': 1,
  'question': 6,
  'score_difference': 3,
  'scorer': 0, // Scorer uses config instead of points
  'series_exact': 14,
  'series_winner': 8,
  'winner': 5,
}

const DEFAULTS_FOOTBALL: Record<string, number> = {
  'exact_score': 3,
  'score_difference': 1,
  'winner': 3, // strict non-draw — draw evaluator handles ties separately
  'draw': 3,   // strict draw — together with winner they cover all outcomes
  'scorer': 0, // Scorer uses config instead of points
  'soccer_playoff_advance': 3,
  'question': 6,
}

const SCORER_CONFIG_HOCKEY = {
  rankedPoints: { '1': 2, '2': 3, '3': 4, '4': 6 },
  unrankedPoints: 8,
}

const SCORER_CONFIG_FOOTBALL = {
  rankedPoints: { '1': 2, '2': 3, '3': 4 },
  unrankedPoints: 7,
}

function getDefaultsForSport(sportId: number) {
  if (sportId === SPORT_IDS.FOOTBALL) {
    return { points: DEFAULTS_FOOTBALL, scorerConfig: SCORER_CONFIG_FOOTBALL }
  }
  return { points: DEFAULTS_HOCKEY, scorerConfig: SCORER_CONFIG_HOCKEY }
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
          // Fall back to sport-specific defaults if no rules selected
          if (evaluatorTypes.length > 0) {
            const { points: defaultPoints, scorerConfig } = getDefaultsForSport(
              validated.sportId
            )

            const defaultTypes = evaluatorTypes.filter(type =>
              Object.prototype.hasOwnProperty.call(defaultPoints, type.name)
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
                  points: defaultPoints[type.name] ?? 1,
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
                  points: defaultPoints[scorerType.name] ?? 1,
                  entity: getEvaluatorEntity(scorerType.name),
                  config: scorerConfig,
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
      updateTag('league-selector')

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

      // Auto-deactivate league when marking as finished
      if (data.isFinished) {
        data.isActive = false
      }

      await prisma.league.update({
        where: { id },
        data: {
          ...data,
          updatedAt: new Date(),
        },
      })

      // Invalidate league selector cache (name, isActive, etc. could change)
      updateTag('league-selector')

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
      updateTag('league-selector')

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
      const result = await prisma.$transaction(async (tx) => {
        // Check if team is already assigned to this league
        const existing = await tx.leagueTeam.findFirst({
          where: {
            leagueId: validated.leagueId,
            teamId: validated.teamId,
            deletedAt: null,
          },
        })

        if (existing) {
          throw new AppError('Team is already assigned to this league', 'CONFLICT', 409)
        }

        // Create new assignment
        return tx.leagueTeam.create({
          data: {
            leagueId: validated.leagueId,
            teamId: validated.teamId,
            group: validated.group,
            createdAt: now,
            updatedAt: now,
          },
        })
      })

      updateTag('special-bet-teams')

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

      updateTag('special-bet-teams')

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

      updateTag('special-bet-teams')

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

export async function updateLeagueTeamTournament(input: UpdateLeagueTeamTournamentInput) {
  return executeServerAction(input, {
    validator: updateLeagueTeamTournamentSchema,
    handler: async (validated, session) => {
      await prisma.leagueTeam.update({
        where: { id: validated.leagueTeamId },
        data: {
          tournamentId: validated.tournamentId,
          updatedAt: new Date(),
        },
      })

      updateTag('special-bet-teams')

      AuditLogger.adminUpdated(
        parseSessionUserId(session!.user!.id!), 'LeagueTeam', validated.leagueTeamId,
        { tournamentId: validated.tournamentId }
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
      const result = await prisma.$transaction(async (tx) => {
        // Check if player is already assigned to this team
        const existing = await tx.leaguePlayer.findFirst({
          where: {
            leagueTeamId: validated.leagueTeamId,
            playerId: validated.playerId,
            deletedAt: null,
          },
        })

        if (existing) {
          throw new AppError('Player is already assigned to this team in this league', 'CONFLICT', 409)
        }

        // Create new assignment
        return tx.leaguePlayer.create({
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
      })

      updateTag('special-bet-players')

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

      updateTag('special-bet-players')

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
          Tournament: true,
          LeaguePlayer: {
            where: { deletedAt: null },
            include: { Player: true },
            orderBy: { Player: { lastName: 'asc' } },
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
