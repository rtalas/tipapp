'use client'

import * as React from 'react'
import {
  format,
  isThisWeek,
  compareAsc,
} from 'date-fns'
import { Calendar } from 'lucide-react'
import { groupByDate, getDateLabel as getBasicDateLabel } from '@/lib/date-grouping-utils'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { MatchCard } from './match-card'
import { RefreshButton } from '@/components/user/common/refresh-button'
import { PullToRefresh } from '@/components/user/common/pull-to-refresh'
import { useRefresh } from '@/hooks/useRefresh'
import type { UserMatch } from '@/actions/user/matches'

interface MatchListProps {
  matches: UserMatch[]
}

type FilterType = 'upcoming' | 'past'

// Extended date label for match list (includes "this week" check)
function getDateLabel(date: Date): string {
  const basicLabel = getBasicDateLabel(date)
  // If it's today or tomorrow, use basic label
  if (basicLabel === 'Today' || basicLabel === 'Tomorrow') {
    return basicLabel
  }
  // For this week, show just the day name
  if (isThisWeek(date)) {
    return format(date, 'EEEE') // Day name
  }
  return basicLabel
}

export function MatchList({ matches }: MatchListProps) {
  const { isRefreshing, refresh, refreshAsync } = useRefresh()
  const [filter, setFilter] = React.useState<FilterType>('upcoming')

  // Filter matches based on selected tab
  const filteredMatches = React.useMemo(() => {
    const now = new Date()

    if (filter === 'upcoming') {
      return matches.filter((m) => m.Match.dateTime > now)
    }
    return matches.filter((m) => m.Match.dateTime <= now)
  }, [matches, filter])

  // Sort matches: upcoming ones ascending, past ones descending
  const sortedMatches = React.useMemo(() => {
    return [...filteredMatches].sort((a, b) => {
      const aDate = a.Match.dateTime
      const bDate = b.Match.dateTime

      if (filter === 'upcoming') {
        return compareAsc(aDate, bDate)
      }
      return compareAsc(bDate, aDate) // Descending for past
    })
  }, [filteredMatches, filter])

  // Group by date
  const groupedMatches = React.useMemo(
    () => groupByDate(sortedMatches, (m) => m.Match.dateTime),
    [sortedMatches]
  )

  return (
    <div className="animate-fade-in">
      {/* Fixed Header */}
      <div className="fixed top-14 left-0 right-0 z-30 glass-card border-b-0 rounded-b-2xl">
        <div className="max-w-2xl mx-auto px-4 py-4 space-y-4">
          {/* Title */}
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-bold text-foreground">Matches</h2>
          </div>

          {/* Filter tabs and refresh */}
          <div className="flex items-center justify-between gap-2">
            <Tabs
              value={filter}
              onValueChange={(v) => setFilter(v as FilterType)}
              className="w-full"
            >
              <TabsList className="grid w-full grid-cols-2 bg-secondary/50">
                <TabsTrigger value="upcoming" className="relative data-[state=active]:bg-card">
                  Current & Upcoming
                </TabsTrigger>
                <TabsTrigger value="past" className="data-[state=active]:bg-card">
                  Past
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
        {/* Match groups */}
        {sortedMatches.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Calendar className="mb-4 h-12 w-12 text-muted-foreground opacity-30" />
            <h3 className="text-lg font-medium">No matches found</h3>
            <p className="text-sm text-muted-foreground">
              {filter === 'upcoming'
                ? 'No upcoming matches to bet on'
                : 'No past matches'}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {Array.from(groupedMatches.entries()).map(([dateKey, dateMatches]) => (
              <div key={dateKey} className="space-y-3">
                {/* Date Divider */}
                <div className="flex items-center gap-3">
                  <div className="h-px flex-1 bg-border" />
                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide px-2">
                    {getDateLabel(new Date(dateKey))}
                  </span>
                  <div className="h-px flex-1 bg-border" />
                </div>

                {/* Matches for this date */}
                {dateMatches.map((match) => (
                  <MatchCard
                    key={match.id}
                    match={match}
                    onBetSaved={refresh}
                  />
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
