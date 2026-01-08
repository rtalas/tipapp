'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/auth-utils'
import { buildSpecialBetsWhere } from '@/lib/query-builders'
import { specialBetInclude } from '@/lib/prisma-helpers'
import {
  createSpecialBetSchema,
  updateSpecialBetResultSchema,
  type CreateSpecialBetInput,
  type UpdateSpecialBetResultInput,
} from '@/lib/validation/admin'
import { deleteByIdSchema } from '@/lib/validation/admin'
import { evaluateExactPlayer, evaluateExactTeam, evaluateExactValue, evaluateClosestValue } from '@/lib/evaluators'
import type { SpecialBetContext, ClosestValueContext } from '@/lib/evaluators'

export async function createSpecialBet(input: CreateSpecialBetInput) {
  await requireAdmin()

  const validated = createSpecialBetSchema.parse(input)
  const now = new Date()

  // Verify league exists
  const league = await prisma.league.findFirst({
    where: {
      id: validated.leagueId,
      deletedAt: null,
    },
  })

  if (!league) {
    throw new Error('League not found')
  }

  // Verify special bet type exists
  const specialBetType = await prisma.specialBetSingle.findFirst({
    where: {
      id: validated.specialBetSingleId,
      deletedAt: null,
    },
  })

  if (!specialBetType) {
    throw new Error('Special bet type not found')
  }

  // Create the special bet
  const specialBet = await prisma.leagueSpecialBetSingle.create({
    data: {
      leagueId: validated.leagueId,
      specialBetSingleId: validated.specialBetSingleId,
      points: validated.points,
      dateTime: validated.dateTime,
      createdAt: now,
      updatedAt: now,
    },
  })

  revalidatePath('/admin/special-bets')
  return { success: true, specialBetId: specialBet.id }
}

export async function updateSpecialBetResult(input: UpdateSpecialBetResultInput) {
  await requireAdmin()

  const validated = updateSpecialBetResultSchema.parse(input)
  const now = new Date()

  // Verify exactly one result field is set (already validated by schema, but double-check)
  const fieldsSet = [
    validated.specialBetTeamResultId !== undefined,
    validated.specialBetPlayerResultId !== undefined,
    validated.specialBetValue !== undefined,
  ].filter(Boolean).length

  if (fieldsSet !== 1) {
    throw new Error('Exactly one result field must be set (team OR player OR value)')
  }

  // Get the special bet to verify it belongs to a league
  const specialBet = await prisma.leagueSpecialBetSingle.findUnique({
    where: { id: validated.specialBetId },
  })

  if (!specialBet) {
    throw new Error('Special bet not found')
  }

  // Verify team belongs to league if team result
  if (validated.specialBetTeamResultId) {
    const team = await prisma.leagueTeam.findFirst({
      where: {
        id: validated.specialBetTeamResultId,
        leagueId: specialBet.leagueId,
        deletedAt: null,
      },
    })

    if (!team) {
      throw new Error('Selected team does not belong to this league')
    }
  }

  // Verify player belongs to league if player result
  if (validated.specialBetPlayerResultId) {
    const player = await prisma.leaguePlayer.findFirst({
      where: {
        id: validated.specialBetPlayerResultId,
        deletedAt: null,
        LeagueTeam: {
          leagueId: specialBet.leagueId,
          deletedAt: null,
        },
      },
    })

    if (!player) {
      throw new Error('Selected player does not belong to this league')
    }
  }

  // Update the special bet result
  // Clear all result fields first, then set the one we want
  await prisma.leagueSpecialBetSingle.update({
    where: { id: validated.specialBetId },
    data: {
      specialBetTeamResultId: validated.specialBetTeamResultId ?? null,
      specialBetPlayerResultId: validated.specialBetPlayerResultId ?? null,
      specialBetValue: validated.specialBetValue ?? null,
      updatedAt: now,
    },
  })

  revalidatePath('/admin/special-bets')
  return { success: true }
}

export async function deleteSpecialBet(id: number) {
  await requireAdmin()

  const validated = deleteByIdSchema.parse({ id })

  // Soft delete by setting deletedAt
  await prisma.leagueSpecialBetSingle.update({
    where: { id: validated.id },
    data: { deletedAt: new Date() },
  })

  revalidatePath('/admin/special-bets')
  return { success: true }
}

// Query functions
export async function getSpecialBets(filters?: {
  leagueId?: number
  status?: 'all' | 'scheduled' | 'finished' | 'evaluated'
  type?: 'all' | 'team' | 'player' | 'value'
}) {
  const whereConditions = buildSpecialBetsWhere(filters)

  return prisma.leagueSpecialBetSingle.findMany({
    where: whereConditions,
    include: specialBetInclude,
    orderBy: { dateTime: 'desc' },
  })
}

