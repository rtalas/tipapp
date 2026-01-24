import { getTranslations } from 'next-intl/server'
import { getAllSeriesTypes } from '@/actions/series-types'
import { SeriesTypesContent } from '@/components/admin/series-types/series-types-content'

export default async function SeriesTypesPage() {
  const t = await getTranslations('admin.seriesTypes')
  const seriesTypes = await getAllSeriesTypes()

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{t('title')}</h1>
        <p className="text-muted-foreground">{t('description')}</p>
      </div>

      <SeriesTypesContent seriesTypes={seriesTypes} />
    </div>
  )
}
