import { getAllSeriesTypes } from '@/actions/series-types'
import { SeriesTypesContent } from '@/components/admin/series-types/series-types-content'

export default async function SeriesTypesPage() {
  const seriesTypes = await getAllSeriesTypes()

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Series Types</h1>
        <p className="text-muted-foreground">Manage global series templates</p>
      </div>

      <SeriesTypesContent seriesTypes={seriesTypes} />
    </div>
  )
}
