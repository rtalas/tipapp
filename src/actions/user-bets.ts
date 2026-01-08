'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/auth-utils'
import { executeServerAction } from '@/lib/server-action-utils'
import { buildUserPicksWhere } from '@/lib/query-builders'
import {
  createUserBetSchema,
  updateUserBetSchema,
  deleteByIdSchema,
  type CreateUserBetInput,
  type UpdateUserBetInput,
} from '@/lib/validation/admin'

/**
 * Fetches matches with all user bets for the User Picks page
 * Includes full nested data: League, Match (teams, scorers), UserBets (user, scorer)
 */
export async function getMatchesWithUserBets(filters?: {
  leagueId?: number
  status?: 'evaluated' | 'unevaluated' | 'all'
}) {
  await requireAdmin()

  const whereConditions = buildUserPicksWhere(filters)

  const matches = await prisma.leagueMatch.findMany({
    where: whereConditions,
    include: {
      League: true,
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
            include: {
              LeaguePlayer: {
                include: { Player: true },
              },
            },
          },
        },
      },
      UserBet: {
        where: { deletedAt: null },
        include: {
          LeagueUser: {
            include: {
              User: true,
            },
          },
          LeaguePlayer: {
            include: {
              Player: true,
            },
          },
        },
        orderBy: [
          { LeagueUser: { User: { lastName: 'asc' } } },
          { LeagueUser: { User: { firstName: 'asc' } } },
        ],
      },
    },
    orderBy: { Match: { dateTime: 'desc' } },
  })

  return matches
}

/**
 * Creates a new user bet
 * Validates that the leagueMatch and leagueUser exist
 * Checks for duplicate bets (same user + match)
 */
export async function createUserBet(input: CreateUserBetInput) {
  return executeServerAction(input, {
    validator: createUserBetSchema,
    handler: async (validated) => {
      // Verify leagueMatch exists
      const leagueMatch = await prisma.leagueMatch.findUnique({
        where: { id: validated.leagueMatchId, deletedAt: null },
        include: { Match: true },
      })

      if (!leagueMatch) {
        throw new Error('Match not found')
      }

      // Verify leagueUser exists
      const leagueUser = await prisma.leagueUser.findUnique({
        where: { id: validated.leagueUserId, deletedAt: null },
      })

      if (!leagueUser) {
        throw new Error('User not found')
      }

      // Check if bet already exists (prevent duplicates)
      const existingBet = await prisma.userBet.findFirst({
        where: {
          leagueMatchId: validated.leagueMatchId,
          leagueUserId: validated.leagueUserId,
          deletedAt: null,
        },
      })

      if (existingBet) {
        throw new Error('User already has a bet for this match')
      }

      // Verify scorer belongs to one of the teams if provided
      if (validated.scorerId) {
        const scorer = await prisma.leaguePlayer.findUnique({
          where: { id: validated.scorerId, deletedAt: null },
        })

        if (!scorer) {
          throw new Error('Scorer not found')
        }

        const isValidScorer =
          scorer.leagueTeamId === leagueMatch.Match.homeTeamId ||
          scorer.leagueTeamId === leagueMatch.Match.awayTeamId

        if (!isValidScorer) {
          throw new Error('Scorer must belong to one of the teams playing')
        }
      }

      const now = new Date()

      const bet = await prisma.userBet.create({
        data: {
          leagueMatchId: validated.leagueMatchId,
          leagueUserId: validated.leagueUserId,
          homeScore: validated.homeScore,
          awayScore: validated.awayScore,
          scorerId: validated.scorerId,
          overtime: validated.overtime,
          homeAdvanced: validated.homeAdvanced,
          dateTime: now,
          totalPoints: 0,
          createdAt: now,
          updatedAt: now,
        },
      })

      return { betId: bet.id, success: true }
    },
    revalidatePath: '/admin/user-picks',
    requiresAdmin: true,
  })
}

/**
 * Updates an existing user bet
 * Logs warning if match is already evaluated
 */
export async function updateUserBet(input: UpdateUserBetInput) {
  return executeServerAction(input, {
    validator: updateUserBetSchema,
    handler: async (validated) => {
      const bet = await prisma.userBet.findUnique({
        where: { id: validated.id, deletedAt: null },
        include: { LeagueMatch: { include: { Match: true } } },
      })

      if (!bet) {
        throw new Error('Bet not found')
      }

      // Warning if match already evaluated
      if (bet.LeagueMatch.Match.isEvaluated) {
        console.warn(
          `Updating bet ${validated.id} for already evaluated match ${bet.LeagueMatch.matchId}. Re-evaluation required.`
        )
      }

      // Verify scorer belongs to one of the teams if provided
      if (validated.scorerId) {
        const scorer = await prisma.leaguePlayer.findUnique({
          where: { id: validated.scorerId, deletedAt: null },
        })

        if (!scorer) {
          throw new Error('Scorer not found')
        }

        const isValidScorer =
          scorer.leagueTeamId === bet.LeagueMatch.Match.homeTeamId ||
          scorer.leagueTeamId === bet.LeagueMatch.Match.awayTeamId

        if (!isValidScorer) {
          throw new Error('Scorer must belong to one of the teams playing')
        }
      }

      await prisma.userBet.update({
        where: { id: validated.id },
        data: {
          ...(validated.homeScore !== undefined && { homeScore: validated.homeScore }),
          ...(validated.awayScore !== undefined && { awayScore: validated.awayScore }),
          ...(validated.scorerId !== undefined && { scorerId: validated.scorerId }),
          ...(validated.overtime !== undefined && { overtime: validated.overtime }),
          ...(validated.homeAdvanced !== undefined && { homeAdvanced: validated.homeAdvanced }),
          updatedAt: new Date(),
        },
      })

      return { success: true }
    },
    revalidatePath: '/admin/user-picks',
    requiresAdmin: true,
  })
}

/**
 * Soft deletes a user bet
 * Sets deletedAt timestamp instead of removing from database
 */
export async function deleteUserBet(id: number) {
  return executeServerAction(
    { id },
    {
      validator: deleteByIdSchema,
      handler: async (validated) => {
        const bet = await prisma.userBet.findUnique({
          where: { id: validated.id, deletedAt: null },
        })

        if (!bet) {
          throw new Error('Bet not found')
        }

        await prisma.userBet.update({
          where: { id: validated.id },
          data: { deletedAt: new Date() },
        })

        return { success: true }
      },
      revalidatePath: '/admin/user-picks',
      requiresAdmin: true,
    }
  )
}
