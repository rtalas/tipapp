import { getLeaderboard } from '@/actions/user/leaderboard'
import { LeaderboardTable } from '@/components/user/leaderboard/leaderboard-table'

interface LeaderboardPageProps {
  params: Promise<{ leagueId: string }>
}

export default async function LeaderboardPage({ params }: LeaderboardPageProps) {
  const { leagueId: leagueIdParam } = await params
  const leagueId = parseInt(leagueIdParam, 10)

  const { entries, prizes } = await getLeaderboard(leagueId)

  return <LeaderboardTable entries={entries} prizes={prizes} />
}
