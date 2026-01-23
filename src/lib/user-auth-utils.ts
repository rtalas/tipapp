import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { AppError } from '@/lib/error-handler'
import type { Session } from 'next-auth'

export interface LeagueMemberResult {
  session: Session
  leagueUser: {
    id: number
    leagueId: number
    userId: number
    admin: boolean | null
    active: boolean | null
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

  const userId = parseInt(session.user.id, 10)

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

  const userId = parseInt(session.user.id, 10)

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
 */
export function isBettingOpen(deadline: Date): boolean {
  return new Date() < deadline
}

