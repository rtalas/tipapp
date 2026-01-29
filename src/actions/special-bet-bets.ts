'use server'

import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/auth-utils'
import { executeServerAction } from '@/lib/server-action-utils'
import { buildSpecialBetPicksWhere } from '@/lib/query-builders'
import { AppError } from '@/lib/error-handler'
import {
  createUserSpecialBetSchema,
  updateUserSpecialBetSchema,
  deleteByIdSchema,
  type CreateUserSpecialBetInput,
  type UpdateUserSpecialBetInput,
} from '@/lib/validation/admin'

/**
 * Fetches special bets with all user bets for the Special Bet Picks page
 * Includes full nested data: League, SpecialBetSingle, Teams, Players, UserSpecialBetSingle (user, predictions)
 */
export async function getSpecialBetsWithUserBets(filters?: {
  leagueId?: number
  status?: 'evaluated' | 'unevaluated' | 'all'
}) {
  await requireAdmin()

  const whereConditions = buildSpecialBetPicksWhere(filters)

  const specialBets = await prisma.leagueSpecialBetSingle.findMany({
    where: whereConditions,
    include: {
      League: true,
      Evaluator: {
        include: {
          EvaluatorType: true,
        },
      },
      SpecialBetSingle: {
        include: {
          SpecialBetSingleType: true,
        },
      },
      LeagueTeam: {
        include: { Team: true },
      },
      LeaguePlayer: {
        include: { Player: true },
      },
      UserSpecialBetSingle: {
        where: { deletedAt: null },
        include: {
          LeagueUser: {
            include: {
              User: true,
            },
          },
          LeagueTeam: {
            include: {
              Team: true,
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
    orderBy: { dateTime: 'desc' },
  })

  return specialBets
}

// Export types for components
export type SpecialBetWithUserBets = Awaited<ReturnType<typeof getSpecialBetsWithUserBets>>[number]
export type UserSpecialBet = SpecialBetWithUserBets['UserSpecialBetSingle'][number]

/**
 * Creates a new user special bet
 * CRITICAL: Validates mutually exclusive fields (team OR player OR value)
 * Validates that the special bet and leagueUser exist
 * Checks for duplicate bets (same user + special bet)
 */
export async function createUserSpecialBet(input: CreateUserSpecialBetInput) {
  return executeServerAction(input, {
    validator: createUserSpecialBetSchema,
    handler: async (validated) => {
      // Verify special bet exists
      const specialBet = await prisma.leagueSpecialBetSingle.findUnique({
        where: { id: validated.leagueSpecialBetSingleId, deletedAt: null },
      })

      if (!specialBet) {
        throw new AppError('Special bet not found', 'NOT_FOUND', 404)
      }

      // Verify leagueUser exists
      const leagueUser = await prisma.leagueUser.findUnique({
        where: { id: validated.leagueUserId, deletedAt: null },
      })

      if (!leagueUser) {
        throw new AppError('League user not found', 'NOT_FOUND', 404)
      }

      // Check for duplicate bet
      const existingBet = await prisma.userSpecialBetSingle.findFirst({
        where: {
          leagueSpecialBetSingleId: validated.leagueSpecialBetSingleId,
          leagueUserId: validated.leagueUserId,
          deletedAt: null,
        },
      })

      if (existingBet) {
        throw new AppError('User already has a bet for this special bet', 'CONFLICT', 409)
      }

      // Verify team belongs to league if team prediction
      if (validated.teamResultId) {
        const team = await prisma.leagueTeam.findFirst({
          where: {
            id: validated.teamResultId,
            leagueId: specialBet.leagueId,
            deletedAt: null,
          },
        })

        if (!team) {
          throw new AppError('Selected team does not belong to this league', 'BAD_REQUEST', 400)
        }
      }

      // Verify player belongs to league if player prediction
      if (validated.playerResultId) {
        const player = await prisma.leaguePlayer.findFirst({
          where: {
            id: validated.playerResultId,
            deletedAt: null,
            LeagueTeam: {
              leagueId: specialBet.leagueId,
              deletedAt: null,
            },
          },
        })

        if (!player) {
          throw new AppError('Selected player does not belong to this league', 'BAD_REQUEST', 400)
        }
      }

      const now = new Date()

      const bet = await prisma.userSpecialBetSingle.create({
        data: {
          leagueSpecialBetSingleId: validated.leagueSpecialBetSingleId,
          leagueUserId: validated.leagueUserId,
          teamResultId: validated.teamResultId ?? null,
          playerResultId: validated.playerResultId ?? null,
          value: validated.value ?? null,
          dateTime: now,
          totalPoints: 0,
          createdAt: now,
          updatedAt: now,
        },
      })

      return { betId: bet.id, success: true }
    },
    revalidatePath: '/admin/special-bet-picks',
    requiresAdmin: true,
  })
}

/**
 * Updates an existing user special bet
 * CRITICAL: Validates mutually exclusive fields (team OR player OR value)
 * Warns if special bet is already evaluated (requires re-evaluation)
 */
export async function updateUserSpecialBet(input: UpdateUserSpecialBetInput) {
  return executeServerAction(input, {
    validator: updateUserSpecialBetSchema,
    handler: async (validated) => {
      // Get the bet to check which league it belongs to
      const bet = await prisma.userSpecialBetSingle.findUnique({
        where: { id: validated.id },
        include: {
          LeagueSpecialBetSingle: true,
        },
      })

      if (!bet) {
        throw new AppError('Bet not found', 'NOT_FOUND', 404)
      }

      // Verify team belongs to league if team prediction
      if (validated.teamResultId) {
        const team = await prisma.leagueTeam.findFirst({
          where: {
            id: validated.teamResultId,
            leagueId: bet.LeagueSpecialBetSingle.leagueId,
            deletedAt: null,
          },
        })

        if (!team) {
          throw new AppError('Selected team does not belong to this league', 'BAD_REQUEST', 400)
        }
      }

      // Verify player belongs to league if player prediction
      if (validated.playerResultId) {
        const player = await prisma.leaguePlayer.findFirst({
          where: {
            id: validated.playerResultId,
            deletedAt: null,
            LeagueTeam: {
              leagueId: bet.LeagueSpecialBetSingle.leagueId,
              deletedAt: null,
            },
          },
        })

        if (!player) {
          throw new AppError('Selected player does not belong to this league', 'BAD_REQUEST', 400)
        }
      }

      const now = new Date()

      // Clear all prediction fields first, then set the one we want
      await prisma.userSpecialBetSingle.update({
        where: { id: validated.id },
        data: {
          teamResultId: validated.teamResultId ?? null,
          playerResultId: validated.playerResultId ?? null,
          value: validated.value ?? null,
          updatedAt: now,
        },
      })

      return { success: true }
    },
    revalidatePath: '/admin/special-bet-picks',
    requiresAdmin: true,
  })
}

/**
 * Deletes a user special bet (soft delete)
 */
export async function deleteUserSpecialBet(id: number) {
  return executeServerAction({ id }, {
    validator: deleteByIdSchema,
    handler: async (validated) => {
      await prisma.userSpecialBetSingle.update({
        where: { id: validated.id },
        data: { deletedAt: new Date() },
      })

      return { success: true }
    },
    revalidatePath: '/admin/special-bet-picks',
    requiresAdmin: true,
  })
}
