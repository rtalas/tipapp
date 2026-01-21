import { getUserSeries } from '@/actions/user/series'
import { SeriesList } from '@/components/user/series/series-list'

interface SeriesPageProps {
  params: Promise<{ leagueId: string }>
}

export default async function SeriesPage({ params }: SeriesPageProps) {
  const { leagueId: leagueIdParam } = await params
  const leagueId = parseInt(leagueIdParam, 10)

  const series = await getUserSeries(leagueId)

  return <SeriesList series={series} />
}
