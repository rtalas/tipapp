'use server'

import { z } from 'zod'
import { revalidateTag } from 'next/cache'
import { prisma } from '@/lib/prisma'
import { executeServerAction } from '@/lib/server-action-utils'
import { buildLeagueMatchWhere } from '@/lib/query-builders'
import { leagueMatchWithBetsInclude } from '@/lib/prisma-helpers'
import { AppError } from '@/lib/error-handler'
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
    handler: async (validated) => {
      const now = new Date()

      // Verify teams belong to the league
      const homeTeam = await prisma.leagueTeam.findFirst({
        where: {
          id: validated.homeTeamId,
          leagueId: validated.leagueId,
          deletedAt: null,
        },
      })

      const awayTeam = await prisma.leagueTeam.findFirst({
        where: {
          id: validated.awayTeamId,
          leagueId: validated.leagueId,
          deletedAt: null,
        },
      })

      if (!homeTeam || !awayTeam) {
        throw new AppError('Teams must belong to the selected league', 'BAD_REQUEST', 400)
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
            homeTeamId: validated.homeTeamId,
            awayTeamId: validated.awayTeamId,
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
            createdAt: now,
            updatedAt: now,
          },
        })

        return match
      })

      // Invalidate user-facing match cache
      revalidateTag('match-data', 'max')

      return { matchId: result.id }
    },
    revalidatePath: '/admin/matches',
    requiresAdmin: true,
  })
}

export async function updateMatch(input: UpdateMatchInput) {
  return executeServerAction(input, {
    validator: updateMatchSchema,
    handler: async (validated) => {
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

      const updateData: {
        dateTime?: Date
        matchPhaseId?: number | null
        gameNumber?: number | null
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

      await prisma.match.update({
        where: { id: validated.matchId },
        data: updateData,
      })

      // Invalidate user-facing match cache
      revalidateTag('match-data', 'max')

      return {}
    },
    revalidatePath: '/admin/matches',
    requiresAdmin: true,
  })
}

export async function updateMatchResult(input: UpdateMatchResultInput) {
  return executeServerAction(input, {
    validator: updateMatchResultSchema,
    handler: async (validated) => {
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

          // Create new scorers
          if (validated.scorers.length > 0) {
            await tx.matchScorer.createMany({
              data: validated.scorers.map((scorer: { playerId: number; numberOfGoals: number }) => ({
                matchId: validated.matchId,
                scorerId: scorer.playerId,
                numberOfGoals: scorer.numberOfGoals,
                createdAt: now,
                updatedAt: now,
              })),
            })
          }
        }
      })

      // Invalidate user-facing match cache (results updated)
      revalidateTag('match-data', 'max')

      return {}
    },
    revalidatePath: '/admin/matches',
    requiresAdmin: true,
  })
}

export async function deleteMatch(id: number) {
  return executeServerAction({ id }, {
    validator: z.object({ id: z.number().int().positive() }),
    handler: async (validated) => {
      await prisma.match.update({
        where: { id: validated.id },
        data: { deletedAt: new Date() },
      })

      // Invalidate user-facing match cache
      revalidateTag('match-data', 'max')

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
  const whereConditions = buildLeagueMatchWhere(filters)

  return prisma.leagueMatch.findMany({
    where: whereConditions,
    include: leagueMatchWithBetsInclude,
    orderBy: { Match: { dateTime: 'asc' } },
  })
}

export async function getMatchById(matchId: number) {
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


