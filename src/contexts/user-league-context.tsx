'use client'

import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { usePathname, useRouter } from 'next/navigation'

interface League {
  leagueUserId: number
  leagueId: number
  name: string
  seasonFrom: number
  seasonTo: number
  isTheMostActive: boolean | null
  infoText: string | null
  sport: {
    id: number
    name: string
  }
  isAdmin: boolean
  isPaid: boolean
}

interface UserLeagueContextType {
  leagues: League[]
  selectedLeagueId: number | null
  selectedLeague: League | null
  setSelectedLeagueId: (leagueId: number) => void
  isLoading: boolean
}

const UserLeagueContext = React.createContext<UserLeagueContextType | undefined>(
  undefined
)

const STORAGE_KEY = 'tipapp_user_selected_league_id'

interface UserLeagueProviderProps {
  children: React.ReactNode
  initialLeagues: League[]
  initialLeagueId?: number | null
}

export function UserLeagueProvider({
  children,
  initialLeagues,
  initialLeagueId,
}: UserLeagueProviderProps) {
  const pathname = usePathname()
  const router = useRouter()
  const [leagues] = useState<League[]>(initialLeagues)
  const [selectedLeagueId, setSelectedLeagueIdState] = useState<number | null>(
    initialLeagueId ?? null
  )
  const [isLoading, setIsLoading] = useState(false)

  // Sync with URL when on league-specific routes
  useEffect(() => {
    // Match routes like /1/matches, /2/series, etc.
    const leagueIdMatch = pathname.match(/^\/(\d+)/)
    if (leagueIdMatch) {
      const urlLeagueId = parseInt(leagueIdMatch[1], 10)
      if (urlLeagueId !== selectedLeagueId) {
        setSelectedLeagueIdState(urlLeagueId)
      }
    }
  }, [pathname, selectedLeagueId])

  // Persist to localStorage
  useEffect(() => {
    if (typeof window !== 'undefined' && selectedLeagueId) {
      localStorage.setItem(STORAGE_KEY, String(selectedLeagueId))
    }
  }, [selectedLeagueId])

  // Initialize from localStorage on mount (if no initial value)
  useEffect(() => {
    if (typeof window !== 'undefined' && !initialLeagueId) {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        const storedId = parseInt(stored, 10)
        // Only use stored ID if the user is a member of that league
        const isValidLeague = leagues.some((l) => l.leagueId === storedId)
        if (isValidLeague && storedId !== selectedLeagueId) {
          setSelectedLeagueIdState(storedId)
        }
      }
    }
  }, [initialLeagueId, leagues, selectedLeagueId])

  const setSelectedLeagueId = useCallback(
    (leagueId: number) => {
      setIsLoading(true)
      setSelectedLeagueIdState(leagueId)

      // Navigate to the new league, preserving the current page type
      const currentPage = pathname.match(/^\/\d+\/(.+)$/)?.[1] || 'matches'
      router.push(`/${leagueId}/${currentPage}`)
      setIsLoading(false)
    },
    [pathname, router]
  )

  const selectedLeague = useMemo(
    () => leagues.find((l) => l.leagueId === selectedLeagueId) ?? null,
    [leagues, selectedLeagueId]
  )

  const value = useMemo(
    () => ({
      leagues,
      selectedLeagueId,
      selectedLeague,
      setSelectedLeagueId,
      isLoading,
    }),
    [leagues, selectedLeagueId, selectedLeague, setSelectedLeagueId, isLoading]
  )

  return (
    <UserLeagueContext.Provider value={value}>
      {children}
    </UserLeagueContext.Provider>
  )
}

export function useUserLeagueContext() {
  const context = React.useContext(UserLeagueContext)
  if (context === undefined) {
    throw new Error(
      'useUserLeagueContext must be used within a UserLeagueProvider'
    )
  }
  return context
}
