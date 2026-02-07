import { redirect, notFound } from 'next/navigation'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { getLocale } from 'next-intl/server'
import { UserLayout } from '@/components/user/layout/user-layout'
import { getBetBadges, getChatBadge } from '@/lib/cache/badge-counts'

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
      lastChatReadAt: true,
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

  // Get badge counts (15 min cache for bet dateTimes, 60s for chat)
  const [betBadges, chatBadge] = await Promise.all([
    getBetBadges(leagueId, currentLeagueUser.id),
    league.isChatEnabled
      ? getChatBadge(
          leagueId,
          currentLeagueUser.id,
          currentLeagueUser.lastChatReadAt ?? null
        )
      : Promise.resolve({ unread: 0 }),
  ])

  // Combine special bets and questions for the special tab
  const specialTabCount = betBadges.specialBets + betBadges.questions

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
        matches: betBadges.matches || undefined,
        series: betBadges.series || undefined,
        special: specialTabCount || undefined,
        chat: chatBadge.unread || undefined,
      }}
      isChatEnabled={league.isChatEnabled}
      hasAnySeries={betBadges.totalSeries > 0}
      locale={locale}
    >
      {children}
    </UserLayout>
  )
}
