'use server'

import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/auth/auth-utils'
import { executeServerAction } from '@/lib/server-action-utils'
import { buildDeletionErrorMessage } from '@/lib/delete-utils'
import { AppError } from '@/lib/error-handler'
import {
  createSeriesTypeSchema,
  updateSeriesTypeSchema,
  deleteByIdSchema,
  type CreateSeriesTypeInput,
  type UpdateSeriesTypeInput,
} from '@/lib/validation/admin'

// Get all series types
export async function getAllSeriesTypes() {
  await requireAdmin()
  return prisma.specialBetSerie.findMany({
    where: { deletedAt: null },
    include: {
      _count: {
        select: { LeagueSpecialBetSerie: true },
      },
    },
    orderBy: { name: 'asc' },
  })
}

// Create a new series type
export async function createSeriesType(input: CreateSeriesTypeInput) {
  return executeServerAction(input, {
    validator: createSeriesTypeSchema,
    handler: async (validated) => {
      const now = new Date()

      const seriesType = await prisma.specialBetSerie.create({
        data: {
          name: validated.name,
          bestOf: validated.bestOf,
          createdAt: now,
          updatedAt: now,
        },
      })

      return { data: seriesType }
    },
    revalidatePath: '/admin/series-types',
    requiresAdmin: true,
  })
}

// Update an existing series type
export async function updateSeriesType(input: UpdateSeriesTypeInput) {
  return executeServerAction(input, {
    validator: updateSeriesTypeSchema,
    handler: async (validated) => {
      const seriesType = await prisma.specialBetSerie.update({
        where: { id: validated.id },
        data: {
          ...(validated.name && { name: validated.name }),
          ...(validated.bestOf && { bestOf: validated.bestOf }),
          updatedAt: new Date(),
        },
      })

      return { data: seriesType }
    },
    revalidatePath: '/admin/series-types',
    requiresAdmin: true,
  })
}

// Delete a series type (soft delete)
export async function deleteSeriesType(id: number) {
  return executeServerAction({ id }, {
    validator: deleteByIdSchema,
    handler: async (validated) => {
      // Check if used in any leagues
      const usageCount = await prisma.leagueSpecialBetSerie.count({
        where: {
          specialBetSerieId: validated.id,
          deletedAt: null,
        },
      })

      if (usageCount > 0) {
        throw new AppError(buildDeletionErrorMessage('series type', usageCount), 'CONFLICT', 409)
      }

      await prisma.specialBetSerie.update({
        where: { id: validated.id },
        data: { deletedAt: new Date() },
      })

      return {}
    },
    revalidatePath: '/admin/series-types',
    requiresAdmin: true,
  })
}
