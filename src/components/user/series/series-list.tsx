'use client'

import * as React from 'react'
import { format } from 'date-fns'
import { Swords, Minus, Plus, Check, Lock, Clock, Users } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { CountdownBadge } from '@/components/user/common/countdown-badge'
import { RefreshButton } from '@/components/user/common/refresh-button'
import { PullToRefresh } from '@/components/user/common/pull-to-refresh'
import { useRefresh } from '@/hooks/useRefresh'
import { cn } from '@/lib/utils'
import { SPORT_IDS } from '@/lib/constants'
import { groupByDate, getDateLabel } from '@/lib/date-grouping-utils'
import { getUserDisplayName, getUserInitials } from '@/lib/user-display-utils'
import { saveSeriesBet, getSeriesFriendPredictions } from '@/actions/user/series'
import type { UserSeries, SeriesFriendPrediction } from '@/actions/user/series'

interface SeriesListProps {
  series: UserSeries[]
}

type FilterType = 'current' | 'past'

export function SeriesList({ series }: SeriesListProps) {
  const { isRefreshing, refresh, refreshAsync } = useRefresh()
  const [filter, setFilter] = React.useState<FilterType>('current')

  // Filter series
  const currentSeries = series.filter((s) => !s.isEvaluated)
  const pastSeries = series.filter((s) => s.isEvaluated)
  const displayedSeries = filter === 'current' ? currentSeries : pastSeries

  // Group by date
  const groupedSeries = React.useMemo(() => {
    const sorted = [...displayedSeries].sort((a, b) => {
      if (filter === 'past') {
        return new Date(b.dateTime).getTime() - new Date(a.dateTime).getTime()
      }
      return new Date(a.dateTime).getTime() - new Date(b.dateTime).getTime()
    })
    return groupByDate(sorted)
  }, [displayedSeries, filter])

  if (series.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <Swords className="mb-4 h-12 w-12 text-muted-foreground opacity-30" />
        <h3 className="text-lg font-medium">No series bets</h3>
        <p className="text-sm text-muted-foreground">
          Series will appear here during playoffs
        </p>
      </div>
    )
  }

  return (
    <div className="animate-fade-in">
      {/* Fixed Header */}
      <div className="fixed top-14 left-0 right-0 z-30 glass-card border-b-0 rounded-b-2xl">
        <div className="max-w-2xl mx-auto px-4 py-4 space-y-4">
          {/* Title */}
          <div className="flex items-center gap-2">
            <Swords className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-bold text-foreground">Series</h2>
          </div>

          {/* Filter tabs and refresh */}
          <div className="flex items-center justify-between gap-2">
            <Tabs
              value={filter}
              onValueChange={(v) => setFilter(v as FilterType)}
              className="w-full"
            >
              <TabsList className="grid w-full grid-cols-2 bg-secondary/50">
                <TabsTrigger value="current" className="data-[state=active]:bg-card">
                  Current
                </TabsTrigger>
                <TabsTrigger value="past" className="data-[state=active]:bg-card">
                  Past
                </TabsTrigger>
              </TabsList>
            </Tabs>

            <RefreshButton isRefreshing={isRefreshing} onRefresh={refresh} />
          </div>
        </div>
      </div>

      {/* Content with padding for fixed header */}
      <PullToRefresh onRefresh={refreshAsync}>
        <div className="pt-32 space-y-4">
        {/* Series grouped by date */}
        {displayedSeries.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <Swords className="w-12 h-12 mx-auto mb-4 opacity-30" />
            <p className="font-medium">
              No {filter === 'current' ? 'upcoming' : 'past'} series
            </p>
            <p className="text-sm">
              {filter === 'current'
                ? 'Series will appear here during playoffs'
                : 'No completed series yet'}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {Array.from(groupedSeries.entries()).map(([dateKey, dateSeries]) => (
              <div key={dateKey} className="space-y-3">
                {/* Date Divider */}
                <div className="flex items-center gap-3">
                  <div className="h-px flex-1 bg-border" />
                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide px-2">
                    {getDateLabel(new Date(dateKey))}
                </span>
                  <div className="h-px flex-1 bg-border" />
                </div>

                {/* Series for this date */}
                {dateSeries.map((s) => (
                  <SeriesCard key={s.id} series={s} onSaved={refresh} />
                ))}
              </div>
            ))}
          </div>
        )}
        </div>
      </PullToRefresh>
    </div>
  )
}

