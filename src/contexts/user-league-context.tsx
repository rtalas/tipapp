'use client'

import React, { useState, useEffect, useTransition } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { AppError } from '@/lib/error-handler'

interface UserLeagueContextType {
  selectedLeagueId: number
  setSelectedLeagueId: (leagueId: number) => void
  isLoading: boolean
}

const UserLeagueContext = React.createContext<UserLeagueContextType | undefined>(
  undefined
)

const STORAGE_KEY = 'tipapp_user_selected_league_id'

interface UserLeagueProviderProps {
  children: React.ReactNode
  initialLeagueId: number
}

export function UserLeagueProvider({
  children,
  initialLeagueId,
}: UserLeagueProviderProps) {
  const pathname = usePathname()
  const router = useRouter()
  const [selectedLeagueId, setSelectedLeagueIdState] = useState<number>(initialLeagueId)
  const [isPending, startTransition] = useTransition()

  // Sync with URL when on league-specific routes
  // Valid use of setState in effect: syncing with external system (router/URL)
  useEffect(() => {
    // Match routes like /1/matches, /2/series, etc.
    const leagueIdMatch = pathname.match(/^\/(\d+)/)
    if (leagueIdMatch) {
      const urlLeagueId = parseInt(leagueIdMatch[1], 10)
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSelectedLeagueIdState((current) => {
        // Only update if URL is different from current state
        return current !== urlLeagueId ? urlLeagueId : current
      })
    }
  }, [pathname])

  // Persist to localStorage
  useEffect(() => {
    if (typeof window !== 'undefined' && selectedLeagueId) {
      localStorage.setItem(STORAGE_KEY, String(selectedLeagueId))
    }
  }, [selectedLeagueId])

  const setSelectedLeagueId = (leagueId: number) => {
    setSelectedLeagueIdState(leagueId)

    // Navigate to the new league, preserving the current page type
    const currentPage = pathname.match(/^\/\d+\/(.+)$/)?.[1] || 'matches'
    startTransition(() => {
      router.push(`/${leagueId}/${currentPage}`)
    })
  }

  const value = {
    selectedLeagueId,
    setSelectedLeagueId,
    isLoading: isPending,
  }

  return (
    <UserLeagueContext.Provider value={value}>
      {children}
    </UserLeagueContext.Provider>
  )
}

export function useUserLeagueContext() {
  const context = React.useContext(UserLeagueContext)
  if (context === undefined) {
    throw new AppError(
      'useUserLeagueContext must be used within a UserLeagueProvider',
      'INTERNAL_ERROR',
      500
    )
  }
  return context
}
