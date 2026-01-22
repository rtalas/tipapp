'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { Trophy, Plus, Loader2, LogOut, Settings, Moon, Sun, User, ChevronDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useTheme } from 'next-themes'
import { toast } from 'sonner'
import { getAllLeaguesForSelector, joinLeague } from '@/actions/user/leagues'
import { signOut } from 'next-auth/react'

interface AvailableLeaguesContentProps {
  user: {
    id: string
    username?: string | null
    email?: string | null
    firstName?: string | null
    lastName?: string | null
    isSuperadmin?: boolean
  }
}

type League = {
  id: number
  name: string
  seasonFrom: number
  seasonTo: number
  sportId: number
  sport: {
    id: number
    name: string
  }
}

// Helper to get sport emoji
function getSportEmoji(sportId?: number): string {
  switch (sportId) {
    case 1: // HOCKEY
      return '🏒'
    case 2: // FOOTBALL
      return '⚽'
    default:
      return '🏆'
  }
}

// Helper to get sport gradient
function getSportGradient(sportId?: number): string {
  switch (sportId) {
    case 1: // HOCKEY
      return 'from-blue-500 to-cyan-600'
    case 2: // FOOTBALL
      return 'from-green-500 to-emerald-600'
    default:
      return 'from-purple-500 to-pink-600'
  }
}

function LeagueCard({ league, onJoinSuccess }: { league: League; onJoinSuccess: () => void }) {
  const [isJoining, setIsJoining] = React.useState(false)

  const handleJoin = async () => {
    setIsJoining(true)
    try {
      await joinLeague(league.id)
      toast.success(`Joined ${league.name}!`)
      onJoinSuccess()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to join league')
      setIsJoining(false)
    }
  }

  return (
    <div className="glass-card rounded-2xl p-4 border-2 border-border/50 hover:border-primary/30 transition-all">
      <div className="flex items-start gap-4">
        {/* Sport Icon */}
        <div
          className={`flex-shrink-0 w-14 h-14 rounded-xl bg-gradient-to-br ${getSportGradient(
            league.sport.id
          )} flex items-center justify-center text-3xl shadow-lg`}
        >
          {getSportEmoji(league.sport.id)}
        </div>

        {/* League Info */}
        <div className="flex-1 min-w-0">
          <h3 className="font-bold text-lg leading-tight mb-1">{league.name}</h3>
          <p className="text-sm text-muted-foreground mb-3">
            {league.sport.name} • Season {league.seasonFrom}/{league.seasonTo}
          </p>

          {/* Join Button */}
          <Button
            onClick={handleJoin}
            disabled={isJoining}
            className="w-full gradient-primary h-10 text-sm font-semibold"
          >
            {isJoining ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Joining...
              </>
            ) : (
              <>
                <Plus className="h-4 w-4 mr-2" />
                Join League
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}

export function AvailableLeaguesContent({ user }: AvailableLeaguesContentProps) {
  const router = useRouter()
  const { theme, setTheme } = useTheme()
  const [availableLeagues, setAvailableLeagues] = React.useState<League[]>([])
  const [isLoading, setIsLoading] = React.useState(true)

  const loadLeagues = React.useCallback(async () => {
    setIsLoading(true)
    try {
      const data = await getAllLeaguesForSelector()
      setAvailableLeagues(data.availableLeagues)
    } catch (error) {
      toast.error('Failed to load leagues')
    } finally {
      setIsLoading(false)
    }
  }, [])

  React.useEffect(() => {
    loadLeagues()
  }, [loadLeagues])

  const handleJoinSuccess = () => {
    // Redirect to the newly joined league
    router.refresh()
  }

  const handleSignOut = async () => {
    await signOut({ redirect: false })
    router.push('/login')
  }

  // Get user initials
  const userInitials = React.useMemo(() => {
    if (user.firstName && user.lastName) {
      return `${user.firstName[0]}${user.lastName[0]}`.toUpperCase()
    }
    return user.username?.slice(0, 2).toUpperCase() || 'U'
  }, [user])

  // Get display name
  const displayName = React.useMemo(() => {
    if (user.firstName && user.lastName) {
      return `${user.firstName} ${user.lastName}`
    }
    return user.username || user.email || 'User'
  }, [user])

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-secondary/20">
      {/* Header */}
      <div className="fixed top-0 left-0 right-0 z-40 glass-card border-b-0 rounded-b-2xl">
        <div className="flex h-14 items-center justify-between px-4 max-w-2xl mx-auto">
          <div className="flex items-center gap-2">
            <Trophy className="h-6 w-6 text-primary" />
            <span className="font-bold text-lg">TipApp</span>
          </div>

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
              <DropdownMenuItem onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>
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

      {/* Main Content */}
      <div className="pt-20 pb-8 px-4 max-w-2xl mx-auto">
        {/* Welcome Section */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-2">
            Welcome{user.username ? `, ${user.username}` : ''}!
          </h1>
          <p className="text-muted-foreground">
            Join a league below to start making predictions
          </p>
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="flex flex-col items-center justify-center py-16">
            <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
            <p className="text-muted-foreground">Loading available leagues...</p>
          </div>
        )}

        {/* Leagues List */}
        {!isLoading && availableLeagues.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-4">
              <div className="h-px flex-1 bg-border" />
              <span className="text-sm font-semibold text-muted-foreground uppercase px-3">
                Available Leagues
              </span>
              <div className="h-px flex-1 bg-border" />
            </div>

            {availableLeagues.map((league) => (
              <LeagueCard key={league.id} league={league} onJoinSuccess={handleJoinSuccess} />
            ))}
          </div>
        )}

        {/* Empty State */}
        {!isLoading && availableLeagues.length === 0 && (
          <div className="glass-card rounded-2xl p-12 text-center">
            <Trophy className="w-16 h-16 text-muted-foreground opacity-20 mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">No leagues available</h2>
            <p className="text-muted-foreground max-w-md mx-auto">
              There are no public leagues to join at the moment. Please contact an administrator to
              be added to a league.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
