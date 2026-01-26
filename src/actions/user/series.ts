'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/prisma'
import { requireLeagueMember, isBettingOpen } from '@/lib/user-auth-utils'
import { userSeriesBetSchema, type UserSeriesBetInput } from '@/lib/validation/user'
import { nullableUniqueConstraint } from '@/lib/prisma-utils'
import { AppError } from '@/lib/error-handler'
import { AuditLogger } from '@/lib/audit-logger'

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
 * Uses Serializable transaction for data consistency
 */
export async function saveSeriesBet(input: UserSeriesBetInput) {
  const startTime = Date.now()
  const parsed = userSeriesBetSchema.safeParse(input)

  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message || 'Invalid input',
    }
  }

  const validated = parsed.data

  // Get series leagueId for membership check (outside transaction)
  const seriesInfo = await prisma.leagueSpecialBetSerie.findUnique({
    where: { id: validated.leagueSpecialBetSerieId, deletedAt: null },
    select: { leagueId: true },
  })

  if (!seriesInfo) {
    return { success: false, error: 'Series not found' }
  }

  // Verify league membership (outside transaction)
  const { leagueUser } = await requireLeagueMember(seriesInfo.leagueId)

  // Wrap database operations in Serializable transaction
  try {
    let isUpdate = false

    await prisma.$transaction(
      async (tx) => {
        // Fetch series details within transaction for consistency
        const series = await tx.leagueSpecialBetSerie.findUnique({
          where: { id: validated.leagueSpecialBetSerieId, deletedAt: null },
        })

        if (!series) {
          throw new AppError('Series not found', 'NOT_FOUND', 404)
        }

        // Check betting lock
        if (!isBettingOpen(series.dateTime)) {
          throw new AppError(
            'Betting is closed for this series',
            'BETTING_CLOSED',
            400
          )
        }

        // Check if bet exists to determine action type
        const existingBet = await tx.userSpecialBetSerie.findUnique({
          where: {
            leagueSpecialBetSerieId_leagueUserId_deletedAt: nullableUniqueConstraint(
              {
                leagueSpecialBetSerieId: validated.leagueSpecialBetSerieId,
                leagueUserId: leagueUser.id,
                deletedAt: null,
              }
            ),
          },
        })

        isUpdate = !!existingBet

        // Atomic upsert to prevent race conditions
        const now = new Date()

        await tx.userSpecialBetSerie.upsert({
          where: {
            leagueSpecialBetSerieId_leagueUserId_deletedAt: nullableUniqueConstraint(
              {
                leagueSpecialBetSerieId: validated.leagueSpecialBetSerieId,
                leagueUserId: leagueUser.id,
                deletedAt: null,
              }
            ),
          },
          update: {
            homeTeamScore: validated.homeTeamScore,
            awayTeamScore: validated.awayTeamScore,
            updatedAt: now,
          },
          create: {
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
      },
      {
        isolationLevel: 'Serializable',
        maxWait: 5000, // 5s max wait for lock
        timeout: 10000, // 10s max transaction time
      }
    )

    // Audit log (fire-and-forget)
    const durationMs = Date.now() - startTime
    const metadata = {
      homeTeamScore: validated.homeTeamScore,
      awayTeamScore: validated.awayTeamScore,
    }

    if (isUpdate) {
      AuditLogger.seriesBetUpdated(
        leagueUser.userId,
        seriesInfo.leagueId,
        validated.leagueSpecialBetSerieId,
        metadata,
        durationMs
      ).catch((err) => console.error('Audit log failed:', err))
    } else {
      AuditLogger.seriesBetCreated(
        leagueUser.userId,
        seriesInfo.leagueId,
        validated.leagueSpecialBetSerieId,
        metadata,
        durationMs
      ).catch((err) => console.error('Audit log failed:', err))
    }

    revalidatePath(`/${seriesInfo.leagueId}/series`)
    return { success: true }
  } catch (error) {
    if (error instanceof AppError) {
      return { success: false, error: error.message }
    }
    throw error
  }
}
