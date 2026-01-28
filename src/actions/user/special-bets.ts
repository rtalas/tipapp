'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/prisma'
import { requireLeagueMember, isBettingOpen } from '@/lib/user-auth-utils'
import { userSpecialBetSchema, type UserSpecialBetInput } from '@/lib/validation/user'
import { nullableUniqueConstraint } from '@/lib/prisma-utils'
import { AppError } from '@/lib/error-handler'
import { AuditLogger } from '@/lib/audit-logger'

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
    return { success: false, error: 'Special bet not found' }
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
        const existingBet = await tx.userSpecialBetSingle.findUnique({
          where: {
            leagueSpecialBetSingleId_leagueUserId_deletedAt:
              nullableUniqueConstraint({
                leagueSpecialBetSingleId: validated.leagueSpecialBetSingleId,
                leagueUserId: leagueUser.id,
                deletedAt: null,
              }),
          },
        })

        isUpdate = !!existingBet

        // Atomic upsert to prevent race conditions
        const now = new Date()

        await tx.userSpecialBetSingle.upsert({
          where: {
            leagueSpecialBetSingleId_leagueUserId_deletedAt:
              nullableUniqueConstraint({
                leagueSpecialBetSingleId: validated.leagueSpecialBetSingleId,
                leagueUserId: leagueUser.id,
                deletedAt: null,
              }),
          },
          update: {
            teamResultId: validated.teamResultId,
            playerResultId: validated.playerResultId,
            value: validated.value,
            updatedAt: now,
          },
          create: {
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

    revalidatePath(`/${specialBetInfo.leagueId}/special-bets`)
    return { success: true }
  } catch (error) {
    if (error instanceof AppError) {
      return { success: false, error: error.message }
    }
    throw error
  }
}
