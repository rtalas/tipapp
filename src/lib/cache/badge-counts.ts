'use server'

import { unstable_cache } from 'next/cache'
import { prisma } from '@/lib/prisma'

const TEN_HOURS_MS = 10 * 60 * 60 * 1000

/**
 * Helper to filter dateTimes to those in the next 10 hours
 */
function countUpcoming(dateTimes: string[]): number {
  const now = Date.now()
  const tenHoursFromNow = now + TEN_HOURS_MS
  return dateTimes.filter((dt) => {
    const time = new Date(dt).getTime()
    return time > now && time <= tenHoursFromNow
  }).length
}

/**
 * Cached league items with IDs and dateTimes (shared across all users)
 * TTL: 15 minutes - time filtering happens at runtime
 */
const getCachedLeagueItems = unstable_cache(
  async (leagueId: number) => {
    const [matches, series, specialBets, questions] = await Promise.all([
      prisma.leagueMatch.findMany({
        where: { leagueId, deletedAt: null, Match: { deletedAt: null } },
        select: { id: true, Match: { select: { dateTime: true } } },
      }),
      prisma.leagueSpecialBetSerie.findMany({
        where: { leagueId, deletedAt: null },
        select: { id: true, dateTime: true },
      }),
      prisma.leagueSpecialBetSingle.findMany({
        where: { leagueId, deletedAt: null },
        select: { id: true, dateTime: true },
      }),
      prisma.leagueSpecialBetQuestion.findMany({
        where: { leagueId, deletedAt: null },
        select: { id: true, dateTime: true },
      }),
    ])

    return {
      matches: matches.map((m) => ({ id: m.id, dateTime: m.Match.dateTime.toISOString() })),
      series: series.map((s) => ({ id: s.id, dateTime: s.dateTime.toISOString() })),
      specialBets: specialBets.map((sb) => ({ id: sb.id, dateTime: sb.dateTime.toISOString() })),
      questions: questions.map((q) => ({ id: q.id, dateTime: q.dateTime.toISOString() })),
      totalSeries: series.length,
    }
  },
  ['bet-badges'],
  {
    revalidate: 900, // 15 minutes
    tags: ['bet-badges'],
  }
)

/**
 * Get bet badge counts with accurate time filtering
 * Caches shared league data, fetches user bets fresh, merges at runtime
 */
export async function getBetBadges(
  leagueId: number,
  leagueUserId: number
): Promise<{
  matches: number
  series: number
  specialBets: number
  questions: number
  totalSeries: number
}> {
  // Cached league data (shared) + fresh user bets in parallel
  const [cached, matchBets, seriesBets, specialBetBets, questionBets] = await Promise.all([
    getCachedLeagueItems(leagueId),
    prisma.userBet.findMany({
      where: { leagueUserId, deletedAt: null },
      select: { leagueMatchId: true },
    }),
    prisma.userSpecialBetSerie.findMany({
      where: { leagueUserId, deletedAt: null },
      select: { leagueSpecialBetSerieId: true },
    }),
    prisma.userSpecialBetSingle.findMany({
      where: { leagueUserId, deletedAt: null },
      select: { leagueSpecialBetSingleId: true },
    }),
    prisma.userSpecialBetQuestion.findMany({
      where: { leagueUserId, deletedAt: null },
      select: { leagueSpecialBetQuestionId: true },
    }),
  ])

  // Build sets for O(1) lookup
  const bettedMatches = new Set(matchBets.map((b) => b.leagueMatchId))
  const bettedSeries = new Set(seriesBets.map((b) => b.leagueSpecialBetSerieId))
  const bettedSpecialBets = new Set(specialBetBets.map((b) => b.leagueSpecialBetSingleId))
  const bettedQuestions = new Set(questionBets.map((b) => b.leagueSpecialBetQuestionId))

  // Filter to unbetted items, then count upcoming
  return {
    matches: countUpcoming(
      cached.matches.filter((m) => !bettedMatches.has(m.id)).map((m) => m.dateTime)
    ),
    series: countUpcoming(
      cached.series.filter((s) => !bettedSeries.has(s.id)).map((s) => s.dateTime)
    ),
    specialBets: countUpcoming(
      cached.specialBets.filter((sb) => !bettedSpecialBets.has(sb.id)).map((sb) => sb.dateTime)
    ),
    questions: countUpcoming(
      cached.questions.filter((q) => !bettedQuestions.has(q.id)).map((q) => q.dateTime)
    ),
    totalSeries: cached.totalSeries,
  }
}

/**
 * Chat badge count (unread messages)
 * Not cached - lastChatReadAt varies per user creating high key variance.
 * A COUNT query on indexed columns is fast enough without caching.
 */
export async function getChatBadge(
  leagueId: number,
  leagueUserId: number,
  lastChatReadAt: Date | null
) {
  const unreadCount = await prisma.message.count({
    where: {
      leagueId,
      deletedAt: null,
      // Only count messages from other users
      leagueUserId: { not: leagueUserId },
      // Only count messages created after lastChatReadAt (if set)
      ...(lastChatReadAt ? { createdAt: { gt: lastChatReadAt } } : {}),
    },
  })

  return { unread: unreadCount }
}
