'use client'

import * as React from 'react'
import { Header } from './header'
import { BottomNav } from './bottom-nav'
import { UserLeagueProvider } from '@/contexts/user-league-context'

interface CurrentLeague {
  id: number
  name: string
  seasonFrom: number
  seasonTo: number
  infoText: string | null
  sport: {
    id: number
    name: string
  }
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
  currentLeague: CurrentLeague
  /** Badge counts for bottom navigation */
  badges?: {
    matches?: number
    series?: number
    special?: number
    chat?: number
  }
  /** Whether chat is enabled for the current league */
  isChatEnabled?: boolean
  /** Whether there are any series in the league */
  hasAnySeries?: boolean
  locale?: string
}

export function UserLayout({
  children,
  user,
  currentLeague,
  badges,
  isChatEnabled,
  hasAnySeries,
  locale,
}: UserLayoutProps) {
  return (
    <UserLeagueProvider initialLeagueId={currentLeague.id}>
      <div className="flex min-h-screen flex-col">
        {/* Header */}
        <Header user={user} currentLeague={currentLeague} locale={locale} />

        {/* Main content area with padding for header and bottom nav */}
        <main className="flex-1 pt-14 pb-20">
          <div className="max-w-2xl mx-auto px-4 py-4">{children}</div>
        </main>

        {/* Bottom navigation */}
        <BottomNav
          leagueId={currentLeague.id}
          badges={badges}
          isChatEnabled={isChatEnabled}
          hasAnySeries={hasAnySeries}
        />
      </div>
    </UserLeagueProvider>
  )
}
