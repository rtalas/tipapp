'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'

/**
 * Hook for handling page refresh with loading state
 * Provides consistent refresh behavior across list components
 * Returns both sync and async versions of refresh for different use cases
 */
export function useRefresh() {
  const router = useRouter()
  const [isRefreshing, setIsRefreshing] = React.useState(false)

  // Sync refresh for button clicks
  const refresh = React.useCallback(() => {
    setIsRefreshing(true)
    router.refresh()
    setTimeout(() => setIsRefreshing(false), 500)
  }, [router])

  // Async refresh for pull-to-refresh
  const refreshAsync = React.useCallback(async () => {
    setIsRefreshing(true)
    router.refresh()
    // Wait a bit to simulate network delay and ensure UI feels responsive
    await new Promise((resolve) => setTimeout(resolve, 500))
    setIsRefreshing(false)
  }, [router])

  return { isRefreshing, refresh, refreshAsync }
}
