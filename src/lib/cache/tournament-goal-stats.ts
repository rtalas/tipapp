import { unstable_cache } from 'next/cache'
import { prisma } from '@/lib/prisma'

export interface TournamentGoalStats {
  goals: number
  evaluatedMatches: number
  totalMatches: number
}

/**
 * Running total of goals across evaluated matches in a league, with
 * evaluated/total match counts. Surfaced next to opt-in special bets
 * (LeagueSpecialBetSingle.showGoalProgress) so users have a live indicator
 * for tournament-wide goal bets.
 *
 * Cached against the `match-data` tag so it invalidates with match results.
 */
export const getCachedTournamentGoalStats = (leagueId: number) =>
  unstable_cache(
    async (): Promise<TournamentGoalStats> => {
      const leagueMatches = await prisma.leagueMatch.findMany({
        where: { leagueId, deletedAt: null },
        select: {
          Match: {
            select: {
              isEvaluated: true,
              homeFinalScore: true,
              awayFinalScore: true,
            },
          },
        },
      })

      let goals = 0
      let evaluatedMatches = 0
      for (const lm of leagueMatches) {
        if (lm.Match.isEvaluated) {
          evaluatedMatches++
          goals += (lm.Match.homeFinalScore ?? 0) + (lm.Match.awayFinalScore ?? 0)
        }
      }

      return { goals, evaluatedMatches, totalMatches: leagueMatches.length }
    },
    ['tournament-goal-stats', String(leagueId)],
    { revalidate: 1200, tags: ['match-data'] }
  )()
