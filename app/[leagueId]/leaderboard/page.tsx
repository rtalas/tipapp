import { Suspense } from 'react'
import { getLeaderboard } from '@/actions/user/leaderboard'
import { LeaderboardTable } from '@/components/user/leaderboard/leaderboard-table'
import { LeaderboardSkeleton } from '@/components/user/leaderboard/leaderboard-skeleton'

interface LeaderboardPageProps {
  params: Promise<{ leagueId: string }>
}

async function LeaderboardContent({ leagueId }: { leagueId: number }) {
  const { entries, prizes, fines } = await getLeaderboard(leagueId)
  return <LeaderboardTable entries={entries} prizes={prizes} fines={fines} />
}

export default async function LeaderboardPage({ params }: LeaderboardPageProps) {
  const { leagueId: leagueIdParam } = await params
  const leagueId = parseInt(leagueIdParam, 10)

  return (
    <Suspense fallback={<LeaderboardSkeleton />}>
      <LeaderboardContent leagueId={leagueId} />
    </Suspense>
  )
}
