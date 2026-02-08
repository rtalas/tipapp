'use client'

import { useState } from 'react'
import { useLocale, useTranslations } from 'next-intl'
import { Trophy } from 'lucide-react'
import { RefreshButton } from '@/components/user/common/refresh-button'
import { PullToRefresh } from '@/components/user/common/pull-to-refresh'
import { UserAvatar } from '@/components/common/user-avatar'
import { useRefresh } from '@/hooks/useRefresh'
import { cn } from '@/lib/utils'
import type { LeaderboardEntry } from '@/types/user'
import type { LeaguePrize } from '@/actions/user/leaderboard'
import { useParams } from 'next/navigation'
import { getUserDisplayName } from '@/lib/user-display-utils'
import { UserPicksModal } from './user-picks-modal'

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
  const [selectedUser, setSelectedUser] = useState<LeaderboardEntry | null>(null)

  const handleSelectUser = (entry: LeaderboardEntry | null) => {
    setSelectedUser(entry)
  }

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

      <UserPicksModal
        selectedUser={selectedUser}
        leagueId={leagueId}
        onClose={() => handleSelectUser(null)}
      />
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
  const locale = useLocale()
  const displayName = getUserDisplayName(entry)
  const rankStyle = getRankStyle(entry.rank)
  const prize = getPrize(entry.rank, prizes, locale)
  const fine = getFine(entry.rank, totalEntries, fines, locale)

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

function getPrize(rank: number, prizes: LeaguePrize[], locale: string) {
  const prize = prizes.find((p) => p.rank === rank)
  if (!prize) return null

  const formatted = new Intl.NumberFormat(locale, {
    minimumFractionDigits: 0,
  }).format(prize.amount / 100)

  return `${formatted}\u00A0${prize.currency}`
}

function getFine(rank: number, totalEntries: number, fines: LeaguePrize[], locale: string) {
  // Calculate position from bottom (1 = last place, 2 = second-to-last, etc.)
  const positionFromBottom = totalEntries - rank + 1

  const fine = fines.find((f) => f.rank === positionFromBottom)
  if (!fine) return null

  // Use Math.abs to avoid double minus sign (minus is added in display)
  const formatted = new Intl.NumberFormat(locale, {
    minimumFractionDigits: 0,
  }).format(Math.abs(fine.amount) / 100)

  return `${formatted}\u00A0${fine.currency}`
}

