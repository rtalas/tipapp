'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { signOut } from 'next-auth/react'
import {
  Moon,
  Sun,
  LogOut,
  User,
  ChevronDown,
  Settings,
  Check,
  Plus,
  Loader2,
  Trophy,
} from 'lucide-react'
import { useTheme } from 'next-themes'
import { useTranslations } from 'next-intl'
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
import { Button } from '@/components/ui/button'
import { useUserLeagueContext } from '@/contexts/user-league-context'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import { getAllLeaguesForSelector, joinLeague } from '@/actions/user/leagues'
import { LanguageSwitcher } from './language-switcher'

interface HeaderProps {
  user: {
    id: string
    username: string
    firstName?: string | null
    lastName?: string | null
    isSuperadmin?: boolean
  }
  locale?: string
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

// League join row component
function LeagueJoinRow({
  league,
  onJoinSuccess,
}: {
  league: {
    id: number
    name: string
    seasonFrom: number
    seasonTo: number
    sport: { id: number; name: string }
  }
  onJoinSuccess: () => void
}) {
  const t = useTranslations('user.header')
  const [isJoining, setIsJoining] = React.useState(false)

  const handleJoin = async (e: React.MouseEvent) => {
    e.stopPropagation()
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
    <div className="flex items-center gap-3 p-3 rounded-xl bg-secondary/20 border-2 border-dashed border-border/50">
      <span className="text-2xl">{getSportEmoji(league.sport?.id)}</span>
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-sm">{league.name}</p>
        <p className="text-xs text-muted-foreground">
          {league.seasonFrom}/{league.seasonTo}
        </p>
      </div>
      <Button
        size="sm"
        onClick={handleJoin}
        disabled={isJoining}
        className="shrink-0 h-8 px-3 text-xs gradient-primary"
      >
        {isJoining ? (
          <Loader2 className="h-3 w-3 animate-spin" />
        ) : (
          <>
            <Plus className="h-3 w-3 mr-1" />
            {t('join')}
          </>
        )}
      </Button>
    </div>
  )
}

export function Header({ user, locale }: HeaderProps) {
  const { theme, setTheme } = useTheme()
  const router = useRouter()
  const t = useTranslations('user.header')
  const { leagues, selectedLeagueId, selectedLeague, setSelectedLeagueId } =
    useUserLeagueContext()
  const [showLeagueDialog, setShowLeagueDialog] = React.useState(false)
  const [showLanguageDialog, setShowLanguageDialog] = React.useState(false)
  const [userLeagues, setUserLeagues] = React.useState<
    Array<{
      id: number
      name: string
      seasonFrom: number
      seasonTo: number
      sportId: number
      leagueId?: number
      sport: { id: number; name: string }
    }>
  >([])
  const [pastLeagues, setPastLeagues] = React.useState<
    Array<{
      id: number
      name: string
      seasonFrom: number
      seasonTo: number
      sportId: number
      leagueId?: number
      sport: { id: number; name: string }
    }>
  >([])
  const [availableLeagues, setAvailableLeagues] = React.useState<
    Array<{
      id: number
      name: string
      seasonFrom: number
      seasonTo: number
      sportId: number
      sport: { id: number; name: string }
    }>
  >([])
  const [isLoadingLeagues, setIsLoadingLeagues] = React.useState(false)

  const loadLeagues = React.useCallback(async () => {
    setIsLoadingLeagues(true)
    try {
      const data = await getAllLeaguesForSelector()
      setUserLeagues(data.userLeagues)
      setPastLeagues(data.pastLeagues)
      setAvailableLeagues(data.availableLeagues)
    } catch (error) {
      toast.error('Failed to load leagues')
    } finally {
      setIsLoadingLeagues(false)
    }
  }, [])

  React.useEffect(() => {
    if (showLeagueDialog) {
      loadLeagues()
    }
  }, [showLeagueDialog, loadLeagues])

  const handleSignOut = async () => {
    await signOut({ redirect: false })
    router.push('/login')
  }

  const handleLeagueSelect = (leagueId: number) => {
    setSelectedLeagueId(leagueId)
    setShowLeagueDialog(false)
  }

  const handleJoinSuccess = () => {
    loadLeagues() // Refresh lists
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
            onClick={() => setShowLeagueDialog(true)}
            className="flex items-center gap-2 rounded-xl px-3 py-2 transition-colors hover:bg-secondary/50 active:bg-secondary"
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
                <ChevronDown className="h-4 w-4 text-muted-foreground ml-1" />
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
                  {theme === 'dark' ? t('lightMode') : t('darkMode')}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setShowLanguageDialog(true)}>
                  <LanguageSwitcher
                    currentLocale={locale || 'en'}
                    open={showLanguageDialog}
                    onOpenChange={setShowLanguageDialog}
                  />
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => router.push('/profile')}>
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
          </div>
        </div>
      </header>

      {/* League Selection Dialog */}
      <Dialog open={showLeagueDialog} onOpenChange={setShowLeagueDialog}>
        <DialogContent className="sm:max-w-md max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t('yourLeagues')}</DialogTitle>
          </DialogHeader>

          {isLoadingLeagues ? (
            <div className="py-8 text-center text-muted-foreground">
              {t('loadingLeagues')}
            </div>
          ) : (
            <>
              {/* User's Leagues Section */}
              {userLeagues.length > 0 && (
                <div className="space-y-2 mt-4">
                  {userLeagues.map((league) => (
                    <button
                      key={league.leagueId}
                      onClick={() => handleLeagueSelect(league.leagueId!)}
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
              )}

              {/* Past Leagues Section */}
              {pastLeagues.length > 0 && (
                <>
                  <div className="mt-6 mb-3 flex items-center gap-2">
                    <div className="h-px flex-1 bg-border" />
                    <span className="text-xs font-semibold text-muted-foreground uppercase">
                      {t('pastLeagues')}
                    </span>
                    <div className="h-px flex-1 bg-border" />
                  </div>

                  <div className="space-y-2">
                    {pastLeagues.map((league) => (
                      <button
                        key={league.leagueId}
                        onClick={() => handleLeagueSelect(league.leagueId!)}
                        className={cn(
                          'w-full flex items-center gap-3 p-3 rounded-xl transition-colors text-left opacity-75',
                          selectedLeagueId === league.leagueId
                            ? 'bg-primary/10 border-2 border-primary'
                            : 'bg-secondary/20 hover:bg-secondary/40 border-2 border-transparent'
                        )}
                      >
                        <span className="text-2xl opacity-60">
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
                </>
              )}

              {/* Available Leagues Section */}
              {availableLeagues.length > 0 && (
                <>
                  <div className="mt-6 mb-3 flex items-center gap-2">
                    <div className="h-px flex-1 bg-border" />
                    <span className="text-xs font-semibold text-muted-foreground uppercase">
                      {t('availableToJoin')}
                    </span>
                    <div className="h-px flex-1 bg-border" />
                  </div>

                  <div className="space-y-2">
                    {availableLeagues.map((league) => (
                      <LeagueJoinRow
                        key={league.id}
                        league={league}
                        onJoinSuccess={handleJoinSuccess}
                      />
                    ))}
                  </div>
                </>
              )}

              {/* Empty State */}
              {userLeagues.length === 0 &&
                pastLeagues.length === 0 &&
                availableLeagues.length === 0 && (
                  <div className="py-8 text-center">
                    <Trophy className="w-12 h-12 text-muted-foreground opacity-20 mx-auto mb-3" />
                    <p className="text-sm text-muted-foreground">{t('noLeaguesAvailable')}</p>
                  </div>
                )}
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
