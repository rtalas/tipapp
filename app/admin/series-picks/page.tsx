import { getSeriesWithUserBets } from '@/actions/series-bets'
import { prisma } from '@/lib/prisma'
import { SeriesPicksContent } from '@/components/admin/series-picks/series-picks-content'

export default async function SeriesPicksPage() {
  const [series, leagues, users] = await Promise.all([
    getSeriesWithUserBets(),
    prisma.league.findMany({
      where: { deletedAt: null, isActive: true },
      orderBy: { name: 'asc' },
    }),
    prisma.user.findMany({
      where: { deletedAt: null },
      orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
      select: {
        id: true,
        firstName: true,
        lastName: true,
        username: true,
      },
    }),
  ])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Series Picks</h1>
        <p className="text-muted-foreground">
          View and manage all user predictions for playoff series.
        </p>
      </div>

      <SeriesPicksContent series={series} leagues={leagues} users={users} />
    </div>
  )
}
