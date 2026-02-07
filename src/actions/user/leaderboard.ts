'use server'

import { unstable_cache } from 'next/cache'
import { prisma } from '@/lib/prisma'
import { requireLeagueMember } from '@/lib/auth/user-auth-utils'
import type { LeaderboardEntry } from '@/types/user'

export interface LeaguePrize {
  rank: number
  amount: number
  currency: string
  label: string | null
}

export interface LeaderboardData {
  entries: LeaderboardEntry[]
  prizes: LeaguePrize[]
  fines: LeaguePrize[]
}

export interface UserMatchPick {
  id: number
  matchName: string
  homeTeamName: string
  awayTeamName: string
  homeTeamFlag: string | null
  awayTeamFlag: string | null
  homeScore: number
  awayScore: number
  scorerName: string | null
  scorerCorrect: boolean
  overtime: boolean
  totalPoints: number
  matchDate: Date
  actualHomeScore: number | null
  actualAwayScore: number | null
  actualOvertime: boolean | null
  isEvaluated: boolean
}

export interface UserSeriesPick {
  id: number
  seriesName: string
  homeScore: number | null
  awayScore: number | null
  totalPoints: number
  deadline: Date
  actualHomeScore: number | null
  actualAwayScore: number | null
  isEvaluated: boolean
}

export interface UserSpecialBetPick {
  id: number
  betName: string
  prediction: string
  totalPoints: number
  deadline: Date
}

export interface UserQuestionPick {
  id: number
  question: string
  answer: boolean | null
  totalPoints: number
  deadline: Date
}

export interface UserPicksData {
  matches: UserMatchPick[]
  series: UserSeriesPick[]
  specialBets: UserSpecialBetPick[]
  questions: UserQuestionPick[]
}

/**
 * Fetches all picks and points for a specific user in a league
 */
