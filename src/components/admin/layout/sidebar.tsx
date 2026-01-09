'use client'

import * as React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Trophy,
  Calendar,
  Users,
  ChevronLeft,
  Zap,
  Award,
  Shield,
  User,
  ListChecks,
  Target,
  MessageSquare,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { useLeagueContext } from '@/contexts/league-context'
import type { League } from '@prisma/client'

interface SidebarProps {
  collapsed: boolean
  onToggle: () => void
  leagues: League[]
}

export function Sidebar({ collapsed, onToggle, leagues }: SidebarProps) {
  const pathname = usePathname()
  const { selectedLeagueId } = useLeagueContext()

  // Use selected league from context (persists across all pages)
  const leagueId = selectedLeagueId
  const currentLeague = leagues.find((l) => l.id.toString() === leagueId)

  // Build league-specific items with dynamic URLs
  const leagueSpecificItems = leagueId
    ? [
        { label: 'Matches', href: `/admin/${leagueId}/matches`, icon: Calendar },
        { label: 'Special Bets', href: `/admin/${leagueId}/special-bets`, icon: Target },
        { label: 'Series', href: `/admin/${leagueId}/series`, icon: ListChecks },
        { label: 'Questions', href: `/admin/${leagueId}/questions`, icon: MessageSquare },
        { label: 'Teams', href: `/admin/${leagueId}/teams`, icon: Shield },
        { label: 'Players', href: `/admin/${leagueId}/players`, icon: User },
        { label: 'Users', href: `/admin/${leagueId}/users`, icon: Users },
        { label: 'Evaluators', href: `/admin/${leagueId}/evaluators`, icon: Award },
      ]
    : []

  const generalAdminItems = [
    { label: 'Leagues', href: '/admin/leagues', icon: Trophy },
    { label: 'Teams (Global)', href: '/admin/teams', icon: Shield },
    { label: 'Players (Global)', href: '/admin/players', icon: User },
    { label: 'Users (Global)', href: '/admin/users', icon: Users },
    { label: 'Special Bet Types', href: '/admin/special-bet-types', icon: Target },
    { label: 'Series Types', href: '/admin/series-types', icon: ListChecks },
  ]

  const renderNavItem = (item: { label: string; href: string; icon: React.ElementType }) => {
    const isActive =
      pathname === item.href ||
      (item.href !== '/admin' && pathname.startsWith(item.href + '/'))

    const link = (
      <Link
        key={item.href}
        href={item.href}
        className={cn(
          'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
          isActive
            ? 'bg-sidebar-primary text-sidebar-primary-foreground'
            : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
          collapsed && 'justify-center px-2'
        )}
      >
        <item.icon className="h-5 w-5 shrink-0" />
        {!collapsed && <span>{item.label}</span>}
      </Link>
    )

    if (collapsed) {
      return (
        <Tooltip key={item.href}>
          <TooltipTrigger asChild>{link}</TooltipTrigger>
          <TooltipContent side="right" sideOffset={10}>
            {item.label}
          </TooltipContent>
        </Tooltip>
      )
    }

    return link
  }

  return (
    <TooltipProvider delayDuration={0}>
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-20 flex flex-col border-r bg-sidebar transition-all duration-300',
          collapsed ? 'w-16' : 'w-64'
        )}
      >
        {/* Logo */}
        <div className="flex h-16 items-center border-b px-4">
          <Link href="/admin" className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
              <Zap className="h-5 w-5 text-primary-foreground" />
            </div>
            {!collapsed && (
              <span className="font-semibold text-lg">TipApp Admin</span>
            )}
          </Link>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto p-2">
          {/* League-Specific Section */}
          {leagueSpecificItems.length > 0 && (
            <div className="space-y-1">
              {!collapsed && currentLeague && (
                <div className="px-3 py-2">
                  <p className="text-xs font-semibold text-sidebar-foreground/70 uppercase tracking-wider">
                    {currentLeague.name}
                  </p>
                  <p className="text-xs text-sidebar-foreground/50">
                    {currentLeague.seasonFrom}/{currentLeague.seasonTo}
                  </p>
                </div>
              )}
              {leagueSpecificItems.map(renderNavItem)}
            </div>
          )}

          {/* Separator between sections */}
          {leagueSpecificItems.length > 0 && (
            <div className="my-4">
              <Separator className="bg-sidebar-border" />
            </div>
          )}

          {/* General Admin Section */}
          <div className="space-y-1">
            {!collapsed && (
              <div className="px-3 py-2">
                <p className="text-xs font-semibold text-sidebar-foreground/70 uppercase tracking-wider">
                  General Admin
                </p>
              </div>
            )}
            {generalAdminItems.map(renderNavItem)}
          </div>
        </nav>

        {/* Toggle button */}
        <div className="border-t p-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={onToggle}
            className={cn(
              'w-full justify-center',
              !collapsed && 'justify-end'
            )}
          >
            <ChevronLeft
              className={cn(
                'h-4 w-4 transition-transform',
                collapsed && 'rotate-180'
              )}
            />
            {!collapsed && <span className="ml-2">Collapse</span>}
          </Button>
        </div>
      </aside>
    </TooltipProvider>
  )
}
