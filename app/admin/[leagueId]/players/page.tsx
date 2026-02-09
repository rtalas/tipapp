import { Suspense } from 'react'
import { notFound } from 'next/navigation'
import { getTranslations } from 'next-intl/server'
import { getLeagueById } from '@/actions/leagues'
import { getAllPlayers } from '@/actions/shared-queries'
import { LeaguePlayersSetup } from '@/components/admin/leagues/league-players-setup'
import { CardListSkeleton } from '@/components/admin/common/table-skeleton'

async function LeaguePlayersData({ leagueId }: { leagueId: number }) {
  const league = await getLeagueById(leagueId)

  if (!league) {
    notFound()
  }

  const allPlayers = await getAllPlayers()

  return <LeaguePlayersSetup league={league} allPlayers={allPlayers} />
}

export default async function LeaguePlayersPage({
  params,
}: {
  params: Promise<{ leagueId: string }>
}) {
  const t = await getTranslations('admin.leaguePlayers')
  const { leagueId } = await params
  const id = parseInt(leagueId, 10)

  if (isNaN(id)) {
    notFound()
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{t('title')}</h1>
        <p className="text-muted-foreground">{t('description')}</p>
      </div>

      <Suspense fallback={<CardListSkeleton rows={5} />}>
        <LeaguePlayersData leagueId={id} />
      </Suspense>
    </div>
  )
}
