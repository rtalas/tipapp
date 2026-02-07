'use server'

import { revalidatePath, revalidateTag, unstable_cache } from 'next/cache'
import { prisma } from '@/lib/prisma'
import { requireLeagueMember, isBettingOpen } from '@/lib/auth/user-auth-utils'
import { userSeriesBetSchema, type UserSeriesBetInput } from '@/lib/validation/user'
import { AppError } from '@/lib/error-handler'
import { AuditLogger } from '@/lib/logging/audit-logger'

/**
 * Cached base series data (20 min TTL)
 * Shared across all users - excludes user-specific bets
 */
const getCachedSeriesData = unstable_cache(
  async (leagueId: number) => {
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
      },
      orderBy: { dateTime: 'asc' },
    })

    return series
  },
  ['series-data'],
  {
    revalidate: 1200, // 20 minutes
    tags: ['series-data'],
  }
)

/**
 * Fetches series for a league with the current user's bets
 */
export async function getUserSeries(leagueId: number) {
  const { leagueUser } = await requireLeagueMember(leagueId)

  // Fetch cached base data and user's bets in parallel
  const [series, userBets] = await Promise.all([
    getCachedSeriesData(leagueId),
    prisma.userSpecialBetSerie.findMany({
      where: {
        leagueUserId: leagueUser.id,
        deletedAt: null,
        LeagueSpecialBetSerie: {
          leagueId,
          deletedAt: null,
        },
      },
    }),
  ])

  // Create a map of user bets by leagueSpecialBetSerieId for fast lookup
  const userBetMap = new Map(userBets.map((bet) => [bet.leagueSpecialBetSerieId, bet]))

  // Transform the data to include betting status and user's bet
  return series.map((s) => ({
    ...s,
    isBettingOpen: isBettingOpen(s.dateTime),
    userBet: userBetMap.get(s.id) || null,
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
    throw new AppError('Series not found', 'NOT_FOUND', 404)
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
              avatarUrl: true,
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
    return { success: false as const, error: 'Series not found' }
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
        const existingBet = await tx.userSpecialBetSerie.findFirst({
          where: {
            leagueSpecialBetSerieId: validated.leagueSpecialBetSerieId,
            leagueUserId: leagueUser.id,
            deletedAt: null,
          },
        })

        isUpdate = !!existingBet

        const now = new Date()

        if (existingBet) {
          // Update existing bet
          await tx.userSpecialBetSerie.update({
            where: { id: existingBet.id },
            data: {
              homeTeamScore: validated.homeTeamScore,
              awayTeamScore: validated.awayTeamScore,
              updatedAt: now,
            },
          })
        } else {
          // Create new bet
          await tx.userSpecialBetSerie.create({
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

    revalidateTag('bet-badges', 'max')
    revalidatePath(`/${seriesInfo.leagueId}/series`)
    return { success: true }
  } catch (error) {
    if (error instanceof AppError) {
      return { success: false as const, error: error.message }
    }
    throw error
  }
}
