'use server'

import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/auth/auth-utils'
import { executeServerAction } from '@/lib/server-action-utils'
import { buildDeletionErrorMessage } from '@/lib/delete-utils'
import { AppError } from '@/lib/error-handler'
import {
  createMatchPhaseSchema,
  updateMatchPhaseSchema,
  deleteByIdSchema,
  type CreateMatchPhaseInput,
  type UpdateMatchPhaseInput,
} from '@/lib/validation/admin'

// Get all match phases
export async function getMatchPhases() {
  await requireAdmin()
  return prisma.matchPhase.findMany({
    where: { deletedAt: null },
    include: {
      _count: {
        select: { Match: true },
      },
    },
    orderBy: { rank: 'asc' },
  })
}

// Create a new match phase
export async function createMatchPhase(input: CreateMatchPhaseInput) {
  return executeServerAction(input, {
    validator: createMatchPhaseSchema,
    handler: async (validated) => {
      const now = new Date()

      const matchPhase = await prisma.matchPhase.create({
        data: {
          name: validated.name,
          rank: validated.rank ?? 0,
          bestOf: validated.bestOf ?? null,
          createdAt: now,
          updatedAt: now,
        },
        include: {
          _count: {
            select: { Match: true },
          },
        },
      })

      return { data: matchPhase }
    },
    revalidatePath: '/admin/match-phases',
    requiresAdmin: true,
  })
}

// Update an existing match phase
export async function updateMatchPhase(input: UpdateMatchPhaseInput) {
  return executeServerAction(input, {
    validator: updateMatchPhaseSchema,
    handler: async (validated) => {
      const updateData: {
        name?: string
        rank?: number
        bestOf?: number | null
        updatedAt: Date
      } = {
        updatedAt: new Date(),
      }

      if (validated.name !== undefined) {
        updateData.name = validated.name
      }
      if (validated.rank !== undefined) {
        updateData.rank = validated.rank
      }
      if (validated.bestOf !== undefined) {
        updateData.bestOf = validated.bestOf
      }

      const matchPhase = await prisma.matchPhase.update({
        where: { id: validated.id },
        data: updateData,
        include: {
          _count: {
            select: { Match: true },
          },
        },
      })

      return { data: matchPhase }
    },
    revalidatePath: '/admin/match-phases',
    requiresAdmin: true,
  })
}

// Delete a match phase (soft delete)
export async function deleteMatchPhase(id: number) {
  return executeServerAction({ id }, {
    validator: deleteByIdSchema,
    handler: async (validated) => {
      // Check if used in any matches
      const usageCount = await prisma.match.count({
        where: {
          matchPhaseId: validated.id,
          deletedAt: null,
        },
      })

      if (usageCount > 0) {
        throw new AppError(buildDeletionErrorMessage('match phase', usageCount), 'CONFLICT', 409)
      }

      await prisma.matchPhase.update({
        where: { id: validated.id },
        data: { deletedAt: new Date() },
      })

      return {}
    },
    revalidatePath: '/admin/match-phases',
    requiresAdmin: true,
  })
}
