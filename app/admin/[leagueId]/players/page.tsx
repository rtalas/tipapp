import { notFound } from 'next/navigation'
import { getLeagueById } from '@/actions/leagues'
import { getAllPlayers } from '@/actions/shared-queries'
import { LeaguePlayersSetup } from '@/components/admin/leagues/league-players-setup'

export default async function LeaguePlayersPage({
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

  const allPlayers = await getAllPlayers()

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Players</h1>
        <p className="text-muted-foreground">
          Manage players for {league.name} {league.seasonFrom}/{league.seasonTo}
        </p>
      </div>

      <LeaguePlayersSetup league={league} allPlayers={allPlayers} />
    </div>
  )
}
