'use server'

import { prisma } from '@/lib/prisma'
import { executeServerAction } from '@/lib/server-action-utils'
import { buildSpecialBetsWhere } from '@/lib/query-builders'
import { specialBetInclude } from '@/lib/prisma-helpers'
import {
  createSpecialBetSchema,
  updateSpecialBetResultSchema,
  type CreateSpecialBetInput,
  type UpdateSpecialBetResultInput,
} from '@/lib/validation/admin'
import { deleteByIdSchema } from '@/lib/validation/admin'

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

      return {}
    },
    revalidatePath: '/admin/special-bets',
    requiresAdmin: true,
  })
}

export async function deleteSpecialBet(id: number) {
  return executeServerAction({ id }, {
    validator: deleteByIdSchema,
    handler: async (validated) => {
      // Soft delete by setting deletedAt
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

