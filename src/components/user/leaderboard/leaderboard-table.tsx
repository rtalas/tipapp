'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { useTranslations } from 'next-intl'
import { Trophy, CheckCircle2 } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { RefreshButton } from '@/components/user/common/refresh-button'
import { PullToRefresh } from '@/components/user/common/pull-to-refresh'
import { UserAvatar } from '@/components/common/user-avatar'
import { useRefresh } from '@/hooks/useRefresh'
import { cn } from '@/lib/utils'
import type { LeaderboardEntry } from '@/types/user'
import type {
  LeaguePrize,
  UserPicksData,
} from '@/actions/user/leaderboard'
import { getUserPicks } from '@/actions/user/leaderboard'
import { useParams } from 'next/navigation'

interface LeaderboardTableProps {
  entries: LeaderboardEntry[]
  prizes: LeaguePrize[]
  fines: LeaguePrize[]
}

export function LeaderboardTable({ entries, prizes, fines }: LeaderboardTableProps) {
  const t = useTranslations('user.leaderboard')
  const { isRefreshing, refresh, refreshAsync } = useRefresh()
  const params = useParams()
  const leagueId = parseInt(params.leagueId as string, 10)
  const [selectedUser, setSelectedUser] = useState<LeaderboardEntry | null>(
    null
  )
  const [userPicks, setUserPicks] = useState<UserPicksData | null>(null)
  const [isLoadingPicks, setIsLoadingPicks] = useState(false)

  const handleSelectUser = useCallback((entry: LeaderboardEntry | null) => {
    setSelectedUser(entry)
    if (entry) {
      setIsLoadingPicks(true)
      setUserPicks(null)
    } else {
      setUserPicks(null)
    }
  }, [])

  // Fetch picks when user is selected
  useEffect(() => {
    if (!selectedUser) return
    let cancelled = false
    getUserPicks(leagueId, selectedUser.leagueUserId)
      .then((data) => { if (!cancelled) setUserPicks(data) })
      .catch((error) => {
        console.error('Failed to fetch user picks:', error)
        if (!cancelled) setUserPicks(null)
      })
      .finally(() => { if (!cancelled) setIsLoadingPicks(false) })
    return () => { cancelled = true }
  }, [selectedUser, leagueId])

  if (entries.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <Trophy className="mb-4 h-12 w-12 text-muted-foreground opacity-30" />
        <h3 className="text-lg font-medium">{t('noRankings')}</h3>
        <p className="text-sm text-muted-foreground">
          {t('description')}
        </p>
      </div>
    )
  }

  // Determine which ranks have prizes and fines
  const maxPrizeRank = prizes.length > 0 ? Math.max(...prizes.map(p => p.rank)) : 0
  const maxFineRank = fines.length > 0 ? Math.max(...fines.map(f => f.rank)) : 0

  // Split entries into three groups
  const prizeEntries = entries.filter((e) => e.rank <= maxPrizeRank)
  const fineEntries = entries.filter((e) => {
    const positionFromBottom = entries.length - e.rank + 1
    return positionFromBottom <= maxFineRank
  })
  const middleEntries = entries.filter((e) => {
    const positionFromBottom = entries.length - e.rank + 1
    return e.rank > maxPrizeRank && positionFromBottom > maxFineRank
  })

  return (
    <>
      <div className="animate-fade-in">
        {/* Fixed Header */}
        <div className="fixed top-14 left-0 right-0 z-30 glass-card border-b-0 rounded-b-2xl">
          <div className="max-w-2xl mx-auto px-4 py-4">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Trophy className="w-5 h-5 text-primary" />
                <h2 className="text-lg font-bold text-foreground">{t('title')}</h2>
              </div>
              <RefreshButton isRefreshing={isRefreshing} onRefresh={refresh} />
            </div>
          </div>
        </div>

        {/* Content with padding for fixed header */}
        <PullToRefresh onRefresh={refreshAsync}>
          <div className="pt-32 space-y-4">
            {/* Prize winners */}
            {prizeEntries.length > 0 && (
              <div className="glass-card rounded-xl divide-y divide-border/50">
                {prizeEntries.map((entry, index) => (
                  <RankingRow
                    key={entry.leagueUserId}
                    entry={entry}
                    index={index}
                    prizes={prizes}
                    fines={fines}
                    totalEntries={entries.length}
                    onClick={() => handleSelectUser(entry)}
                  />
                ))}
              </div>
            )}

            {/* Middle (no prize or fine) */}
            {middleEntries.length > 0 && (
              <div className="glass-card rounded-xl divide-y divide-border/50">
                {middleEntries.map((entry, index) => (
                  <RankingRow
                    key={entry.leagueUserId}
                    entry={entry}
                    index={index + prizeEntries.length}
                    prizes={prizes}
                    fines={fines}
                    totalEntries={entries.length}
                    onClick={() => handleSelectUser(entry)}
                  />
                ))}
              </div>
            )}

            {/* Fined players */}
            {fineEntries.length > 0 && (
              <div className="glass-card rounded-xl divide-y divide-border/50">
                {fineEntries.map((entry, index) => (
                  <RankingRow
                    key={entry.leagueUserId}
                    entry={entry}
                    index={index + prizeEntries.length + middleEntries.length}
                    prizes={prizes}
                    fines={fines}
                    totalEntries={entries.length}
                    onClick={() => handleSelectUser(entry)}
                  />
                ))}
              </div>
            )}
          </div>
        </PullToRefresh>
      </div>

      {/* User History Modal */}
      <Dialog open={!!selectedUser} onOpenChange={() => handleSelectUser(null)}>
        <DialogContent className="sm:max-w-md bg-card border-border">
          <DialogHeader>
            <div className="flex items-center gap-3">
              {selectedUser && (
                <>
                  <UserAvatar
                    avatarUrl={selectedUser.avatarUrl}
                    firstName={selectedUser.firstName}
                    lastName={selectedUser.lastName}
                    username={selectedUser.username}
                    size="lg"
                    className="ring-2 ring-primary"
                  />
                  <div>
                    <DialogTitle>
                      {getDisplayName(
                        selectedUser.firstName,
                        selectedUser.lastName,
                        selectedUser.username
                      )}
                    </DialogTitle>
                    <DialogDescription>
                      {selectedUser.totalPoints} {t('points')} · {t('rankNumber', { rank: selectedUser.rank })}
                    </DialogDescription>
                  </div>
                </>
              )}
            </div>
          </DialogHeader>
          <div className="mt-4">
            {isLoadingPicks ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : userPicks ? (
              <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
                {/* Matches */}
                {userPicks.matches.length > 0 && (
                  <div className="space-y-2">
                    <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                      {t('matchPredictions')} ({userPicks.matches.length})
                    </h3>
                    <div className="space-y-2">
                      {userPicks.matches.map((match) => (
                        <div
                          key={match.id}
                          className={cn(
                            'p-3 rounded-lg bg-secondary/30 border',
                            match.totalPoints > 0
                              ? 'border-green-500/30'
                              : 'border-transparent'
                          )}
                        >
                          <div className="flex items-start justify-between gap-2 mb-1">
                            <div className="flex-1">
                              <span className="text-xs font-medium text-foreground">
                                {match.matchName}
                              </span>
                              {match.isEvaluated && match.actualHomeScore !== null && match.actualAwayScore !== null && (
                                <span className="text-xs font-semibold text-foreground ml-2">
                                  ({match.actualHomeScore}:{match.actualAwayScore}
                                  {match.actualOvertime && ' OT'})
                                </span>
                              )}
                            </div>
                            <span
                              className={cn(
                                'text-xs font-bold shrink-0',
                                match.totalPoints > 0
                                  ? 'text-green-500'
                                  : 'text-muted-foreground'
                              )}
                            >
                              {match.totalPoints > 0 ? '+' : ''}
                              {match.totalPoints}
                            </span>
                          </div>

                          {/* User's Prediction */}
                          <div className="flex items-center gap-2 text-xs">
                            <span className="text-muted-foreground">Tip:</span>
                            <span className="font-mono font-medium">
                              {match.homeScore}:{match.awayScore}
                              {match.overtime && ' (OT)'}
                            </span>
                            {match.scorerName && (
                              <>
                                <span className="text-muted-foreground">•</span>
                                <span className="flex items-center gap-1">
                                  {match.scorerName}
                                  {match.scorerCorrect && (
                                    <CheckCircle2 className="w-3.5 h-3.5 text-green-500 inline-block" />
                                  )}
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Series */}
                {userPicks.series.length > 0 && (
                  <div className="space-y-2">
                    <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                      {t('seriesPredictions')} ({userPicks.series.length})
                    </h3>
                    <div className="space-y-2">
                      {userPicks.series.map((series) => (
                        <div
                          key={series.id}
                          className={cn(
                            'p-3 rounded-lg bg-secondary/30 border',
                            series.totalPoints > 0
                              ? 'border-green-500/30'
                              : 'border-transparent'
                          )}
                        >
                          <div className="flex items-start justify-between gap-2 mb-1">
                            <div className="flex-1">
                              <span className="text-xs font-medium text-foreground">
                                {series.seriesName}
                              </span>
                              {series.isEvaluated && series.actualHomeScore !== null && series.actualAwayScore !== null && (
                                <span className="text-xs font-semibold text-foreground ml-2">
                                  ({series.actualHomeScore}:{series.actualAwayScore})
                                </span>
                              )}
                            </div>
                            <span
                              className={cn(
                                'text-xs font-bold shrink-0',
                                series.totalPoints > 0
                                  ? 'text-green-500'
                                  : 'text-muted-foreground'
                              )}
                            >
                              {series.totalPoints > 0 ? '+' : ''}
                              {series.totalPoints}
                            </span>
                          </div>

                          {/* User's Prediction */}
                          {series.homeScore !== null && series.awayScore !== null && (
                            <div className="flex items-center gap-2 text-xs">
                              <span className="text-muted-foreground">Tip:</span>
                              <span className="font-mono font-medium">
                                {series.homeScore}:{series.awayScore}
                              </span>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Special Bets */}
                {userPicks.specialBets.length > 0 && (
                  <div className="space-y-2">
                    <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                      {t('specialBets')} ({userPicks.specialBets.length})
                    </h3>
                    <div className="space-y-2">
                      {userPicks.specialBets.map((bet) => (
                        <div
                          key={bet.id}
                          className={cn(
                            'p-3 rounded-lg bg-secondary/30 border',
                            bet.totalPoints > 0
                              ? 'border-green-500/30'
                              : 'border-transparent'
                          )}
                        >
                          <div className="flex items-start justify-between gap-2 mb-1">
                            <span className="text-xs font-medium text-foreground flex-1">
                              {bet.betName}
                            </span>
                            <span
                              className={cn(
                                'text-xs font-bold shrink-0',
                                bet.totalPoints > 0
                                  ? 'text-green-500'
                                  : 'text-muted-foreground'
                              )}
                            >
                              {bet.totalPoints > 0 ? '+' : ''}
                              {bet.totalPoints}
                            </span>
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {bet.prediction}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Questions */}
                {userPicks.questions.length > 0 && (
                  <div className="space-y-2">
                    <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                      {t('questions')} ({userPicks.questions.length})
                    </h3>
                    <div className="space-y-2">
                      {userPicks.questions.map((question) => (
                        <div
                          key={question.id}
                          className={cn(
                            'p-3 rounded-lg bg-secondary/30 border',
                            question.totalPoints > 0
                              ? 'border-green-500/30'
                              : question.totalPoints < 0
                                ? 'border-red-500/30'
                                : 'border-transparent'
                          )}
                        >
                          <div className="flex items-start justify-between gap-2 mb-1">
                            <span className="text-xs font-medium text-foreground flex-1">
                              {question.question}
                            </span>
                            <span
                              className={cn(
                                'text-xs font-bold shrink-0',
                                question.totalPoints > 0
                                  ? 'text-green-500'
                                  : question.totalPoints < 0
                                    ? 'text-red-500'
                                    : 'text-muted-foreground'
                              )}
                            >
                              {question.totalPoints > 0 ? '+' : ''}
                              {question.totalPoints}
                            </span>
                          </div>
                          {question.answer !== null && (
                            <div className="text-xs text-muted-foreground">
                              {question.answer ? t('yes') : t('no')}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Empty state */}
                {userPicks.matches.length === 0 &&
                  userPicks.series.length === 0 &&
                  userPicks.specialBets.length === 0 &&
                  userPicks.questions.length === 0 && (
                    <p className="text-center text-muted-foreground py-8 text-sm">
                      {t('noPicksYet')}
                    </p>
                  )}
              </div>
            ) : null}
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}

interface RankingRowProps {
  entry: LeaderboardEntry
  index: number
  prizes: LeaguePrize[]
  fines: LeaguePrize[]
  totalEntries: number
  onClick: () => void
}

function RankingRow({ entry, index, prizes, fines, totalEntries, onClick }: RankingRowProps) {
  const t = useTranslations('user.leaderboard')
  const displayName = getDisplayName(
    entry.firstName,
    entry.lastName,
    entry.username
  )
  const rankStyle = getRankStyle(entry.rank)
  const prize = getPrize(entry.rank, prizes)
  const fine = getFine(entry.rank, totalEntries, fines)

  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full flex items-center gap-3 p-3 hover:bg-secondary/30 transition-colors text-left',
        entry.isCurrentUser && 'bg-primary/5'
      )}
      style={{ animationDelay: `${index * 0.05}s` }}
    >
      {/* Rank */}
      <div
        className={cn(
          'w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm',
          rankStyle.bg,
          rankStyle.text
        )}
      >
        {entry.rank}
      </div>

      {/* Avatar */}
      <UserAvatar
        avatarUrl={entry.avatarUrl}
        firstName={entry.firstName}
        lastName={entry.lastName}
        username={entry.username}
        size="md"
        className={cn(
          'ring-2',
          entry.isCurrentUser ? 'ring-primary' : rankStyle.ring
        )}
        isCurrentUser={entry.isCurrentUser}
      />

      {/* Username */}
      <span
        className={cn(
          'flex-1 font-semibold text-sm',
          entry.isCurrentUser ? 'text-primary' : 'text-foreground'
        )}
      >
        {displayName}
        {entry.isCurrentUser && (
          <span className="ml-1 text-[10px] text-muted-foreground">{t('you')}</span>
        )}
      </span>

      {/* Prize Badge for top performers */}
      {prize && (
        <span
          className={cn(
            'px-2 py-0.5 rounded-full text-xs font-semibold',
            rankStyle.bg,
            rankStyle.text
          )}
        >
          {prize}
        </span>
      )}

      {/* Fine Badge for worst performers */}
      {fine && (
        <span
          className="px-2 py-0.5 rounded-full text-xs font-semibold bg-red-500/20 text-red-500"
        >
          -{fine}
        </span>
      )}

      {/* Points */}
      <div
        className={cn(
          'font-bold text-base',
          entry.rank <= 3 ? rankStyle.text : 'text-foreground'
        )}
      >
        {entry.totalPoints}
      </div>
    </button>
  )
}

function getRankStyle(rank: number) {
  if (rank === 1)
    return {
      bg: 'bg-yellow-500/20',
      ring: 'ring-yellow-500',
      text: 'text-yellow-500',
    }
  if (rank === 2)
    return {
      bg: 'bg-slate-300/20',
      ring: 'ring-slate-400',
      text: 'text-slate-400',
    }
  if (rank === 3)
    return {
      bg: 'bg-amber-600/20',
      ring: 'ring-amber-600',
      text: 'text-amber-600',
    }
  return { bg: 'bg-secondary', ring: 'ring-border', text: 'text-muted-foreground' }
}

function getPrize(rank: number, prizes: LeaguePrize[]) {
  const prize = prizes.find((p) => p.rank === rank)
  if (!prize) return null

  const formatted = new Intl.NumberFormat('cs-CZ', {
    minimumFractionDigits: 0,
  }).format(prize.amount / 100)

  return `${formatted}\u00A0${prize.currency}`
}

function getFine(rank: number, totalEntries: number, fines: LeaguePrize[]) {
  // Calculate position from bottom (1 = last place, 2 = second-to-last, etc.)
  const positionFromBottom = totalEntries - rank + 1

  const fine = fines.find((f) => f.rank === positionFromBottom)
  if (!fine) return null

  // Use Math.abs to avoid double minus sign (minus is added in display)
  const formatted = new Intl.NumberFormat('cs-CZ', {
    minimumFractionDigits: 0,
  }).format(Math.abs(fine.amount) / 100)

  return `${formatted}\u00A0${fine.currency}`
}

function getDisplayName(
  firstName: string | null,
  lastName: string | null,
  username: string
): string {
  if (firstName && lastName) {
    return `${firstName} ${lastName}`
  }
  if (firstName) return firstName
  if (lastName) return lastName
  return username
}
