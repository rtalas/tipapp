/**
 * Shared server action queries used across multiple admin pages
 * Consolidates common data fetching logic to prevent duplication
 */

'use server'

import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/auth/auth-utils'

/**
 * Get all evaluator types
 * Used in: evaluator pages, league setup
 */
export async function getEvaluatorTypes() {
  await requireAdmin()
  return prisma.evaluatorType.findMany({
    where: { deletedAt: null },
    orderBy: { name: 'asc' },
  })
}

/**
 * Get all players with league count
 * Used in: global players page, league setup
 */
export async function getAllPlayers() {
  await requireAdmin()
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

/**
 * Get teams filtered by sport
 * Used in: league setup, team management
 */
export async function getTeamsBySport(sportId: number) {
  await requireAdmin()
  return prisma.team.findMany({
    where: {
      sportId,
      deletedAt: null,
    },
    include: {
      Sport: true,
    },
    orderBy: { name: 'asc' },
  })
}

/**
 * Get leagues with their associated teams and players
 * Used in: matches, special bets dialogs (where player selection is needed)
 */
export async function getLeaguesWithTeams() {
  await requireAdmin()
  return prisma.league.findMany({
    where: {
      deletedAt: null,
      isActive: true,
    },
    include: {
      LeagueTeam: {
        where: { deletedAt: null },
        include: {
          Team: true,
          LeaguePlayer: {
            where: { deletedAt: null },
            include: { Player: true },
            orderBy: { Player: { lastName: 'asc' } },
          },
        },
        orderBy: { Team: { name: 'asc' } },
      },
    },
    orderBy: { name: 'asc' },
  })
}

// Export type for components
export type LeagueWithTeams = Awaited<ReturnType<typeof getLeaguesWithTeams>>[number]

