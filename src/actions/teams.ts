'use server'

import { revalidateTag } from 'next/cache'
import { prisma } from '@/lib/prisma'
import { requireAdmin, parseSessionUserId } from '@/lib/auth/auth-utils'
import { executeServerAction } from '@/lib/server-action-utils'
import { AuditLogger } from '@/lib/logging/audit-logger'
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
    handler: async (validated, session) => {
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

      AuditLogger.adminCreated(
        parseSessionUserId(session!.user!.id!), 'Team', team.id,
        { name: validated.name, shortcut: validated.shortcut, sportId: validated.sportId }
      ).catch(() => {})

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
    handler: async (validated, session) => {
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

      // Check if team exists and is not deleted
      const existingTeam = await prisma.team.findFirst({
        where: { id: validated.id, deletedAt: null },
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

      AuditLogger.adminUpdated(
        parseSessionUserId(session!.user!.id!), 'Team', validated.id!,
        { name: validated.name, shortcut: validated.shortcut, sportId: validated.sportId }
      ).catch(() => {})

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
      handler: async (validated, session) => {
        // Check if team exists and is not already deleted
        const team = await prisma.team.findFirst({
          where: { id: validated.id, deletedAt: null },
          include: {
            _count: {
              select: { LeagueTeam: { where: { deletedAt: null } } },
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

        AuditLogger.adminDeleted(
          parseSessionUserId(session!.user!.id!), 'Team', validated.id,
          { name: team.name }
        ).catch(() => {})

        return { success: true }
      },
      revalidatePath: '/admin/teams',
      requiresAdmin: true,
    }
  )
}
