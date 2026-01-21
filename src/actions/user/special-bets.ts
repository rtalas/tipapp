'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/prisma'
import { requireLeagueMember, isBettingOpen } from '@/lib/user-auth-utils'
import { userSpecialBetSchema, type UserSpecialBetInput } from '@/lib/validation/user'

/**
 * Fetches special bets for a league with the current user's picks
 */
export async function getUserSpecialBets(leagueId: number) {
  const { leagueUser } = await requireLeagueMember(leagueId)

  const specialBets = await prisma.leagueSpecialBetSingle.findMany({
    where: {
      leagueId,
      deletedAt: null,
    },
    include: {
      SpecialBetSingle: {
        include: {
          SpecialBetSingleType: true,
          Sport: true,
        },
      },
      // Actual results
      LeagueTeam: {
        include: { Team: true },
      },
      LeaguePlayer: {
        include: { Player: true },
      },
      // User's bet
      UserSpecialBetSingle: {
        where: {
          leagueUserId: leagueUser.id,
          deletedAt: null,
        },
        include: {
          LeagueTeam: {
            include: { Team: true },
          },
          LeaguePlayer: {
            include: { Player: true },
          },
        },
        take: 1,
      },
    },
    orderBy: { dateTime: 'asc' },
  })

  return specialBets.map((sb) => ({
    ...sb,
    isBettingOpen: isBettingOpen(sb.dateTime),
    userBet: sb.UserSpecialBetSingle[0] || null,
  }))
}

export type UserSpecialBet = Awaited<ReturnType<typeof getUserSpecialBets>>[number]

/**
 * Fetches friend predictions for a specific special bet
 * Only returns predictions if the betting is closed
 */
export async function getSpecialBetFriendPredictions(leagueSpecialBetSingleId: number) {
  const specialBet = await prisma.leagueSpecialBetSingle.findUnique({
    where: { id: leagueSpecialBetSingleId, deletedAt: null },
  })

  if (!specialBet) {
    throw new Error('Special bet not found')
  }

  const { leagueUser } = await requireLeagueMember(specialBet.leagueId)

  // Only show friend predictions after betting is closed
  if (isBettingOpen(specialBet.dateTime)) {
    return {
      isLocked: false,
      predictions: [],
    }
  }

  const predictions = await prisma.userSpecialBetSingle.findMany({
    where: {
      leagueSpecialBetSingleId,
      deletedAt: null,
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
      LeagueTeam: {
        include: { Team: true },
      },
      LeaguePlayer: {
        include: { Player: true },
      },
    },
    orderBy: { totalPoints: 'desc' },
  })

  return {
    isLocked: true,
    predictions,
  }
}

export type SpecialBetFriendPrediction = Awaited<
  ReturnType<typeof getSpecialBetFriendPredictions>
>['predictions'][number]

/**
 * Gets teams available for a special bet
 */
export async function getSpecialBetTeams(leagueId: number) {
  await requireLeagueMember(leagueId)

  const teams = await prisma.leagueTeam.findMany({
    where: {
      leagueId,
      deletedAt: null,
    },
    include: { Team: true },
    orderBy: { Team: { name: 'asc' } },
  })

  return teams
}

/**
 * Gets players available for a special bet
 */
export async function getSpecialBetPlayers(leagueId: number) {
  await requireLeagueMember(leagueId)

  const players = await prisma.leaguePlayer.findMany({
    where: {
      deletedAt: null,
      LeagueTeam: {
        leagueId,
        deletedAt: null,
      },
    },
    include: {
      Player: true,
      LeagueTeam: {
        include: { Team: true },
      },
    },
    orderBy: { Player: { lastName: 'asc' } },
  })

  return players
}

/**
 * Creates or updates a special bet pick for the current user
 */
export async function saveSpecialBet(input: UserSpecialBetInput) {
  const parsed = userSpecialBetSchema.safeParse(input)

  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message || 'Invalid input',
    }
  }

  const validated = parsed.data

  const specialBet = await prisma.leagueSpecialBetSingle.findUnique({
    where: { id: validated.leagueSpecialBetSingleId, deletedAt: null },
  })

  if (!specialBet) {
    return { success: false, error: 'Special bet not found' }
  }

  const { leagueUser } = await requireLeagueMember(specialBet.leagueId)

  if (!isBettingOpen(specialBet.dateTime)) {
    return { success: false, error: 'Betting is closed for this special bet' }
  }

  const existingBet = await prisma.userSpecialBetSingle.findFirst({
    where: {
      leagueSpecialBetSingleId: validated.leagueSpecialBetSingleId,
      leagueUserId: leagueUser.id,
      deletedAt: null,
    },
  })

  const now = new Date()

  if (existingBet) {
    await prisma.userSpecialBetSingle.update({
      where: { id: existingBet.id },
      data: {
        teamResultId: validated.teamResultId,
        playerResultId: validated.playerResultId,
        value: validated.value,
        updatedAt: now,
      },
    })
  } else {
    await prisma.userSpecialBetSingle.create({
      data: {
        leagueSpecialBetSingleId: validated.leagueSpecialBetSingleId,
        leagueUserId: leagueUser.id,
        teamResultId: validated.teamResultId,
        playerResultId: validated.playerResultId,
        value: validated.value,
        totalPoints: 0,
        dateTime: now,
        createdAt: now,
        updatedAt: now,
      },
    })
  }

  revalidatePath(`/${specialBet.leagueId}/special-bets`)

  return { success: true }
}
