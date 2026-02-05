'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/prisma'
import { requireLeagueMember, isBettingOpen } from '@/lib/user-auth-utils'
import { userMatchBetSchema, type UserMatchBetInput } from '@/lib/validation/user'
import { AppError } from '@/lib/error-handler'
import { SPORT_IDS } from '@/lib/constants'
import { AuditLogger } from '@/lib/audit-logger'

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
    throw new AppError('Match not found', 'NOT_FOUND', 404)
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
              avatarUrl: true,
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
 * Uses Serializable transaction for data consistency
 */
export async function saveMatchBet(input: UserMatchBetInput) {
  const startTime = Date.now()
  const parsed = userMatchBetSchema.safeParse(input)

  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message || 'Invalid input',
    }
  }

  const validated = parsed.data

  // Get the match leagueId for membership check (outside transaction)
  const matchInfo = await prisma.leagueMatch.findUnique({
    where: { id: validated.leagueMatchId, deletedAt: null },
    select: { leagueId: true },
  })

  if (!matchInfo) {
    return { success: false, error: 'Match not found' }
  }

  // Verify league membership (outside transaction)
  const { leagueUser } = await requireLeagueMember(matchInfo.leagueId)

  // Wrap database operations in Serializable transaction
  try {
    let isUpdate = false

    await prisma.$transaction(
      async (tx) => {
        // Fetch match details within transaction for consistency
        const leagueMatch = await tx.leagueMatch.findUnique({
          where: { id: validated.leagueMatchId, deletedAt: null },
          include: {
            League: { select: { sportId: true } },
            Match: {
              include: {
                LeagueTeam_Match_homeTeamIdToLeagueTeam: true,
                LeagueTeam_Match_awayTeamIdToLeagueTeam: true,
              },
            },
          },
        })

        if (!leagueMatch) {
          throw new AppError('Match not found', 'NOT_FOUND', 404)
        }

        // Check betting lock
        if (!isBettingOpen(leagueMatch.Match.dateTime)) {
          throw new AppError(
            'Betting is closed for this match',
            'BETTING_CLOSED',
            400
          )
        }

        // Validate mutual exclusivity between scorerId and noScorer
        if (validated.noScorer === true && validated.scorerId !== null) {
          throw new AppError(
            'Cannot set both scorer and no scorer',
            'VALIDATION_ERROR',
            400
          )
        }

        // Validate that noScorer can only be set for soccer matches
        if (validated.noScorer === true && leagueMatch.League.sportId !== SPORT_IDS.FOOTBALL) {
          throw new AppError(
            'No scorer option is only available for soccer matches',
            'VALIDATION_ERROR',
            400
          )
        }

        // Verify scorer belongs to one of the teams if provided
        if (validated.scorerId) {
          const scorer = await tx.leaguePlayer.findUnique({
            where: { id: validated.scorerId, deletedAt: null },
          })

          if (!scorer) {
            throw new AppError('Scorer not found', 'NOT_FOUND', 404)
          }

          const isValidScorer =
            scorer.leagueTeamId === leagueMatch.Match.homeTeamId ||
            scorer.leagueTeamId === leagueMatch.Match.awayTeamId

          if (!isValidScorer) {
            throw new AppError(
              'Scorer must belong to one of the teams playing',
              'VALIDATION_ERROR',
              400
            )
          }
        }

        // Check if bet exists to determine action type
        const existingBet = await tx.userBet.findFirst({
          where: {
            leagueMatchId: validated.leagueMatchId,
            leagueUserId: leagueUser.id,
            deletedAt: null,
          },
        })

        isUpdate = !!existingBet

        // Atomic upsert to prevent race conditions
        const now = new Date()

        if (existingBet) {
          // Update existing bet
          await tx.userBet.update({
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
          await tx.userBet.create({
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
      homeScore: validated.homeScore,
      awayScore: validated.awayScore,
      scorerId: validated.scorerId,
      noScorer: validated.noScorer,
      overtime: validated.overtime,
      homeAdvanced: validated.homeAdvanced,
    }

    if (isUpdate) {
      AuditLogger.userBetUpdated(
        leagueUser.userId,
        matchInfo.leagueId,
        validated.leagueMatchId,
        metadata,
        durationMs
      ).catch((err) => console.error('Audit log failed:', err))
    } else {
      AuditLogger.userBetCreated(
        leagueUser.userId,
        matchInfo.leagueId,
        validated.leagueMatchId,
        metadata,
        durationMs
      ).catch((err) => console.error('Audit log failed:', err))
    }

    revalidatePath(`/${matchInfo.leagueId}/matches`)
    return { success: true }
  } catch (error) {
    if (error instanceof AppError) {
      return { success: false, error: error.message }
    }
    throw error
  }
}

