import { redirect, notFound } from 'next/navigation'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { UserLayout } from '@/components/user/layout/user-layout'

interface LeagueLayoutProps {
  children: React.ReactNode
  params: Promise<{ leagueId: string }>
}

export default async function LeagueLayout({
  children,
  params,
}: LeagueLayoutProps) {
  const { leagueId: leagueIdParam } = await params
  const leagueId = parseInt(leagueIdParam, 10)

  if (isNaN(leagueId)) {
    notFound()
  }

  // Check authentication
  const session = await auth()
  if (!session?.user?.id) {
    redirect('/login')
  }

  const userId = parseInt(session.user.id, 10)

  // Verify the league exists and is active
  const league = await prisma.league.findUnique({
    where: { id: leagueId, deletedAt: null, isActive: true },
    select: { id: true, name: true },
  })

  if (!league) {
    notFound()
  }

  // Check user is a member of this league
  const currentLeagueUser = await prisma.leagueUser.findFirst({
    where: {
      userId,
      leagueId,
      active: true,
      deletedAt: null,
    },
    select: {
      id: true,
      admin: true,
      paid: true,
    },
  })

  if (!currentLeagueUser) {
    // User is not a member of this league
    redirect('/')
  }

  // Fetch all leagues the user is a member of
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

  const leagues = leagueUsers.map((lu) => ({
    leagueUserId: lu.id,
    leagueId: lu.League.id,
    name: lu.League.name,
    seasonFrom: lu.League.seasonFrom,
    seasonTo: lu.League.seasonTo,
    isTheMostActive: lu.League.isTheMostActive,
    sport: lu.League.Sport,
    isAdmin: lu.admin ?? false,
    isPaid: lu.paid,
  }))

  // Fetch user details
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      username: true,
      firstName: true,
      lastName: true,
      isSuperadmin: true,
    },
  })

  if (!user) {
    redirect('/login')
  }

  // Calculate badge counts for events in the next 10 hours
  const now = new Date()
  const tenHoursFromNow = new Date(now.getTime() + 10 * 60 * 60 * 1000)

  // Count matches without bets in next 10 hours
  const upcomingMatchesCount = await prisma.leagueMatch.count({
    where: {
      leagueId,
      deletedAt: null,
      Match: {
        dateTime: {
          gt: now,
          lte: tenHoursFromNow,
        },
        deletedAt: null,
      },
      UserBet: {
        none: {
          leagueUserId: currentLeagueUser.id,
          deletedAt: null,
        },
      },
    },
  })

  // Count series without bets in next 10 hours
  const upcomingSeriesCount = await prisma.leagueSpecialBetSerie.count({
    where: {
      leagueId,
      deletedAt: null,
      dateTime: {
        gt: now,
        lte: tenHoursFromNow,
      },
      UserSpecialBetSerie: {
        none: {
          leagueUserId: currentLeagueUser.id,
          deletedAt: null,
        },
      },
    },
  })

  // Count special bets and questions without bets in next 10 hours
  const upcomingSpecialBetsCount = await prisma.leagueSpecialBetSingle.count({
    where: {
      leagueId,
      deletedAt: null,
      dateTime: {
        gt: now,
        lte: tenHoursFromNow,
      },
      UserSpecialBetSingle: {
        none: {
          leagueUserId: currentLeagueUser.id,
          deletedAt: null,
        },
      },
    },
  })

  const upcomingQuestionsCount = await prisma.leagueSpecialBetQuestion.count({
    where: {
      leagueId,
      deletedAt: null,
      dateTime: {
        gt: now,
        lte: tenHoursFromNow,
      },
      UserSpecialBetQuestion: {
        none: {
          leagueUserId: currentLeagueUser.id,
          deletedAt: null,
        },
      },
    },
  })

  // Combine special bets and questions for the special tab
  const specialTabCount = upcomingSpecialBetsCount + upcomingQuestionsCount

  return (
    <UserLayout
      user={{
        id: user.id.toString(),
        username: user.username,
        firstName: user.firstName,
        lastName: user.lastName,
        isSuperadmin: user.isSuperadmin,
      }}
      leagues={leagues}
      currentLeagueId={leagueId}
      badges={{
        matches: upcomingMatchesCount || undefined,
        series: upcomingSeriesCount || undefined,
        special: specialTabCount || undefined,
      }}
    >
      {children}
    </UserLayout>
  )
}
