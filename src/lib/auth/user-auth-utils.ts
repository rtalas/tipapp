import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { AppError } from '@/lib/error-handler'
import { parseSessionUserId } from '@/lib/auth/auth-utils'
import { AuditLogger } from '@/lib/logging/audit-logger'
import type { Session } from 'next-auth'

export interface LeagueMemberResult {
  session: Session
  leagueUser: {
    id: number
    leagueId: number
    userId: number
    admin: boolean
    active: boolean
    paid: boolean
  }
  userId: number
}

/**
 * Verifies that the current user is an active member of the specified league.
 * Does NOT require admin/superadmin access - just league membership.
 *
 * @param leagueId - The league ID to check membership for
 * @throws {AppError} If user is not authenticated or not a member of the league
 * @returns {Promise<LeagueMemberResult>} The session and league user data
 */
export async function requireLeagueMember(
  leagueId: number
): Promise<LeagueMemberResult> {
  const session = await auth()

  if (!session?.user?.id) {
    throw new AppError('Unauthorized: Login required', 'UNAUTHORIZED', 401)
  }

  const userId = parseSessionUserId(session.user.id)

  const leagueUser = await prisma.leagueUser.findFirst({
    where: {
      userId,
      leagueId,
      active: true,
      deletedAt: null,
    },
    select: {
      id: true,
      leagueId: true,
      userId: true,
      admin: true,
      active: true,
      paid: true,
    },
  })

  if (!leagueUser) {
    await AuditLogger.leagueAccessDenied(userId, leagueId)
    throw new AppError('Unauthorized: Not a member of this league', 'FORBIDDEN', 403)
  }

  return { session, leagueUser, userId }
}


/**
 * Gets all leagues the current user is a member of.
 *
 * @throws {AppError} If user is not authenticated
 * @returns {Promise<Array>} Array of leagues with user's membership info
 */
async function getUserLeagues() {
  const session = await auth()

  if (!session?.user?.id) {
    throw new AppError('Unauthorized: Login required', 'UNAUTHORIZED', 401)
  }

  const userId = parseSessionUserId(session.user.id)

  const leagueUsers = await prisma.leagueUser.findMany({
    where: {
      userId,
      active: true,
      deletedAt: null,
      League: {
        deletedAt: null,
        isActive: true,
      },
    },
    include: {
      League: {
        select: {
          id: true,
          name: true,
          seasonFrom: true,
          seasonTo: true,
          isTheMostActive: true,
          Sport: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      },
    },
    orderBy: {
      League: {
        seasonTo: 'desc',
      },
    },
  })

  return leagueUsers.map((lu) => ({
    leagueUserId: lu.id,
    leagueId: lu.League.id,
    name: lu.League.name,
    seasonFrom: lu.League.seasonFrom,
    seasonTo: lu.League.seasonTo,
    isTheMostActive: lu.League.isTheMostActive,
    sport: lu.League.Sport,
    isAdmin: lu.admin,
    isPaid: lu.paid,
  }))
}

/**
 * Gets the most active league for the current user.
 * Returns the league marked as "most active" or the most recent one.
 *
 * @throws {Error} If user is not authenticated
 * @returns {Promise<number | null>} The league ID or null if user has no leagues
 */
export async function getMostActiveLeagueId(): Promise<number | null> {
  const leagues = await getUserLeagues()

  if (leagues.length === 0) {
    return null
  }

  // First, check for the most active league
  const mostActive = leagues.find((l) => l.isTheMostActive)
  if (mostActive) {
    return mostActive.leagueId
  }

  // Otherwise, return the first (most recent by season)
  return leagues[0].leagueId
}

/**
 * Checks if a betting deadline has passed.
 *
 * @param deadline - The deadline datetime
 * @returns {boolean} True if betting is still open, false if locked
 *
 * Note: Accepts string because dates from unstable_cache are serialized to strings
 */
export function isBettingOpen(deadline: Date | string): boolean {
  const deadlineDate = deadline instanceof Date ? deadline : new Date(deadline)
  return new Date() < deadlineDate
}

