'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/auth-utils'
import { executeServerAction } from '@/lib/server-action-utils'
import { createPlayerSchema, updatePlayerSchema, deleteByIdSchema, type CreatePlayerInput, type UpdatePlayerInput } from '@/lib/validation/admin'

// Get all players
export async function getAllPlayers() {
  return prisma.player.findMany({
    where: { deletedAt: null },
    include: {
      _count: {
        select: { LeaguePlayer: true },
      },
    },
    orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
  })
}

// Get player by ID
export async function getPlayerById(id: number) {
  return prisma.player.findUnique({
    where: { id },
  })
}

// Create new player
export async function createPlayer(input: CreatePlayerInput) {
  return executeServerAction(input, {
    validator: createPlayerSchema,
    handler: async (validated) => {
      const player = await prisma.player.create({
        data: {
          firstName: validated.firstName || null,
          lastName: validated.lastName || null,
          position: validated.position,
          isActive: validated.isActive ?? true,
          externalId: validated.externalId,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      })

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
        throw new Error('Player ID is required')
      }

      // Check if player exists
      const existingPlayer = await prisma.player.findUnique({
        where: { id: validated.id },
      })

      if (!existingPlayer) {
        throw new Error('Player not found')
      }

      await prisma.player.update({
        where: { id: validated.id },
        data: {
          firstName: validated.firstName,
          lastName: validated.lastName,
          position: validated.position,
          isActive: validated.isActive,
          externalId: validated.externalId,
          updatedAt: new Date(),
        },
      })

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
          throw new Error('Player not found')
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

        return { success: true }
      },
      revalidatePath: '/admin/players',
      requiresAdmin: true,
    }
  )
}
