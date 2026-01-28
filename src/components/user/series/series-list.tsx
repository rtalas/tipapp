'use client'

import { useState, useMemo } from 'react'
import { useTranslations } from 'next-intl'
import { Swords } from 'lucide-react'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { RefreshButton } from '@/components/user/common/refresh-button'
import { PullToRefresh } from '@/components/user/common/pull-to-refresh'
import { SeriesCard } from './series-card'
import { useRefresh } from '@/hooks/useRefresh'
import { groupByDate, getDateLabel } from '@/lib/date-grouping-utils'
import type { UserSeries } from '@/actions/user/series'

interface SeriesListProps {
  series: UserSeries[]
}

type FilterType = 'current' | 'past'

export function SeriesList({ series }: SeriesListProps) {
  const t = useTranslations('user.series')
  const { isRefreshing, refresh, refreshAsync } = useRefresh()
  const [filter, setFilter] = useState<FilterType>('current')

  // Filter series
  const currentSeries = series.filter((s) => !s.isEvaluated)
  const pastSeries = series.filter((s) => s.isEvaluated)
  const displayedSeries = filter === 'current' ? currentSeries : pastSeries

  // Group by date
  const groupedSeries = useMemo(() => {
    const sorted = [...displayedSeries].sort((a, b) => {
      if (filter === 'past') {
        return new Date(b.dateTime).getTime() - new Date(a.dateTime).getTime()
      }
      return new Date(a.dateTime).getTime() - new Date(b.dateTime).getTime()
    })
    return groupByDate(sorted)
  }, [displayedSeries, filter])

  if (series.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <Swords className="mb-4 h-12 w-12 text-muted-foreground opacity-30" />
        <h3 className="text-lg font-medium">{t('noSeriesBets')}</h3>
        <p className="text-sm text-muted-foreground">
          {t('seriesPlayoffsDescription')}
        </p>
      </div>
    )
  }

  return (
    <div className="animate-fade-in">
      {/* Fixed Header */}
      <div className="fixed top-14 left-0 right-0 z-30 glass-card border-b-0 rounded-b-2xl">
        <div className="max-w-2xl mx-auto px-4 py-4 space-y-4">
          {/* Title */}
          <div className="flex items-center gap-2">
            <Swords className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-bold text-foreground">{t('title')}</h2>
          </div>

          {/* Filter tabs and refresh */}
          <div className="flex items-center justify-between gap-2">
            <Tabs
              value={filter}
              onValueChange={(v) => setFilter(v as FilterType)}
              className="w-full"
            >
              <TabsList className="grid w-full grid-cols-2 bg-secondary/50">
                <TabsTrigger value="current" className="data-[state=active]:bg-card">
                  {t('current')}
                </TabsTrigger>
                <TabsTrigger value="past" className="data-[state=active]:bg-card">
                  {t('past')}
                </TabsTrigger>
              </TabsList>
            </Tabs>

            <RefreshButton isRefreshing={isRefreshing} onRefresh={refresh} />
          </div>
        </div>
      </div>

      {/* Content with padding for fixed header */}
      <PullToRefresh onRefresh={refreshAsync}>
        <div className="pt-32 space-y-4">
        {/* Series grouped by date */}
        {displayedSeries.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <Swords className="w-12 h-12 mx-auto mb-4 opacity-30" />
            <p className="font-medium">
              {filter === 'current' ? t('noUpcoming') : t('noPast')}
            </p>
            <p className="text-sm">
              {filter === 'current'
                ? t('noCurrentSeries')
                : t('noCompletedSeries')}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {Array.from(groupedSeries.entries()).map(([dateKey, dateSeries]) => (
              <div key={dateKey} className="space-y-3">
                {/* Date Divider */}
                <div className="flex items-center gap-3">
                  <div className="h-px flex-1 bg-border" />
                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide px-2">
                    {getDateLabel(new Date(dateKey))}
                </span>
                  <div className="h-px flex-1 bg-border" />
                </div>

                {/* Series for this date */}
                {dateSeries.map((s) => (
                  <SeriesCard key={s.id} series={s} onSaved={refresh} />
                ))}
              </div>
            ))}
          </div>
        )}
        </div>
      </PullToRefresh>
    </div>
  )
}
