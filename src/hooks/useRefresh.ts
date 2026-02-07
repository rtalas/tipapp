'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'

/**
 * Hook for handling page refresh with loading state
 * Provides consistent refresh behavior across list components
 * Returns both sync and async versions of refresh for different use cases
 */
export function useRefresh() {
  const router = useRouter()
  const [isRefreshing, setIsRefreshing] = useState(false)
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
    }
  }, [])

  // Sync refresh for button clicks
  const refresh = useCallback(() => {
    setIsRefreshing(true)
    router.refresh()
    timeoutRef.current = setTimeout(() => setIsRefreshing(false), 500)
  }, [router])

  // Async refresh for pull-to-refresh
  const refreshAsync = useCallback(async () => {
    setIsRefreshing(true)
    router.refresh()
    await new Promise((resolve) => {
      timeoutRef.current = setTimeout(resolve, 500)
    })
    setIsRefreshing(false)
  }, [router])

  return { isRefreshing, refresh, refreshAsync }
}
