'use server'

import { prisma } from '@/lib/prisma'
import { requireLeagueMember } from '@/lib/user-auth-utils'
import type { LeaderboardEntry } from '@/types/user'

/**
 * Fetches leaderboard for a league with aggregated points
 */
export async function getLeaderboard(leagueId: number): Promise<LeaderboardEntry[]> {
  const { leagueUser, userId } = await requireLeagueMember(leagueId)

  // Fetch all league users with their bets
  const leagueUsers = await prisma.leagueUser.findMany({
    where: {
      leagueId,
      active: true,
      deletedAt: null,
    },
    include: {
      User: {
        select: {
          id: true,
          username: true,
          firstName: true,
          lastName: true,
        },
      },
      UserBet: {
        where: { deletedAt: null },
        select: { totalPoints: true },
      },
      UserSpecialBetSerie: {
        where: { deletedAt: null },
        select: { totalPoints: true },
      },
      UserSpecialBetSingle: {
        where: { deletedAt: null },
        select: { totalPoints: true },
      },
      UserSpecialBetQuestion: {
        where: { deletedAt: null },
        select: { totalPoints: true },
      },
    },
  })

  // Calculate totals and sort
  const entries = leagueUsers.map((lu) => {
    const matchPoints = lu.UserBet.reduce((sum, b) => sum + (b.totalPoints || 0), 0)
    const seriesPoints = lu.UserSpecialBetSerie.reduce(
      (sum, b) => sum + (b.totalPoints || 0),
      0
    )
    const specialBetPoints = lu.UserSpecialBetSingle.reduce(
      (sum, b) => sum + (b.totalPoints || 0),
      0
    )
    const questionPoints = lu.UserSpecialBetQuestion.reduce(
      (sum, b) => sum + (b.totalPoints || 0),
      0
    )
    const totalPoints =
      matchPoints + seriesPoints + specialBetPoints + questionPoints

    return {
      leagueUserId: lu.id,
      userId: lu.User.id,
      username: lu.User.username,
      firstName: lu.User.firstName,
      lastName: lu.User.lastName,
      matchPoints,
      seriesPoints,
      specialBetPoints,
      questionPoints,
      totalPoints,
      isCurrentUser: lu.userId === userId,
    }
  })

  // Sort by total points descending
  entries.sort((a, b) => b.totalPoints - a.totalPoints)

  // Add ranks
  return entries.map((entry, index) => ({
    ...entry,
    rank: index + 1,
  }))
}