export async function getSpecialBetById(specialBetId: number) {
  return prisma.leagueSpecialBetSingle.findUnique({
    where: { id: specialBetId, deletedAt: null },
    include: {
      League: true,
      SpecialBetSingle: true,
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
            include: { User: true },
          },
        },
      },
    },
  })
}

export async function getLeaguesWithTeamsAndPlayers() {
  return prisma.league.findMany({
    where: {
      deletedAt: null,
      isActive: true,
    },
    include: {
      LeagueTeam: {
        where: { deletedAt: null },
        include: {
          Team: true,
          LeaguePlayer: {
            where: { deletedAt: null },
            include: { Player: true },
            orderBy: { Player: { lastName: 'asc' } },
          },
        },
        orderBy: { Team: { name: 'asc' } },
      },
    },
    orderBy: { name: 'asc' },
  })
}

// Evaluate a single special bet and calculate points for all user bets
// Uses atomic transaction to prevent race conditions (double evaluation)
export async function evaluateSpecialBet(specialBetId: number) {
  await requireAdmin()

  const now = new Date()

  // Wrapped in transaction with optimistic locking
  const result = await prisma.$transaction(async (tx) => {
    // Lock: Get special bet with exclusive lock within transaction
    const specialBet = await tx.leagueSpecialBetSingle.findUnique({
      where: { id: specialBetId, deletedAt: null },
      include: {
        League: {
          include: {
            Evaluator: {
              where: { deletedAt: null },
              include: { EvaluatorType: true },
            },
          },
        },
        UserSpecialBetSingle: {
          where: { deletedAt: null },
        },
      },
    })

    if (!specialBet) {
      throw new Error('Special bet not found')
    }

    // Race condition protection: Check if already evaluated
    if (specialBet.isEvaluated) {
      throw new Error('Special bet is already evaluated')
    }

    // Verify exactly one result field is set
    const resultsSet = [
      specialBet.specialBetTeamResultId !== null,
      specialBet.specialBetPlayerResultId !== null,
      specialBet.specialBetValue !== null,
    ].filter(Boolean).length

    if (resultsSet !== 1) {
      throw new Error('Special bet result must be set before evaluation (exactly one field)')
    }

    const evaluators = specialBet.League.Evaluator

    // Build evaluator lookup by type name
    const evaluatorByType: Record<string, number> = {}
    for (const evaluator of evaluators) {
      evaluatorByType[evaluator.EvaluatorType.name] = parseInt(evaluator.points, 10) || 0
    }

    // Process each user bet
    for (const bet of specialBet.UserSpecialBetSingle) {
      let points = 0

      // Team result evaluation
      if (specialBet.specialBetTeamResultId !== null) {
        const context: SpecialBetContext = {
          prediction: { teamResultId: bet.teamResultId },
          actual: { teamResultId: specialBet.specialBetTeamResultId },
        }

        if (evaluateExactTeam(context)) {
          points += evaluatorByType['exact-team'] ?? 0
        }
      }
      // Player result evaluation
      else if (specialBet.specialBetPlayerResultId !== null) {
        const context: SpecialBetContext = {
          prediction: { playerResultId: bet.playerResultId },
          actual: { playerResultId: specialBet.specialBetPlayerResultId },
        }

        if (evaluateExactPlayer(context)) {
          points += evaluatorByType['exact-player'] ?? 0
        }
      }
      // Value result evaluation
      else if (specialBet.specialBetValue !== null) {
        const context: SpecialBetContext = {
          prediction: { value: bet.value },
          actual: { value: specialBet.specialBetValue },
        }

        // Check exact value first
        if (evaluateExactValue(context)) {
          points += evaluatorByType['exact-value'] ?? 0
        }
        // If not exact, check closest value (requires all user predictions)
        else {
          // Collect all user predictions for closest-value evaluation
          const allPredictions = specialBet.UserSpecialBetSingle.map((b) => b.value ?? 0)

          const closestContext: ClosestValueContext = {
            prediction: { value: bet.value ?? 0 },
            actual: { value: specialBet.specialBetValue },
            allPredictions,
          }

          if (evaluateClosestValue(closestContext)) {
            points += evaluatorByType['closest-value'] ?? 0
          }
        }
      }

      // Update bet with calculated points
      await tx.userSpecialBetSingle.update({
        where: { id: bet.id },
        data: {
          totalPoints: points,
          updatedAt: now,
        },
      })
    }

    // Mark special bet as evaluated
    await tx.leagueSpecialBetSingle.update({
      where: { id: specialBetId },
      data: {
        isEvaluated: true,
        updatedAt: now,
      },
    })

    return { evaluatedBets: specialBet.UserSpecialBetSingle.length }
  }, {
    isolationLevel: 'Serializable',
  })

  revalidatePath('/admin/special-bets')
  return { success: true, evaluatedBets: result.evaluatedBets }
}
