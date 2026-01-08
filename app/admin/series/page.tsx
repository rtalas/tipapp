import { getSeries } from '@/actions/series'
import { prisma } from '@/lib/prisma'
import { SeriesContent } from '@/components/admin/series/series-content'

export default async function SeriesPage() {
  const [series, leagues, specialBetSeries] = await Promise.all([
    getSeries(),
    prisma.league.findMany({
      where: { deletedAt: null, isActive: true },
      include: {
        LeagueTeam: {
          where: { deletedAt: null },
          include: { Team: true },
          orderBy: { Team: { name: 'asc' } },
        },
      },
      orderBy: { name: 'asc' },
    }),
    prisma.specialBetSerie.findMany({
      where: { deletedAt: null },
      orderBy: { name: 'asc' },
    }),
  ])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Series</h1>
        <p className="text-muted-foreground">
          Manage playoff series and best-of-7 matchups.
        </p>
      </div>

      <SeriesContent
        series={series}
        leagues={leagues}
        specialBetSeries={specialBetSeries}
      />
    </div>
  )
}
