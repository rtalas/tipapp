'use server'

import { prisma } from '@/lib/prisma'
import { isBettingOpen } from '@/lib/auth/user-auth-utils'
import { userMatchBetSchema, type UserMatchBetInput } from '@/lib/validation/user'
import { AppError } from '@/lib/error-handler'
import { SPORT_IDS } from '@/lib/constants'
import { AuditLogger } from '@/lib/logging/audit-logger'
import { saveUserBet, getFriendPredictions, validateScorerExclusivity, validateScorerBelongsToTeam, type TransactionClient } from '@/lib/bet-utils'
import { createCachedEntityFetcher } from '@/lib/cached-data-utils'

/**
 * Fetches matches for a league with the current user's bets
 * Returns matches grouped with betting status and deadline info
 */
export const getUserMatches = createCachedEntityFetcher({
  cacheKey: 'match-data',
  cacheTags: ['match-data'],
  revalidateSeconds: 1200,
  fetchEntities: (leagueId) =>
    prisma.leagueMatch.findMany({
      where: {
        leagueId,
        deletedAt: null,
        Match: { deletedAt: null },
      },
      include: {
        League: {
          select: {
            id: true,
            name: true,
            sportId: true,
            Sport: { select: { id: true, name: true } },
          },
        },
        Match: {
          include: {
            LeagueTeam_Match_homeTeamIdToLeagueTeam: {
              include: {
                Team: true,
                LeaguePlayer: {
                  where: { deletedAt: null },
                  include: { Player: true },
                  orderBy: { Player: { lastName: 'asc' } },
                },
              },
            },
            LeagueTeam_Match_awayTeamIdToLeagueTeam: {
              include: {
                Team: true,
                LeaguePlayer: {
                  where: { deletedAt: null },
                  include: { Player: true },
                  orderBy: { Player: { lastName: 'asc' } },
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
            MatchPhase: true,
          },
        },
      },
      orderBy: { Match: { dateTime: 'asc' } },
    }),
  fetchUserBets: (leagueUserId, leagueId) =>
    prisma.userBet.findMany({
      where: {
        leagueUserId,
        deletedAt: null,
        LeagueMatch: { leagueId, deletedAt: null },
      },
      include: {
        LeaguePlayer: { include: { Player: true } },
      },
    }),
  getUserBetEntityId: (bet) => bet.leagueMatchId,
  getDateTime: (match) => match.Match.dateTime,
})

export type UserMatch = Awaited<ReturnType<typeof getUserMatches>>[number]

/**
 * Fetches friend predictions for a specific match
 * Only returns predictions if the betting is closed (match has started)
 */
export async function getMatchFriendPredictions(leagueMatchId: number) {
  return getFriendPredictions({
    entityId: leagueMatchId,
    entityLabel: 'Match',
    findEntity: (id) =>
      prisma.leagueMatch.findUnique({
        where: { id, deletedAt: null },
        include: { Match: true },
      }),
    getLeagueId: (match) => match.leagueId,
    getDateTime: (match) => match.Match.dateTime,
    findPredictions: (entityId, excludeLeagueUserId) =>
      prisma.userBet.findMany({
        where: {
          leagueMatchId: entityId,
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
          LeaguePlayer: {
            include: { Player: true },
          },
        },
        orderBy: { totalPoints: 'desc' },
      }),
  })
}

export type FriendPrediction = Awaited<
  ReturnType<typeof getMatchFriendPredictions>
>['predictions'][number]

/**
 * Creates or updates a match bet for the current user
 * Enforces betting lock (cannot bet after match starts)
 * Uses Serializable transaction for data consistency
 */
export async function saveMatchBet(input: UserMatchBetInput) {
  return saveUserBet({
    input,
    schema: userMatchBetSchema,
    entityLabel: 'Match',
    findLeagueId: async (validated) => {
      const info = await prisma.leagueMatch.findUnique({
        where: { id: validated.leagueMatchId, deletedAt: null },
        select: { leagueId: true },
      })
      return info?.leagueId ?? null
    },
    runTransaction: async (tx: TransactionClient, validated, leagueUserId) => {
      const leagueMatch = await tx.leagueMatch.findUnique({
        where: { id: validated.leagueMatchId, deletedAt: null },
        include: {
          League: { select: { sportId: true } },
          Match: {
            include: {
              LeagueTeam_Match_homeTeamIdToLeagueTeam: true,
              LeagueTeam_Match_awayTeamIdToLeagueTeam: true,
            },
          },
        },
      })

      if (!leagueMatch) {
        throw new AppError('Match not found', 'NOT_FOUND', 404)
      }

      if (!isBettingOpen(leagueMatch.Match.dateTime)) {
        throw new AppError('Betting is closed for this match', 'BETTING_CLOSED', 400)
      }

      validateScorerExclusivity(validated.scorerId, validated.noScorer)

      // Validate that noScorer can only be set for soccer matches
      if (validated.noScorer === true && leagueMatch.League.sportId !== SPORT_IDS.FOOTBALL) {
        throw new AppError('No scorer option is only available for soccer matches', 'VALIDATION_ERROR', 400)
      }

      if (validated.scorerId) {
        await validateScorerBelongsToTeam(
          validated.scorerId, leagueMatch.Match.homeTeamId, leagueMatch.Match.awayTeamId, tx
        )
      }

      const existingBet = await tx.userBet.findFirst({
        where: {
          leagueMatchId: validated.leagueMatchId,
          leagueUserId,
          deletedAt: null,
        },
      })

      const now = new Date()

      if (existingBet) {
        await tx.userBet.update({
          where: { id: existingBet.id },
          data: {
            homeScore: validated.homeScore,
            awayScore: validated.awayScore,
            scorerId: validated.scorerId,
            noScorer: validated.noScorer,
            overtime: validated.overtime,
            homeAdvanced: validated.homeAdvanced,
            updatedAt: now,
          },
        })
        return true
      }

      await tx.userBet.create({
        data: {
          leagueMatchId: validated.leagueMatchId,
          leagueUserId,
          homeScore: validated.homeScore,
          awayScore: validated.awayScore,
          scorerId: validated.scorerId,
          noScorer: validated.noScorer,
          overtime: validated.overtime,
          homeAdvanced: validated.homeAdvanced,
          dateTime: now,
          totalPoints: 0,
          createdAt: now,
          updatedAt: now,
        },
      })
      return false
    },
    audit: {
      getEntityId: (validated) => validated.leagueMatchId,
      getMetadata: (validated) => ({
        homeScore: validated.homeScore,
        awayScore: validated.awayScore,
        scorerId: validated.scorerId,
        noScorer: validated.noScorer,
        overtime: validated.overtime,
        homeAdvanced: validated.homeAdvanced,
      }),
      onCreated: AuditLogger.userBetCreated,
      onUpdated: AuditLogger.userBetUpdated,
    },
    revalidatePathSuffix: '/matches',
  })
}
