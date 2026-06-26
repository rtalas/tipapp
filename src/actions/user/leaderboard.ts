'use server'

import { prisma } from '@/lib/prisma'
import { requireLeagueMember } from '@/lib/auth/user-auth-utils'
import { groupStageRequiresUserMark } from '@/lib/evaluators/types'
import {
  getCachedTournamentGoalStats,
  type TournamentGoalStats,
} from '@/lib/cache/tournament-goal-stats'
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
  lastEvaluatedAt: Date | null
  isFinished: boolean
  jokerCount: number
}

export interface UserMatchPick {
  id: number
  matchName: string
  homeTeamName: string
  awayTeamName: string
  homeTeamFlag: string | null
  homeTeamFlagType: string | null
  awayTeamFlag: string | null
  awayTeamFlagType: string | null
  homeScore: number
  awayScore: number
  scorerName: string | null
  scorerRanking: number | null
  scorerCorrect: boolean
  ownGoal: boolean
  ownGoalCorrect: boolean
  overtime: boolean
  usedJoker: boolean
  isDoubled: boolean
  totalPoints: number
  matchDate: Date
  actualHomeScore: number | null
  actualAwayScore: number | null
  actualOvertime: boolean | null
  isEvaluated: boolean
  isPlayoff: boolean
  homeAdvanced: boolean | null
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
  actualResult: string | null
  totalPoints: number
  deadline: Date
  isEvaluated: boolean
  showGoalProgress: boolean
  showAdvanceMark: boolean
  markedAsAdvancing: boolean | null
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
  goalStats: TournamentGoalStats
}

/**
 * Fetches all picks and points for a specific user in a league
 */