export async function getUserPicks(
  leagueId: number,
  leagueUserId: number
): Promise<UserPicksData> {
  await requireLeagueMember(leagueId)

  // Fetch all bets in parallel (4 independent queries)
  const [matchBets, seriesBets, specialBetResults, questionBets] = await Promise.all([
    // Match bets (only for this league)
    prisma.userBet.findMany({
      where: {
        leagueUserId,
        deletedAt: null,
        LeagueMatch: {
          leagueId, // Filter by league to prevent showing bets from other leagues
          deletedAt: null,
        },
      },
      include: {
        LeagueMatch: {
          include: {
            Match: {
              include: {
                LeagueTeam_Match_homeTeamIdToLeagueTeam: {
                  include: {
                    Team: true,
                  },
                },
                LeagueTeam_Match_awayTeamIdToLeagueTeam: {
                  include: {
                    Team: true,
                  },
                },
                MatchScorer: {
                  where: {
                    deletedAt: null,
                  },
                  select: {
                    scorerId: true,
                  },
                },
              },
            },
          },
        },
        LeaguePlayer: {
          include: {
            Player: true,
          },
        },
      },
      orderBy: {
        dateTime: 'desc',
      },
    }),

    // Series bets (only for this league)
    prisma.userSpecialBetSerie.findMany({
      where: {
        leagueUserId,
        deletedAt: null,
        LeagueSpecialBetSerie: {
          leagueId, // Filter by league to prevent showing bets from other leagues
          deletedAt: null,
        },
      },
      include: {
        LeagueSpecialBetSerie: {
          include: {
            SpecialBetSerie: true,
            LeagueTeam_LeagueSpecialBetSerie_homeTeamIdToLeagueTeam: {
              include: {
                Team: true,
              },
            },
            LeagueTeam_LeagueSpecialBetSerie_awayTeamIdToLeagueTeam: {
              include: {
                Team: true,
              },
            },
          },
        },
      },
      orderBy: {
        dateTime: 'desc',
      },
    }),

    // Special bets (only for this league)
    prisma.userSpecialBetSingle.findMany({
      where: {
        leagueUserId,
        deletedAt: null,
        LeagueSpecialBetSingle: {
          leagueId, // Filter by league to prevent showing bets from other leagues
          deletedAt: null,
        },
      },
      include: {
        LeagueSpecialBetSingle: {
          include: {
            SpecialBetSingle: true,
          },
        },
        LeagueTeam: {
          include: {
            Team: true,
          },
        },
        LeaguePlayer: {
          include: {
            Player: true,
          },
        },
      },
      orderBy: {
        dateTime: 'desc',
      },
    }),

    // Question bets (only for this league)
    prisma.userSpecialBetQuestion.findMany({
      where: {
        leagueUserId,
        deletedAt: null,
        LeagueSpecialBetQuestion: {
          leagueId, // Filter by league to prevent showing bets from other leagues
          deletedAt: null,
        },
      },
      include: {
        LeagueSpecialBetQuestion: true,
      },
      orderBy: {
        dateTime: 'desc',
      },
    }),
  ])

  const matches: UserMatchPick[] = matchBets.map((bet) => {
    let scorerName: string | null = null
    let scorerCorrect = false

    if (bet.LeaguePlayer?.Player) {
      const { firstName, lastName } = bet.LeaguePlayer.Player
      scorerName = [firstName, lastName].filter(Boolean).join(' ') || null

      // Check if the predicted scorer is in the actual scorers list
      const actualScorerIds = bet.LeagueMatch.Match.MatchScorer.map(
        (ms) => ms.scorerId
      )
      scorerCorrect = actualScorerIds.includes(bet.scorerId || -1)
    }

    const match = bet.LeagueMatch.Match
    const homeTeam = match.LeagueTeam_Match_homeTeamIdToLeagueTeam.Team
    const awayTeam = match.LeagueTeam_Match_awayTeamIdToLeagueTeam.Team

    return {
      id: bet.id,
      matchName: `${homeTeam.name} vs ${awayTeam.name}`,
      homeTeamName: homeTeam.name,
      awayTeamName: awayTeam.name,
      homeTeamFlag: homeTeam.flagIcon,
      awayTeamFlag: awayTeam.flagIcon,
      homeScore: bet.homeScore,
      awayScore: bet.awayScore,
      scorerName,
      scorerCorrect,
      overtime: bet.overtime,
      totalPoints: bet.totalPoints,
      matchDate: match.dateTime,
      actualHomeScore: match.homeFinalScore,
      actualAwayScore: match.awayFinalScore,
      actualOvertime: match.isOvertime || match.isShootout || null,
      isEvaluated: match.isEvaluated,
    }
  })

  const series: UserSeriesPick[] = seriesBets.map((bet) => ({
    id: bet.id,
    seriesName: `${bet.LeagueSpecialBetSerie.LeagueTeam_LeagueSpecialBetSerie_homeTeamIdToLeagueTeam.Team.name} vs ${bet.LeagueSpecialBetSerie.LeagueTeam_LeagueSpecialBetSerie_awayTeamIdToLeagueTeam.Team.name}`,
    homeScore: bet.homeTeamScore,
    awayScore: bet.awayTeamScore,
    totalPoints: bet.totalPoints,
    deadline: bet.LeagueSpecialBetSerie.dateTime,
    actualHomeScore: bet.LeagueSpecialBetSerie.homeTeamScore,
    actualAwayScore: bet.LeagueSpecialBetSerie.awayTeamScore,
    isEvaluated: bet.LeagueSpecialBetSerie.isEvaluated,
  }))

  const specialBets: UserSpecialBetPick[] = specialBetResults.map((bet) => {
    let prediction = ''
    if (bet.LeagueTeam) {
      prediction = bet.LeagueTeam.Team.name
    } else if (bet.LeaguePlayer?.Player) {
      const { firstName, lastName } = bet.LeaguePlayer.Player
      prediction = [firstName, lastName].filter(Boolean).join(' ')
    } else if (bet.value !== null) {
      prediction = bet.value.toString()
    }

    return {
      id: bet.id,
      betName: bet.LeagueSpecialBetSingle.name,
      prediction,
      totalPoints: bet.totalPoints,
      deadline: bet.LeagueSpecialBetSingle.dateTime,
    }
  })

  const questions: UserQuestionPick[] = questionBets.map((bet) => ({
    id: bet.id,
    question: bet.LeagueSpecialBetQuestion.text,
    answer: bet.userBet,
    totalPoints: bet.totalPoints,
    deadline: bet.LeagueSpecialBetQuestion.dateTime,
  }))

  return {
    matches,
    series,
    specialBets,
    questions,
  }
}

/**
 * Cached leaderboard data (30 min TTL)
 * Same data for all users in a league - only isCurrentUser differs
 */
