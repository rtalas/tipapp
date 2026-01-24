import { getTranslations } from 'next-intl/server'
import { validateLeagueAccess } from '@/lib/league-utils'
import { getSeriesWithUserBets } from '@/actions/series-bets'
import { getUsers } from '@/actions/users'
import { prisma } from '@/lib/prisma'
import { SeriesContent } from '@/components/admin/series/series-content'

export default async function LeagueSeriesPage({
  params,
}: {
  params: Promise<{ leagueId: string }>
}) {
  const t = await getTranslations('admin.series')
  const { leagueId } = await params
  const league = await validateLeagueAccess(leagueId)

  const [series, leagues, specialBetSeries, users] = await Promise.all([
    getSeriesWithUserBets({ leagueId: league.id }),
    prisma.league.findMany({
      where: { id: league.id, deletedAt: null },
      include: {
        LeagueTeam: {
          where: { deletedAt: null },
          include: { Team: true },
          orderBy: { Team: { name: 'asc' } },
        },
      },
    }),
    prisma.specialBetSerie.findMany({
      where: { deletedAt: null },
      orderBy: { name: 'asc' },
    }),
    getUsers(),
  ])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{t('title')}</h1>
        <p className="text-muted-foreground">
          {t('description', {
            leagueName: league.name,
            season: `${league.seasonFrom}/${league.seasonTo}`
          })}
        </p>
      </div>

      <SeriesContent
        series={series}
        leagues={leagues}
        specialBetSeries={specialBetSeries}
        users={users}
        league={league}
      />
    </div>
  )
}
