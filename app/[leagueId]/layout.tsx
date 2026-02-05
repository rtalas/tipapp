import { redirect, notFound } from 'next/navigation'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { getLocale } from 'next-intl/server'
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

  // Auth check handled by proxy.ts
  const session = await auth()
  if (!session?.user?.id) {
    redirect('/login')
  }
  const userId = parseInt(session.user.id, 10)

  // Verify the league exists and is active, and fetch all data needed for Header
  const league = await prisma.league.findUnique({
    where: { id: leagueId, deletedAt: null, isActive: true },
    select: {
      id: true,
      name: true,
      seasonFrom: true,
      seasonTo: true,
      infoText: true,
      isChatEnabled: true,
      Sport: {
        select: {
          id: true,
          name: true,
        },
      },
    },
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

  // Fetch user details
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      username: true,
      firstName: true,
      lastName: true,
      avatarUrl: true,
      isSuperadmin: true,
    },
  })

  if (!user) {
    redirect('/login')
  }

  // Calculate badge counts for events in the next 10 hours
  const now = new Date()
  const tenHoursFromNow = new Date(now.getTime() + 10 * 60 * 60 * 1000)

  // Parallelize badge count queries and series existence check for performance
  const [
    upcomingMatchesCount,
    upcomingSeriesCount,
    upcomingSpecialBetsCount,
    upcomingQuestionsCount,
    totalSeriesCount,
  ] = await Promise.all([
    prisma.leagueMatch.count({
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
    }),
    prisma.leagueSpecialBetSerie.count({
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
    }),
    prisma.leagueSpecialBetSingle.count({
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
    }),
    prisma.leagueSpecialBetQuestion.count({
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
    }),
    // Check if there are any series in the league at all (to show/hide series tab)
    prisma.leagueSpecialBetSerie.count({
      where: {
        leagueId,
        deletedAt: null,
      },
    }),
  ])

  // Combine special bets and questions for the special tab
  const specialTabCount = upcomingSpecialBetsCount + upcomingQuestionsCount

  // Get current locale for i18n
  const locale = await getLocale()

  return (
    <UserLayout
      user={{
        id: user.id.toString(),
        username: user.username,
        firstName: user.firstName,
        lastName: user.lastName,
        avatarUrl: user.avatarUrl,
        isSuperadmin: user.isSuperadmin,
      }}
      currentLeague={{
        id: league.id,
        name: league.name,
        seasonFrom: league.seasonFrom,
        seasonTo: league.seasonTo,
        infoText: league.infoText,
        sport: league.Sport,
      }}
      badges={{
        matches: upcomingMatchesCount || undefined,
        series: upcomingSeriesCount || undefined,
        special: specialTabCount || undefined,
      }}
      isChatEnabled={league.isChatEnabled}
      hasAnySeries={totalSeriesCount > 0}
      locale={locale}
    >
      {children}
    </UserLayout>
  )
}
