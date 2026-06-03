'use client'

import { useState, useMemo, useCallback, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { Trophy, HelpCircle } from 'lucide-react'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { RefreshButton } from '@/components/user/common/refresh-button'
import { PullToRefresh } from '@/components/user/common/pull-to-refresh'
import { SpecialBetCard } from './special-bet-card'
import { QuestionCard } from '@/components/user/questions/question-card'
import { useRefresh } from '@/hooks/useRefresh'
import { useDateLocale } from '@/hooks/useDateLocale'
import { groupByDate, getDateLabel as getBasicDateLabel } from '@/lib/date-grouping-utils'
import { isCurrentTabEvent } from '@/lib/event-status-utils'
import { EVENT_POST_EVAL_VISIBLE_MS } from '@/lib/constants'
import type { UserSpecialBet } from '@/actions/user/special-bets'
import type { UserQuestion } from '@/actions/user/questions'

interface SpecialBetsListProps {
  specialBets: UserSpecialBet[]
  teams: Array<{ id: number; group: string | null; tournamentId: number | null; Team: { id: number; name: string; shortcut: string } }>
  players: Array<{
    id: number
    Player: { id: number; firstName: string | null; lastName: string | null; position: string | null }
    LeagueTeam: { tournamentId: number | null; Team: { shortcut: string } }
  }>
  questions: UserQuestion[]
}

type FilterType = 'current' | 'past'

export function SpecialBetsList({
  specialBets,
  teams,
  players,
  questions,
}: SpecialBetsListProps) {
  const t = useTranslations('user.specialBets')
  const tQuestions = useTranslations('user.questions')
  const tMatches = useTranslations('user.matches')
  const { isRefreshing, refresh, refreshAsync } = useRefresh()
  // SSR-safe default — see match-list.tsx.
  const [filter, setFilter] = useState<FilterType>('current')
  useEffect(() => {
    const hasCurrent =
      specialBets.some((b) => isCurrentTabEvent(b.isEvaluated, b.updatedAt, EVENT_POST_EVAL_VISIBLE_MS)) ||
      questions.some((q) => isCurrentTabEvent(q.isEvaluated, q.updatedAt, EVENT_POST_EVAL_VISIBLE_MS))
    if (!hasCurrent) setFilter('past')
  }, [specialBets, questions])
  const dateLocale = useDateLocale()

  const getDateLabel = useCallback(
    (date: Date) =>
      getBasicDateLabel(date, dateLocale, {
        today: tMatches('today'),
        tomorrow: tMatches('tomorrow'),
      }),
    [dateLocale, tMatches]
  )

  // Filter + group questions by date (independent of special bets)
  const groupedQuestions = useMemo(() => {
    const filtered = questions.filter((q) => {
      const isCurrent = isCurrentTabEvent(q.isEvaluated, new Date(q.updatedAt), EVENT_POST_EVAL_VISIBLE_MS)
      return filter === 'current' ? isCurrent : !isCurrent
    })
    const sorted = [...filtered].sort((a, b) => {
      const aTime = new Date(a.dateTime).getTime()
      const bTime = new Date(b.dateTime).getTime()
      return filter === 'past' ? bTime - aTime : aTime - bTime
    })
    return groupByDate(sorted.map((q) => ({ ...q, dateTime: new Date(q.dateTime) })))
  }, [questions, filter])

  // Filter + group special bets by date (independent of questions)
  const groupedSpecialBets = useMemo(() => {
    const filtered = specialBets.filter((b) => {
      const isCurrent = isCurrentTabEvent(b.isEvaluated, new Date(b.updatedAt), EVENT_POST_EVAL_VISIBLE_MS)
      return filter === 'current' ? isCurrent : !isCurrent
    })
    const sorted = [...filtered].sort((a, b) => {
      const aTime = new Date(a.dateTime).getTime()
      const bTime = new Date(b.dateTime).getTime()
      return filter === 'past' ? bTime - aTime : aTime - bTime
    })
    return groupByDate(sorted.map((b) => ({ ...b, dateTime: new Date(b.dateTime) })))
  }, [specialBets, filter])

  const hasAnyData = specialBets.length > 0 || questions.length > 0
  const hasQuestionsInFilter = groupedQuestions.size > 0
  const hasSpecialBetsInFilter = groupedSpecialBets.size > 0
  const hasAnythingInFilter = hasQuestionsInFilter || hasSpecialBetsInFilter

  if (!hasAnyData) {
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
              {t('title')}
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
        <div className="pt-32 space-y-8">
          {!hasAnythingInFilter ? (
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
            <>
              {/* Questions section */}
              {hasQuestionsInFilter && (
                <section className="space-y-3">
                  <div className="flex items-center gap-2 px-1">
                    <HelpCircle className="w-5 h-5 text-primary" />
                    <h3 className="text-base font-semibold text-foreground">
                      {tQuestions('title')}
                    </h3>
                  </div>
                  <div className="space-y-4">
                    {Array.from(groupedQuestions.entries()).map(([dateKey, items]) => (
                      <div key={`q-${dateKey}`} className="space-y-3">
                        <div className="flex items-center gap-3">
                          <div className="h-px flex-1 bg-border" />
                          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide px-2">
                            {getDateLabel(new Date(dateKey))}
                          </span>
                          <div className="h-px flex-1 bg-border" />
                        </div>
                        {items.map((q) => (
                          <QuestionCard key={`q-${q.id}`} question={q} onSaved={refresh} />
                        ))}
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {/* Long-term predictions section */}
              {hasSpecialBetsInFilter && (
                <section className="space-y-3">
                  <div className="flex items-center gap-2 px-1">
                    <Trophy className="w-5 h-5 text-primary" />
                    <h3 className="text-base font-semibold text-foreground">
                      {t('longTermPredictions')}
                    </h3>
                  </div>
                  <div className="space-y-4">
                    {Array.from(groupedSpecialBets.entries()).map(([dateKey, items]) => (
                      <div key={`b-${dateKey}`} className="space-y-3">
                        <div className="flex items-center gap-3">
                          <div className="h-px flex-1 bg-border" />
                          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide px-2">
                            {getDateLabel(new Date(dateKey))}
                          </span>
                          <div className="h-px flex-1 bg-border" />
                        </div>
                        {items.map((bet) => (
                          <SpecialBetCard
                            key={`bet-${bet.id}`}
                            specialBet={bet}
                            teams={teams}
                            players={players}
                            onSaved={refresh}
                          />
                        ))}
                      </div>
                    ))}
                  </div>
                </section>
              )}
            </>
          )}
        </div>
      </PullToRefresh>
    </div>
  )
}
