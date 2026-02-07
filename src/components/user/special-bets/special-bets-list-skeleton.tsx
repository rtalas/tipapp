'use client'

import { cn } from '@/lib/utils'

function SpecialBetCardSkeleton() {
  return (
    <div className="glass-card rounded-xl p-3 sm:p-4 animate-pulse">
      {/* Header skeleton */}
      <div className="flex items-start gap-2 sm:gap-3 mb-3">
        <div className="w-8 h-8 sm:w-10 sm:h-10 bg-muted rounded-lg shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <div className="h-4 w-32 bg-muted rounded mb-1" />
              <div className="h-3 w-16 bg-muted rounded" />
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <div className="h-5 w-14 bg-muted rounded-full" />
              <div className="h-5 w-12 bg-muted rounded-full" />
            </div>
          </div>
        </div>
      </div>

      {/* Selection area skeleton */}
      <div className="space-y-2">
        <div className="h-10 w-full bg-muted rounded-lg" />
        <div className="h-9 w-full bg-muted rounded-lg" />
      </div>
    </div>
  )
}

function QuestionCardSkeleton() {
  return (
    <div className="glass-card rounded-xl p-3 sm:p-4 animate-pulse">
      {/* Header skeleton */}
      <div className="flex items-start gap-2 sm:gap-3 mb-3">
        <div className="w-8 h-8 sm:w-10 sm:h-10 bg-muted rounded-lg shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <div className="h-4 w-40 bg-muted rounded" />
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <div className="h-5 w-14 bg-muted rounded-full" />
            </div>
          </div>
        </div>
      </div>

      {/* Yes/No buttons skeleton */}
      <div className="grid grid-cols-2 gap-2">
        <div className="h-10 bg-muted rounded-lg" />
        <div className="h-10 bg-muted rounded-lg" />
      </div>
    </div>
  )
}

interface SpecialBetsListSkeletonProps {
  count?: number
  className?: string
}

export function SpecialBetsListSkeleton({ count = 4, className }: SpecialBetsListSkeletonProps) {
  return (
    <div className="animate-fade-in">
      {/* Fixed Header skeleton */}
      <div className="fixed top-14 left-0 right-0 z-30 glass-card border-b-0 rounded-b-2xl">
        <div className="max-w-2xl mx-auto px-4 py-4 space-y-4">
          {/* Title skeleton */}
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 bg-muted rounded animate-pulse" />
            <div className="h-5 w-36 bg-muted rounded animate-pulse" />
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

        {/* Mixed cards skeleton - alternate between special bet and question */}
        {Array.from({ length: count }).map((_, i) => (
          i % 3 === 2 ? <QuestionCardSkeleton key={i} /> : <SpecialBetCardSkeleton key={i} />
        ))}
      </div>
    </div>
  )
}
