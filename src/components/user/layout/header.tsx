'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { signOut } from 'next-auth/react'
import { Moon, Sun, LogOut, User, ChevronDown, Settings, Check } from 'lucide-react'
import { useTheme } from 'next-themes'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { useUserLeagueContext } from '@/contexts/user-league-context'
import { cn } from '@/lib/utils'

interface HeaderProps {
  user: {
    id: string
    username: string
    firstName?: string | null
    lastName?: string | null
    isSuperadmin?: boolean
  }
}

// Helper to get sport emoji
function getSportEmoji(sportId?: number): string {
  switch (sportId) {
    case 1:
      return '⚽'
    case 2:
      return '🏒'
    default:
      return '🏆'
  }
}

export function Header({ user }: HeaderProps) {
  const { theme, setTheme } = useTheme()
  const router = useRouter()
  const { leagues, selectedLeagueId, selectedLeague, setSelectedLeagueId } =
    useUserLeagueContext()
  const [showLeagueDialog, setShowLeagueDialog] = React.useState(false)

  const handleSignOut = async () => {
    await signOut({ redirect: false })
    router.push('/login')
  }

  const handleLeagueSelect = (leagueId: number) => {
    setSelectedLeagueId(leagueId)
    setShowLeagueDialog(false)
  }

  // Get user initials
  const userInitials = React.useMemo(() => {
    if (user.firstName && user.lastName) {
      return `${user.firstName[0]}${user.lastName[0]}`.toUpperCase()
    }
    return user.username.slice(0, 2).toUpperCase()
  }, [user])

  // Get display name
  const displayName = React.useMemo(() => {
    if (user.firstName && user.lastName) {
      return `${user.firstName} ${user.lastName}`
    }
    return user.username
  }, [user])

  return (
    <>
      <header className="fixed top-0 left-0 right-0 z-40 glass-card border-b-0 rounded-b-2xl">
        <div className="flex h-14 items-center justify-between px-4 max-w-2xl mx-auto">
          {/* Left side: League selector */}
          <button
            onClick={() => leagues.length > 1 && setShowLeagueDialog(true)}
            className={cn(
              'flex items-center gap-2 rounded-xl px-3 py-2 transition-colors',
              leagues.length > 1 && 'hover:bg-secondary/50 active:bg-secondary'
            )}
            disabled={leagues.length <= 1}
          >
            {selectedLeague && (
              <>
                <span className="text-lg">
                  {getSportEmoji(selectedLeague.sport?.id)}
                </span>
                <div className="flex flex-col items-start">
                  <span className="font-semibold text-sm leading-tight">
                    {selectedLeague.name}
                  </span>
                  <span className="text-[10px] text-muted-foreground">
                    {selectedLeague.seasonFrom}/{selectedLeague.seasonTo}
                  </span>
                </div>
                {leagues.length > 1 && (
                  <ChevronDown className="h-4 w-4 text-muted-foreground ml-1" />
                )}
              </>
            )}
            {!selectedLeague && (
              <span className="text-muted-foreground text-sm">No league</span>
            )}
          </button>

          {/* Right side: User menu */}
          <div className="flex items-center">
            {/* User dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  className="flex items-center gap-1.5 p-1 rounded-full hover:bg-secondary/50 transition-colors"
                  aria-label="User menu"
                >
                  <Avatar className="h-8 w-8 ring-2 ring-primary/30">
                    <AvatarFallback className="bg-primary text-primary-foreground text-xs font-semibold">
                      {userInitials}
                    </AvatarFallback>
                  </Avatar>
                  <ChevronDown className="w-4 h-4 text-muted-foreground" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <div className="px-3 py-2 border-b border-border/50">
                  <p className="font-semibold text-sm">{displayName}</p>
                  <p className="text-xs text-muted-foreground">@{user.username}</p>
                </div>
                <DropdownMenuItem
                  onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                >
                  {theme === 'dark' ? (
                    <Sun className="mr-2 h-4 w-4" />
                  ) : (
                    <Moon className="mr-2 h-4 w-4" />
                  )}
                  {theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => router.push('/profile')}>
                  <User className="mr-2 h-4 w-4" />
                  Profile
                </DropdownMenuItem>
                {user.isSuperadmin && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => router.push('/admin')}>
                      <Settings className="mr-2 h-4 w-4" />
                      Admin Dashboard
                    </DropdownMenuItem>
                  </>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={handleSignOut}
                  className="text-destructive focus:text-destructive"
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      {/* League Selection Dialog */}
      <Dialog open={showLeagueDialog} onOpenChange={setShowLeagueDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Select League</DialogTitle>
          </DialogHeader>
          <div className="space-y-2 mt-4">
            {leagues.map((league) => (
              <button
                key={league.leagueId}
                onClick={() => handleLeagueSelect(league.leagueId)}
                className={cn(
                  'w-full flex items-center gap-3 p-3 rounded-xl transition-colors text-left',
                  selectedLeagueId === league.leagueId
                    ? 'bg-primary/10 border-2 border-primary'
                    : 'bg-secondary/30 hover:bg-secondary/50 border-2 border-transparent'
                )}
              >
                <span className="text-2xl">
                  {getSportEmoji(league.sport?.id)}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm">{league.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {league.seasonFrom}/{league.seasonTo}
                  </p>
                </div>
                {selectedLeagueId === league.leagueId && (
                  <Check className="h-5 w-5 text-primary shrink-0" />
                )}
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
