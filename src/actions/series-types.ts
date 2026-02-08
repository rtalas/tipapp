'use server'

import { prisma } from '@/lib/prisma'
import { requireAdmin, parseSessionUserId } from '@/lib/auth/auth-utils'
import { executeServerAction } from '@/lib/server-action-utils'
import { AuditLogger } from '@/lib/logging/audit-logger'
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
    handler: async (validated, session) => {
      const now = new Date()

      const seriesType = await prisma.specialBetSerie.create({
        data: {
          name: validated.name,
          bestOf: validated.bestOf,
          createdAt: now,
          updatedAt: now,
        },
      })

      AuditLogger.adminCreated(
        parseSessionUserId(session!.user!.id!), 'SpecialBetSerie', seriesType.id,
        { name: validated.name, bestOf: validated.bestOf }
      ).catch(() => {})

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
    handler: async (validated, session) => {
      const seriesType = await prisma.specialBetSerie.update({
        where: { id: validated.id },
        data: {
          ...(validated.name !== undefined && { name: validated.name }),
          ...(validated.bestOf !== undefined && { bestOf: validated.bestOf }),
          updatedAt: new Date(),
        },
      })

      AuditLogger.adminUpdated(
        parseSessionUserId(session!.user!.id!), 'SpecialBetSerie', validated.id,
        { name: validated.name, bestOf: validated.bestOf }
      ).catch(() => {})

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
    handler: async (validated, session) => {
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

      AuditLogger.adminDeleted(
        parseSessionUserId(session!.user!.id!), 'SpecialBetSerie', validated.id
      ).catch(() => {})

      return {}
    },
    revalidatePath: '/admin/series-types',
    requiresAdmin: true,
  })
}
