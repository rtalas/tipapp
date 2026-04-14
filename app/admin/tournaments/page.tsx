import { Suspense } from 'react'
import { getTranslations } from 'next-intl/server'
import { getAllTournaments } from '@/actions/tournaments'
import { TournamentsContent } from '@/components/admin/tournaments/tournaments-content'
import { TableSkeleton } from '@/components/admin/common/table-skeleton'

async function TournamentsData() {
  const tournaments = await getAllTournaments()
  return <TournamentsContent tournaments={tournaments} />
}

export default async function TournamentsPage() {
  const t = await getTranslations('admin.tournaments')

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{t('title')}</h1>
        <p className="text-muted-foreground">{t('description')}</p>
      </div>

      <Suspense fallback={<TableSkeleton rows={4} columns={3} />}>
        <TournamentsData />
      </Suspense>
    </div>
  )
}
