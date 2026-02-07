'use server'

import { prisma } from '@/lib/prisma'
import { isBettingOpen } from '@/lib/auth/user-auth-utils'
import { userSeriesBetSchema, type UserSeriesBetInput } from '@/lib/validation/user'
import { AppError } from '@/lib/error-handler'
import { AuditLogger } from '@/lib/logging/audit-logger'
import { saveUserBet, getFriendPredictions, type TransactionClient } from '@/lib/bet-utils'
import { createCachedEntityFetcher } from '@/lib/cached-data-utils'

/**
 * Fetches series for a league with the current user's bets
 */
export const getUserSeries = createCachedEntityFetcher({
  cacheKey: 'series-data',
  cacheTags: ['series-data'],
  revalidateSeconds: 1200,
  fetchEntities: (leagueId) =>
    prisma.leagueSpecialBetSerie.findMany({
      where: { leagueId, deletedAt: null },
      include: {
        SpecialBetSerie: true,
        League: { include: { Sport: true } },
        LeagueTeam_LeagueSpecialBetSerie_homeTeamIdToLeagueTeam: {
          include: { Team: true },
        },
        LeagueTeam_LeagueSpecialBetSerie_awayTeamIdToLeagueTeam: {
          include: { Team: true },
        },
      },
      orderBy: { dateTime: 'asc' },
    }),
  fetchUserBets: (leagueUserId, leagueId) =>
    prisma.userSpecialBetSerie.findMany({
      where: {
        leagueUserId,
        deletedAt: null,
        LeagueSpecialBetSerie: { leagueId, deletedAt: null },
      },
    }),
  getUserBetEntityId: (bet) => bet.leagueSpecialBetSerieId,
  getDateTime: (series) => series.dateTime,
})

export type UserSeries = Awaited<ReturnType<typeof getUserSeries>>[number]

/**
 * Fetches friend predictions for a specific series
 * Only returns predictions if the betting is closed
 */
export async function getSeriesFriendPredictions(leagueSpecialBetSerieId: number) {
  return getFriendPredictions({
    entityId: leagueSpecialBetSerieId,
    entityLabel: 'Series',
    findEntity: (id) =>
      prisma.leagueSpecialBetSerie.findUnique({
        where: { id, deletedAt: null },
      }),
    getLeagueId: (series) => series.leagueId,
    getDateTime: (series) => series.dateTime,
    findPredictions: (entityId, excludeLeagueUserId) =>
      prisma.userSpecialBetSerie.findMany({
        where: {
          leagueSpecialBetSerieId: entityId,
          deletedAt: null,
          leagueUserId: { not: excludeLeagueUserId },
        },
        include: {
          LeagueUser: {
            include: {
              User: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                  username: true,
                  avatarUrl: true,
                },
              },
            },
          },
        },
        orderBy: { totalPoints: 'desc' },
      }),
  })
}

export type SeriesFriendPrediction = Awaited<
  ReturnType<typeof getSeriesFriendPredictions>
>['predictions'][number]

/**
 * Creates or updates a series bet for the current user
 * Uses Serializable transaction for data consistency
 */
export async function saveSeriesBet(input: UserSeriesBetInput) {
  return saveUserBet({
    input,
    schema: userSeriesBetSchema,
    entityLabel: 'Series',
    findLeagueId: async (validated) => {
      const info = await prisma.leagueSpecialBetSerie.findUnique({
        where: { id: validated.leagueSpecialBetSerieId, deletedAt: null },
        select: { leagueId: true },
      })
      return info?.leagueId ?? null
    },
    runTransaction: async (tx: TransactionClient, validated, leagueUserId) => {
      const series = await tx.leagueSpecialBetSerie.findUnique({
        where: { id: validated.leagueSpecialBetSerieId, deletedAt: null },
      })

      if (!series) {
        throw new AppError('Series not found', 'NOT_FOUND', 404)
      }

      if (!isBettingOpen(series.dateTime)) {
        throw new AppError('Betting is closed for this series', 'BETTING_CLOSED', 400)
      }

      const existingBet = await tx.userSpecialBetSerie.findFirst({
        where: {
          leagueSpecialBetSerieId: validated.leagueSpecialBetSerieId,
          leagueUserId,
          deletedAt: null,
        },
      })

      const now = new Date()

      if (existingBet) {
        await tx.userSpecialBetSerie.update({
          where: { id: existingBet.id },
          data: {
            homeTeamScore: validated.homeTeamScore,
            awayTeamScore: validated.awayTeamScore,
            updatedAt: now,
          },
        })
        return true
      }

      await tx.userSpecialBetSerie.create({
        data: {
          leagueSpecialBetSerieId: validated.leagueSpecialBetSerieId,
          leagueUserId,
          homeTeamScore: validated.homeTeamScore,
          awayTeamScore: validated.awayTeamScore,
          totalPoints: 0,
          dateTime: now,
          createdAt: now,
          updatedAt: now,
        },
      })
      return false
    },
    audit: {
      getEntityId: (validated) => validated.leagueSpecialBetSerieId,
      getMetadata: (validated) => ({
        homeTeamScore: validated.homeTeamScore,
        awayTeamScore: validated.awayTeamScore,
      }),
      onCreated: AuditLogger.seriesBetCreated,
      onUpdated: AuditLogger.seriesBetUpdated,
    },
    revalidatePathSuffix: '/series',
  })
}
