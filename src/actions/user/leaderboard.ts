'use server'

import { prisma } from '@/lib/prisma'
import { requireLeagueMember } from '@/lib/user-auth-utils'
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
}

export interface UserMatchPick {
  id: number
  matchName: string
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

  // Fetch match bets (only for this league)
  const matchBets = await prisma.userBet.findMany({
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
  })

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

    return {
      id: bet.id,
      matchName: `${match.LeagueTeam_Match_homeTeamIdToLeagueTeam.Team.name} vs ${match.LeagueTeam_Match_awayTeamIdToLeagueTeam.Team.name}`,
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

  // Fetch series bets (only for this league)
  const seriesBets = await prisma.userSpecialBetSerie.findMany({
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

  // Fetch special bets (only for this league)
  const specialBetResults = await prisma.userSpecialBetSingle.findMany({
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
  })

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
      betName: bet.LeagueSpecialBetSingle.SpecialBetSingle.name,
      prediction,
      totalPoints: bet.totalPoints,
      deadline: bet.LeagueSpecialBetSingle.dateTime,
    }
  })

  // Fetch question bets (only for this league)
  const questionBets = await prisma.userSpecialBetQuestion.findMany({
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
 * Fetches leaderboard for a league with aggregated points and prizes
 */
export async function getLeaderboard(leagueId: number): Promise<LeaderboardData> {
  const { userId } = await requireLeagueMember(leagueId)

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
  const rankedEntries = entries.map((entry, index) => ({
    ...entry,
    rank: index + 1,
  }))

  // Fetch prizes for this league
  const prizes = await prisma.leaguePrize.findMany({
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
    },
  })

  return {
    entries: rankedEntries,
    prizes,
  }
}


