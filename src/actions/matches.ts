'use server'

import { z } from 'zod'
import { updateTag } from 'next/cache'
import { prisma } from '@/lib/prisma'
import { executeServerAction } from '@/lib/server-action-utils'
import { buildLeagueMatchWhere } from '@/lib/query-builders'
import { leagueMatchWithBetsInclude } from '@/lib/prisma-helpers'
import { AppError } from '@/lib/error-handler'
import { requireAdmin, parseSessionUserId } from '@/lib/auth/auth-utils'
import { AuditLogger } from '@/lib/logging/audit-logger'
import {
  createMatchSchema,
  updateMatchSchema,
  updateMatchResultSchema,
  type CreateMatchInput,
  type UpdateMatchInput,
  type UpdateMatchResultInput,
} from '@/lib/validation/admin'

export async function createMatch(input: CreateMatchInput) {
  return executeServerAction(input, {
    validator: createMatchSchema,
    handler: async (validated, session) => {
      const now = new Date()

      // Verify any provided teams belong to the league (placeholder sides skip this)
      if (validated.homeTeamId) {
        const homeTeam = await prisma.leagueTeam.findFirst({
          where: { id: validated.homeTeamId, leagueId: validated.leagueId, deletedAt: null },
        })
        if (!homeTeam) {
          throw new AppError('Home team must belong to the selected league', 'BAD_REQUEST', 400)
        }
      }

      if (validated.awayTeamId) {
        const awayTeam = await prisma.leagueTeam.findFirst({
          where: { id: validated.awayTeamId, leagueId: validated.leagueId, deletedAt: null },
        })
        if (!awayTeam) {
          throw new AppError('Away team must belong to the selected league', 'BAD_REQUEST', 400)
        }
      }

      // Verify match phase exists if provided
      if (validated.matchPhaseId) {
        const matchPhase = await prisma.matchPhase.findFirst({
          where: {
            id: validated.matchPhaseId,
            deletedAt: null,
          },
        })

        if (!matchPhase) {
          throw new AppError('Match phase not found', 'NOT_FOUND', 404)
        }

        // Validate game number against phase bestOf if both provided
        if (validated.gameNumber && matchPhase.bestOf && validated.gameNumber > matchPhase.bestOf) {
          throw new AppError(`Game number cannot exceed best of ${matchPhase.bestOf}`, 'BAD_REQUEST', 400)
        }
      }

      // Transaction: Create match + league match
      const result = await prisma.$transaction(async (tx) => {
        // Create the match
        const match = await tx.match.create({
          data: {
            dateTime: validated.dateTime,
            homeTeamId: validated.homeTeamId ?? null,
            awayTeamId: validated.awayTeamId ?? null,
            homePlaceholder: validated.homePlaceholder ?? null,
            awayPlaceholder: validated.awayPlaceholder ?? null,
            isPlayoffGame: validated.isPlayoffGame,
            matchPhaseId: validated.matchPhaseId ?? null,
            gameNumber: validated.gameNumber ?? null,
            createdAt: now,
            updatedAt: now,
          },
        })

        // Create the league match link
        await tx.leagueMatch.create({
          data: {
            leagueId: validated.leagueId,
            matchId: match.id,
            isDoubled: validated.isDoubled,
            jokerBlocked: validated.jokerBlocked,
            createdAt: now,
            updatedAt: now,
          },
        })

        return match
      })

      // Invalidate user-facing match cache
      updateTag('match-data')

      AuditLogger.adminCreated(
        parseSessionUserId(session!.user!.id!), 'Match', result.id,
        {
          leagueId: validated.leagueId,
          homeTeamId: validated.homeTeamId ?? null,
          awayTeamId: validated.awayTeamId ?? null,
          homePlaceholder: validated.homePlaceholder ?? null,
          awayPlaceholder: validated.awayPlaceholder ?? null,
        },
        validated.leagueId
      ).catch(() => {})

      return { matchId: result.id }
    },
    revalidatePath: '/admin/matches',
    requiresAdmin: true,
  })
}

