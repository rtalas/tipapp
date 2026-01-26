'use server'

import { prisma } from '@/lib/prisma'
import { executeServerAction } from '@/lib/server-action-utils'
import { buildDeletionErrorMessage } from '@/lib/delete-utils'
import {
  createSeriesTypeSchema,
  updateSeriesTypeSchema,
  deleteByIdSchema,
  type CreateSeriesTypeInput,
  type UpdateSeriesTypeInput,
} from '@/lib/validation/admin'

// Get all series types
export async function getAllSeriesTypes() {
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

// Get series type by ID (internal use only)
async function getSeriesTypeById(id: number) {
  return prisma.specialBetSerie.findUnique({
    where: { id },
    include: {
      _count: {
        select: { LeagueSpecialBetSerie: true },
      },
    },
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
        throw new Error(buildDeletionErrorMessage('series type', usageCount))
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
