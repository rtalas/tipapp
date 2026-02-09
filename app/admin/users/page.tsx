import { Suspense } from 'react'
import { getTranslations } from 'next-intl/server'
import { getPendingRequests, getLeagueUsers } from '@/actions/users'
import { prisma } from '@/lib/prisma'
import { UsersContent } from '@/components/admin/users/users-content'
import { TableSkeleton } from '@/components/admin/common/table-skeleton'

async function UsersData() {
  const [pendingRequests, leagueUsers, leagues] = await Promise.all([
    getPendingRequests(),
    getLeagueUsers(),
    prisma.league.findMany({
      where: { deletedAt: null },
      orderBy: { name: 'asc' },
    }),
  ])

  return (
    <UsersContent
      pendingRequests={pendingRequests}
      leagueUsers={leagueUsers}
      leagues={leagues}
    />
  )
}

export default async function UsersPage() {
  const t = await getTranslations('admin.users')

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{t('title')}</h1>
        <p className="text-muted-foreground">{t('description')}</p>
      </div>

      <Suspense fallback={<TableSkeleton rows={5} columns={6} />}>
        <UsersData />
      </Suspense>
    </div>
  )
}
