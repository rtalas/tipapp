'use server'

import { revalidateTag } from 'next/cache'
import { prisma } from '@/lib/prisma'
import { executeServerAction } from '@/lib/server-action-utils'
import { AppError } from '@/lib/error-handler'
import { createPlayerSchema, updatePlayerSchema, deleteByIdSchema, type CreatePlayerInput, type UpdatePlayerInput } from '@/lib/validation/admin'

// Create new player
export async function createPlayer(input: CreatePlayerInput) {
  return executeServerAction(input, {
    validator: createPlayerSchema,
    handler: async (validated) => {
      const player = await prisma.player.create({
        data: {
          firstName: validated.firstName?.trim() || null,
          lastName: validated.lastName?.trim() || null,
          position: validated.position,
          isActive: validated.isActive ?? true,
          externalId: validated.externalId,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      })

      revalidateTag('special-bet-players', 'max')
      return { playerId: player.id }
    },
    revalidatePath: '/admin/players',
    requiresAdmin: true,
  })
}

// Update player
export async function updatePlayer(input: UpdatePlayerInput) {
  return executeServerAction(input, {
    validator: updatePlayerSchema,
    handler: async (validated) => {
      if (!validated.id) {
        throw new AppError('Player ID is required', 'BAD_REQUEST', 400)
      }

      // Check if player exists
      const existingPlayer = await prisma.player.findUnique({
        where: { id: validated.id },
      })

      if (!existingPlayer) {
        throw new AppError('Player not found', 'NOT_FOUND', 404)
      }

      await prisma.player.update({
        where: { id: validated.id },
        data: {
          firstName: validated.firstName?.trim(),
          lastName: validated.lastName?.trim(),
          position: validated.position,
          isActive: validated.isActive,
          externalId: validated.externalId,
          updatedAt: new Date(),
        },
      })

      revalidateTag('special-bet-players', 'max')
      return { success: true }
    },
    revalidatePath: '/admin/players',
    requiresAdmin: true,
  })
}

// Delete player (soft delete)
export async function deletePlayer(id: number) {
  return executeServerAction(
    { id },
    {
      validator: deleteByIdSchema,
      handler: async (validated) => {
        // Check if player exists
        const player = await prisma.player.findUnique({
          where: { id: validated.id },
          include: {
            _count: {
              select: { LeaguePlayer: true },
            },
          },
        })

        if (!player) {
          throw new AppError('Player not found', 'NOT_FOUND', 404)
        }

        // Warn if player is assigned to leagues
        const playerName = `${player.firstName || ''} ${player.lastName || ''}`.trim() || `Player ${validated.id}`
        if (player._count.LeaguePlayer > 0) {
          console.warn(
            `Player "${playerName}" is assigned to ${player._count.LeaguePlayer} league(s). Soft deleting.`
          )
        }

        // Soft delete
        await prisma.player.update({
          where: { id: validated.id },
          data: { deletedAt: new Date() },
        })

        revalidateTag('special-bet-players', 'max')
        return { success: true }
      },
      revalidatePath: '/admin/players',
      requiresAdmin: true,
    }
  )
}
