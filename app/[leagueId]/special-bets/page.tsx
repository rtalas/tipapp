import { getUserSpecialBets, getSpecialBetTeams, getSpecialBetPlayers } from '@/actions/user/special-bets'
import { getUserQuestions } from '@/actions/user/questions'
import { SpecialBetsList } from '@/components/user/special-bets/special-bets-list'

interface SpecialBetsPageProps {
  params: Promise<{ leagueId: string }>
}

export default async function SpecialBetsPage({ params }: SpecialBetsPageProps) {
  const { leagueId: leagueIdParam } = await params
  const leagueId = parseInt(leagueIdParam, 10)

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
