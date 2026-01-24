import { getTranslations } from 'next-intl/server'
import { getAllTeams } from '@/actions/teams'
import { getSports } from '@/actions/leagues'
import { TeamsContent } from '@/components/admin/teams/teams-content'

export default async function TeamsPage() {
  const t = await getTranslations('admin.teams')
  const [teams, sports] = await Promise.all([
    getAllTeams(),
    getSports(),
  ])

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{t('title')}</h1>
        <p className="text-muted-foreground">{t('description')}</p>
      </div>

      <TeamsContent teams={teams} sports={sports} />
    </div>
  )
}
