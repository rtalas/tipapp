'use client'

import { cn } from '@/lib/utils'

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

interface QuestionsListSkeletonProps {
  count?: number
  className?: string
}

export function QuestionsListSkeleton({ count = 4, className }: QuestionsListSkeletonProps) {
  return (
    <div className={cn('space-y-4', className)}>
      {/* Title skeleton */}
      <div className="h-6 w-28 bg-muted rounded animate-pulse" />

      {/* Date divider skeleton */}
      <div className="flex items-center gap-3">
        <div className="h-px flex-1 bg-border" />
        <div className="h-3 w-20 bg-muted rounded animate-pulse" />
        <div className="h-px flex-1 bg-border" />
      </div>

      {/* Question cards */}
      {Array.from({ length: count }).map((_, i) => (
        <QuestionCardSkeleton key={i} />
      ))}
    </div>
  )
}
