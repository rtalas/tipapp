import { getTranslations } from 'next-intl/server'
import { getMatchPhases } from '@/actions/match-phases'
import { MatchPhasesContent } from '@/components/admin/match-phases/match-phases-content'

export default async function MatchPhasesPage() {
  const t = await getTranslations('admin.matchPhases')
  const phases = await getMatchPhases()

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{t('title')}</h1>
        <p className="text-muted-foreground">{t('description')}</p>
      </div>

      <MatchPhasesContent initialPhases={phases} />
    </div>
  )
}
