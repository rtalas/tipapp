'use client'

import { cn } from '@/lib/utils'

interface ProfileSkeletonProps {
  className?: string
}

export function ProfileSkeleton({ className }: ProfileSkeletonProps) {
  return (
    <div className={cn('space-y-6 animate-pulse', className)}>
      {/* Avatar section */}
      <div className="flex flex-col items-center gap-3">
        <div className="w-24 h-24 bg-muted rounded-full" />
        <div className="h-4 w-32 bg-muted rounded" />
      </div>

      {/* Profile form card */}
      <div className="glass-card rounded-xl p-4 space-y-4">
        <div className="h-5 w-36 bg-muted rounded" />
        <div className="space-y-3">
          <div className="space-y-1.5">
            <div className="h-3.5 w-20 bg-muted rounded" />
            <div className="h-10 w-full bg-muted rounded-lg" />
          </div>
          <div className="space-y-1.5">
            <div className="h-3.5 w-16 bg-muted rounded" />
            <div className="h-10 w-full bg-muted rounded-lg" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <div className="h-3.5 w-20 bg-muted rounded" />
              <div className="h-10 w-full bg-muted rounded-lg" />
            </div>
            <div className="space-y-1.5">
              <div className="h-3.5 w-20 bg-muted rounded" />
              <div className="h-10 w-full bg-muted rounded-lg" />
            </div>
          </div>
        </div>
      </div>

      {/* Password card */}
      <div className="glass-card rounded-xl p-4 space-y-4">
        <div className="h-5 w-32 bg-muted rounded" />
        <div className="space-y-3">
          <div className="space-y-1.5">
            <div className="h-3.5 w-28 bg-muted rounded" />
            <div className="h-10 w-full bg-muted rounded-lg" />
          </div>
          <div className="space-y-1.5">
            <div className="h-3.5 w-24 bg-muted rounded" />
            <div className="h-10 w-full bg-muted rounded-lg" />
          </div>
        </div>
      </div>
    </div>
  )
}
