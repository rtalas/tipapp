'use server'

import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/auth-utils'
import { executeServerAction } from '@/lib/server-action-utils'
import { buildSeriesPicksWhere } from '@/lib/query-builders'
import {
  createUserSeriesBetSchema,
  updateUserSeriesBetSchema,
  deleteByIdSchema,
  type CreateUserSeriesBetInput,
  type UpdateUserSeriesBetInput,
} from '@/lib/validation/admin'

/**
 * Fetches series with all user bets for the Series Picks page
 * Includes full nested data: League, Teams, UserSpecialBetSerie (user)
 */
export async function getSeriesWithUserBets(filters?: {
  leagueId?: number
  status?: 'evaluated' | 'unevaluated' | 'all'
}) {
  await requireAdmin()

  const whereConditions = buildSeriesPicksWhere(filters)

  const series = await prisma.leagueSpecialBetSerie.findMany({
    where: whereConditions,
    include: {
      League: true,
      SpecialBetSerie: true,
      LeagueTeam_LeagueSpecialBetSerie_homeTeamIdToLeagueTeam: {
        include: {
          Team: true,
        },
      },
      LeagueTeam_LeagueSpecialBetSerie_awayTeamIdToLeagueTeam: {
        include: {
          Team: true,
        },
      },
      UserSpecialBetSerie: {
        where: { deletedAt: null },
        include: {
          LeagueUser: {
            include: {
              User: true,
            },
          },
        },
        orderBy: [
          { LeagueUser: { User: { lastName: 'asc' } } },
          { LeagueUser: { User: { firstName: 'asc' } } },
        ],
      },
    },
    orderBy: { dateTime: 'desc' },
  })

  return series
}

// Export types for components
export type SeriesWithUserBets = Awaited<ReturnType<typeof getSeriesWithUserBets>>[number]
export type UserSeriesBet = SeriesWithUserBets['UserSpecialBetSerie'][number]

/**
 * Creates a new user series bet
 * Validates that the series and leagueUser exist
 * Checks for duplicate bets (same user + series)
 */
export async function createUserSeriesBet(input: CreateUserSeriesBetInput) {
  return executeServerAction(input, {
    validator: createUserSeriesBetSchema,
    handler: async (validated) => {
      // Verify series exists
      const series = await prisma.leagueSpecialBetSerie.findUnique({
        where: { id: validated.leagueSpecialBetSerieId, deletedAt: null },
      })

      if (!series) {
        throw new Error('Series not found')
      }

      // Verify leagueUser exists
      const leagueUser = await prisma.leagueUser.findUnique({
        where: { id: validated.leagueUserId, deletedAt: null },
      })

      if (!leagueUser) {
        throw new Error('League user not found')
      }

      // Check for duplicate bet
      const existingBet = await prisma.userSpecialBetSerie.findFirst({
        where: {
          leagueSpecialBetSerieId: validated.leagueSpecialBetSerieId,
          leagueUserId: validated.leagueUserId,
          deletedAt: null,
        },
      })

      if (existingBet) {
        throw new Error('User already has a bet for this series')
      }

      const now = new Date()

      const bet = await prisma.userSpecialBetSerie.create({
        data: {
          leagueSpecialBetSerieId: validated.leagueSpecialBetSerieId,
          leagueUserId: validated.leagueUserId,
          homeTeamScore: validated.homeTeamScore,
          awayTeamScore: validated.awayTeamScore,
          dateTime: now,
          totalPoints: 0,
          createdAt: now,
          updatedAt: now,
        },
      })

      return { betId: bet.id, success: true }
    },
    revalidatePath: '/admin/series-picks',
    requiresAdmin: true,
  })
}

/**
 * Updates an existing user series bet
 * Warns if series is already evaluated (requires re-evaluation)
 */
export async function updateUserSeriesBet(input: UpdateUserSeriesBetInput) {
  return executeServerAction(input, {
    validator: updateUserSeriesBetSchema,
    handler: async (validated) => {
      const now = new Date()

      await prisma.userSpecialBetSerie.update({
        where: { id: validated.id },
        data: {
          ...(validated.homeTeamScore !== undefined && { homeTeamScore: validated.homeTeamScore }),
          ...(validated.awayTeamScore !== undefined && { awayTeamScore: validated.awayTeamScore }),
          updatedAt: now,
        },
      })

      return { success: true }
    },
    revalidatePath: '/admin/series-picks',
    requiresAdmin: true,
  })
}

/**
 * Deletes a user series bet (soft delete)
 */
export async function deleteUserSeriesBet(id: number) {
  return executeServerAction({ id }, {
    validator: deleteByIdSchema,
    handler: async (validated) => {
      await prisma.userSpecialBetSerie.update({
        where: { id: validated.id },
        data: { deletedAt: new Date() },
      })

      return { success: true }
    },
    revalidatePath: '/admin/series-picks',
    requiresAdmin: true,
  })
}
