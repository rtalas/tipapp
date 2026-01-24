'use client'

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { Sidebar } from './sidebar'
import { Topbar } from './topbar'
import { Sheet, SheetContent } from '@/components/ui/sheet'
import { cn } from '@/lib/utils'
import { LeagueProvider } from '@/contexts/league-context'
import type { League } from '@prisma/client'

interface AdminLayoutProps {
  children: React.ReactNode
  user?: {
    username: string
    isSuperadmin: boolean
  }
  leagues: League[]
  locale?: string
}

export function AdminLayout({ children, user, leagues, locale }: AdminLayoutProps) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  return (
    <LeagueProvider>
      <div className="flex min-h-screen w-full bg-background">
        {/* Desktop Sidebar */}
        <div className="hidden lg:block">
          <Sidebar
            collapsed={sidebarCollapsed}
            onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
            leagues={leagues}
          />
        </div>

        {/* Mobile Sidebar (Sheet) */}
        <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
          <SheetContent side="left" className="w-64 p-0">
            <Sidebar
              collapsed={false}
              onToggle={() => setMobileMenuOpen(false)}
              leagues={leagues}
            />
          </SheetContent>
        </Sheet>

        {/* Main content area */}
        <div
          className={cn(
            'flex flex-1 flex-col transition-all duration-300',
            sidebarCollapsed ? 'lg:pl-16' : 'lg:pl-64'
          )}
        >
          <Topbar
            sidebarCollapsed={sidebarCollapsed}
            onMenuClick={() => setMobileMenuOpen(true)}
            user={user}
            leagues={leagues}
            locale={locale}
          />

          {/* Main content */}
          <main className="flex-1 overflow-auto p-6 pt-22">
            <div className="mx-auto max-w-7xl">{children}</div>
          </main>
        </div>
      </div>
    </LeagueProvider>
  )
}
