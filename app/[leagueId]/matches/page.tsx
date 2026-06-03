import type { Metadata } from 'next'
import { Suspense } from 'react'
import { getUserMatches, getUserJokerStats } from '@/actions/user/matches'
import { MatchList } from '@/components/user/matches/match-list'
import { MatchListSkeleton } from '@/components/user/matches/match-list-skeleton'

export const metadata: Metadata = { title: 'Matches' }

interface MatchesPageProps {
  params: Promise<{ leagueId: string }>
}

async function MatchListContent({ leagueId }: { leagueId: number }) {
  const [matches, jokerStats] = await Promise.all([
    getUserMatches(leagueId),
    getUserJokerStats(leagueId),
  ])
  return <MatchList matches={matches} jokerStats={jokerStats} />
}

export default async function MatchesPage({ params }: MatchesPageProps) {
  const { leagueId: leagueIdParam } = await params
  const leagueId = parseInt(leagueIdParam, 10)

  return (
    <Suspense fallback={<MatchListSkeleton />}>
      <MatchListContent leagueId={leagueId} />
    </Suspense>
  )
}
