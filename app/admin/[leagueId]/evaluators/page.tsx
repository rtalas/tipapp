import { getTranslations } from 'next-intl/server'
import { validateLeagueAccess } from '@/lib/league-utils'
import { getLeagueEvaluators } from '@/actions/evaluators'
import { getEvaluatorTypes } from '@/actions/shared-queries'
import { prisma } from '@/lib/prisma'
import { EvaluatorsContent } from '@/components/admin/evaluators/evaluators-content'

export default async function LeagueEvaluatorsPage({
  params,
}: {
  params: Promise<{ leagueId: string }>
}) {
  const { leagueId } = await params
  const league = await validateLeagueAccess(leagueId)

  const [evaluators, leagues, evaluatorTypes, t] = await Promise.all([
    getLeagueEvaluators(league.id),
    prisma.league.findMany({
      where: { id: league.id, deletedAt: null },
    }),
    getEvaluatorTypes(),
    getTranslations('admin.leagueEvaluators'),
  ])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{t('scoringRules')}</h1>
        <p className="text-muted-foreground">
          {t('description', { leagueName: league.name, season: `${league.seasonFrom}/${league.seasonTo}` })}
        </p>
      </div>

      <EvaluatorsContent
        evaluators={evaluators}
        leagues={leagues}
        evaluatorTypes={evaluatorTypes}
        league={league}
      />
    </div>
  )
}
