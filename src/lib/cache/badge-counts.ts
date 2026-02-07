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
 * Cached unbetted item dateTimes (no time filter in query)
 * TTL: 15 minutes - time filtering happens at runtime so always accurate
 *
 * Returns ISO date strings for each bet type, filtered at runtime by caller
 */
const getCachedUnbettedDateTimes = unstable_cache(
  async (leagueId: number, leagueUserId: number) => {
    const [
      unbettedMatches,
      unbettedSeries,
      unbettedSpecialBets,
      unbettedQuestions,
      totalSeriesCount,
    ] = await Promise.all([
      // Unbetted matches - get dateTimes
      prisma.leagueMatch.findMany({
        where: {
          leagueId,
          deletedAt: null,
          Match: { deletedAt: null },
          UserBet: {
            none: {
              leagueUserId,
              deletedAt: null,
            },
          },
        },
        select: {
          Match: { select: { dateTime: true } },
        },
      }),
      // Unbetted series - get dateTimes
      prisma.leagueSpecialBetSerie.findMany({
        where: {
          leagueId,
          deletedAt: null,
          UserSpecialBetSerie: {
            none: {
              leagueUserId,
              deletedAt: null,
            },
          },
        },
        select: { dateTime: true },
      }),
      // Unbetted special bets - get dateTimes
      prisma.leagueSpecialBetSingle.findMany({
        where: {
          leagueId,
          deletedAt: null,
          UserSpecialBetSingle: {
            none: {
              leagueUserId,
              deletedAt: null,
            },
          },
        },
        select: { dateTime: true },
      }),
      // Unbetted questions - get dateTimes
      prisma.leagueSpecialBetQuestion.findMany({
        where: {
          leagueId,
          deletedAt: null,
          UserSpecialBetQuestion: {
            none: {
              leagueUserId,
              deletedAt: null,
            },
          },
        },
        select: { dateTime: true },
      }),
      // Total series count (for showing/hiding series tab)
      prisma.leagueSpecialBetSerie.count({
        where: {
          leagueId,
          deletedAt: null,
        },
      }),
    ])

    return {
      matchDateTimes: unbettedMatches.map((m) => m.Match.dateTime.toISOString()),
      seriesDateTimes: unbettedSeries.map((s) => s.dateTime.toISOString()),
      specialBetDateTimes: unbettedSpecialBets.map((sb) => sb.dateTime.toISOString()),
      questionDateTimes: unbettedQuestions.map((q) => q.dateTime.toISOString()),
      totalSeries: totalSeriesCount,
    }
  },
  ['bet-badges'],
  {
    revalidate: 900, // 15 minutes - time filtering is at runtime
    tags: ['bet-badges'],
  }
)

/**
 * Get bet badge counts with accurate time filtering
 * Caches unbetted item dateTimes, filters by current time at runtime
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
  const cached = await getCachedUnbettedDateTimes(leagueId, leagueUserId)

  return {
    matches: countUpcoming(cached.matchDateTimes),
    series: countUpcoming(cached.seriesDateTimes),
    specialBets: countUpcoming(cached.specialBetDateTimes),
    questions: countUpcoming(cached.questionDateTimes),
    totalSeries: cached.totalSeries,
  }
}

/**
 * Cached chat badge count (unread messages)
 * TTL: 60 seconds - needs faster updates for incoming messages
 *
 * Note: lastChatReadAt is passed as ISO string (or null) for consistent cache keys.
 * Date objects serialize to strings in unstable_cache, but passing explicit strings
 * ensures predictable cache key generation.
 */
export const getCachedChatBadge = unstable_cache(
  async (
    leagueId: number,
    leagueUserId: number,
    lastChatReadAtISO: string | null
  ) => {
    const lastChatReadAt = lastChatReadAtISO
      ? new Date(lastChatReadAtISO)
      : null

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
  },
  ['chat-badge'],
  {
    revalidate: 60, // 60 seconds
    tags: ['chat-badge'],
  }
)
