'use client'

import * as React from 'react'
import { Header } from './header'
import { BottomNav } from './bottom-nav'
import { UserLeagueProvider } from '@/contexts/user-league-context'

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

interface UserLayoutProps {
  children: React.ReactNode
  user: {
    id: string
    username: string
    firstName?: string | null
    lastName?: string | null
    isSuperadmin?: boolean
  }
  leagues: League[]
  currentLeagueId: number
  /** Badge counts for bottom navigation */
  badges?: {
    matches?: number
    series?: number
    special?: number
    chat?: number
  }
  locale?: string
}

export function UserLayout({
  children,
  user,
  leagues,
  currentLeagueId,
  badges,
  locale,
}: UserLayoutProps) {
  return (
    <UserLeagueProvider initialLeagues={leagues} initialLeagueId={currentLeagueId}>
      <div className="flex min-h-screen flex-col">
        {/* Header */}
        <Header user={user} locale={locale} />

        {/* Main content area with padding for header and bottom nav */}
        <main className="flex-1 pt-14 pb-20">
          <div className="max-w-2xl mx-auto px-4 py-4">{children}</div>
        </main>

        {/* Bottom navigation */}
        <BottomNav leagueId={currentLeagueId} badges={badges} />
      </div>
    </UserLeagueProvider>
  )
}
