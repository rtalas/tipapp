import type { Metadata } from 'next'
import { Suspense } from 'react'
import { getTranslations } from 'next-intl/server'
import { getUserQuestions } from '@/actions/user/questions'
import { QuestionsList } from '@/components/user/questions/questions-list'
import { QuestionsListSkeleton } from '@/components/user/questions/questions-list-skeleton'

export const metadata: Metadata = { title: 'Questions' }

interface QuestionsPageProps {
  params: Promise<{ leagueId: string }>
}

async function QuestionsContent({ leagueId }: { leagueId: number }) {
  const [questions, t] = await Promise.all([
    getUserQuestions(leagueId),
    getTranslations('user.questions'),
  ])

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">{t('title')}</h1>
      <QuestionsList questions={questions} />
    </div>
  )
}

export default async function QuestionsPage({ params }: QuestionsPageProps) {
  const { leagueId: leagueIdParam } = await params
  const leagueId = parseInt(leagueIdParam, 10)

  return (
    <Suspense fallback={<QuestionsListSkeleton />}>
      <QuestionsContent leagueId={leagueId} />
    </Suspense>
  )
}