export async function updateMatch(input: UpdateMatchInput) {
  return executeServerAction(input, {
    validator: updateMatchSchema,
    handler: async (validated, session) => {
      // Verify match phase exists if provided
      if (validated.matchPhaseId) {
        const matchPhase = await prisma.matchPhase.findFirst({
          where: {
            id: validated.matchPhaseId,
            deletedAt: null,
          },
        })

        if (!matchPhase) {
          throw new AppError('Match phase not found', 'NOT_FOUND', 404)
        }

        // Validate game number against phase bestOf if both provided
        if (validated.gameNumber && matchPhase.bestOf && validated.gameNumber > matchPhase.bestOf) {
          throw new AppError(`Game number cannot exceed best of ${matchPhase.bestOf}`, 'BAD_REQUEST', 400)
        }
      }

      const existing = await prisma.match.findFirst({
        where: { id: validated.matchId, deletedAt: null },
        include: { LeagueMatch: { select: { leagueId: true } } },
      })
      if (!existing) {
        throw new AppError('Match not found', 'NOT_FOUND', 404)
      }

      const updateData: {
        dateTime?: Date
        matchPhaseId?: number | null
        gameNumber?: number | null
        homeTeamId?: number | null
        awayTeamId?: number | null
        homePlaceholder?: string | null
        awayPlaceholder?: string | null
        updatedAt: Date
      } = {
        updatedAt: new Date(),
      }

      if (validated.dateTime) {
        updateData.dateTime = validated.dateTime
      }
      if (validated.matchPhaseId !== undefined) {
        updateData.matchPhaseId = validated.matchPhaseId
      }
      if (validated.gameNumber !== undefined) {
        updateData.gameNumber = validated.gameNumber
      }

      // Team / placeholder updates.
      // While the match is still a placeholder (at least one side missing a team), BOTH sides
      // remain editable — admin can swap the already-assigned team or change a placeholder text.
      // Once both teams are set, the match is no longer a placeholder and team edits are locked.
      const wasPlaceholder = existing.homeTeamId === null || existing.awayTeamId === null
      const leagueId = existing.LeagueMatch[0]?.leagueId
      for (const side of ['home', 'away'] as const) {
        const idKey = `${side}TeamId` as const
        const phKey = `${side}Placeholder` as const
        const newId = validated[idKey]
        const newPh = validated[phKey]
        const currentId = existing[idKey]

        if (newId !== undefined && newId !== null) {
          if (currentId !== null && currentId !== newId && !wasPlaceholder) {
            throw new AppError(`Cannot change ${side} team — match is already fully set`, 'BAD_REQUEST', 400)
          }
          if (leagueId) {
            const team = await prisma.leagueTeam.findFirst({
              where: { id: newId, leagueId, deletedAt: null },
            })
            if (!team) {
              throw new AppError(`${side === 'home' ? 'Home' : 'Away'} team must belong to the selected league`, 'BAD_REQUEST', 400)
            }
          }
          updateData[idKey] = newId
          updateData[phKey] = null
        } else if (newPh !== undefined) {
          if (!wasPlaceholder) {
            throw new AppError(`Cannot set placeholder for ${side} side — match is already fully set`, 'BAD_REQUEST', 400)
          }
          // Allow swapping a team back to a placeholder while the match is still a placeholder.
          updateData[idKey] = null
          updateData[phKey] = newPh
        }
      }

      // Refuse to leave a side with neither team nor placeholder
      const finalHomeId = updateData.homeTeamId !== undefined ? updateData.homeTeamId : existing.homeTeamId
      const finalAwayId = updateData.awayTeamId !== undefined ? updateData.awayTeamId : existing.awayTeamId
      const finalHomePh = updateData.homePlaceholder !== undefined ? updateData.homePlaceholder : existing.homePlaceholder
      const finalAwayPh = updateData.awayPlaceholder !== undefined ? updateData.awayPlaceholder : existing.awayPlaceholder
      if ((!finalHomeId && !finalHomePh) || (!finalAwayId && !finalAwayPh)) {
        throw new AppError('Each side must have a team or a placeholder', 'BAD_REQUEST', 400)
      }

      await prisma.match.update({
        where: { id: validated.matchId },
        data: updateData,
      })

      // Update LeagueMatch flags (isDoubled, jokerBlocked) if provided.
      if (validated.isDoubled !== undefined || validated.jokerBlocked !== undefined) {
        await prisma.leagueMatch.updateMany({
          where: { matchId: validated.matchId, deletedAt: null },
          data: {
            ...(validated.isDoubled !== undefined && { isDoubled: validated.isDoubled }),
            ...(validated.jokerBlocked !== undefined && { jokerBlocked: validated.jokerBlocked }),
            updatedAt: new Date(),
          },
        })
      }

      // Refund jokers when match becomes 2x or joker-blocked — those bets can no longer keep usedJoker.
      let refundedJokers = 0
      if (validated.isDoubled === true || validated.jokerBlocked === true) {
        const result = await prisma.userBet.updateMany({
          where: {
            usedJoker: true,
            deletedAt: null,
            LeagueMatch: { matchId: validated.matchId, deletedAt: null },
          },
          data: { usedJoker: false, updatedAt: new Date() },
        })
        refundedJokers = result.count
      }

      // Invalidate caches — match data + leaderboard (joker stats may have changed)
      updateTag('match-data')
      if (refundedJokers > 0) {
        updateTag('leaderboard')
      }

      AuditLogger.adminUpdated(
        parseSessionUserId(session!.user!.id!), 'Match', validated.matchId,
        {
          dateTime: validated.dateTime,
          matchPhaseId: validated.matchPhaseId,
          gameNumber: validated.gameNumber,
          homeTeamId: validated.homeTeamId,
          awayTeamId: validated.awayTeamId,
          homePlaceholder: validated.homePlaceholder,
          awayPlaceholder: validated.awayPlaceholder,
          isDoubled: validated.isDoubled,
          jokerBlocked: validated.jokerBlocked,
          ...(refundedJokers > 0 && { refundedJokers }),
        }
      ).catch(() => {})

      return {}
    },
    revalidatePath: '/admin/matches',
    requiresAdmin: true,
  })
}

