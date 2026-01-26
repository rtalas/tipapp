'use client'

import React, { useState, useEffect } from 'react'
import { usePathname } from 'next/navigation'

interface LeagueContextType {
  selectedLeagueId: string | null
  setSelectedLeagueId: (leagueId: string | null) => void
}

const LeagueContext = React.createContext<LeagueContextType | undefined>(undefined)

export function LeagueProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const [selectedLeagueId, setSelectedLeagueIdState] = useState<string | null>(null)

  // Sync with URL when on league-specific routes
  useEffect(() => {
    const leagueIdMatch = pathname.match(/^\/admin\/(\d+)/)
    if (leagueIdMatch) {
      const urlLeagueId = leagueIdMatch[1]
      setSelectedLeagueIdState(urlLeagueId)
    }
  }, [pathname])

  // Optional: Persist to localStorage (only after mount to avoid hydration issues)
  useEffect(() => {
    if (typeof window !== 'undefined' && selectedLeagueId) {
      localStorage.setItem('tipapp_selected_league_id', selectedLeagueId)
    }
  }, [selectedLeagueId])

  // Optional: Initialize from localStorage on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('tipapp_selected_league_id')
      if (stored && !selectedLeagueId) {
        setSelectedLeagueIdState(stored)
      }
    }
  }, [selectedLeagueId])

  return (
    <LeagueContext.Provider value={{ selectedLeagueId, setSelectedLeagueId: setSelectedLeagueIdState }}>
      {children}
    </LeagueContext.Provider>
  )
}

export function useLeagueContext() {
  const context = React.useContext(LeagueContext)
  if (context === undefined) {
    throw new Error('useLeagueContext must be used within a LeagueProvider')
  }
  return context
}
