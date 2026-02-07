'use client'

import { cn } from '@/lib/utils'

function MatchCardSkeleton() {
  return (
    <div className="glass-card rounded-xl p-4 animate-pulse">
      {/* Header skeleton */}
      <div className="flex items-center justify-between mb-3">
        <div className="h-4 w-24 bg-muted rounded" />
        <div className="h-5 w-16 bg-muted rounded-full" />
      </div>

      {/* Teams and scores skeleton */}
      <div className="flex items-center justify-between py-3">
        {/* Home team */}
        <div className="flex-1 flex items-center gap-2">
          <div className="w-8 h-8 bg-muted rounded-full" />
          <div className="h-4 w-20 bg-muted rounded" />
        </div>

        {/* Scores */}
        <div className="flex items-center gap-3 px-4">
          <div className="w-10 h-10 bg-muted rounded-lg" />
          <div className="h-4 w-4 bg-muted rounded" />
          <div className="w-10 h-10 bg-muted rounded-lg" />
        </div>

        {/* Away team */}
        <div className="flex-1 flex items-center gap-2 justify-end">
          <div className="h-4 w-20 bg-muted rounded" />
          <div className="w-8 h-8 bg-muted rounded-full" />
        </div>
      </div>

      {/* Controls skeleton */}
      <div className="mt-3 pt-3 border-t border-border/30">
        <div className="flex items-center gap-4">
          <div className="h-8 w-full bg-muted rounded" />
        </div>
      </div>

      {/* Save button skeleton */}
      <div className="mt-3">
        <div className="h-10 w-full bg-muted rounded-lg" />
      </div>
    </div>
  )
}

interface MatchListSkeletonProps {
  count?: number
  className?: string
}

export function MatchListSkeleton({ count = 4, className }: MatchListSkeletonProps) {
  return (
    <div className={cn('space-y-3', className)}>
      {Array.from({ length: count }).map((_, i) => (
        <MatchCardSkeleton key={i} />
      ))}
    </div>
  )
}
