'use client'

import { RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface RefreshButtonProps {
  isRefreshing: boolean
  onRefresh: () => void
  className?: string
}

/**
 * Reusable refresh button component with spin animation
 * Hidden on mobile (use PullToRefresh instead)
 */
export function RefreshButton({
  isRefreshing,
  onRefresh,
  className,
}: RefreshButtonProps) {
  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={onRefresh}
      disabled={isRefreshing}
      aria-label="Refresh"
      className={cn('hidden sm:flex', className)}
    >
      <RefreshCw className={cn('h-4 w-4', isRefreshing && 'animate-spin')} />
    </Button>
  )
}
