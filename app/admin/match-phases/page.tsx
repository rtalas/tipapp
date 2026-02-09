import { Suspense } from 'react'
import { getTranslations } from 'next-intl/server'
import { getMatchPhases } from '@/actions/match-phases'
import { MatchPhasesContent } from '@/components/admin/match-phases/match-phases-content'
import { TableSkeleton } from '@/components/admin/common/table-skeleton'

async function MatchPhasesData() {
  const phases = await getMatchPhases()
  return <MatchPhasesContent initialPhases={phases} />
}

export default async function MatchPhasesPage() {
  const t = await getTranslations('admin.matchPhases')

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{t('title')}</h1>
        <p className="text-muted-foreground">{t('description')}</p>
      </div>

      <Suspense fallback={<TableSkeleton rows={3} columns={4} />}>
        <MatchPhasesData />
      </Suspense>
    </div>
  )
}
