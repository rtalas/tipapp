'use client'

import { cn } from '@/lib/utils'

function LeaderboardRowSkeleton({ isFirst = false }: { isFirst?: boolean }) {
  return (
    <div
      className={cn(
        'flex items-center gap-3 p-3 animate-pulse',
        isFirst && 'rounded-t-xl',
        'border-b border-border/30 last:border-b-0'
      )}
    >
      {/* Rank */}
      <div className="w-8 h-8 bg-muted rounded-full flex-shrink-0" />

      {/* Avatar */}
      <div className="w-10 h-10 bg-muted rounded-full flex-shrink-0" />

      {/* Name */}
      <div className="flex-1 min-w-0">
        <div className="h-4 w-24 bg-muted rounded mb-1" />
        <div className="h-3 w-16 bg-muted rounded" />
      </div>

      {/* Points */}
      <div className="flex-shrink-0">
        <div className="h-5 w-12 bg-muted rounded" />
      </div>
    </div>
  )
}

interface LeaderboardSkeletonProps {
  count?: number
  className?: string
}

export function LeaderboardSkeleton({ count = 10, className }: LeaderboardSkeletonProps) {
  return (
    <div className={cn('glass-card rounded-xl overflow-hidden', className)}>
      {/* Header skeleton */}
      <div className="flex items-center justify-between p-4 border-b border-border/30 animate-pulse">
        <div className="h-6 w-32 bg-muted rounded" />
        <div className="h-8 w-8 bg-muted rounded-full" />
      </div>

      {/* Rows */}
      <div>
        {Array.from({ length: count }).map((_, i) => (
          <LeaderboardRowSkeleton key={i} isFirst={i === 0} />
        ))}
      </div>
    </div>
  )
}
