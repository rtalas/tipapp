import { notFound } from 'next/navigation'
import { getTranslations } from 'next-intl/server'
import { getLeagueById } from '@/actions/leagues'
import { getTeamsBySport, getAllPlayers } from '@/actions/shared-queries'
import { LeagueSetupTabs } from '@/components/admin/leagues/league-setup-tabs'

interface LeagueSetupPageProps {
  params: Promise<{ id: string }>
}

export default async function LeagueSetupPage({ params }: LeagueSetupPageProps) {
  const t = await getTranslations('admin.leagueSetup')
  const { id } = await params
  const leagueId = parseInt(id, 10)

  if (isNaN(leagueId)) {
    notFound()
  }

  const league = await getLeagueById(leagueId)

  if (!league) {
    notFound()
  }

  // Get available teams for this sport
  const availableTeams = await getTeamsBySport(league.sportId)
  const allPlayers = await getAllPlayers()

  // Filter out already assigned teams
  const assignedTeamIds = new Set(league.LeagueTeam.map((lt) => lt.teamId))
  const unassignedTeams = availableTeams.filter((t) => !assignedTeamIds.has(t.id))

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{league.name}</h1>
        <p className="text-muted-foreground">
          {t('description')}
        </p>
      </div>

      <LeagueSetupTabs
        league={league}
        availableTeams={unassignedTeams}
        allPlayers={allPlayers}
      />
    </div>
  )
}
