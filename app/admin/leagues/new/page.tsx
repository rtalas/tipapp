import { getTranslations } from 'next-intl/server'
import { getSports } from '@/actions/leagues'
import { LeagueForm } from '@/components/admin/leagues/league-form'

export default async function NewLeaguePage() {
  const t = await getTranslations('admin.leagueNew')
  const sports = await getSports()

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{t('title')}</h1>
        <p className="text-muted-foreground">
          {t('description')}
        </p>
      </div>

      <div className="max-w-2xl">
        <LeagueForm sports={sports} />
      </div>
    </div>
  )
}
