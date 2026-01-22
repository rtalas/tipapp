'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/prisma'
import { requireLeagueMember, isBettingOpen } from '@/lib/user-auth-utils'
import { userMatchBetSchema, type UserMatchBetInput } from '@/lib/validation/user'

/**
 * Fetches matches for a league with the current user's bets
 * Returns matches grouped with betting status and deadline info
 */
export async function getUserMatches(leagueId: number) {
  const { leagueUser } = await requireLeagueMember(leagueId)

  const matches = await prisma.leagueMatch.findMany({
    where: {
      leagueId,
      deletedAt: null,
      Match: {
        deletedAt: null,
      },
    },
    include: {
      League: {
        select: {
          id: true,
          name: true,
          sportId: true,
          Sport: { select: { id: true, name: true } },
        },
      },
      Match: {
        include: {
          LeagueTeam_Match_homeTeamIdToLeagueTeam: {
            include: {
              Team: true,
              LeaguePlayer: {
                where: { deletedAt: null },
                include: { Player: true },
                orderBy: { Player: { lastName: 'asc' } },
              },
            },
          },
          LeagueTeam_Match_awayTeamIdToLeagueTeam: {
            include: {
              Team: true,
              LeaguePlayer: {
                where: { deletedAt: null },
                include: { Player: true },
                orderBy: { Player: { lastName: 'asc' } },
              },
            },
          },
          MatchScorer: {
            include: {
              LeaguePlayer: {
                include: { Player: true },
              },
            },
          },
          MatchPhase: true,
        },
      },
      // Get only the current user's bet
      UserBet: {
        where: {
          leagueUserId: leagueUser.id,
          deletedAt: null,
        },
        include: {
          LeaguePlayer: {
            include: {
              Player: true,
            },
          },
        },
        take: 1,
      },
    },
    orderBy: { Match: { dateTime: 'asc' } },
  })

  // Transform the data to include betting status
  return matches.map((match) => ({
    ...match,
    isBettingOpen: isBettingOpen(match.Match.dateTime),
    userBet: match.UserBet[0] || null,
  }))
}

export type UserMatch = Awaited<ReturnType<typeof getUserMatches>>[number]

/**
 * Fetches friend predictions for a specific match
 * Only returns predictions if the betting is closed (match has started)
 */
export async function getMatchFriendPredictions(leagueMatchId: number) {
  const match = await prisma.leagueMatch.findUnique({
    where: { id: leagueMatchId, deletedAt: null },
    include: { Match: true },
  })

  if (!match) {
    throw new Error('Match not found')
  }

  const { leagueUser } = await requireLeagueMember(match.leagueId)

  // Only show friend predictions after betting is closed
  if (isBettingOpen(match.Match.dateTime)) {
    return {
      isLocked: false,
      predictions: [],
    }
  }

  const predictions = await prisma.userBet.findMany({
    where: {
      leagueMatchId,
      deletedAt: null,
      // Exclude current user's bet
      leagueUserId: { not: leagueUser.id },
    },
    include: {
      LeagueUser: {
        include: {
          User: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              username: true,
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
    orderBy: { totalPoints: 'desc' },
  })

  return {
    isLocked: true,
    predictions,
  }
}

export type FriendPrediction = Awaited<
  ReturnType<typeof getMatchFriendPredictions>
>['predictions'][number]

/**
 * Creates or updates a match bet for the current user
 * Enforces betting lock (cannot bet after match starts)
 */
export async function saveMatchBet(input: UserMatchBetInput) {
  const parsed = userMatchBetSchema.safeParse(input)

  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message || 'Invalid input',
    }
  }

  const validated = parsed.data

  // Get the match and verify membership
  const leagueMatch = await prisma.leagueMatch.findUnique({
    where: { id: validated.leagueMatchId, deletedAt: null },
    include: {
      Match: {
        include: {
          LeagueTeam_Match_homeTeamIdToLeagueTeam: true,
          LeagueTeam_Match_awayTeamIdToLeagueTeam: true,
        },
      },
    },
  })

  if (!leagueMatch) {
    return { success: false, error: 'Match not found' }
  }

  const { leagueUser } = await requireLeagueMember(leagueMatch.leagueId)

  // Check betting lock
  if (!isBettingOpen(leagueMatch.Match.dateTime)) {
    return {
      success: false,
      error: 'Betting is closed for this match',
    }
  }

  // Validate mutual exclusivity between scorerId and noScorer
  if (validated.noScorer === true && validated.scorerId !== null) {
    return {
      success: false,
      error: 'Cannot set both scorer and no scorer',
    }
  }

  // Verify scorer belongs to one of the teams if provided
  if (validated.scorerId) {
    const scorer = await prisma.leaguePlayer.findUnique({
      where: { id: validated.scorerId, deletedAt: null },
    })

    if (!scorer) {
      return { success: false, error: 'Scorer not found' }
    }

    const isValidScorer =
      scorer.leagueTeamId === leagueMatch.Match.homeTeamId ||
      scorer.leagueTeamId === leagueMatch.Match.awayTeamId

    if (!isValidScorer) {
      return {
        success: false,
        error: 'Scorer must belong to one of the teams playing',
      }
    }
  }

  // Check if bet already exists
  const existingBet = await prisma.userBet.findFirst({
    where: {
      leagueMatchId: validated.leagueMatchId,
      leagueUserId: leagueUser.id,
      deletedAt: null,
    },
  })

  const now = new Date()

  if (existingBet) {
    // Update existing bet
    await prisma.userBet.update({
      where: { id: existingBet.id },
      data: {
        homeScore: validated.homeScore,
        awayScore: validated.awayScore,
        scorerId: validated.scorerId,
        noScorer: validated.noScorer,
        overtime: validated.overtime,
        homeAdvanced: validated.homeAdvanced,
        updatedAt: now,
      },
    })
  } else {
    // Create new bet
    await prisma.userBet.create({
      data: {
        leagueMatchId: validated.leagueMatchId,
        leagueUserId: leagueUser.id,
        homeScore: validated.homeScore,
        awayScore: validated.awayScore,
        scorerId: validated.scorerId,
        noScorer: validated.noScorer,
        overtime: validated.overtime,
        homeAdvanced: validated.homeAdvanced,
        dateTime: now,
        totalPoints: 0,
        createdAt: now,
        updatedAt: now,
      },
    })
  }

  revalidatePath(`/${leagueMatch.leagueId}/matches`)

  return { success: true }
}

