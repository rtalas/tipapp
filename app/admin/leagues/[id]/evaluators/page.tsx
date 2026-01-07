import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'
import { getLeagueEvaluators } from '@/actions/evaluators'
import { getLeagueById } from '@/actions/leagues'
import { getEvaluatorTypes } from '@/actions/evaluators'
import { Button } from '@/components/ui/button'
import { LeagueEvaluatorsContent } from '@/components/admin/leagues/league-evaluators-content'

interface LeagueEvaluatorsPageProps {
  params: Promise<{
    id: string
  }>
}

export default async function LeagueEvaluatorsPage({ params }: LeagueEvaluatorsPageProps) {
  const { id } = await params
  const leagueId = parseInt(id, 10)

  if (isNaN(leagueId)) {
    notFound()
  }

  const [league, evaluators, evaluatorTypes] = await Promise.all([
    getLeagueById(leagueId),
    getLeagueEvaluators(leagueId),
    getEvaluatorTypes(),
  ])

  if (!league) {
    notFound()
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/admin/leagues">
            <ChevronLeft className="h-4 w-4" />
            <span className="sr-only">Back to leagues</span>
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{league.name}</h1>
          <p className="text-muted-foreground">Manage scoring rules for this league</p>
        </div>
      </div>

      <LeagueEvaluatorsContent
        leagueId={leagueId}
        leagueName={league.name}
        evaluators={evaluators}
        evaluatorTypes={evaluatorTypes}
      />
    </div>
  )
}
