import { getUserQuestions } from '@/actions/user/questions'
import { QuestionsList } from '@/components/user/questions/questions-list'

interface QuestionsPageProps {
  params: Promise<{ leagueId: string }>
}

export default async function QuestionsPage({ params }: QuestionsPageProps) {
  const { leagueId: leagueIdParam } = await params
  const leagueId = parseInt(leagueIdParam, 10)

  const questions = await getUserQuestions(leagueId)

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">Questions</h1>
      <QuestionsList questions={questions} />
    </div>
  )
}
