/**
 * Utility functions for time-based scorer ranking lookups
 * Used to determine what ranking a player had at a specific point in time
 */

import { prisma } from '@/lib/prisma'

/**
 * Get the scorer ranking for a specific player at a given point in time
 * @param leaguePlayerId - The LeaguePlayer ID to look up
 * @param atTime - The point in time to check (typically match.dateTime)
 * @returns The ranking (1-4) or null if no ranking was active at that time
 */
export async function getScorerRankingAtTime(
  leaguePlayerId: number,
  atTime: Date
): Promise<number | null> {
  const version = await prisma.topScorerRankingVersion.findFirst({
    where: {
      leaguePlayerId,
      effectiveFrom: { lte: atTime },
      OR: [
        { effectiveTo: null }, // Current version (still active)
        { effectiveTo: { gt: atTime } }, // Version was still active at atTime
      ],
    },
    orderBy: { effectiveFrom: 'desc' },
    select: { ranking: true },
  })

  return version?.ranking ?? null
}

/**
 * Get all scorer rankings for a league at a given point in time
 * @param leagueId - The League ID to look up rankings for
 * @param atTime - The point in time to check (typically match.dateTime)
 * @returns Map of leaguePlayerId -> ranking for all ranked players at that time
 */
export async function getLeagueRankingsAtTime(
  leagueId: number,
  atTime: Date
): Promise<Map<number, number>> {
  const versions = await prisma.topScorerRankingVersion.findMany({
    where: {
      leagueId,
      effectiveFrom: { lte: atTime },
      OR: [
        { effectiveTo: null },
        { effectiveTo: { gt: atTime } },
      ],
    },
    orderBy: { effectiveFrom: 'desc' },
    distinct: ['leaguePlayerId'], // Get most recent per player
    select: {
      leaguePlayerId: true,
      ranking: true,
    },
  })

  return new Map(versions.map((v) => [v.leaguePlayerId, v.ranking]))
}

/**
 * Get the full ranking history for a specific player
 * Useful for admin UI to show historical changes
 * @param leaguePlayerId - The LeaguePlayer ID to get history for
 * @returns Array of ranking versions ordered by effectiveFrom descending (newest first)
 */
export async function getRankingHistory(leaguePlayerId: number) {
  return prisma.topScorerRankingVersion.findMany({
    where: { leaguePlayerId },
    orderBy: { effectiveFrom: 'desc' },
    include: {
      User: {
        select: {
          id: true,
          username: true,
          firstName: true,
          lastName: true,
        },
      },
    },
  })
}

/**
 * Get all current rankings for a league (where effectiveTo is null)
 * @param leagueId - The League ID
 * @returns Array of current ranking versions with player info
 */
export async function getCurrentLeagueRankings(leagueId: number) {
  return prisma.topScorerRankingVersion.findMany({
    where: {
      leagueId,
      effectiveTo: null,
    },
    include: {
      LeaguePlayer: {
        include: {
          Player: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
            },
          },
        },
      },
    },
    orderBy: { ranking: 'asc' },
  })
}
