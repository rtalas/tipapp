import { getTranslations } from 'next-intl/server'
import { getAllSpecialBetTypes, getSpecialBetSingleTypes } from '@/actions/special-bet-types'
import { getSports } from '@/actions/leagues'
import { SpecialBetTypesContent } from '@/components/admin/special-bet-types/special-bet-types-content'

export default async function SpecialBetTypesPage() {
  const t = await getTranslations('admin.specialBetTypes')
  const [specialBetTypes, sports, betTypes] = await Promise.all([
    getAllSpecialBetTypes(),
    getSports(),
    getSpecialBetSingleTypes(),
  ])

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{t('title')}</h1>
        <p className="text-muted-foreground">{t('description')}</p>
      </div>

      <SpecialBetTypesContent
        specialBetTypes={specialBetTypes}
        sports={sports}
        betTypes={betTypes}
      />
    </div>
  )
}
