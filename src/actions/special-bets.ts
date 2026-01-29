'use server'

import { Prisma } from '@prisma/client'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { executeServerAction } from '@/lib/server-action-utils'
import { specialBetInclude } from '@/lib/prisma-helpers'
import { AppError } from '@/lib/error-handler'
import {
  createSpecialBetSchema,
  updateSpecialBetResultSchema,
  type CreateSpecialBetInput,
  type UpdateSpecialBetResultInput,
} from '@/lib/validation/admin'

export async function createSpecialBet(input: CreateSpecialBetInput) {
  return executeServerAction(input, {
    validator: createSpecialBetSchema,
    handler: async (validated) => {
      const now = new Date()

      // Verify league exists
      const league = await prisma.league.findFirst({
        where: {
          id: validated.leagueId,
          deletedAt: null,
        },
      })

      if (!league) {
        throw new AppError('League not found', 'NOT_FOUND', 404)
      }

      // Verify special bet type exists
      const specialBetType = await prisma.specialBetSingle.findFirst({
        where: {
          id: validated.specialBetSingleId,
          deletedAt: null,
        },
      })

      if (!specialBetType) {
        throw new AppError('Special bet type not found', 'NOT_FOUND', 404)
      }

      // Verify evaluator exists, belongs to league, and has entity='special'
      const evaluator = await prisma.evaluator.findFirst({
        where: {
          id: validated.evaluatorId,
          leagueId: validated.leagueId,
          entity: 'special',
          deletedAt: null,
        },
      })

      if (!evaluator) {
        throw new AppError(
          'Evaluator not found or does not belong to this league with entity type "special"',
          'BAD_REQUEST',
          400
        )
      }

      // Create the special bet
      const specialBet = await prisma.leagueSpecialBetSingle.create({
        data: {
          leagueId: validated.leagueId,
          specialBetSingleId: validated.specialBetSingleId,
          evaluatorId: validated.evaluatorId,
          points: evaluator.points,
          dateTime: validated.dateTime,
          group: validated.group,
          createdAt: now,
          updatedAt: now,
        },
      })

      return { specialBetId: specialBet.id }
    },
    revalidatePath: '/admin/special-bets',
    requiresAdmin: true,
  })
}

export async function updateSpecialBetResult(input: UpdateSpecialBetResultInput) {
  return executeServerAction(input, {
    validator: updateSpecialBetResultSchema,
    handler: async (validated) => {
      const now = new Date()

      // Verify exactly one result field is set (already validated by schema, but double-check)
      const fieldsSet = [
        validated.specialBetTeamResultId !== undefined,
        validated.specialBetPlayerResultId !== undefined,
        validated.specialBetValue !== undefined,
      ].filter(Boolean).length

      if (fieldsSet !== 1) {
        throw new AppError('Exactly one result field must be set (team OR player OR value)', 'BAD_REQUEST', 400)
      }

      // Get the special bet to verify it belongs to a league
      const specialBet = await prisma.leagueSpecialBetSingle.findUnique({
        where: { id: validated.specialBetId },
      })

      if (!specialBet) {
        throw new AppError('Special bet not found', 'NOT_FOUND', 404)
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
          throw new AppError('Selected team does not belong to this league', 'BAD_REQUEST', 400)
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
          throw new AppError('Selected player does not belong to this league', 'BAD_REQUEST', 400)
        }
      }

      // Verify advanced teams belong to league if provided
      if (validated.advancedTeamIds && validated.advancedTeamIds.length > 0) {
        const teams = await prisma.leagueTeam.findMany({
          where: {
            id: { in: validated.advancedTeamIds },
            leagueId: specialBet.leagueId,
            deletedAt: null,
          },
        })

        if (teams.length !== validated.advancedTeamIds.length) {
          throw new AppError('One or more advanced teams do not belong to this league', 'BAD_REQUEST', 400)
        }
      }

      // Use transaction to update result and advanced teams atomically
      await prisma.$transaction(async (tx) => {
        // Update the special bet result
        // Clear all result fields first, then set the one we want
        // If bet was already evaluated, reset isEvaluated to false (requires re-evaluation)
        await tx.leagueSpecialBetSingle.update({
          where: { id: validated.specialBetId },
          data: {
            specialBetTeamResultId: validated.specialBetTeamResultId ?? null,
            specialBetPlayerResultId: validated.specialBetPlayerResultId ?? null,
            specialBetValue: validated.specialBetValue ?? null,
            isEvaluated: false, // Reset evaluation status
            updatedAt: now,
          },
        })

        // Handle advanced teams if provided
        if (validated.advancedTeamIds && validated.advancedTeamIds.length > 0) {
          // Soft delete existing advanced teams
          await tx.leagueSpecialBetSingleTeamAdvanced.updateMany({
            where: {
              leagueSpecialBetSingleId: validated.specialBetId,
              deletedAt: null,
            },
            data: { deletedAt: now },
          })

          // Create new advanced teams
          await tx.leagueSpecialBetSingleTeamAdvanced.createMany({
            data: validated.advancedTeamIds.map((teamId) => ({
              leagueSpecialBetSingleId: validated.specialBetId,
              leagueTeamId: teamId,
              createdAt: now,
              updatedAt: now,
            })),
          })
        }
      })

      return {
        wasEvaluated: specialBet.isEvaluated,
        needsReEvaluation: true, // Always needs re-evaluation after result update
      }
    },
    revalidatePath: '/admin/special-bets',
    requiresAdmin: true,
  })
}

export async function deleteSpecialBet(id: number) {
  'use server'
  return executeServerAction({ id }, {
    validator: z.object({ id: z.number().int().positive() }),
    handler: async (validated) => {
      await prisma.leagueSpecialBetSingle.update({
        where: { id: validated.id },
        data: { deletedAt: new Date() },
      })
      return {}
    },
    revalidatePath: '/admin/special-bets',
    requiresAdmin: true,
  })
}

// Export type for components (derived from shared query structure)
export type SpecialBetWithDetails = Awaited<
  ReturnType<
    () => Promise<
      Array<
        Prisma.LeagueSpecialBetSingleGetPayload<{
          include: typeof specialBetInclude
        }>
      >
    >
  >
>[number]
