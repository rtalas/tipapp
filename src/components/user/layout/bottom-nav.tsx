'use client'

import * as React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Calendar,
  Swords,
  Target,
  Trophy,
  MessageCircle,
} from 'lucide-react'
import { useTranslations } from 'next-intl'
import { cn } from '@/lib/utils'

interface NavItem {
  id: string
  labelKey: string
  icon: React.ElementType
  href: (leagueId: number) => string
  matchPattern: RegExp
}

const navItems: NavItem[] = [
  {
    id: 'matches',
    labelKey: 'matches',
    icon: Calendar,
    href: (leagueId) => `/${leagueId}/matches`,
    matchPattern: /^\/\d+\/matches/,
  },
  {
    id: 'series',
    labelKey: 'series',
    icon: Swords,
    href: (leagueId) => `/${leagueId}/series`,
    matchPattern: /^\/\d+\/series/,
  },
  {
    id: 'chat',
    labelKey: 'chat',
    icon: MessageCircle,
    href: (leagueId) => `/${leagueId}/chat`,
    matchPattern: /^\/\d+\/chat/,
  },
  {
    id: 'special',
    labelKey: 'special',
    icon: Target,
    href: (leagueId) => `/${leagueId}/special-bets`,
    matchPattern: /^\/\d+\/special-bets/,
  },
  {
    id: 'rankings',
    labelKey: 'rankings',
    icon: Trophy,
    href: (leagueId) => `/${leagueId}/leaderboard`,
    matchPattern: /^\/\d+\/leaderboard/,
  },
]

interface BottomNavProps {
  leagueId: number
  /** Badge counts for each tab (optional) */
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
}

export function BottomNav({
  leagueId,
  badges,
  isChatEnabled,
  hasAnySeries,
}: BottomNavProps) {
  const pathname = usePathname()
  const t = useTranslations('user.navigation')

  // Filter out chat if disabled and series if no series exist
  let filteredNavItems = navItems
  if (!isChatEnabled) {
    filteredNavItems = filteredNavItems.filter((item) => item.id !== 'chat')
  }
  if (!hasAnySeries) {
    filteredNavItems = filteredNavItems.filter((item) => item.id !== 'series')
  }

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 glass-card border-t-0 rounded-t-2xl"
      role="navigation"
      aria-label="Main navigation"
    >
      {/* Safe area padding for iOS devices */}
      <div className="flex h-16 items-center justify-around pb-safe max-w-lg mx-auto">
        {filteredNavItems.map((item) => {
          const isActive = item.matchPattern.test(pathname)
          const Icon = item.icon
          const badgeCount = badges?.[item.id as keyof typeof badges]

          return (
            <Link
              key={item.id}
              href={item.href(leagueId)}
              className={cn(
                'relative flex flex-1 flex-col items-center justify-center gap-1 py-2 transition-all duration-200',
                item.id === 'chat'
                  ? 'text-foreground'
                  : isActive
                    ? 'text-primary'
                    : 'text-muted-foreground hover:text-foreground'
              )}
              aria-current={isActive ? 'page' : undefined}
            >
              <div className="relative">
                {/* Special styling for Chat icon with orange background */}
                {item.id === 'chat' ? (
                  <div
                    className={cn(
                      'w-8 h-8 rounded-full flex items-center justify-center transition-all duration-200',
                      isActive ? 'bg-orange-500 scale-110' : 'bg-orange-500/90'
                    )}
                  >
                    <Icon className="h-5 w-5 text-white" />
                  </div>
                ) : (
                  <div
                    className={cn(
                      'flex items-center justify-center rounded-xl p-2 transition-all duration-200',
                      isActive && 'bg-primary/10'
                    )}
                  >
                    <Icon
                      className={cn(
                        'h-5 w-5 transition-transform',
                        isActive && 'scale-110'
                      )}
                    />
                  </div>
                )}
                {badgeCount && badgeCount > 0 && (
                  <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-destructive-foreground">
                    {badgeCount > 99 ? '99+' : badgeCount}
                  </span>
                )}
              </div>
              <span
                className={cn(
                  'text-[10px] font-medium',
                  isActive && 'font-semibold'
                )}
              >
                {t(item.labelKey)}
              </span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
