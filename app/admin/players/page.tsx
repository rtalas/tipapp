import { getAllPlayers } from '@/actions/players'
import { PlayersContent } from '@/components/admin/players/players-content'

export default async function PlayersPage() {
  const players = await getAllPlayers()

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Players</h1>
        <p className="text-muted-foreground">Manage players across all leagues</p>
      </div>

      <PlayersContent players={players} />
    </div>
  )
}
