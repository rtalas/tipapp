'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { format } from 'date-fns'
import { Swords, Minus, Plus, Check, Clock, Users } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { UserAvatar } from '@/components/common/user-avatar'
import { CountdownBadge } from '@/components/user/common/countdown-badge'
import { StatusBadge } from '@/components/user/common/status-badge'
import { FriendPredictionsModal } from '@/components/user/common/friend-predictions-modal'
import { TeamFlag } from '@/components/common/team-flag'
import { cn } from '@/lib/utils'
import { logger } from '@/lib/logging/client-logger'
import { SPORT_IDS } from '@/lib/constants'
import { getUserDisplayName } from '@/lib/user-display-utils'
import { saveSeriesBet, getSeriesFriendPredictions } from '@/actions/user/series'
import type { UserSeries, SeriesFriendPrediction } from '@/actions/user/series'

interface SeriesCardProps {
  series: UserSeries
  onSaved: () => void
}

export function SeriesCard({ series, onSaved }: SeriesCardProps) {
  const t = useTranslations('user.series')
  const homeTeam = series.LeagueTeam_LeagueSpecialBetSerie_homeTeamIdToLeagueTeam
  const awayTeam = series.LeagueTeam_LeagueSpecialBetSerie_awayTeamIdToLeagueTeam
  const isLocked = !series.isBettingOpen
  const isEvaluated = series.isEvaluated
  const bestOf = series.SpecialBetSerie.bestOf
  const winsNeeded = Math.ceil(bestOf / 2)
  const sportId = series.League?.sportId
  const sportGradient = sportId === SPORT_IDS.HOCKEY ? 'gradient-hockey' : 'gradient-football'

  const [homeScore, setHomeScore] = useState(series.userBet?.homeTeamScore ?? 0)
  const [awayScore, setAwayScore] = useState(series.userBet?.awayTeamScore ?? 0)
  const [isSaving, setIsSaving] = useState(false)
  const [isSaved, setIsSaved] = useState(!!series.userBet)
  const [showFriendsBets, setShowFriendsBets] = useState(false)
  const [friendPredictions, setFriendPredictions] = useState<SeriesFriendPrediction[]>([])
  const [isLoadingFriends, setIsLoadingFriends] = useState(false)

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
        toast.error(result.error || t('saveError'))
        setIsSaved(false)
      } else {
        setIsSaved(true)
        onSaved()
      }
    } catch {
      toast.error(t('saveError'))
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
        logger.error('Failed to load friend predictions', { error: error instanceof Error ? error.message : String(error), seriesId: series.id })
        toast.error(t('friendsLoadError'))
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
                {t('bestOf', { count: bestOf })}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            {/* Status badge: Scheduled or Awaiting evaluation */}
            <StatusBadge dateTime={series.dateTime} isEvaluated={isEvaluated} />
            {/* Countdown and time badges - only show for non-evaluated events */}
            {!isEvaluated && !isLocked && <CountdownBadge deadline={series.dateTime} />}
            {!isEvaluated && (
              <span className="badge-upcoming flex items-center gap-1 text-[10px]">
                <Clock className="w-3 h-3" />
                {format(series.dateTime, 'HH:mm')}
              </span>
            )}
            {/* Points badge - only show for evaluated series */}
            {isEvaluated && series.userBet && (
              <span
                className={cn(
                  'px-2 py-0.5 rounded text-[10px] font-bold',
                  series.userBet.totalPoints > 0
                    ? 'bg-primary/20 text-primary'
                    : 'bg-secondary text-muted-foreground'
                )}
              >
                +{series.userBet.totalPoints} {t('pointsShort')}
              </span>
            )}
          </div>
        </div>

        {/* Teams - Responsive */}
        <div className="flex items-center justify-between gap-2 sm:gap-4">
          {/* Home Team */}
          <div className="flex flex-col items-center gap-1 min-w-0 flex-1 p-2">
            <div className="flex items-center gap-2">
              <TeamFlag
                flagIcon={homeTeam?.Team.flagIcon ?? null}
                flagType={homeTeam?.Team.flagType ?? null}
                teamName={homeTeam?.Team.name ?? 'Home'}
                size="sm"
                className="sm:w-6 sm:h-6"
              />
              <p className="font-semibold text-xs sm:text-sm text-foreground text-center leading-tight line-clamp-2">
                {homeTeamName}
              </p>
            </div>
          </div>

          {/* Score Selection */}
          <div className="flex items-center gap-2 shrink-0">
            {isLocked ? (
              <div className="flex flex-col items-center gap-1">
                <span className="text-[10px] text-muted-foreground uppercase">
                  {t('result')}
                </span>
                {series.homeTeamScore !== null && series.awayTeamScore !== null && (
                  <span className="text-lg font-black text-foreground">
                    {series.homeTeamScore} : {series.awayTeamScore}
                  </span>
                )}
                {series.userBet && (
                  <div className="flex items-center gap-1">
                    <span className="text-[10px] text-muted-foreground">
                      {t('yourBet')}
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
            <div className="flex items-center gap-2">
              <TeamFlag
                flagIcon={awayTeam?.Team.flagIcon ?? null}
                flagType={awayTeam?.Team.flagType ?? null}
                teamName={awayTeam?.Team.name ?? 'Away'}
                size="sm"
                className="sm:w-6 sm:h-6"
              />
              <p className="font-semibold text-xs sm:text-sm text-foreground text-center leading-tight line-clamp-2">
                {awayTeamName}
              </p>
            </div>
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
              <span className="animate-pulse">{t('saving')}</span>
            ) : isSaved ? (
              <>
                <Check className="w-4 h-4 mr-2" />
                {t('saved')}
              </>
            ) : (
              <>
                <Check className="w-4 h-4 mr-2" />
                {t('savePrediction')}
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
              <span>{t('friendsPicks')}</span>
            </button>
          </div>
        )}
      </div>

      {/* Friends Predictions Modal */}
      <FriendPredictionsModal
        open={showFriendsBets}
        onOpenChange={setShowFriendsBets}
        title={`${homeTeamName} vs ${awayTeamName}`}
        subtitle={
          series.homeTeamScore !== null && series.awayTeamScore !== null
            ? `${t('final')} ${series.homeTeamScore} - ${series.awayTeamScore}`
            : undefined
        }
        sectionLabel={t('friendsPredictions')}
        isLocked={isLocked}
        isLoading={isLoadingFriends}
        predictions={friendPredictions}
        emptyMessage={t('noFriendsPredictions')}
        lockedMessage={t('friendsPicksLater')}
        loadingMessage={t('loading')}
      >
        {friendPredictions.map((prediction) => {
          const user = prediction.LeagueUser.User
          const displayName = getUserDisplayName(user)

          return (
            <div
              key={prediction.id}
              className="flex items-center justify-between p-3 rounded-lg bg-secondary/50"
            >
              <div className="flex items-center gap-3">
                <UserAvatar
                  avatarUrl={user.avatarUrl}
                  firstName={user.firstName}
                  lastName={user.lastName}
                  username={user.username}
                  size="sm"
                />
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
        })}
      </FriendPredictionsModal>
    </>
  )
}
