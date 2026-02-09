import { notFound } from 'next/navigation'
import Link from 'next/link'
import { getTranslations } from 'next-intl/server'
import { ChevronLeft } from 'lucide-react'
import { getLeagueEvaluators } from '@/actions/evaluators'
import { getLeagueById } from '@/actions/leagues'
import { getEvaluatorTypes } from '@/actions/shared-queries'
import { Button } from '@/components/ui/button'
import { LeagueEvaluatorsContent } from '@/components/admin/leagues/league-evaluators-content'

interface LeagueEvaluatorsPageProps {
  params: Promise<{
    id: string
  }>
}

export default async function LeagueEvaluatorsPage({ params }: LeagueEvaluatorsPageProps) {
  const t = await getTranslations('admin.leagueEvaluators')
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
            <span className="sr-only">{t('backToLeagues')}</span>
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{league.name}</h1>
          <p className="text-muted-foreground">{t('description', { leagueName: league.name, season: `${league.seasonFrom}/${league.seasonTo}` })}</p>
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
