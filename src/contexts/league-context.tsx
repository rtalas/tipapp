'use client'

import React, { useState, useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { AppError } from '@/lib/error-handler'

interface LeagueContextType {
  selectedLeagueId: string | null
  setSelectedLeagueId: (leagueId: string | null) => void
}

const LeagueContext = React.createContext<LeagueContextType | undefined>(undefined)

export function LeagueProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  // State only for manual selection (initialized from localStorage)
  const [manuallySelectedLeagueId, setManuallySelectedLeagueId] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('tipapp_selected_league_id')
    }
    return null
  })

  // Derive the current league ID from URL (no effect needed)
  const urlLeagueId = pathname.match(/^\/admin\/(\d+)/)?.[1] ?? null
  const selectedLeagueId = urlLeagueId ?? manuallySelectedLeagueId

  // Update localStorage when URL changes (no state update - that's the key!)
  useEffect(() => {
    if (typeof window !== 'undefined' && urlLeagueId) {
      localStorage.setItem('tipapp_selected_league_id', urlLeagueId)
    }
  }, [urlLeagueId])

  const setSelectedLeagueId = (leagueId: string | null) => {
    if (typeof window !== 'undefined' && leagueId) {
      localStorage.setItem('tipapp_selected_league_id', leagueId)
    }
    setManuallySelectedLeagueId(leagueId)
  }

  return (
    <LeagueContext.Provider value={{ selectedLeagueId, setSelectedLeagueId }}>
      {children}
    </LeagueContext.Provider>
  )
}

export function useLeagueContext() {
  const context = React.useContext(LeagueContext)
  if (context === undefined) {
    throw new AppError('useLeagueContext must be used within a LeagueProvider', 'INTERNAL_ERROR', 500)
  }
  return context
}
