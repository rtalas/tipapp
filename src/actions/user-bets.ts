'use server'

import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/auth/auth-utils'
import { executeServerAction } from '@/lib/server-action-utils'
import { buildUserPicksWhere } from '@/lib/query-builders'
import { AppError } from '@/lib/error-handler'
import { validateScorerExclusivity, validateScorerBelongsToTeam } from '@/lib/bet-utils'
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
 * (internal use only)
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
            where: { deletedAt: null },
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

// Export types for components
export type MatchWithUserBets = Awaited<ReturnType<typeof getMatchesWithUserBets>>[number]
export type UserBet = MatchWithUserBets['UserBet'][number]

/**
 * Creates a new user bet
 * Validates that the leagueMatch and leagueUser exist
 * Checks for duplicate bets (same user + match)
 */
export async function createUserBet(input: CreateUserBetInput) {
  return executeServerAction(input, {
    validator: createUserBetSchema,
    handler: async (validated) => {
      const bet = await prisma.$transaction(
        async (tx) => {
          // Verify leagueMatch exists
          const leagueMatch = await tx.leagueMatch.findUnique({
            where: { id: validated.leagueMatchId, deletedAt: null },
            include: { Match: true, League: { select: { jokerCount: true } } },
          })

          if (!leagueMatch || leagueMatch.Match.deletedAt !== null) {
            throw new AppError('Match not found', 'NOT_FOUND', 404)
          }

          if (leagueMatch.Match.homeTeamId === null || leagueMatch.Match.awayTeamId === null) {
            throw new AppError('Cannot create bet for a placeholder match', 'BAD_REQUEST', 400)
          }

          // Verify leagueUser exists
          const leagueUser = await tx.leagueUser.findUnique({
            where: { id: validated.leagueUserId, deletedAt: null },
          })

          if (!leagueUser) {
            throw new AppError('User not found', 'NOT_FOUND', 404)
          }

          // Verify leagueUser belongs to the same league as the match
          if (leagueUser.leagueId !== leagueMatch.leagueId) {
            throw new AppError('User does not belong to the same league as this match', 'BAD_REQUEST', 400)
          }

          // Check if bet already exists (prevent duplicates)
          const existingBet = await tx.userBet.findFirst({
            where: {
              leagueMatchId: validated.leagueMatchId,
              leagueUserId: validated.leagueUserId,
              deletedAt: null,
            },
          })

          if (existingBet) {
            throw new AppError('User already has a bet for this match', 'CONFLICT', 409)
          }

          validateScorerExclusivity(validated.scorerId, validated.noScorer, validated.ownGoal)

          if (validated.scorerId) {
            await validateScorerBelongsToTeam(
              validated.scorerId, leagueMatch.Match.homeTeamId, leagueMatch.Match.awayTeamId, tx
            )
          }

          const useJoker = validated.usedJoker === true
          if (useJoker) {
            await assertJokerAllowed(tx, {
              leagueId: leagueMatch.leagueId,
              leagueUserId: validated.leagueUserId,
              leagueMatchId: validated.leagueMatchId,
              jokerCount: leagueMatch.League.jokerCount,
              isDoubled: leagueMatch.isDoubled,
              jokerBlocked: leagueMatch.jokerBlocked,
            })
          }

          const now = new Date()

          return tx.userBet.create({
            data: {
              leagueMatchId: validated.leagueMatchId,
              leagueUserId: validated.leagueUserId,
              homeScore: validated.homeScore,
              awayScore: validated.awayScore,
              scorerId: validated.scorerId,
              noScorer: validated.noScorer,
              ownGoal: validated.ownGoal,
              overtime: validated.overtime,
              homeAdvanced: validated.homeAdvanced,
              usedJoker: useJoker,
              dateTime: now,
              totalPoints: 0,
              createdAt: now,
              updatedAt: now,
            },
          })
        },
        {
          isolationLevel: 'Serializable',
          maxWait: 5000,
          timeout: 10000,
        }
      )

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
        include: {
          LeagueMatch: {
            include: {
              Match: true,
              League: { select: { jokerCount: true } },
            },
          },
        },
      })

      if (!bet || bet.LeagueMatch.Match.deletedAt !== null) {
        throw new AppError('Bet not found', 'NOT_FOUND', 404)
      }

      if (bet.LeagueMatch.Match.homeTeamId === null || bet.LeagueMatch.Match.awayTeamId === null) {
        throw new AppError('Cannot update bet for a placeholder match', 'BAD_REQUEST', 400)
      }

      // Warning if match already evaluated
      if (bet.LeagueMatch.Match.isEvaluated) {
        console.warn(
          `Updating bet ${validated.id} for already evaluated match ${bet.LeagueMatch.matchId}. Re-evaluation required.`
        )
      }

      validateScorerExclusivity(validated.scorerId, validated.noScorer, validated.ownGoal)

      if (validated.scorerId) {
        await validateScorerBelongsToTeam(
          validated.scorerId, bet.LeagueMatch.Match.homeTeamId, bet.LeagueMatch.Match.awayTeamId
        )
      }

      if (validated.usedJoker === true) {
        await assertJokerAllowed(prisma, {
          leagueId: bet.LeagueMatch.leagueId,
          leagueUserId: bet.leagueUserId,
          leagueMatchId: bet.leagueMatchId,
          jokerCount: bet.LeagueMatch.League.jokerCount,
          isDoubled: bet.LeagueMatch.isDoubled,
          jokerBlocked: bet.LeagueMatch.jokerBlocked,
        })
      }

      await prisma.userBet.update({
        where: { id: validated.id },
        data: {
          ...(validated.homeScore !== undefined && { homeScore: validated.homeScore }),
          ...(validated.awayScore !== undefined && { awayScore: validated.awayScore }),
          ...(validated.scorerId !== undefined && { scorerId: validated.scorerId }),
          ...(validated.noScorer !== undefined && { noScorer: validated.noScorer }),
          ...(validated.ownGoal !== undefined && { ownGoal: validated.ownGoal }),
          ...(validated.overtime !== undefined && { overtime: validated.overtime }),
          ...(validated.homeAdvanced !== undefined && { homeAdvanced: validated.homeAdvanced }),
          ...(validated.usedJoker !== undefined && { usedJoker: validated.usedJoker }),
          updatedAt: new Date(),
        },
      })

      return { success: true }
    },
    revalidatePath: '/admin/user-picks',
    requiresAdmin: true,
  })
}

