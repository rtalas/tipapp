'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/auth-utils'
import { executeServerAction } from '@/lib/server-action-utils'
import {
  createSpecialBetTypeSchema,
  updateSpecialBetTypeSchema,
  deleteByIdSchema,
  type CreateSpecialBetTypeInput,
  type UpdateSpecialBetTypeInput,
} from '@/lib/validation/admin'

// Get all special bet types with Sport and Type relations
export async function getAllSpecialBetTypes() {
  return prisma.specialBetSingle.findMany({
    where: { deletedAt: null },
    include: {
      Sport: true,
      SpecialBetSingleType: true,
      _count: {
        select: { LeagueSpecialBetSingle: true },
      },
    },
    orderBy: { name: 'asc' },
  })
}

// Get special bet type by ID
export async function getSpecialBetTypeById(id: number) {
  return prisma.specialBetSingle.findUnique({
    where: { id },
    include: {
      Sport: true,
      SpecialBetSingleType: true,
      _count: {
        select: { LeagueSpecialBetSingle: true },
      },
    },
  })
}

// Create a new special bet type
export async function createSpecialBetType(input: CreateSpecialBetTypeInput) {
  return executeServerAction(input, {
    validator: createSpecialBetTypeSchema,
    handler: async (validated) => {
      const now = new Date()

      // Verify sport exists
      const sport = await prisma.sport.findFirst({
        where: { id: validated.sportId, deletedAt: null },
      })

      if (!sport) {
        throw new Error('Sport not found')
      }

      // Verify special bet type exists
      const betType = await prisma.specialBetSingleType.findFirst({
        where: { id: validated.specialBetSingleTypeId, deletedAt: null },
      })

      if (!betType) {
        throw new Error('Special bet type not found')
      }

      const specialBetType = await prisma.specialBetSingle.create({
        data: {
          name: validated.name,
          sportId: validated.sportId,
          specialBetSingleTypeId: validated.specialBetSingleTypeId,
          createdAt: now,
          updatedAt: now,
        },
        include: {
          Sport: true,
          SpecialBetSingleType: true,
        },
      })

      return { data: specialBetType }
    },
    revalidatePath: '/admin/special-bet-types',
    requiresAdmin: true,
  })
}

// Update an existing special bet type
export async function updateSpecialBetType(input: UpdateSpecialBetTypeInput) {
  return executeServerAction(input, {
    validator: updateSpecialBetTypeSchema,
    handler: async (validated) => {
      // Verify sport exists if being updated
      if (validated.sportId) {
        const sport = await prisma.sport.findFirst({
          where: { id: validated.sportId, deletedAt: null },
        })

        if (!sport) {
          throw new Error('Sport not found')
        }
      }

      // Verify special bet type exists if being updated
      if (validated.specialBetSingleTypeId) {
        const betType = await prisma.specialBetSingleType.findFirst({
          where: { id: validated.specialBetSingleTypeId, deletedAt: null },
        })

        if (!betType) {
          throw new Error('Special bet type not found')
        }
      }

      const specialBetType = await prisma.specialBetSingle.update({
        where: { id: validated.id },
        data: {
          ...(validated.name && { name: validated.name }),
          ...(validated.sportId && { sportId: validated.sportId }),
          ...(validated.specialBetSingleTypeId && { specialBetSingleTypeId: validated.specialBetSingleTypeId }),
          updatedAt: new Date(),
        },
        include: {
          Sport: true,
          SpecialBetSingleType: true,
        },
      })

      return { data: specialBetType }
    },
    revalidatePath: '/admin/special-bet-types',
    requiresAdmin: true,
  })
}

// Delete a special bet type (soft delete)
export async function deleteSpecialBetType(id: number) {
  return executeServerAction({ id }, {
    validator: deleteByIdSchema,
    handler: async (validated) => {
      // Check if used in any leagues
      const usageCount = await prisma.leagueSpecialBetSingle.count({
        where: {
          specialBetSingleId: validated.id,
          deletedAt: null,
        },
      })

      if (usageCount > 0) {
        throw new Error(
          `Cannot delete: This special bet type is used in ${usageCount} league${usageCount !== 1 ? 's' : ''}`
        )
      }

      await prisma.specialBetSingle.update({
        where: { id: validated.id },
        data: { deletedAt: new Date() },
      })

      return {}
    },
    revalidatePath: '/admin/special-bet-types',
    requiresAdmin: true,
  })
}

// Get all special bet single types (categories)
export async function getSpecialBetSingleTypes() {
  return prisma.specialBetSingleType.findMany({
    where: { deletedAt: null },
    orderBy: { name: 'asc' },
  })
}
