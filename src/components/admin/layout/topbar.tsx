'use client'

import * as React from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { signOut } from 'next-auth/react'
import { Menu, Moon, Sun, LogOut, User } from 'lucide-react'
import { useTheme } from 'next-themes'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Breadcrumbs } from './breadcrumbs'
import { LeagueSelector } from './league-selector'
import { LanguageSwitcher } from '@/components/user/layout/language-switcher'
import { cn } from '@/lib/utils'
import type { League } from '@prisma/client'

interface TopbarProps {
  sidebarCollapsed: boolean
  onMenuClick: () => void
  user?: {
    username: string
    isSuperadmin: boolean
  }
  leagues: League[]
  locale?: string
}

export function Topbar({ sidebarCollapsed, onMenuClick, user, leagues, locale }: TopbarProps) {
  const t = useTranslations('admin.common')
  const { theme, setTheme } = useTheme()
  const router = useRouter()
  const pathname = usePathname()
  const [showLanguageDialog, setShowLanguageDialog] = React.useState(false)

  const handleSignOut = async () => {
    await signOut({ redirect: false })
    router.push('/login')
  }

  const userInitials = user?.username
    ? user.username.slice(0, 2).toUpperCase()
    : 'AD'

  // Extract leagueId from URL
  const leagueIdMatch = pathname.match(/^\/admin\/(\d+)/)
  const currentLeagueId = leagueIdMatch ? parseInt(leagueIdMatch[1], 10) : undefined

  // Show league selector if we have leagues (always visible)
  const showLeagueSelector = leagues.length > 0

  return (
    <header
      className={cn(
        'fixed top-0 right-0 z-10 flex h-16 items-center justify-between border-b bg-background px-4 transition-all duration-300 left-0',
        'lg:left-0',
        sidebarCollapsed ? 'lg:left-16' : 'lg:left-64'
      )}
    >
      {/* Left side: Menu button (mobile) + Breadcrumbs */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          className="lg:hidden"
          onClick={onMenuClick}
        >
          <Menu className="h-5 w-5" />
          <span className="sr-only">{t('toggleMenu')}</span>
        </Button>
        <Breadcrumbs leagues={leagues} />
      </div>

      {/* Right side: League selector + Theme toggle + User menu */}
      <div className="flex items-center gap-2">
        {/* League selector (only on league-specific routes) */}
        {showLeagueSelector && (
          <LeagueSelector leagues={leagues} currentLeagueId={currentLeagueId} />
        )}

        {/* Theme toggle */}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          aria-label={t('toggleTheme')}
        >
          <Sun className="h-5 w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
          <Moon className="absolute h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
          <span className="sr-only">{t('toggleTheme')}</span>
        </Button>

        {/* User dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="flex items-center gap-2 px-2">
              <Avatar className="h-8 w-8">
                <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                  {userInitials}
                </AvatarFallback>
              </Avatar>
              <div className="hidden flex-col items-start text-left lg:flex">
                <span className="text-sm font-medium">
                  {user?.username || t('admin')}
                </span>
                {user?.isSuperadmin && (
                  <Badge variant="admin" className="text-[10px] px-1.5 py-0">
                    {t('superadmin')}
                  </Badge>
                )}
              </div>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>{t('myAccount')}</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => router.push('/admin/profile')}>
              <User className="mr-2 h-4 w-4" />
              {t('profile')}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setShowLanguageDialog(true)}>
              <LanguageSwitcher
                currentLocale={locale || 'en'}
                open={showLanguageDialog}
                onOpenChange={setShowLanguageDialog}
              />
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={handleSignOut}
              className="text-destructive focus:text-destructive"
            >
              <LogOut className="mr-2 h-4 w-4" />
              {t('signOut')}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
