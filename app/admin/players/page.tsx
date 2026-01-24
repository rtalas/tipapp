import { getTranslations } from 'next-intl/server'
import { getAllPlayers } from '@/actions/shared-queries'
import { PlayersContent } from '@/components/admin/players/players-content'

export default async function PlayersPage() {
  const t = await getTranslations('admin.players')
  const players = await getAllPlayers()

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{t('title')}</h1>
        <p className="text-muted-foreground">{t('description')}</p>
      </div>

      <PlayersContent players={players} />
    </div>
  )
}
