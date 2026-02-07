'use server'

import { z } from 'zod'
import { revalidateTag } from 'next/cache'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/auth/auth-utils'
import { executeServerAction } from '@/lib/server-action-utils'
import {
  updateLeaguePrizesSchema,
  type UpdateLeaguePrizesInput,
} from '@/lib/validation/admin'

// Schema for fetching prizes
const getLeaguePrizesSchema = z.object({
  leagueId: z.number().int().positive('League ID is required'),
})

/**
 * Fetch all active prizes and fines for a specific league
 */
export async function getLeaguePrizes(leagueId: number) {
  try {
    // Validate input
    const validated = getLeaguePrizesSchema.parse({ leagueId })

    // Require admin access
    await requireAdmin()

    // Fetch all prize records (both prizes and fines)
    const prizeRecords = await prisma.leaguePrize.findMany({
      where: {
        leagueId: validated.leagueId,
        deletedAt: null,
      },
      orderBy: {
        rank: 'asc',
      },
      select: {
        id: true,
        rank: true,
        amount: true,
        currency: true,
        label: true,
        type: true,
      },
    })

    // Separate prizes and fines
    const prizes = prizeRecords.filter(p => p.type === 'prize')
    const fines = prizeRecords.filter(p => p.type === 'fine')

    return { success: true, prizes, fines }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch prizes and fines',
    }
  }
}

/**
 * Update all prize and fine tiers for a league (batch update with soft delete)
 *
 * This uses a transaction to:
 * 1. Soft delete all existing prizes and fines
 * 2. Create new prize and fine tiers
 *
 * This ensures atomicity and prevents partial updates.
 */
export async function updateLeaguePrizes(input: UpdateLeaguePrizesInput) {
  return executeServerAction(input, {
    validator: updateLeaguePrizesSchema,
    handler: async (validated) => {
      const now = new Date()

      await prisma.$transaction(async (tx) => {
        // Soft delete all existing prizes and fines for this league
        await tx.leaguePrize.updateMany({
          where: {
            leagueId: validated.leagueId,
            deletedAt: null,
          },
          data: {
            deletedAt: now,
            updatedAt: now,
          },
        })

        // Create new prize tiers if any provided
        if (validated.prizes.length > 0) {
          await tx.leaguePrize.createMany({
            data: validated.prizes.map((prize) => ({
              leagueId: validated.leagueId,
              rank: prize.rank,
              amount: prize.amount,
              currency: prize.currency,
              label: prize.label || null,
              type: 'prize',
              createdAt: now,
              updatedAt: now,
            })),
          })
        }

        // Create new fine tiers if any provided
        if (validated.fines.length > 0) {
          await tx.leaguePrize.createMany({
            data: validated.fines.map((fine) => ({
              leagueId: validated.leagueId,
              rank: fine.rank,
              amount: fine.amount,
              currency: fine.currency,
              label: fine.label || null,
              type: 'fine',
              createdAt: now,
              updatedAt: now,
            })),
          })
        }
      })

      // Invalidate leaderboard cache so prize/fine changes appear immediately
      revalidateTag('leaderboard', 'max')

      return { success: true }
    },
    revalidatePath: `/admin/leagues`,
    requiresAdmin: true,
  })
}
