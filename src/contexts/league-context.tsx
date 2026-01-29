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

  // State only for manual selection - starts as null to avoid hydration mismatch
  const [manuallySelectedLeagueId, setManuallySelectedLeagueId] = useState<string | null>(null)

  // Derive the current league ID from URL (no effect needed)
  const urlLeagueId = pathname.match(/^\/admin\/(\d+)/)?.[1] ?? null
  const selectedLeagueId = urlLeagueId ?? manuallySelectedLeagueId

  // Initialize from localStorage after mount to avoid hydration mismatch
  useEffect(() => {
    const stored = localStorage.getItem('tipapp_selected_league_id')
    if (stored) {
      // This is intentional: we need to read from localStorage after mount
      // to avoid server/client hydration mismatch
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setManuallySelectedLeagueId(stored)
    }
  }, [])

  // Update localStorage when URL changes
  useEffect(() => {
    if (urlLeagueId) {
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