const getCachedLeaderboardData = unstable_cache(
  async (leagueId: number) => {
    // Fetch league users (without bet includes)
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
            avatarUrl: true,
          },
        },
      },
    })

    const leagueUserIds = leagueUsers.map((lu) => lu.id)

    // Aggregate points in database instead of loading all bet rows
    const [matchTotals, seriesTotals, specialBetTotals, questionTotals] = await Promise.all([
      prisma.userBet.groupBy({
        by: ['leagueUserId'],
        where: { leagueUserId: { in: leagueUserIds }, deletedAt: null },
        _sum: { totalPoints: true },
      }),
      prisma.userSpecialBetSerie.groupBy({
        by: ['leagueUserId'],
        where: { leagueUserId: { in: leagueUserIds }, deletedAt: null },
        _sum: { totalPoints: true },
      }),
      prisma.userSpecialBetSingle.groupBy({
        by: ['leagueUserId'],
        where: { leagueUserId: { in: leagueUserIds }, deletedAt: null },
        _sum: { totalPoints: true },
      }),
      prisma.userSpecialBetQuestion.groupBy({
        by: ['leagueUserId'],
        where: { leagueUserId: { in: leagueUserIds }, deletedAt: null },
        _sum: { totalPoints: true },
      }),
    ])

    // Build lookup maps for O(1) access
    const matchMap = new Map(matchTotals.map((t) => [t.leagueUserId, t._sum.totalPoints || 0]))
    const seriesMap = new Map(seriesTotals.map((t) => [t.leagueUserId, t._sum.totalPoints || 0]))
    const specialBetMap = new Map(specialBetTotals.map((t) => [t.leagueUserId, t._sum.totalPoints || 0]))
    const questionMap = new Map(questionTotals.map((t) => [t.leagueUserId, t._sum.totalPoints || 0]))

    // Merge user data with aggregated points
    const entries = leagueUsers.map((lu) => {
      const matchPoints = matchMap.get(lu.id) || 0
      const seriesPoints = seriesMap.get(lu.id) || 0
      const specialBetPoints = specialBetMap.get(lu.id) || 0
      const questionPoints = questionMap.get(lu.id) || 0

      return {
        leagueUserId: lu.id,
        odataUserId: lu.User.id,
        username: lu.User.username,
        firstName: lu.User.firstName,
        lastName: lu.User.lastName,
        avatarUrl: lu.User.avatarUrl,
        matchPoints,
        seriesPoints,
        specialBetPoints,
        questionPoints,
        totalPoints: matchPoints + seriesPoints + specialBetPoints + questionPoints,
      }
    })

    // Sort by total points descending
    entries.sort((a, b) => b.totalPoints - a.totalPoints)

    // Add ranks
    const rankedEntries = entries.map((entry, index) => ({
      ...entry,
      rank: index + 1,
    }))

    // Fetch prizes and fines for this league
    const prizeRecords = await prisma.leaguePrize.findMany({
      where: {
        leagueId,
        deletedAt: null,
      },
      orderBy: {
        rank: 'asc',
      },
      select: {
        rank: true,
        amount: true,
        currency: true,
        label: true,
        type: true,
      },
    })

    // Separate prizes and fines
    const prizes = prizeRecords
      .filter((p) => p.type === 'prize')
      .map(({ rank, amount, currency, label }) => ({
        rank,
        amount,
        currency,
        label,
      }))

    const fines = prizeRecords
      .filter((p) => p.type === 'fine')
      .map(({ rank, amount, currency, label }) => ({
        rank,
        amount,
        currency,
        label,
      }))

    return { entries: rankedEntries, prizes, fines }
  },
  ['leaderboard'],
  {
    revalidate: 1800, // 30 minutes
    tags: ['leaderboard'],
  }
)

/**
 * Fetches leaderboard for a league with aggregated points and prizes
 */
export async function getLeaderboard(leagueId: number): Promise<LeaderboardData> {
  const { userId } = await requireLeagueMember(leagueId)

  // Get cached leaderboard data (shared across all users)
  const cachedData = await getCachedLeaderboardData(leagueId)

  // Add isCurrentUser flag for this specific user
  const entries = cachedData.entries.map((entry) => {
    const { odataUserId, ...rest } = entry
    return {
      ...rest,
      userId: odataUserId,
      isCurrentUser: odataUserId === userId,
    }
  })

  return {
    entries,
    prizes: cachedData.prizes,
    fines: cachedData.fines,
  }
}


