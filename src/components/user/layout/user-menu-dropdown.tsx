'use client'

import { useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { signOut } from 'next-auth/react'
import {
  Moon,
  Sun,
  LogOut,
  User,
  ChevronDown,
  Settings,
  Globe,
} from 'lucide-react'
import { useTheme } from 'next-themes'
import { useTranslations } from 'next-intl'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { UserAvatar } from '@/components/common/user-avatar'

interface UserMenuDropdownProps {
  user: {
    id: string
    username: string
    firstName?: string | null
    lastName?: string | null
    avatarUrl?: string | null
    isSuperadmin?: boolean
  }
  currentLeagueId: number
  onLanguageClick: () => void
}

/**
 * User menu dropdown with profile, settings, theme toggle, and sign out options.
 */
export function UserMenuDropdown({
  user,
  currentLeagueId,
  onLanguageClick,
}: UserMenuDropdownProps) {
  const { resolvedTheme, setTheme } = useTheme()
  const router = useRouter()
  const t = useTranslations('user.header')

  const handleSignOut = async () => {
    await signOut({ redirect: false })
    router.push('/login')
  }

  // Get display name
  const displayName = useMemo(() => {
    if (user.firstName && user.lastName) {
      return `${user.firstName} ${user.lastName}`
    }
    return user.username
  }, [user])

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className="flex items-center gap-1.5 p-1 rounded-full hover:bg-secondary/50 transition-colors"
          aria-label="User menu"
        >
          <UserAvatar
            avatarUrl={user.avatarUrl}
            firstName={user.firstName}
            lastName={user.lastName}
            username={user.username}
            size="sm"
            className="ring-2 ring-primary/30"
            isCurrentUser
          />
          <ChevronDown className="w-4 h-4 text-muted-foreground" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <div className="px-3 py-2 border-b border-border/50">
          <p className="font-semibold text-sm">{displayName}</p>
          <p className="text-xs text-muted-foreground">@{user.username}</p>
        </div>
        <DropdownMenuItem
          onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
        >
          {resolvedTheme === 'dark' ? (
            <Sun className="mr-2 h-4 w-4" />
          ) : (
            <Moon className="mr-2 h-4 w-4" />
          )}
          {resolvedTheme === 'dark' ? t('lightMode') : t('darkMode')}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={onLanguageClick}>
          <Globe className="mr-2 h-4 w-4" />
          {t('language')}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => router.push(`/${currentLeagueId}/profile`)}>
          <User className="mr-2 h-4 w-4" />
          {t('profile')}
        </DropdownMenuItem>
        {user.isSuperadmin && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => router.push('/admin')}>
              <Settings className="mr-2 h-4 w-4" />
              {t('adminDashboard')}
            </DropdownMenuItem>
          </>
        )}
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
  )
}
