'use server'

import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { joinLeagueSchema } from '@/lib/validation/user'
import { AppError, handleActionError } from '@/lib/error-handler'
import { revalidatePath } from 'next/cache'

type LeagueWithSport = {
  id: number
  name: string
  seasonFrom: number
  seasonTo: number
  sportId: number
  sport: {
    id: number
    name: string
  }
  leagueId?: number // For user leagues
}

type AllLeaguesResult = {
  userLeagues: LeagueWithSport[]
  pastLeagues: LeagueWithSport[]
  availableLeagues: LeagueWithSport[]
}

/**
 * Get all leagues for the league selector dropdown
 * Returns active leagues, past leagues where user participated, and public leagues they can join
 */
export async function getAllLeaguesForSelector(): Promise<AllLeaguesResult> {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      throw new AppError('Authentication required', 'UNAUTHORIZED', 401)
    }

    const userId = parseInt(session.user.id)

    // Get active leagues user is a member of
    const userLeagues = await prisma.leagueUser.findMany({
      where: {
        userId,
        active: true,
        deletedAt: null,
        League: {
          isActive: true,
          deletedAt: null,
        },
      },
      include: {
        League: {
          include: {
            Sport: true,
          },
        },
      },
      orderBy: {
        League: {
          seasonTo: 'desc',
        },
      },
    })

    // Get past leagues user was a member of (inactive or finished)
    const pastLeagues = await prisma.leagueUser.findMany({
      where: {
        userId,
        deletedAt: null,
        League: {
          OR: [
            { isActive: false },
            { isFinished: true },
          ],
          deletedAt: null,
        },
      },
      include: {
        League: {
          include: {
            Sport: true,
          },
        },
      },
      orderBy: {
        League: {
          seasonTo: 'desc',
        },
      },
    })

    // Get IDs of all leagues user is already a member of (active + past)
    const allUserLeagueIds = [
      ...userLeagues.map((lu) => lu.leagueId),
      ...pastLeagues.map((lu) => lu.leagueId),
    ]

    // Get public leagues user is not a member of
    const availableLeagues = await prisma.league.findMany({
      where: {
        isPublic: true,
        isActive: true,
        deletedAt: null,
        id: {
          notIn: allUserLeagueIds.length > 0 ? allUserLeagueIds : undefined,
        },
      },
      include: {
        Sport: true,
      },
      orderBy: {
        seasonTo: 'desc',
      },
    })

    // Transform user leagues to match the expected format
    const formattedUserLeagues: LeagueWithSport[] = userLeagues.map((lu) => ({
      id: lu.League.id,
      name: lu.League.name,
      seasonFrom: lu.League.seasonFrom,
      seasonTo: lu.League.seasonTo,
      sportId: lu.League.sportId,
      leagueId: lu.leagueId,
      sport: {
        id: lu.League.Sport.id,
        name: lu.League.Sport.name,
      },
    }))

    // Transform past leagues to match the expected format
    const formattedPastLeagues: LeagueWithSport[] = pastLeagues.map((lu) => ({
      id: lu.League.id,
      name: lu.League.name,
      seasonFrom: lu.League.seasonFrom,
      seasonTo: lu.League.seasonTo,
      sportId: lu.League.sportId,
      leagueId: lu.leagueId,
      sport: {
        id: lu.League.Sport.id,
        name: lu.League.Sport.name,
      },
    }))

    // Transform available leagues to match the expected format
    const formattedAvailableLeagues: LeagueWithSport[] = availableLeagues.map((league) => ({
      id: league.id,
      name: league.name,
      seasonFrom: league.seasonFrom,
      seasonTo: league.seasonTo,
      sportId: league.sportId,
      sport: {
        id: league.Sport.id,
        name: league.Sport.name,
      },
    }))

    return {
      userLeagues: formattedUserLeagues,
      pastLeagues: formattedPastLeagues,
      availableLeagues: formattedAvailableLeagues,
    }
  } catch (error) {
    throw handleActionError(error, 'Failed to load leagues')
  }
}

/**
 * Join a public league
 * Creates a LeagueUser record and revalidates the league context
 */
export async function joinLeague(leagueId: number): Promise<{ success: true; leagueId: number }> {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      throw new AppError('Authentication required', 'UNAUTHORIZED', 401)
    }

    const userId = parseInt(session.user.id)

    // Validate input
    const validated = joinLeagueSchema.parse({ leagueId })

    // Check if league exists and is valid
    const league = await prisma.league.findUnique({
      where: {
        id: validated.leagueId,
        deletedAt: null,
      },
    })

    if (!league) {
      throw new AppError('League not found', 'NOT_FOUND', 404)
    }

    if (!league.isPublic) {
      throw new AppError('This league is private', 'FORBIDDEN', 403)
    }

    if (!league.isActive) {
      throw new AppError('League is not active', 'BAD_REQUEST', 400)
    }

    // Check if user is already a member
    const existingMembership = await prisma.leagueUser.findFirst({
      where: {
        userId,
        leagueId: validated.leagueId,
        deletedAt: null,
      },
    })

    if (existingMembership) {
      throw new AppError('Already a member of this league', 'CONFLICT', 409)
    }

    // Create league membership
    const now = new Date()
    await prisma.leagueUser.create({
      data: {
        userId,
        leagueId: validated.leagueId,
        active: true,
        admin: false,
        paid: false,
        createdAt: now,
        updatedAt: now,
      },
    })

    // Revalidate league context
    revalidatePath('/[leagueId]', 'layout')

    return { success: true, leagueId: validated.leagueId }
  } catch (error) {
    throw handleActionError(error, 'Failed to join league')
  }
}
