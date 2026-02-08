import type { Metadata } from 'next'
import { Suspense } from 'react'
import { getUserSeries } from '@/actions/user/series'
import { SeriesList } from '@/components/user/series/series-list'
import { SeriesListSkeleton } from '@/components/user/series/series-list-skeleton'

export const metadata: Metadata = { title: 'Series' }

interface SeriesPageProps {
  params: Promise<{ leagueId: string }>
}

async function SeriesListContent({ leagueId }: { leagueId: number }) {
  const series = await getUserSeries(leagueId)
  return <SeriesList series={series} />
}

export default async function SeriesPage({ params }: SeriesPageProps) {
  const { leagueId: leagueIdParam } = await params
  const leagueId = parseInt(leagueIdParam, 10)

  return (
    <Suspense fallback={<SeriesListSkeleton />}>
      <SeriesListContent leagueId={leagueId} />
    </Suspense>
  )
}
