'use client'

import { cn } from '@/lib/utils'

function SeriesCardSkeleton() {
  return (
    <div className="glass-card rounded-xl p-4 animate-pulse">
      {/* Header skeleton */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-muted rounded-lg" />
          <div className="h-3 w-16 bg-muted rounded" />
        </div>
        <div className="flex items-center gap-1.5">
          <div className="h-5 w-14 bg-muted rounded-full" />
          <div className="h-5 w-12 bg-muted rounded-full" />
        </div>
      </div>

      {/* Teams and scores skeleton */}
      <div className="flex items-center justify-between gap-2">
        {/* Home team */}
        <div className="flex flex-col items-center gap-1 flex-1 p-2">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 bg-muted rounded-full" />
            <div className="h-4 w-12 bg-muted rounded" />
          </div>
        </div>

        {/* Score controls */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1">
            <div className="w-7 h-7 bg-muted rounded" />
            <div className="w-8 h-8 bg-muted rounded" />
            <div className="w-7 h-7 bg-muted rounded" />
          </div>
          <div className="h-4 w-2 bg-muted rounded" />
          <div className="flex items-center gap-1">
            <div className="w-7 h-7 bg-muted rounded" />
            <div className="w-8 h-8 bg-muted rounded" />
            <div className="w-7 h-7 bg-muted rounded" />
          </div>
        </div>

        {/* Away team */}
        <div className="flex flex-col items-center gap-1 flex-1 p-2">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 bg-muted rounded-full" />
            <div className="h-4 w-12 bg-muted rounded" />
          </div>
        </div>
      </div>

      {/* Save button skeleton */}
      <div className="mt-4">
        <div className="h-9 w-full bg-muted rounded-lg" />
      </div>
    </div>
  )
}

interface SeriesListSkeletonProps {
  count?: number
  className?: string
}

export function SeriesListSkeleton({ count = 3, className }: SeriesListSkeletonProps) {
  return (
    <div className="animate-fade-in">
      {/* Fixed Header skeleton */}
      <div className="fixed top-14 left-0 right-0 z-30 glass-card border-b-0 rounded-b-2xl">
        <div className="max-w-2xl mx-auto px-4 py-4 space-y-4">
          {/* Title skeleton */}
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 bg-muted rounded animate-pulse" />
            <div className="h-5 w-24 bg-muted rounded animate-pulse" />
          </div>

          {/* Tabs skeleton */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex-1 h-10 bg-muted/50 rounded-lg animate-pulse" />
            <div className="w-10 h-10 bg-muted rounded-lg animate-pulse" />
          </div>
        </div>
      </div>

      {/* Content skeleton */}
      <div className={cn('pt-32 space-y-4', className)}>
        {/* Date divider skeleton */}
        <div className="flex items-center gap-3">
          <div className="h-px flex-1 bg-border" />
          <div className="h-3 w-20 bg-muted rounded animate-pulse" />
          <div className="h-px flex-1 bg-border" />
        </div>

        {/* Series cards skeleton */}
        {Array.from({ length: count }).map((_, i) => (
          <SeriesCardSkeleton key={i} />
        ))}
      </div>
    </div>
  )
}
