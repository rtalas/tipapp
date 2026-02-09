import { Suspense } from 'react'
import { getTranslations } from 'next-intl/server'
import { getAllTeams } from '@/actions/teams'
import { getSports } from '@/actions/leagues'
import { TeamsContent } from '@/components/admin/teams/teams-content'
import { TableSkeleton } from '@/components/admin/common/table-skeleton'

async function TeamsData() {
  const [teams, sports] = await Promise.all([
    getAllTeams(),
    getSports(),
  ])

  return <TeamsContent teams={teams} sports={sports} />
}

export default async function TeamsPage() {
  const t = await getTranslations('admin.teams')

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{t('title')}</h1>
        <p className="text-muted-foreground">{t('description')}</p>
      </div>

      <Suspense fallback={<TableSkeleton rows={5} columns={5} />}>
        <TeamsData />
      </Suspense>
    </div>
  )
}