function SeriesCard({
  series,
  onSaved,
}: {
  series: UserSeries
  onSaved: () => void
}) {
  const homeTeam = series.LeagueTeam_LeagueSpecialBetSerie_homeTeamIdToLeagueTeam
  const awayTeam = series.LeagueTeam_LeagueSpecialBetSerie_awayTeamIdToLeagueTeam
  const isLocked = !series.isBettingOpen
  const isEvaluated = series.isEvaluated
  const bestOf = series.SpecialBetSerie.bestOf
  const winsNeeded = Math.ceil(bestOf / 2)
  const sportId = series.League?.sportId
  const sportGradient = sportId === SPORT_IDS.HOCKEY ? 'gradient-hockey' : 'gradient-football'

  const [homeScore, setHomeScore] = React.useState(series.userBet?.homeTeamScore ?? 0)
  const [awayScore, setAwayScore] = React.useState(series.userBet?.awayTeamScore ?? 0)
  const [isSaving, setIsSaving] = React.useState(false)
  const [isSaved, setIsSaved] = React.useState(!!series.userBet)
  const [showFriendsBets, setShowFriendsBets] = React.useState(false)
  const [friendPredictions, setFriendPredictions] = React.useState<SeriesFriendPrediction[]>([])
  const [isLoadingFriends, setIsLoadingFriends] = React.useState(false)

  const homeTeamName = homeTeam?.Team.shortcut || homeTeam?.Team.name || 'Home'
  const awayTeamName = awayTeam?.Team.shortcut || awayTeam?.Team.name || 'Away'

  const handleSave = async () => {
    if (isLocked) return
    if (homeScore < winsNeeded && awayScore < winsNeeded) return

    setIsSaving(true)
    try {
      const result = await saveSeriesBet({
        leagueSpecialBetSerieId: series.id,
        homeTeamScore: homeScore,
        awayTeamScore: awayScore,
      })

      if (!result.success) {
        toast.error(result.error || 'Failed to save')
        setIsSaved(false)
      } else {
        setIsSaved(true)
        onSaved()
      }
    } catch {
      toast.error('Failed to save')
      setIsSaved(false)
    } finally {
      setIsSaving(false)
    }
  }

  const handleOpenFriendsBets = async () => {
    setShowFriendsBets(true)
    if (isLocked && friendPredictions.length === 0) {
      setIsLoadingFriends(true)
      try {
        const result = await getSeriesFriendPredictions(series.id)
        setFriendPredictions(result.predictions)
      } catch (error) {
        console.error('Failed to load friend predictions:', error)
      } finally {
        setIsLoadingFriends(false)
      }
    }
  }

  const adjustScore = (team: 'home' | 'away', delta: number) => {
    setIsSaved(false)
    let newHome = homeScore
    let newAway = awayScore

    if (team === 'home') {
      newHome = Math.max(0, Math.min(winsNeeded, homeScore + delta))
      if (newHome === winsNeeded) {
        newAway = Math.min(newAway, winsNeeded - 1)
      }
    } else {
      newAway = Math.max(0, Math.min(winsNeeded, awayScore + delta))
      if (newAway === winsNeeded) {
        newHome = Math.min(newHome, winsNeeded - 1)
      }
    }

    setHomeScore(newHome)
    setAwayScore(newAway)
  }

  return (
    <>
      <div
        className={cn(
          'glass-card rounded-xl p-4 animate-fade-in',
          isEvaluated && 'opacity-80'
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div
              className={cn(
                'w-8 h-8 rounded-lg flex items-center justify-center',
                sportGradient
              )}
            >
              <Swords className="w-4 h-4 text-white" />
            </div>
            <div>
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Best of {bestOf}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            {isLocked && (
              <span className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-secondary text-muted-foreground text-[10px] font-medium">
                <Lock className="w-3 h-3" />
                Locked
              </span>
            )}
            {!isLocked && <CountdownBadge deadline={series.dateTime} />}
            {!isLocked && (
              <span className="badge-upcoming flex items-center gap-1 text-[10px]">
                <Clock className="w-3 h-3" />
                {format(series.dateTime, 'HH:mm')}
              </span>
            )}
            {isEvaluated && series.userBet && (
              <span
                className={cn(
                  'px-2 py-0.5 rounded text-[10px] font-bold',
                  series.userBet.totalPoints > 0
                    ? 'bg-primary/20 text-primary'
                    : 'bg-secondary text-muted-foreground'
                )}
              >
                +{series.userBet.totalPoints} pts
              </span>
            )}
          </div>
        </div>

        {/* Teams - Responsive */}
        <div className="flex items-center justify-between gap-2 sm:gap-4">
          {/* Home Team */}
          <div className="flex flex-col items-center gap-1 min-w-0 flex-1 p-2">
            <p className="font-semibold text-xs sm:text-sm text-foreground text-center leading-tight line-clamp-2">
              {homeTeamName}
            </p>
          </div>

          {/* Score Selection */}
          <div className="flex items-center gap-2 shrink-0">
            {isLocked ? (
              <div className="flex flex-col items-center gap-1">
                <span className="text-[10px] text-muted-foreground uppercase">
                  Result
                </span>
                {series.homeTeamScore !== null && series.awayTeamScore !== null && (
                  <span className="text-lg font-black text-foreground">
                    {series.homeTeamScore} : {series.awayTeamScore}
                  </span>
                )}
                {series.userBet && (
                  <div className="flex items-center gap-1">
                    <span className="text-[10px] text-muted-foreground">
                      Your bet:
                    </span>
                    <span className="text-xs font-semibold text-primary">
                      {series.userBet.homeTeamScore}:{series.userBet.awayTeamScore}
                    </span>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => adjustScore('home', -1)}
                    disabled={homeScore <= 0}
                    className={cn(
                      'score-button',
                      homeScore <= 0 && 'opacity-50 cursor-not-allowed'
                    )}
                  >
                    <Minus className="w-3 h-3" />
                  </button>
                  <span className="score-display">{homeScore}</span>
                  <button
                    type="button"
                    onClick={() => adjustScore('home', 1)}
                    disabled={homeScore >= winsNeeded || awayScore >= winsNeeded}
                    className={cn(
                      'score-button',
                      (homeScore >= winsNeeded || awayScore >= winsNeeded) &&
                        'opacity-50 cursor-not-allowed'
                    )}
                  >
                    <Plus className="w-3 h-3" />
                  </button>
                </div>
                <span className="text-lg font-bold text-muted-foreground">:</span>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => adjustScore('away', -1)}
                    disabled={awayScore <= 0}
                    className={cn(
                      'score-button',
                      awayScore <= 0 && 'opacity-50 cursor-not-allowed'
                    )}
                  >
                    <Minus className="w-3 h-3" />
                  </button>
                  <span className="score-display">{awayScore}</span>
                  <button
                    type="button"
                    onClick={() => adjustScore('away', 1)}
                    disabled={awayScore >= winsNeeded || homeScore >= winsNeeded}
                    className={cn(
                      'score-button',
                      (awayScore >= winsNeeded || homeScore >= winsNeeded) &&
                        'opacity-50 cursor-not-allowed'
                    )}
                  >
                    <Plus className="w-3 h-3" />
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Away Team */}
          <div className="flex flex-col items-center gap-1 min-w-0 flex-1 p-2">
            <p className="font-semibold text-xs sm:text-sm text-foreground text-center leading-tight line-clamp-2">
              {awayTeamName}
            </p>
          </div>
        </div>

        {/* Save Button */}
        {!isLocked && (
          <Button
            className={cn(
              'w-full mt-4',
              isSaved ? 'bg-primary/20 text-primary hover:bg-primary/30' : sportGradient
            )}
            size="sm"
            disabled={isSaving || (homeScore < winsNeeded && awayScore < winsNeeded)}
            onClick={handleSave}
          >
            {isSaving ? (
              <span className="animate-pulse">Saving...</span>
            ) : isSaved ? (
              <>
                <Check className="w-4 h-4 mr-2" />
                Saved
              </>
            ) : (
              <>
                <Check className="w-4 h-4 mr-2" />
                Save Prediction
              </>
            )}
          </Button>
        )}

        {/* Friends' Picks Button - Only when betting is closed */}
        {isLocked && (
          <div className="mt-3 pt-3 border-t border-border/30 flex justify-center">
            <button
              onClick={handleOpenFriendsBets}
              className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              <Users className="w-3.5 h-3.5" />
              <span>Friends' picks</span>
            </button>
          </div>
        )}
      </div>

      {/* Friends Predictions Modal */}
      <Dialog open={showFriendsBets} onOpenChange={setShowFriendsBets}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <span>{homeTeamName}</span>
              <span className="text-muted-foreground">vs</span>
              <span>{awayTeamName}</span>
            </DialogTitle>
            {series.homeTeamScore !== null && series.awayTeamScore !== null && (
              <p className="text-sm text-muted-foreground">
                Final: {series.homeTeamScore} - {series.awayTeamScore}
              </p>
            )}
          </DialogHeader>
          <div className="mt-4">
            <div className="flex items-center gap-2 mb-3">
              <Users className="w-4 h-4 text-muted-foreground" />
              <span className="font-medium text-sm">Friends' Predictions</span>
            </div>
            <div className="space-y-2 max-h-[40vh] overflow-y-auto">
              {!isLocked ? (
                <p className="text-center text-muted-foreground text-sm py-4">
                  Friends' picks will be visible after betting closes
                </p>
              ) : isLoadingFriends ? (
                <p className="text-center text-muted-foreground text-sm py-4 animate-pulse">
                  Loading...
                </p>
              ) : friendPredictions.length === 0 ? (
                <p className="text-center text-muted-foreground text-sm py-4">
                  No friends' predictions yet
                </p>
              ) : (
                friendPredictions.map((prediction) => {
                  const user = prediction.LeagueUser.User
                  const displayName = getUserDisplayName(user)
                  const initials = getUserInitials(user)

                  return (
                    <div
                      key={prediction.id}
                      className="flex items-center justify-between p-3 rounded-lg bg-secondary/50"
                    >
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarFallback className="text-xs bg-primary/20 text-primary">
                            {initials}
                          </AvatarFallback>
                        </Avatar>
                        <span className="font-medium text-sm">{displayName}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-foreground">
                          {prediction.homeTeamScore} : {prediction.awayTeamScore}
                        </span>
                        {prediction.totalPoints > 0 && (
                          <span className="text-xs font-semibold text-primary bg-primary/20 px-1.5 py-0.5 rounded">
                            +{prediction.totalPoints}
                          </span>
                        )}
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
