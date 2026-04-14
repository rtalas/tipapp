'use server'

import { updateTag } from 'next/cache'
import { prisma } from '@/lib/prisma'
import { requireAdmin, parseSessionUserId } from '@/lib/auth/auth-utils'
import { executeServerAction } from '@/lib/server-action-utils'
import { AuditLogger } from '@/lib/logging/audit-logger'
import { AppError } from '@/lib/error-handler'
import {
  createTournamentSchema,
  updateTournamentSchema,
  deleteByIdSchema,
  type CreateTournamentInput,
  type UpdateTournamentInput,
} from '@/lib/validation/admin'

export async function getAllTournaments() {
  await requireAdmin()
  return prisma.tournament.findMany({
    where: { deletedAt: null },
    include: {
      _count: {
        select: { LeagueTeam: true },
      },
    },
    orderBy: { name: 'asc' },
  })
}

export async function createTournament(input: CreateTournamentInput) {
  return executeServerAction(input, {
    validator: createTournamentSchema,
    handler: async (validated, session) => {
      const tournament = await prisma.tournament.create({
        data: {
          name: validated.name.trim(),
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      })

      updateTag('special-bet-teams')

      AuditLogger.adminCreated(
        parseSessionUserId(session!.user!.id!), 'Tournament', tournament.id,
        { name: validated.name }
      ).catch(() => {})

      return { tournamentId: tournament.id }
    },
    revalidatePath: '/admin/tournaments',
    requiresAdmin: true,
  })
}

export async function updateTournament(input: UpdateTournamentInput) {
  return executeServerAction(input, {
    validator: updateTournamentSchema,
    handler: async (validated, session) => {
      if (!validated.id) {
        throw new AppError('Tournament ID is required', 'BAD_REQUEST', 400)
      }

      const existing = await prisma.tournament.findFirst({
        where: { id: validated.id, deletedAt: null },
      })

      if (!existing) {
        throw new AppError('Tournament not found', 'NOT_FOUND', 404)
      }

      await prisma.tournament.update({
        where: { id: validated.id },
        data: {
          name: validated.name?.trim(),
          updatedAt: new Date(),
        },
      })

      updateTag('special-bet-teams')

      AuditLogger.adminUpdated(
        parseSessionUserId(session!.user!.id!), 'Tournament', validated.id,
        { name: validated.name }
      ).catch(() => {})

      return { success: true }
    },
    revalidatePath: '/admin/tournaments',
    requiresAdmin: true,
  })
}

export async function deleteTournament(id: number) {
  return executeServerAction(
    { id },
    {
      validator: deleteByIdSchema,
      handler: async (validated, session) => {
        const tournament = await prisma.tournament.findFirst({
          where: { id: validated.id, deletedAt: null },
          include: {
            _count: {
              select: { LeagueTeam: { where: { deletedAt: null } } },
            },
          },
        })

        if (!tournament) {
          throw new AppError('Tournament not found', 'NOT_FOUND', 404)
        }

        if (tournament._count.LeagueTeam > 0) {
          throw new AppError(
            `Cannot delete tournament assigned to ${tournament._count.LeagueTeam} team(s). Remove the assignment first.`,
            'CONFLICT',
            409
          )
        }

        await prisma.tournament.update({
          where: { id: validated.id },
          data: { deletedAt: new Date() },
        })

        updateTag('special-bet-teams')

        AuditLogger.adminDeleted(
          parseSessionUserId(session!.user!.id!), 'Tournament', validated.id,
          { name: tournament.name }
        ).catch(() => {})

        return { success: true }
      },
      revalidatePath: '/admin/tournaments',
      requiresAdmin: true,
    }
  )
}
