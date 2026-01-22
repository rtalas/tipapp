import { getMatchPhases } from '@/actions/match-phases'
import { MatchPhasesContent } from '@/components/admin/match-phases/match-phases-content'

export default async function MatchPhasesPage() {
  const phases = await getMatchPhases()

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Match Phases</h1>
        <p className="text-muted-foreground">Manage tournament phases and rounds</p>
      </div>

      <MatchPhasesContent initialPhases={phases} />
    </div>
  )
}
