'use client'

import { cn } from '@/lib/utils'

function MessageBubbleSkeleton({ isOwn = false }: { isOwn?: boolean }) {
  return (
    <div className={cn('flex gap-2 animate-pulse', isOwn ? 'justify-end' : 'justify-start')}>
      {!isOwn && <div className="w-8 h-8 bg-muted rounded-full shrink-0" />}
      <div className={cn('max-w-[75%] space-y-1', isOwn ? 'items-end' : 'items-start')}>
        {!isOwn && <div className="h-3 w-16 bg-muted rounded" />}
        <div className={cn('rounded-2xl p-3', isOwn ? 'bg-muted/70' : 'bg-muted/50')}>
          <div className="h-4 w-32 bg-muted rounded mb-1" />
          <div className="h-4 w-20 bg-muted rounded" />
        </div>
        <div className="h-2.5 w-10 bg-muted rounded" />
      </div>
    </div>
  )
}

interface ChatSkeletonProps {
  className?: string
}

export function ChatSkeleton({ className }: ChatSkeletonProps) {
  return (
    <div className={cn('flex flex-col h-[calc(100dvh-7rem)]', className)}>
      {/* Messages area */}
      <div className="flex-1 overflow-hidden p-4 space-y-4">
        <MessageBubbleSkeleton />
        <MessageBubbleSkeleton isOwn />
        <MessageBubbleSkeleton />
        <MessageBubbleSkeleton />
        <MessageBubbleSkeleton isOwn />
        <MessageBubbleSkeleton />
      </div>

      {/* Input area skeleton */}
      <div className="border-t p-3 animate-pulse">
        <div className="flex items-center gap-2">
          <div className="flex-1 h-10 bg-muted rounded-full" />
          <div className="w-10 h-10 bg-muted rounded-full" />
        </div>
      </div>
    </div>
  )
}
