'use client'

import { useState, useCallback, useEffect } from 'react'
import { Plus, Loader2, Check, Trophy } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { cn } from '@/lib/utils'
import { getAllLeaguesForSelector, joinLeague } from '@/actions/user/leagues'

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
  const [isJoining, setIsJoining] = useState(false)

  const handleJoin = async (e: React.MouseEvent) => {
    e.stopPropagation()
    setIsJoining(true)
    try {
      await joinLeague(league.id)
      toast.success(t('joinedLeague', { leagueName: league.name }))
      onJoinSuccess()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t('joinFailed'))
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

interface LeagueData {
  id: number
  name: string
  seasonFrom: number
  seasonTo: number
  sportId: number
  leagueId?: number
  sport: { id: number; name: string }
}

interface LeagueSelectionDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  selectedLeagueId: number | null
  onLeagueSelect: (leagueId: number) => void
}

/**
 * Dialog for selecting leagues and joining new leagues.
 * Displays user's leagues, past leagues, and available leagues to join.
 */
export function LeagueSelectionDialog({
  open,
  onOpenChange,
  selectedLeagueId,
  onLeagueSelect,
}: LeagueSelectionDialogProps) {
  const t = useTranslations('user.header')
  const [userLeagues, setUserLeagues] = useState<LeagueData[]>([])
  const [pastLeagues, setPastLeagues] = useState<LeagueData[]>([])
  const [availableLeagues, setAvailableLeagues] = useState<LeagueData[]>([])
  const [isLoadingLeagues, setIsLoadingLeagues] = useState(false)

  const loadLeagues = useCallback(async () => {
    setIsLoadingLeagues(true)
    try {
      const data = await getAllLeaguesForSelector()
      setUserLeagues(data.userLeagues)
      setPastLeagues(data.pastLeagues)
      setAvailableLeagues(data.availableLeagues)
    } catch {
      toast.error(t('loadFailed'))
    } finally {
      setIsLoadingLeagues(false)
    }
  }, [t])

  useEffect(() => {
    if (open) {
      loadLeagues()
    }
  }, [open, loadLeagues])

  const handleLeagueSelect = (leagueId: number) => {
    onLeagueSelect(leagueId)
    onOpenChange(false)
  }

  const handleJoinSuccess = () => {
    loadLeagues() // Refresh lists
  }

  return (
    <>
      {/* League Selection Dialog */}
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t('yourLeagues')}</DialogTitle>
            <DialogDescription className="sr-only">
              {t('selectLeagueDescription')}
            </DialogDescription>
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
