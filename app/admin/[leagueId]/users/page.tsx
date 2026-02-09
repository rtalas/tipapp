import { Suspense } from 'react'
import { getTranslations } from 'next-intl/server'
import { validateLeagueAccess } from '@/lib/league-utils'
import { getPendingRequests, getLeagueUsers } from '@/actions/users'
import { prisma } from '@/lib/prisma'
import { UsersContent } from '@/components/admin/users/users-content'
import { TableSkeleton } from '@/components/admin/common/table-skeleton'

async function LeagueUsersData({ league }: { league: { id: number; name: string; seasonFrom: number; seasonTo: number } }) {
  const [pendingRequests, leagueUsers, leagues] = await Promise.all([
    getPendingRequests({ leagueId: league.id }),
    getLeagueUsers({ leagueId: league.id }),
    prisma.league.findMany({
      where: { id: league.id, deletedAt: null },
    }),
  ])

  return (
    <UsersContent
      pendingRequests={pendingRequests}
      leagueUsers={leagueUsers}
      leagues={leagues}
      league={league}
    />
  )
}

export default async function LeagueUsersPage({
  params,
}: {
  params: Promise<{ leagueId: string }>
}) {
  const t = await getTranslations('admin.users')
  const { leagueId } = await params
  const league = await validateLeagueAccess(leagueId)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{t('title')}</h1>
        <p className="text-muted-foreground">
          {t('descriptionLeague', {
            leagueName: league.name,
            season: `${league.seasonFrom}/${league.seasonTo}`
          })}
        </p>
      </div>

      <Suspense fallback={<TableSkeleton rows={5} columns={5} />}>
        <LeagueUsersData league={league} />
      </Suspense>
    </div>
  )
}
