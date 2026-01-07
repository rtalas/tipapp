import { getSports } from '@/actions/leagues'
import { LeagueForm } from '@/components/admin/leagues/league-form'

export default async function NewLeaguePage() {
  const sports = await getSports()

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Create League</h1>
        <p className="text-muted-foreground">
          Set up a new prediction league for your friends
        </p>
      </div>

      <div className="max-w-2xl">
        <LeagueForm sports={sports} />
      </div>
    </div>
  )
}
