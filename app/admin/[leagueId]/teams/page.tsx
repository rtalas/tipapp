import { notFound } from 'next/navigation'
import { getLeagueById } from '@/actions/leagues'
import { getTeamsBySport } from '@/actions/shared-queries'
import { LeagueTeamsSetup } from '@/components/admin/leagues/league-teams-setup'

export default async function LeagueTeamsPage({
  params,
}: {
  params: Promise<{ leagueId: string }>
}) {
  const { leagueId } = await params
  const id = parseInt(leagueId, 10)

  if (isNaN(id)) {
    notFound()
  }

  const league = await getLeagueById(id)

  if (!league) {
    notFound()
  }

  // Get available teams for this sport
  const availableTeams = await getTeamsBySport(league.sportId)

  // Filter out already assigned teams
  const assignedTeamIds = new Set(league.LeagueTeam.map((lt) => lt.teamId))
  const unassignedTeams = availableTeams.filter((t) => !assignedTeamIds.has(t.id))

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Teams</h1>
        <p className="text-muted-foreground">
          Manage teams for {league.name} {league.seasonFrom}/{league.seasonTo}
        </p>
      </div>

      <LeagueTeamsSetup league={league} availableTeams={unassignedTeams} />
    </div>
  )
}