export async function updateMatchResult(input: UpdateMatchResultInput) {
  return executeServerAction(input, {
    validator: updateMatchResultSchema,
    handler: async (validated, session) => {
      const now = new Date()

      await prisma.$transaction(async (tx) => {
        // Update the match scores
        await tx.match.update({
          where: { id: validated.matchId },
          data: {
            homeRegularScore: validated.homeRegularScore,
            awayRegularScore: validated.awayRegularScore,
            homeFinalScore: validated.homeFinalScore ?? validated.homeRegularScore,
            awayFinalScore: validated.awayFinalScore ?? validated.awayRegularScore,
            isOvertime: validated.isOvertime,
            isShootout: validated.isShootout,
            homeAdvanced: validated.homeAdvanced ?? null,
            updatedAt: now,
          },
        })

        // Handle scorers
        if (validated.scorers) {
          // Soft-delete existing scorers
          await tx.matchScorer.updateMany({
            where: { matchId: validated.matchId, deletedAt: null },
            data: { deletedAt: now },
          })

          // Create new scorers (own-goal rows have no named player)
          if (validated.scorers.length > 0) {
            await tx.matchScorer.createMany({
              data: validated.scorers.map((scorer) => ({
                matchId: validated.matchId,
                scorerId: scorer.ownGoal ? null : scorer.playerId ?? null,
                ownGoal: scorer.ownGoal ?? false,
                numberOfGoals: scorer.numberOfGoals,
                createdAt: now,
                updatedAt: now,
              })),
            })
          }
        }
      })

      // Invalidate user-facing match cache (results updated)
      updateTag('match-data')

      AuditLogger.adminUpdated(
        parseSessionUserId(session!.user!.id!), 'Match', validated.matchId,
        { homeRegularScore: validated.homeRegularScore, awayRegularScore: validated.awayRegularScore, homeAdvanced: validated.homeAdvanced ?? null, scorerCount: validated.scorers?.length ?? 0 }
      ).catch(() => {})

      return {}
    },
    revalidatePath: '/admin/matches',
    requiresAdmin: true,
  })
}

export async function deleteMatch(id: number) {
  return executeServerAction({ id }, {
    validator: z.object({ id: z.number().int().positive() }),
    handler: async (validated, session) => {
      await prisma.match.update({
        where: { id: validated.id },
        data: { deletedAt: new Date() },
      })

      // Invalidate user-facing match cache
      updateTag('match-data')

      AuditLogger.adminDeleted(
        parseSessionUserId(session!.user!.id!), 'Match', validated.id
      ).catch(() => {})

      return {}
    },
    revalidatePath: '/admin/matches',
    requiresAdmin: true,
  })
}

// Query functions
export async function getMatches(filters?: {
  leagueId?: number
  status?: 'all' | 'scheduled' | 'finished' | 'evaluated'
  userId?: number
}) {
  await requireAdmin()

  const whereConditions = buildLeagueMatchWhere(filters)

  return prisma.leagueMatch.findMany({
    where: whereConditions,
    include: leagueMatchWithBetsInclude,
    orderBy: { Match: { dateTime: 'asc' } },
  })
}

export async function getMatchById(matchId: number) {
  await requireAdmin()

  return prisma.match.findUnique({
    where: { id: matchId, deletedAt: null },
    include: {
      LeagueTeam_Match_homeTeamIdToLeagueTeam: {
        include: {
          Team: true,
          LeaguePlayer: {
            where: { deletedAt: null },
            include: { Player: true },
          },
        },
      },
      LeagueTeam_Match_awayTeamIdToLeagueTeam: {
        include: {
          Team: true,
          LeaguePlayer: {
            where: { deletedAt: null },
            include: { Player: true },
          },
        },
      },
      MatchScorer: {
        where: { deletedAt: null },
        include: {
          LeaguePlayer: {
            include: { Player: true },
          },
        },
      },
      LeagueMatch: {
        include: { League: true },
      },
      MatchPhase: true,
    },
  })
}


