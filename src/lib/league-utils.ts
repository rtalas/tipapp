import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import type { League } from '@prisma/client'

/**
 * Validates that a league ID is valid and the league exists
 * Redirects to /admin/leagues if invalid
 * @param leagueId - League ID from URL params
 * @returns The validated league object
 */
export async function validateLeagueAccess(leagueId: string): Promise<League> {
  const id = parseInt(leagueId, 10)

  if (isNaN(id)) {
    redirect('/admin/leagues')
  }

  const league = await prisma.league.findFirst({
    where: {
      id,
      deletedAt: null,
    },
  })

  if (!league) {
    redirect('/admin/leagues')
  }

  return league
}

/**
 * Gets all active leagues ordered by season
 * @returns Array of active leagues
 */
export async function getActiveLeagues() {
  return await prisma.league.findMany({
    where: {
      isActive: true,
      deletedAt: null,
    },
    orderBy: { seasonFrom: 'desc' },
  })
}

/**
 * Redirects from a non-league-scoped admin route to its league-scoped equivalent.
 * Falls back to /admin/leagues if no active leagues exist.
 * Used by /admin/matches, /admin/series, /admin/special-bets, /admin/evaluators.
 */
export async function redirectToLeagueScoped(segment: string): Promise<never> {
  const leagues = await getActiveLeagues()

  if (leagues.length === 0) {
    redirect('/admin/leagues')
  }

  redirect(`/admin/${leagues[0].id}/${segment}`)
}
