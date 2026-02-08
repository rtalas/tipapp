'use server'

import { revalidateTag } from 'next/cache'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/auth/auth-utils'
import { executeServerAction } from '@/lib/server-action-utils'
import { AppError } from '@/lib/error-handler'
import { createTeamSchema, updateTeamSchema, deleteByIdSchema, type CreateTeamInput, type UpdateTeamInput } from '@/lib/validation/admin'

// Get all teams with Sport relation
export async function getAllTeams() {
  await requireAdmin()
  return prisma.team.findMany({
    where: { deletedAt: null },
    include: {
      Sport: true,
      _count: {
        select: { LeagueTeam: true },
      },
    },
    orderBy: { name: 'asc' },
  })
}

// Create new team
export async function createTeam(input: CreateTeamInput) {
  return executeServerAction(input, {
    validator: createTeamSchema,
    handler: async (validated) => {
      // Check if sport exists
      const sport = await prisma.sport.findUnique({
        where: { id: validated.sportId },
      })

      if (!sport) {
        throw new AppError('Sport not found', 'NOT_FOUND', 404)
      }

      const team = await prisma.team.create({
        data: {
          name: validated.name.trim(),
          nickname: validated.nickname?.trim(),
          shortcut: validated.shortcut.trim(),
          flagIcon: validated.flagIcon,
          flagType: validated.flagType,
          sportId: validated.sportId,
          externalId: validated.externalId,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        include: {
          Sport: true,
        },
      })

      revalidateTag('special-bet-teams', 'max')
      return { teamId: team.id }
    },
    revalidatePath: '/admin/teams',
    requiresAdmin: true,
  })
}

// Update team
export async function updateTeam(input: UpdateTeamInput) {
  return executeServerAction(input, {
    validator: updateTeamSchema,
    handler: async (validated) => {
      if (!validated.id) {
        throw new AppError('Team ID is required', 'BAD_REQUEST', 400)
      }

      // Check if sport exists (if being updated)
      if (validated.sportId) {
        const sport = await prisma.sport.findUnique({
          where: { id: validated.sportId },
        })

        if (!sport) {
          throw new AppError('Sport not found', 'NOT_FOUND', 404)
        }
      }

      // Check if team exists
      const existingTeam = await prisma.team.findUnique({
        where: { id: validated.id },
      })

      if (!existingTeam) {
        throw new AppError('Team not found', 'NOT_FOUND', 404)
      }

      await prisma.team.update({
        where: { id: validated.id },
        data: {
          name: validated.name?.trim(),
          nickname: validated.nickname?.trim(),
          shortcut: validated.shortcut?.trim(),
          flagIcon: validated.flagIcon,
          flagType: validated.flagType,
          sportId: validated.sportId,
          externalId: validated.externalId,
          updatedAt: new Date(),
        },
      })

      revalidateTag('special-bet-teams', 'max')
      return { success: true }
    },
    revalidatePath: '/admin/teams',
    requiresAdmin: true,
  })
}

// Delete team (soft delete)
export async function deleteTeam(id: number) {
  return executeServerAction(
    { id },
    {
      validator: deleteByIdSchema,
      handler: async (validated) => {
        // Check if team exists
        const team = await prisma.team.findUnique({
          where: { id: validated.id },
          include: {
            _count: {
              select: { LeagueTeam: true },
            },
          },
        })

        if (!team) {
          throw new AppError('Team not found', 'NOT_FOUND', 404)
        }

        // Warn if team is assigned to leagues
        if (team._count.LeagueTeam > 0) {
          console.warn(
            `Team "${team.name}" is assigned to ${team._count.LeagueTeam} league(s). Soft deleting.`
          )
        }

        // Soft delete
        await prisma.team.update({
          where: { id: validated.id },
          data: { deletedAt: new Date() },
        })

        revalidateTag('special-bet-teams', 'max')
        return { success: true }
      },
      revalidatePath: '/admin/teams',
      requiresAdmin: true,
    }
  )
}