export async function getUserPicks(
  leagueId: number,
  leagueUserId: number
): Promise<UserPicksData> {
  await requireLeagueMember(leagueId)

  const now = new Date()

  // Fetch all bets + tournament goal totals in parallel
  const [matchBets, seriesBets, specialBetResults, questionBets, goalStats] = await Promise.all([
    // Match bets (only for this league, only after deadline — server time)
    prisma.userBet.findMany({
      where: {
        leagueUserId,
        deletedAt: null,
        LeagueMatch: {
          leagueId, // Filter by league to prevent showing bets from other leagues
          deletedAt: null,
          Match: {
            dateTime: { lt: now }, // Only show bets for matches that have already started
          },
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
                    ownGoal: true,
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

    // Series bets (only for this league, only after deadline — server time)
    prisma.userSpecialBetSerie.findMany({
      where: {
        leagueUserId,
        deletedAt: null,
        LeagueSpecialBetSerie: {
          leagueId, // Filter by league to prevent showing bets from other leagues
          deletedAt: null,
          dateTime: { lt: now }, // Only show bets for series that have already started
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

    // Special bets (only for this league, only after deadline — server time)
    prisma.userSpecialBetSingle.findMany({
      where: {
        leagueUserId,
        deletedAt: null,
        LeagueSpecialBetSingle: {
          leagueId, // Filter by league to prevent showing bets from other leagues
          deletedAt: null,
          dateTime: { lt: now }, // Only show bets after deadline has passed
        },
      },
      include: {
        LeagueSpecialBetSingle: {
          include: {
            SpecialBetSingle: true,
            Evaluator: { select: { config: true } },
            LeagueTeam: { include: { Team: true } },
            LeaguePlayer: { include: { Player: true } },
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

    // Question bets (only for this league, only after deadline — server time)
    prisma.userSpecialBetQuestion.findMany({
      where: {
        leagueUserId,
        deletedAt: null,
        LeagueSpecialBetQuestion: {
          leagueId, // Filter by league to prevent showing bets from other leagues
          deletedAt: null,
          dateTime: { lt: now }, // Only show bets after deadline has passed
        },
      },
      include: {
        LeagueSpecialBetQuestion: true,
      },
      orderBy: {
        dateTime: 'desc',
      },
    }),
    getCachedTournamentGoalStats(leagueId),
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

    const ownGoal = bet.ownGoal === true
    const ownGoalCorrect =
      ownGoal && bet.LeagueMatch.Match.MatchScorer.some((ms) => ms.ownGoal)

    const match = bet.LeagueMatch.Match
    // Bets cannot be created on placeholder matches, so teams are always present here.
    const homeTeam = match.LeagueTeam_Match_homeTeamIdToLeagueTeam!.Team
    const awayTeam = match.LeagueTeam_Match_awayTeamIdToLeagueTeam!.Team

    return {
      id: bet.id,
      matchName: `${homeTeam.name} vs ${awayTeam.name}`,
      homeTeamName: homeTeam.name,
      awayTeamName: awayTeam.name,
      homeTeamFlag: homeTeam.flagIcon,
      homeTeamFlagType: homeTeam.flagType,
      awayTeamFlag: awayTeam.flagIcon,
      awayTeamFlagType: awayTeam.flagType,
      homeScore: bet.homeScore,
      awayScore: bet.awayScore,
      scorerName,
      scorerRanking: bet.LeaguePlayer?.topScorerRanking ?? null,
      scorerCorrect,
      ownGoal,
      ownGoalCorrect,
      overtime: bet.overtime,
      usedJoker: bet.usedJoker,
      isDoubled: bet.LeagueMatch.isDoubled,
      totalPoints: bet.totalPoints,
      matchDate: match.dateTime,
      actualHomeScore: match.homeFinalScore,
      actualAwayScore: match.awayFinalScore,
      actualOvertime: match.isOvertime || match.isShootout || null,
      isEvaluated: match.isEvaluated,
      isPlayoff: match.isPlayoffGame,
      homeAdvanced: bet.homeAdvanced,
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

    // 3rd-place WC group-stage bets: user marks whether their team advances (top-8).
    const showAdvanceMark =
      bet.LeagueTeam !== null &&
      groupStageRequiresUserMark(bet.LeagueSpecialBetSingle.Evaluator?.config)

    // Correct answer (set once the bet is evaluated): team, player, or numeric value.
    const result = bet.LeagueSpecialBetSingle
    let actualResult: string | null = null
    if (result.LeagueTeam) {
      actualResult = result.LeagueTeam.Team.name
    } else if (result.LeaguePlayer?.Player) {
      const { firstName, lastName } = result.LeaguePlayer.Player
      actualResult = [firstName, lastName].filter(Boolean).join(' ') || null
    } else if (result.specialBetValue !== null) {
      actualResult = result.specialBetValue.toString()
    }

    return {
      id: bet.id,
      betName: bet.LeagueSpecialBetSingle.name,
      prediction,
      actualResult,
      totalPoints: bet.totalPoints,
      deadline: bet.LeagueSpecialBetSingle.dateTime,
      isEvaluated: bet.LeagueSpecialBetSingle.isEvaluated,
      showGoalProgress: bet.LeagueSpecialBetSingle.showGoalProgress,
      showAdvanceMark,
      markedAsAdvancing: bet.markedAsAdvancing,
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
    goalStats,
  }
}

/**
 * Fetches leaderboard for a league with aggregated points and prizes
 */
export async function getLeaderboard(leagueId: number): Promise<LeaderboardData> {
  const { userId } = await requireLeagueMember(leagueId)

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
  const now = new Date()

  // Aggregate points in database instead of loading all bet rows
  const [matchTotals, seriesTotals, specialBetTotals, questionTotals, jokerCounts, jokerRevealedCounts, prizeRecords, lastEvalTimestamps, league] = await Promise.all([
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
    prisma.userBet.groupBy({
      by: ['leagueUserId'],
      where: { leagueUserId: { in: leagueUserIds }, usedJoker: true, deletedAt: null },
      _count: { _all: true },
    }),
    // Jokers on matches whose deadline has already passed. Shown for *other* users
    // so a joker on a future (still-bettable) match isn't revealed before kickoff.
    prisma.userBet.groupBy({
      by: ['leagueUserId'],
      where: {
        leagueUserId: { in: leagueUserIds },
        usedJoker: true,
        deletedAt: null,
        LeagueMatch: { Match: { dateTime: { lt: now } } },
      },
      _count: { _all: true },
    }),
    prisma.leaguePrize.findMany({
      where: { leagueId, deletedAt: null },
      orderBy: { rank: 'asc' },
      select: { rank: true, amount: true, currency: true, label: true, type: true },
    }),
    // Find the most recent evaluation timestamp across all evaluated entity types
    Promise.all([
      prisma.match.aggregate({
        where: { isEvaluated: true, deletedAt: null, LeagueMatch: { some: { leagueId, deletedAt: null } } },
        _max: { updatedAt: true },
      }),
      prisma.leagueSpecialBetSerie.aggregate({
        where: { isEvaluated: true, deletedAt: null, leagueId },
        _max: { updatedAt: true },
      }),
      prisma.leagueSpecialBetSingle.aggregate({
        where: { isEvaluated: true, deletedAt: null, leagueId },
        _max: { updatedAt: true },
      }),
      prisma.leagueSpecialBetQuestion.aggregate({
        where: { isEvaluated: true, deletedAt: null, leagueId },
        _max: { updatedAt: true },
      }),
    ]),
    prisma.league.findUniqueOrThrow({
      where: { id: leagueId },
      select: { isFinished: true, jokerCount: true },
    }),
  ])

  // Build lookup maps for O(1) access
  const matchMap = new Map(matchTotals.map((t) => [t.leagueUserId, t._sum.totalPoints || 0]))
  const seriesMap = new Map(seriesTotals.map((t) => [t.leagueUserId, t._sum.totalPoints || 0]))
  const specialBetMap = new Map(specialBetTotals.map((t) => [t.leagueUserId, t._sum.totalPoints || 0]))
  const questionMap = new Map(questionTotals.map((t) => [t.leagueUserId, t._sum.totalPoints || 0]))
  const jokerMap = new Map(jokerCounts.map((t) => [t.leagueUserId, t._count?._all ?? 0]))
  const jokerRevealedMap = new Map(jokerRevealedCounts.map((t) => [t.leagueUserId, t._count?._all ?? 0]))

  // Merge user data with aggregated points
  const entries = leagueUsers.map((lu) => {
    const matchPoints = matchMap.get(lu.id) || 0
    const seriesPoints = seriesMap.get(lu.id) || 0
    const specialBetPoints = specialBetMap.get(lu.id) || 0
    const questionPoints = questionMap.get(lu.id) || 0
    // Own row shows the true total (incl. jokers on upcoming matches the user
    // committed). Other rows only expose jokers on matches past their deadline,
    // so a joker on a future match stays hidden until kickoff.
    const isCurrentUser = lu.User.id === userId
    const jokersUsed = isCurrentUser
      ? jokerMap.get(lu.id) || 0
      : jokerRevealedMap.get(lu.id) || 0

    return {
      leagueUserId: lu.id,
      userId: lu.User.id,
      username: lu.User.username,
      firstName: lu.User.firstName,
      lastName: lu.User.lastName,
      avatarUrl: lu.User.avatarUrl,
      matchPoints,
      seriesPoints,
      specialBetPoints,
      questionPoints,
      totalPoints: matchPoints + seriesPoints + specialBetPoints + questionPoints,
      jokersUsed,
      isCurrentUser,
    }
  })

  // Sort by total points descending
  entries.sort((a, b) => b.totalPoints - a.totalPoints)

  // Add ranks
  const rankedEntries = entries.map((entry, index) => ({
    ...entry,
    rank: index + 1,
  }))

  // Separate prizes and fines
  const prizes = prizeRecords
    .filter((p) => p.type === 'prize')
    .map(({ rank, amount, currency, label }) => ({ rank, amount, currency, label }))

  const fines = prizeRecords
    .filter((p) => p.type === 'fine')
    .map(({ rank, amount, currency, label }) => ({ rank, amount, currency, label }))

  const lastEvaluatedAt = lastEvalTimestamps
    .map((r) => r._max.updatedAt)
    .filter((d): d is Date => d !== null)
    .reduce<Date | null>((max, d) => (max === null || d > max ? d : max), null)

  return {
    entries: rankedEntries,
    prizes,
    fines,
    lastEvaluatedAt,
    isFinished: league.isFinished,
    jokerCount: league.jokerCount,
  }
}


