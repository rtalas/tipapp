import { Suspense } from 'react'
import { getTranslations } from 'next-intl/server'
import { getAllPlayers } from '@/actions/shared-queries'
import { PlayersContent } from '@/components/admin/players/players-content'
import { TableSkeleton } from '@/components/admin/common/table-skeleton'

async function PlayersData() {
  const players = await getAllPlayers()
  return <PlayersContent players={players} />
}

export default async function PlayersPage() {
  const t = await getTranslations('admin.players')

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{t('title')}</h1>
        <p className="text-muted-foreground">{t('description')}</p>
      </div>

      <Suspense fallback={<TableSkeleton rows={5} columns={5} />}>
        <PlayersData />
      </Suspense>
    </div>
  )
}
