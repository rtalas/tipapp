'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/prisma'
import { requireLeagueMember, isBettingOpen } from '@/lib/user-auth-utils'
import { userSeriesBetSchema, type UserSeriesBetInput } from '@/lib/validation/user'

/**
 * Fetches series for a league with the current user's bets
 */
export async function getUserSeries(leagueId: number) {
  const { leagueUser } = await requireLeagueMember(leagueId)

  const series = await prisma.leagueSpecialBetSerie.findMany({
    where: {
      leagueId,
      deletedAt: null,
    },
    include: {
      SpecialBetSerie: true,
      League: {
        include: { Sport: true },
      },
      LeagueTeam_LeagueSpecialBetSerie_homeTeamIdToLeagueTeam: {
        include: { Team: true },
      },
      LeagueTeam_LeagueSpecialBetSerie_awayTeamIdToLeagueTeam: {
        include: { Team: true },
      },
      UserSpecialBetSerie: {
        where: {
          leagueUserId: leagueUser.id,
          deletedAt: null,
        },
        take: 1,
      },
    },
    orderBy: { dateTime: 'asc' },
  })

  return series.map((s) => ({
    ...s,
    isBettingOpen: isBettingOpen(s.dateTime),
    userBet: s.UserSpecialBetSerie[0] || null,
  }))
}

export type UserSeries = Awaited<ReturnType<typeof getUserSeries>>[number]

/**
 * Fetches friend predictions for a specific series
 * Only returns predictions if the betting is closed
 */
export async function getSeriesFriendPredictions(leagueSpecialBetSerieId: number) {
  const series = await prisma.leagueSpecialBetSerie.findUnique({
    where: { id: leagueSpecialBetSerieId, deletedAt: null },
  })

  if (!series) {
    throw new Error('Series not found')
  }

  const { leagueUser } = await requireLeagueMember(series.leagueId)

  // Only show friend predictions after betting is closed
  if (isBettingOpen(series.dateTime)) {
    return {
      isLocked: false,
      predictions: [],
    }
  }

  const predictions = await prisma.userSpecialBetSerie.findMany({
    where: {
      leagueSpecialBetSerieId,
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
    },
    orderBy: { totalPoints: 'desc' },
  })

  return {
    isLocked: true,
    predictions,
  }
}

export type SeriesFriendPrediction = Awaited<
  ReturnType<typeof getSeriesFriendPredictions>
>['predictions'][number]

/**
 * Creates or updates a series bet for the current user
 */
export async function saveSeriesBet(input: UserSeriesBetInput) {
  const parsed = userSeriesBetSchema.safeParse(input)

  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message || 'Invalid input',
    }
  }

  const validated = parsed.data

  const series = await prisma.leagueSpecialBetSerie.findUnique({
    where: { id: validated.leagueSpecialBetSerieId, deletedAt: null },
  })

  if (!series) {
    return { success: false, error: 'Series not found' }
  }

  const { leagueUser } = await requireLeagueMember(series.leagueId)

  if (!isBettingOpen(series.dateTime)) {
    return { success: false, error: 'Betting is closed for this series' }
  }

  const existingBet = await prisma.userSpecialBetSerie.findFirst({
    where: {
      leagueSpecialBetSerieId: validated.leagueSpecialBetSerieId,
      leagueUserId: leagueUser.id,
      deletedAt: null,
    },
  })

  const now = new Date()

  if (existingBet) {
    await prisma.userSpecialBetSerie.update({
      where: { id: existingBet.id },
      data: {
        homeTeamScore: validated.homeTeamScore,
        awayTeamScore: validated.awayTeamScore,
        updatedAt: now,
      },
    })
  } else {
    await prisma.userSpecialBetSerie.create({
      data: {
        leagueSpecialBetSerieId: validated.leagueSpecialBetSerieId,
        leagueUserId: leagueUser.id,
        homeTeamScore: validated.homeTeamScore,
        awayTeamScore: validated.awayTeamScore,
        totalPoints: 0,
        dateTime: now,
        createdAt: now,
        updatedAt: now,
      },
    })
  }

  revalidatePath(`/${series.leagueId}/series`)

  return { success: true }
}
