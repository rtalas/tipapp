import { Suspense } from 'react'
import { getUserSpecialBets, getSpecialBetTeams, getSpecialBetPlayers } from '@/actions/user/special-bets'
import { getUserQuestions } from '@/actions/user/questions'
import { SpecialBetsList } from '@/components/user/special-bets/special-bets-list'
import { SpecialBetsListSkeleton } from '@/components/user/special-bets/special-bets-list-skeleton'

interface SpecialBetsPageProps {
  params: Promise<{ leagueId: string }>
}

async function SpecialBetsListContent({ leagueId }: { leagueId: number }) {
  const [specialBets, teams, players, questions] = await Promise.all([
    getUserSpecialBets(leagueId),
    getSpecialBetTeams(leagueId),
    getSpecialBetPlayers(leagueId),
    getUserQuestions(leagueId),
  ])

  return (
    <SpecialBetsList
      specialBets={specialBets}
      teams={teams}
      players={players}
      questions={questions}
    />
  )
}

export default async function SpecialBetsPage({ params }: SpecialBetsPageProps) {
  const { leagueId: leagueIdParam } = await params
  const leagueId = parseInt(leagueIdParam, 10)

  return (
    <Suspense fallback={<SpecialBetsListSkeleton />}>
      <SpecialBetsListContent leagueId={leagueId} />
    </Suspense>
  )
}
