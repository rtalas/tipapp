'use client'

import * as React from 'react'
import { useTranslations } from 'next-intl'
import { Trophy } from 'lucide-react'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { RefreshButton } from '@/components/user/common/refresh-button'
import { PullToRefresh } from '@/components/user/common/pull-to-refresh'
import { useRefresh } from '@/hooks/useRefresh'
import { cn } from '@/lib/utils'
import type { LeaderboardEntry } from '@/types/user'
import type { LeaguePrize } from '@/actions/user/leaderboard'

interface LeaderboardTableProps {
  entries: LeaderboardEntry[]
  prizes: LeaguePrize[]
}

export function LeaderboardTable({ entries, prizes }: LeaderboardTableProps) {
  const t = useTranslations('user.leaderboard')
  const { isRefreshing, refresh, refreshAsync } = useRefresh()
  const [selectedUser, setSelectedUser] = React.useState<LeaderboardEntry | null>(
    null
  )

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

  const topThree = entries.filter((e) => e.rank <= 3)
  const rest = entries.filter((e) => e.rank > 3)

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
            {/* Top 3 */}
            <div className="glass-card rounded-xl divide-y divide-border/50">
              {topThree.map((entry, index) => (
                <RankingRow
                  key={entry.leagueUserId}
                  entry={entry}
                  index={index}
                  prizes={prizes}
                  onClick={() => setSelectedUser(entry)}
                />
              ))}
            </div>

            {/* Rest */}
            {rest.length > 0 && (
              <div className="glass-card rounded-xl divide-y divide-border/50">
                {rest.map((entry, index) => (
                  <RankingRow
                    key={entry.leagueUserId}
                    entry={entry}
                    index={index + 3}
                    prizes={prizes}
                    onClick={() => setSelectedUser(entry)}
                  />
                ))}
              </div>
            )}
          </div>
        </PullToRefresh>
      </div>

      {/* User History Modal */}
      <Dialog open={!!selectedUser} onOpenChange={() => setSelectedUser(null)}>
        <DialogContent className="sm:max-w-md bg-card border-border">
          <DialogHeader>
            <div className="flex items-center gap-3">
              {selectedUser && (
                <>
                  <Avatar className="w-12 h-12 ring-2 ring-primary">
                    <AvatarFallback className="text-sm font-bold bg-secondary">
                      {getInitials(
                        selectedUser.firstName,
                        selectedUser.lastName,
                        selectedUser.username
                      )}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <DialogTitle>
                      {getDisplayName(
                        selectedUser.firstName,
                        selectedUser.lastName,
                        selectedUser.username
                      )}
                    </DialogTitle>
                    <p className="text-sm text-muted-foreground">
                      {selectedUser.totalPoints} {t('points')} · {t('rankNumber', { rank: selectedUser.rank })}
                    </p>
                  </div>
                </>
              )}
            </div>
          </DialogHeader>
          <div className="mt-4">
            <div className="space-y-2 h-[40vh] overflow-y-auto">
              {selectedUser && (
                <div className="space-y-3">
                  {/* Match Points */}
                  {selectedUser.matchPoints > 0 && (
                    <div className="p-3 rounded-lg bg-secondary/30">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-foreground">
                          {t('matchPredictions')}
                        </span>
                        <span className="text-sm font-bold text-primary">
                          +{selectedUser.matchPoints} {t('pointsShort')}
                        </span>
                      </div>
                    </div>
                  )}
                  {/* Series Points */}
                  {selectedUser.seriesPoints > 0 && (
                    <div className="p-3 rounded-lg bg-secondary/30">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-foreground">
                          {t('seriesPredictions')}
                        </span>
                        <span className="text-sm font-bold text-primary">
                          +{selectedUser.seriesPoints} {t('pointsShort')}
                        </span>
                      </div>
                    </div>
                  )}
                  {/* Special Bet Points */}
                  {selectedUser.specialBetPoints > 0 && (
                    <div className="p-3 rounded-lg bg-secondary/30">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-foreground">
                          {t('specialBets')}
                        </span>
                        <span className="text-sm font-bold text-primary">
                          +{selectedUser.specialBetPoints} {t('pointsShort')}
                        </span>
                      </div>
                    </div>
                  )}
                  {/* Question Points */}
                  {selectedUser.questionPoints > 0 && (
                    <div className="p-3 rounded-lg bg-secondary/30">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-foreground">
                          {t('questions')}
                        </span>
                        <span className="text-sm font-bold text-primary">
                          +{selectedUser.questionPoints} {t('pointsShort')}
                        </span>
                      </div>
                    </div>
                  )}
                  {selectedUser.totalPoints === 0 && (
                    <p className="text-center text-muted-foreground py-8 text-sm">
                      {t('noPointsYet')}
                    </p>
                  )}
                </div>
              )}
            </div>
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
  onClick: () => void
}

function RankingRow({ entry, index, prizes, onClick }: RankingRowProps) {
  const t = useTranslations('user.leaderboard')
  const initials = getInitials(entry.firstName, entry.lastName, entry.username)
  const displayName = getDisplayName(
    entry.firstName,
    entry.lastName,
    entry.username
  )
  const rankStyle = getRankStyle(entry.rank)
  const prize = getPrize(entry.rank, prizes)

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
      <Avatar
        className={cn(
          'w-10 h-10 ring-2',
          entry.isCurrentUser ? 'ring-primary' : rankStyle.ring
        )}
      >
        <AvatarFallback
          className={cn(
            'text-xs font-semibold',
            entry.isCurrentUser ? 'bg-primary text-primary-foreground' : 'bg-secondary'
          )}
        >
          {initials}
        </AvatarFallback>
      </Avatar>

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

      {/* Prize Badge for top 3 */}
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

function getInitials(
  firstName: string | null,
  lastName: string | null,
  username: string
): string {
  if (firstName && lastName) {
    return `${firstName[0]}${lastName[0]}`.toUpperCase()
  }
  return username.slice(0, 2).toUpperCase()
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
