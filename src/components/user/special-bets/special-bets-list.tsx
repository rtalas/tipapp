'use client'

import { useState, useMemo } from 'react'
import { useTranslations } from 'next-intl'
import { Trophy } from 'lucide-react'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { RefreshButton } from '@/components/user/common/refresh-button'
import { PullToRefresh } from '@/components/user/common/pull-to-refresh'
import { SpecialBetCard } from './special-bet-card'
import { QuestionCard } from '@/components/user/questions/question-card'
import { useRefresh } from '@/hooks/useRefresh'
import { groupByDate, getDateLabel } from '@/lib/date-grouping-utils'
import type { UserSpecialBet } from '@/actions/user/special-bets'
import type { UserQuestion } from '@/actions/user/questions'

interface SpecialBetsListProps {
  specialBets: UserSpecialBet[]
  teams: Array<{ id: number; group: string | null; Team: { id: number; name: string; shortcut: string } }>
  players: Array<{
    id: number
    Player: { id: number; firstName: string | null; lastName: string | null; position: string | null }
    LeagueTeam: { Team: { shortcut: string } }
  }>
  questions: UserQuestion[]
}

type FilterType = 'current' | 'past'

// Unified item type for both special bets and questions
type UnifiedItem =
  | { type: 'specialBet'; data: UserSpecialBet; dateTime: Date; isEvaluated: boolean }
  | { type: 'question'; data: UserQuestion; dateTime: Date; isEvaluated: boolean }

export function SpecialBetsList({
  specialBets,
  teams,
  players,
  questions,
}: SpecialBetsListProps) {
  const t = useTranslations('user.specialBets')
  const { isRefreshing, refresh, refreshAsync } = useRefresh()
  const [filter, setFilter] = useState<FilterType>('current')

  // Combine special bets and questions into unified items
  const allItems: UnifiedItem[] = useMemo(() => {
    const betItems: UnifiedItem[] = specialBets.map((bet) => ({
      type: 'specialBet' as const,
      data: bet,
      dateTime: new Date(bet.dateTime),
      isEvaluated: bet.isEvaluated,
    }))

    const questionItems: UnifiedItem[] = questions.map((q) => ({
      type: 'question' as const,
      data: q,
      dateTime: new Date(q.dateTime),
      isEvaluated: q.isEvaluated,
    }))

    return [...betItems, ...questionItems]
  }, [specialBets, questions])

  // Filter items - current = not evaluated, past = evaluated
  const currentItems = allItems.filter((item) => !item.isEvaluated)
  const pastItems = allItems.filter((item) => item.isEvaluated)
  const displayedItems = filter === 'current' ? currentItems : pastItems

  // Group by date
  const groupedItems = useMemo(() => {
    const sorted = [...displayedItems].sort((a, b) => {
      if (filter === 'past') {
        return b.dateTime.getTime() - a.dateTime.getTime()
      }
      return a.dateTime.getTime() - b.dateTime.getTime()
    })
    return groupByDate(sorted)
  }, [displayedItems, filter])

  if (allItems.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <Trophy className="mb-4 h-12 w-12 text-muted-foreground opacity-30" />
        <h3 className="text-lg font-medium">{t('noSpecialBets')}</h3>
        <p className="text-sm text-muted-foreground">
          {t('specialBetsWillAppear')}
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
            <Trophy className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-bold text-foreground">
              {t('longTermPredictions')}
            </h2>
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

        {/* Items grouped by date */}
        {displayedItems.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <Trophy className="w-12 h-12 mx-auto mb-4 opacity-30" />
            <p className="font-medium">
              {filter === 'current' ? t('noUpcomingBets') : t('noPastBets')}
            </p>
            <p className="text-sm">
              {filter === 'current'
                ? t('specialBetsWillAppear')
                : t('noCompletedBets')}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {Array.from(groupedItems.entries()).map(([dateKey, dateItems]) => (
              <div key={dateKey} className="space-y-3">
                {/* Date Divider */}
                <div className="flex items-center gap-3">
                  <div className="h-px flex-1 bg-border" />
                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide px-2">
                    {getDateLabel(new Date(dateKey))}
                  </span>
                  <div className="h-px flex-1 bg-border" />
                </div>

                {/* Items for this date */}
                {dateItems.map((item) =>
                  item.type === 'specialBet' ? (
                    <SpecialBetCard
                      key={`bet-${item.data.id}`}
                      specialBet={item.data}
                      teams={teams}
                      players={players}
                      onSaved={refresh}
                    />
                  ) : (
                    <QuestionCard
                      key={`q-${item.data.id}`}
                      question={item.data}
                      onSaved={refresh}
                    />
                  )
                )}
              </div>
            ))}
          </div>
        )}
        </div>
      </PullToRefresh>
    </div>
  )
}
