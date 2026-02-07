'use server'

import { unstable_cache } from 'next/cache'
import { prisma } from '@/lib/prisma'
import { requireLeagueMember, isBettingOpen } from '@/lib/auth/user-auth-utils'
import { userSpecialBetSchema, type UserSpecialBetInput } from '@/lib/validation/user'
import { AppError } from '@/lib/error-handler'
import { AuditLogger } from '@/lib/logging/audit-logger'
import { saveUserBet, getFriendPredictions, type TransactionClient } from '@/lib/bet-utils'
import { createCachedEntityFetcher } from '@/lib/cached-data-utils'

/**
 * Fetches special bets for a league with the current user's picks
 */
export const getUserSpecialBets = createCachedEntityFetcher({
  cacheKey: 'special-bet-data',
  cacheTags: ['special-bet-data'],
  revalidateSeconds: 1200,
  fetchEntities: (leagueId) =>
    prisma.leagueSpecialBetSingle.findMany({
      where: { leagueId, deletedAt: null },
      include: {
        Evaluator: { include: { EvaluatorType: true } },
        SpecialBetSingle: {
          include: { SpecialBetSingleType: true, Sport: true },
        },
        LeagueTeam: { include: { Team: true } },
        LeaguePlayer: { include: { Player: true } },
      },
      orderBy: { dateTime: 'asc' },
    }),
  fetchUserBets: (leagueUserId, leagueId) =>
    prisma.userSpecialBetSingle.findMany({
      where: {
        leagueUserId,
        deletedAt: null,
        LeagueSpecialBetSingle: { leagueId, deletedAt: null },
      },
      include: {
        LeagueTeam: { include: { Team: true } },
        LeaguePlayer: { include: { Player: true } },
      },
    }),
  getUserBetEntityId: (bet) => bet.leagueSpecialBetSingleId,
  getDateTime: (sb) => sb.dateTime,
})

export type UserSpecialBet = Awaited<ReturnType<typeof getUserSpecialBets>>[number]

/**
 * Fetches friend predictions for a specific special bet
 * Only returns predictions if the betting is closed
 */
export async function getSpecialBetFriendPredictions(leagueSpecialBetSingleId: number) {
  return getFriendPredictions({
    entityId: leagueSpecialBetSingleId,
    entityLabel: 'Special bet',
    findEntity: (id) =>
      prisma.leagueSpecialBetSingle.findUnique({
        where: { id, deletedAt: null },
      }),
    getLeagueId: (sb) => sb.leagueId,
    getDateTime: (sb) => sb.dateTime,
    findPredictions: (entityId, excludeLeagueUserId) =>
      prisma.userSpecialBetSingle.findMany({
        where: {
          leagueSpecialBetSingleId: entityId,
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
          LeagueTeam: { include: { Team: true } },
          LeaguePlayer: { include: { Player: true } },
        },
        orderBy: { totalPoints: 'desc' },
      }),
  })
}

export type SpecialBetFriendPrediction = Awaited<
  ReturnType<typeof getSpecialBetFriendPredictions>
>['predictions'][number]

/**
 * Cached teams data (12 hour TTL)
 * Fetches all teams for a league - group filtering happens at runtime
 */
const getCachedTeams = (leagueId: number) =>
  unstable_cache(
    async () => {
      const teams = await prisma.leagueTeam.findMany({
        where: { leagueId, deletedAt: null },
        include: { Team: true },
        orderBy: { Team: { name: 'asc' } },
      })

      return teams.map((t) => ({ ...t, group: t.group }))
    },
    ['special-bet-teams', String(leagueId)],
    {
      revalidate: 43200,
      tags: ['special-bet-teams'],
    }
  )()

/**
 * Gets teams available for a special bet
 */
export async function getSpecialBetTeams(leagueId: number, group?: string) {
  await requireLeagueMember(leagueId)
  const teams = await getCachedTeams(leagueId)
  return group ? teams.filter((t) => t.group === group) : teams
}

/**
 * Cached players data (12 hour TTL)
 */
const getCachedPlayers = (leagueId: number) =>
  unstable_cache(
    async () => {
      const players = await prisma.leaguePlayer.findMany({
        where: {
          deletedAt: null,
          LeagueTeam: { leagueId, deletedAt: null },
        },
        include: {
          Player: true,
          LeagueTeam: { include: { Team: true } },
        },
        orderBy: { Player: { lastName: 'asc' } },
      })

      return players
    },
    ['special-bet-players', String(leagueId)],
    {
      revalidate: 43200,
      tags: ['special-bet-players'],
    }
  )()

/**
 * Gets players available for a special bet
 */
export async function getSpecialBetPlayers(leagueId: number) {
  await requireLeagueMember(leagueId)
  return getCachedPlayers(leagueId)
}

/**
 * Creates or updates a special bet pick for the current user
 * Uses Serializable transaction for data consistency
 */
export async function saveSpecialBet(input: UserSpecialBetInput) {
  return saveUserBet({
    input,
    schema: userSpecialBetSchema,
    entityLabel: 'Special bet',
    findLeagueId: async (validated) => {
      const info = await prisma.leagueSpecialBetSingle.findUnique({
        where: { id: validated.leagueSpecialBetSingleId, deletedAt: null },
        select: { leagueId: true },
      })
      return info?.leagueId ?? null
    },
    runTransaction: async (tx: TransactionClient, validated, leagueUserId) => {
      const specialBet = await tx.leagueSpecialBetSingle.findUnique({
        where: { id: validated.leagueSpecialBetSingleId, deletedAt: null },
      })

      if (!specialBet) {
        throw new AppError('Special bet not found', 'NOT_FOUND', 404)
      }

      if (!isBettingOpen(specialBet.dateTime)) {
        throw new AppError('Betting is closed for this special bet', 'BETTING_CLOSED', 400)
      }

      const existingBet = await tx.userSpecialBetSingle.findFirst({
        where: {
          leagueSpecialBetSingleId: validated.leagueSpecialBetSingleId,
          leagueUserId,
          deletedAt: null,
        },
      })

      const now = new Date()

      if (existingBet) {
        await tx.userSpecialBetSingle.update({
          where: { id: existingBet.id },
          data: {
            teamResultId: validated.teamResultId,
            playerResultId: validated.playerResultId,
            value: validated.value,
            updatedAt: now,
          },
        })
        return true
      }

      await tx.userSpecialBetSingle.create({
        data: {
          leagueSpecialBetSingleId: validated.leagueSpecialBetSingleId,
          leagueUserId,
          teamResultId: validated.teamResultId,
          playerResultId: validated.playerResultId,
          value: validated.value,
          totalPoints: 0,
          dateTime: now,
          createdAt: now,
          updatedAt: now,
        },
      })
      return false
    },
    audit: {
      getEntityId: (validated) => validated.leagueSpecialBetSingleId,
      getMetadata: (validated) => ({
        teamResultId: validated.teamResultId,
        playerResultId: validated.playerResultId,
        value: validated.value,
      }),
      onCreated: AuditLogger.specialBetCreated,
      onUpdated: AuditLogger.specialBetUpdated,
    },
    revalidatePathSuffix: '/special-bets',
  })
}
