import { Suspense } from 'react'
import { notFound } from 'next/navigation'
import { getTranslations } from 'next-intl/server'
import { getLeagueById } from '@/actions/leagues'
import { getTeamsBySport } from '@/actions/shared-queries'
import { LeagueTeamsSetup } from '@/components/admin/leagues/league-teams-setup'
import { CardListSkeleton } from '@/components/admin/common/table-skeleton'

async function LeagueTeamsData({ leagueId }: { leagueId: number }) {
  const league = await getLeagueById(leagueId)

  if (!league) {
    notFound()
  }

  const availableTeams = await getTeamsBySport(league.sportId)
  const assignedTeamIds = new Set(league.LeagueTeam.map((lt) => lt.teamId))
  const unassignedTeams = availableTeams.filter((t) => !assignedTeamIds.has(t.id))

  return <LeagueTeamsSetup league={league} availableTeams={unassignedTeams} />
}

export default async function LeagueTeamsPage({
  params,
}: {
  params: Promise<{ leagueId: string }>
}) {
  const t = await getTranslations('admin.teams')
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
        <LeagueTeamsData leagueId={id} />
      </Suspense>
    </div>
  )
}
