import { getUserMatches } from '@/actions/user/matches'
import { MatchList } from '@/components/user/matches/match-list'

interface MatchesPageProps {
  params: Promise<{ leagueId: string }>
}

export default async function MatchesPage({ params }: MatchesPageProps) {
  const { leagueId: leagueIdParam } = await params
  const leagueId = parseInt(leagueIdParam, 10)

  // Fetch matches with user's bets
  // Auth is checked inside getUserMatches via requireLeagueMember
  const matches = await getUserMatches(leagueId)

  return <MatchList matches={matches} />
}
