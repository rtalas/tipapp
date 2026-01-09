import { validateLeagueAccess } from '@/lib/league-utils'
import { getQuestionsWithUserBets } from '@/actions/question-bets'
import { getUsers } from '@/actions/users'
import { QuestionsContent } from '@/components/admin/questions/questions-content'

export default async function LeagueQuestionsPage({
  params,
}: {
  params: Promise<{ leagueId: string }>
}) {
  const { leagueId } = await params
  const league = await validateLeagueAccess(leagueId)

  const [questions, users] = await Promise.all([
    getQuestionsWithUserBets({ leagueId: league.id }),
    getUsers(),
  ])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Questions</h1>
        <p className="text-muted-foreground">
          Questions in {league.name} {league.seasonFrom}/{league.seasonTo}
        </p>
      </div>

      <QuestionsContent
        questions={questions}
        users={users}
        league={league}
      />
    </div>
  )
}
