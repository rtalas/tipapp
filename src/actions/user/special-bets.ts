'use server'

import { revalidatePath, revalidateTag, unstable_cache } from 'next/cache'
import { prisma } from '@/lib/prisma'
import { requireLeagueMember, isBettingOpen } from '@/lib/auth/user-auth-utils'
import { userSpecialBetSchema, type UserSpecialBetInput } from '@/lib/validation/user'
import { AppError } from '@/lib/error-handler'
import { AuditLogger } from '@/lib/logging/audit-logger'

/**
 * Cached base special bet data (20 min TTL)
 * Shared across all users - excludes user-specific bets
 */
const getCachedSpecialBetData = unstable_cache(
  async (leagueId: number) => {
    const specialBets = await prisma.leagueSpecialBetSingle.findMany({
      where: {
        leagueId,
        deletedAt: null,
      },
      include: {
        // Include Evaluator for determining bet type
        Evaluator: {
          include: {
            EvaluatorType: true,
          },
        },
        // Keep SpecialBetSingle for backward compatibility (nullable)
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
      },
      orderBy: { dateTime: 'asc' },
    })

    return specialBets
  },
  ['special-bet-data'],
  {
    revalidate: 1200, // 20 minutes
    tags: ['special-bet-data'],
  }
)

/**
 * Fetches special bets for a league with the current user's picks
 */
export async function getUserSpecialBets(leagueId: number) {
  const { leagueUser } = await requireLeagueMember(leagueId)

  // Fetch cached base data and user's bets in parallel
  const [specialBets, userBets] = await Promise.all([
    getCachedSpecialBetData(leagueId),
    prisma.userSpecialBetSingle.findMany({
      where: {
        leagueUserId: leagueUser.id,
        deletedAt: null,
        LeagueSpecialBetSingle: {
          leagueId,
          deletedAt: null,
        },
      },
      include: {
        LeagueTeam: {
          include: { Team: true },
        },
        LeaguePlayer: {
          include: { Player: true },
        },
      },
    }),
  ])

  // Create a map of user bets by leagueSpecialBetSingleId for fast lookup
  const userBetMap = new Map(userBets.map((bet) => [bet.leagueSpecialBetSingleId, bet]))

  // Transform the data to include betting status and user's bet
  return specialBets.map((sb) => ({
    ...sb,
    isBettingOpen: isBettingOpen(sb.dateTime),
    userBet: userBetMap.get(sb.id) || null,
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
    throw new AppError('Special bet not found', 'NOT_FOUND', 404)
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
              avatarUrl: true,
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
 * Cached teams data (12 hour TTL)
 * Fetches all teams for a league - group filtering happens at runtime
 */
const getCachedTeams = unstable_cache(
  async (leagueId: number) => {
    const teams = await prisma.leagueTeam.findMany({
      where: {
        leagueId,
        deletedAt: null,
      },
      include: { Team: true },
      orderBy: { Team: { name: 'asc' } },
    })

    return teams.map((t) => ({ ...t, group: t.group }))
  },
  ['special-bet-teams'],
  {
    revalidate: 43200, // 12 hours
    tags: ['special-bet-teams'],
  }
)

/**
 * Gets teams available for a special bet
 * @param leagueId - The league ID
 * @param group - Optional group filter for group stage predictions
 */
export async function getSpecialBetTeams(leagueId: number, group?: string) {
  await requireLeagueMember(leagueId)
  const teams = await getCachedTeams(leagueId)
  return group ? teams.filter((t) => t.group === group) : teams
}

/**
 * Cached players data (1 hour TTL)
 * Players rarely change during a season
 */
const getCachedPlayers = unstable_cache(
  async (leagueId: number) => {
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
  },
  ['special-bet-players'],
  {
    revalidate: 43200, // 12 hours
    tags: ['special-bet-players'],
  }
)

/**
 * Gets players available for a special bet
 */
export async function getSpecialBetPlayers(leagueId: number) {
  await requireLeagueMember(leagueId)
  return getCachedPlayers(leagueId)
}

/**
 * Creates or updates a special bet pick for the current user
 * Uses Serializable transaction for data consistency
 */
export async function saveSpecialBet(input: UserSpecialBetInput) {
  const startTime = Date.now()
  const parsed = userSpecialBetSchema.safeParse(input)

  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message || 'Invalid input',
    }
  }

  const validated = parsed.data

  // Get special bet leagueId for membership check (outside transaction)
  const specialBetInfo = await prisma.leagueSpecialBetSingle.findUnique({
    where: { id: validated.leagueSpecialBetSingleId, deletedAt: null },
    select: { leagueId: true },
  })

  if (!specialBetInfo) {
    return { success: false as const, error: 'Special bet not found' }
  }

  // Verify league membership (outside transaction)
  const { leagueUser } = await requireLeagueMember(specialBetInfo.leagueId)

  // Wrap database operations in Serializable transaction
  try {
    let isUpdate = false

    await prisma.$transaction(
      async (tx) => {
        // Fetch special bet details within transaction for consistency
        const specialBet = await tx.leagueSpecialBetSingle.findUnique({
          where: { id: validated.leagueSpecialBetSingleId, deletedAt: null },
        })

        if (!specialBet) {
          throw new AppError('Special bet not found', 'NOT_FOUND', 404)
        }

        // Check betting lock
        if (!isBettingOpen(specialBet.dateTime)) {
          throw new AppError(
            'Betting is closed for this special bet',
            'BETTING_CLOSED',
            400
          )
        }

        // Check if bet exists to determine action type
        const existingBet = await tx.userSpecialBetSingle.findFirst({
          where: {
            leagueSpecialBetSingleId: validated.leagueSpecialBetSingleId,
            leagueUserId: leagueUser.id,
            deletedAt: null,
          },
        })

        isUpdate = !!existingBet

        const now = new Date()

        if (existingBet) {
          // Update existing bet
          await tx.userSpecialBetSingle.update({
            where: { id: existingBet.id },
            data: {
              teamResultId: validated.teamResultId,
              playerResultId: validated.playerResultId,
              value: validated.value,
              updatedAt: now,
            },
          })
        } else {
          // Create new bet
          await tx.userSpecialBetSingle.create({
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
      teamResultId: validated.teamResultId,
      playerResultId: validated.playerResultId,
      value: validated.value,
    }

    if (isUpdate) {
      AuditLogger.specialBetUpdated(
        leagueUser.userId,
        specialBetInfo.leagueId,
        validated.leagueSpecialBetSingleId,
        metadata,
        durationMs
      ).catch((err) => console.error('Audit log failed:', err))
    } else {
      AuditLogger.specialBetCreated(
        leagueUser.userId,
        specialBetInfo.leagueId,
        validated.leagueSpecialBetSingleId,
        metadata,
        durationMs
      ).catch((err) => console.error('Audit log failed:', err))
    }

    revalidateTag('bet-badges', 'max')
    revalidatePath(`/${specialBetInfo.leagueId}/special-bets`)
    return { success: true }
  } catch (error) {
    if (error instanceof AppError) {
      return { success: false as const, error: error.message }
    }
    throw error
  }
}