async function assertJokerAllowed(
  client: typeof prisma | Parameters<Parameters<typeof prisma.$transaction>[0]>[0],
  args: {
    leagueId: number
    leagueUserId: number
    leagueMatchId: number
    jokerCount: number
    isDoubled: boolean
    jokerBlocked: boolean
  }
) {
  if (args.jokerCount <= 0) {
    throw new AppError('Jokers are disabled for this league', 'VALIDATION_ERROR', 400)
  }
  if (args.isDoubled) {
    throw new AppError('Joker cannot be used on doubled matches', 'VALIDATION_ERROR', 400)
  }
  if (args.jokerBlocked) {
    throw new AppError('Joker is not allowed on this match', 'VALIDATION_ERROR', 400)
  }

  const jokersUsedElsewhere = await client.userBet.count({
    where: {
      leagueUserId: args.leagueUserId,
      usedJoker: true,
      deletedAt: null,
      leagueMatchId: { not: args.leagueMatchId },
      LeagueMatch: { leagueId: args.leagueId, deletedAt: null },
    },
  })

  if (jokersUsedElsewhere >= args.jokerCount) {
    throw new AppError('No jokers remaining', 'VALIDATION_ERROR', 400)
  }
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
          throw new AppError('Bet not found', 'NOT_FOUND', 404)
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
