'use client'

import * as React from 'react'
import { format } from 'date-fns'
import { Zap, Check, Clock, Lock, Users } from 'lucide-react'
import { toast } from 'sonner'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { ScoreInput } from './score-input'
import { ScorerSelect } from './scorer-select'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { cn } from '@/lib/utils'
import { SPORT_IDS } from '@/lib/constants'
import { getUserDisplayName, getUserInitials } from '@/lib/user-display-utils'
import { saveMatchBet, getMatchFriendPredictions } from '@/actions/user/matches'
import type { UserMatch, FriendPrediction } from '@/actions/user/matches'

interface MatchCardProps {
  match: UserMatch
  onBetSaved?: () => void
}

export function MatchCard({ match, onBetSaved }: MatchCardProps) {
  const homeTeam = match.Match.LeagueTeam_Match_homeTeamIdToLeagueTeam
  const awayTeam = match.Match.LeagueTeam_Match_awayTeamIdToLeagueTeam
  const isLocked = !match.isBettingOpen
  const isEvaluated = match.Match.isEvaluated
  const isPlayoff = match.Match.isPlayoffGame
  const isDoubled = match.isDoubled
  const sportId = match.League.sportId
  const sportGradient = sportId === SPORT_IDS.HOCKEY ? 'gradient-hockey' : 'gradient-football'

  // Form state
  const [homeScore, setHomeScore] = React.useState(match.userBet?.homeScore ?? 0)
  const [awayScore, setAwayScore] = React.useState(match.userBet?.awayScore ?? 0)
  const [scorerId, setScorerId] = React.useState<number | null>(
    match.userBet?.scorerId ?? null
  )
  const [noScorer, setNoScorer] = React.useState<boolean | null>(
    match.userBet?.noScorer ?? null
  )
  const [overtime, setOvertime] = React.useState(match.userBet?.overtime ?? false)
  const [homeAdvanced, setHomeAdvanced] = React.useState<boolean | null>(
    match.userBet?.homeAdvanced ?? null
  )
  const [isSaving, setIsSaving] = React.useState(false)
  const [isSaved, setIsSaved] = React.useState(!!match.userBet)
  const [showFriendsBets, setShowFriendsBets] = React.useState(false)
  const [friendPredictions, setFriendPredictions] = React.useState<FriendPrediction[]>([])
  const [isLoadingFriends, setIsLoadingFriends] = React.useState(false)

  const handleSave = React.useCallback(async () => {
    if (isLocked) return

    setIsSaving(true)
    try {
      const result = await saveMatchBet({
        leagueMatchId: match.id,
        homeScore,
        awayScore,
        scorerId,
        noScorer,
        overtime,
        homeAdvanced,
      })

      if (!result.success) {
        toast.error(result.error || 'Failed to save bet')
        setIsSaved(false)
      } else {
        setIsSaved(true)
        onBetSaved?.()
      }
    } catch {
      toast.error('Failed to save bet')
      setIsSaved(false)
    } finally {
      setIsSaving(false)
    }
  }, [
    match.id,
    homeScore,
    awayScore,
    scorerId,
    noScorer,
    overtime,
    homeAdvanced,
    isLocked,
    onBetSaved,
  ])

  // Handle field changes - mark as unsaved
  const handleHomeScoreChange = (value: number) => {
    setHomeScore(value)
    setIsSaved(false)
  }

  const handleAwayScoreChange = (value: number) => {
    setAwayScore(value)
    setIsSaved(false)
  }

  const handleScorerChange = (value: number | null) => {
    setScorerId(value)
    if (value !== null) {
      setNoScorer(null) // Clear noScorer when player selected
    }
    setIsSaved(false)
  }

  const handleNoScorerChange = (value: boolean | null) => {
    setNoScorer(value)
    if (value === true) {
      setScorerId(null) // Clear scorerId when noScorer selected
    }
    setIsSaved(false)
  }

  const handleOvertimeChange = (checked: boolean) => {
    setOvertime(checked)
    setIsSaved(false)
  }

  const handleAdvancedChange = (value: string) => {
    if (value === 'home') {
      setHomeAdvanced(true)
    } else if (value === 'away') {
      setHomeAdvanced(false)
    } else {
      setHomeAdvanced(null)
    }
    setIsSaved(false)
  }

  // Determine actual result display
  const hasResult =
    match.Match.homeRegularScore !== null &&
    match.Match.awayRegularScore !== null

  const homeTeamName = homeTeam.Team.shortcut || homeTeam.Team.name
  const awayTeamName = awayTeam.Team.shortcut || awayTeam.Team.name

  // Handle opening friends modal
  const handleOpenFriendsBets = async () => {
    setShowFriendsBets(true)
    if (isLocked && friendPredictions.length === 0) {
      setIsLoadingFriends(true)
      try {
        const result = await getMatchFriendPredictions(match.id)
        setFriendPredictions(result.predictions)
      } catch (error) {
        console.error('Failed to load friend predictions:', error)
      } finally {
        setIsLoadingFriends(false)
      }
    }
  }

  return (
    <>
      <div
        className={cn(
          'glass-card rounded-xl p-4 animate-fade-in',
          isLocked && !isEvaluated && 'opacity-80'
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-1.5">
            {/* Phase + Game Number badge */}
            {match.Match.MatchPhase && (
              <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide px-1.5 py-0.5 bg-secondary/50 rounded">
                {match.Match.MatchPhase.name}
                {match.Match.gameNumber && match.Match.MatchPhase.bestOf && match.Match.MatchPhase.bestOf > 1 && (
                  <>, Game {match.Match.gameNumber}</>
                )}
              </span>
            )}

            {/* Fallback badges for backward compatibility (only if no phase) */}
            {!match.Match.MatchPhase && (
              <>
                {homeTeam.group && (
                  <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide px-1.5 py-0.5 bg-secondary/50 rounded">
                    {homeTeam.group}
                  </span>
                )}
                {isPlayoff && (
                  <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide px-1.5 py-0.5 bg-secondary/50 rounded">
                    Playoff
                  </span>
                )}
              </>
            )}
          </div>
          <div className="flex items-center gap-1.5">
            {isDoubled && (
              <span className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-yellow-500/20 text-yellow-600 dark:text-yellow-500 text-[10px] font-bold">
                <Zap className="w-3 h-3" />
                2x
              </span>
            )}
            {isLocked && (
              <span className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-secondary text-muted-foreground text-[10px] font-medium">
                <Lock className="w-3 h-3" />
                Locked
              </span>
            )}
            {!isLocked && (
              <span className="badge-upcoming flex items-center gap-1 text-[10px]">
                <Clock className="w-3 h-3" />
                {format(match.Match.dateTime, 'HH:mm')}
              </span>
            )}
            {isEvaluated && match.userBet && (
              <span
                className={cn(
                  'px-2 py-0.5 rounded text-[10px] font-bold',
                  match.userBet.totalPoints > 0
                    ? 'bg-primary/20 text-primary'
                    : 'bg-secondary text-muted-foreground'
                )}
              >
                +{match.userBet.totalPoints} pts
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
                {hasResult && (
                  <>
                    <span className="text-[10px] text-muted-foreground uppercase">
                      Result
                    </span>
                    <span className="text-lg font-black text-foreground">
                      {match.Match.homeRegularScore} : {match.Match.awayRegularScore}
                    </span>
                    {(match.Match.isOvertime || match.Match.isShootout) && (
                      <span className="text-[10px] text-muted-foreground">
                        {match.Match.isOvertime && 'OT'}
                        {match.Match.isShootout && 'SO'}
                      </span>
                    )}
                  </>
                )}
                {match.userBet && (
                  <div className="flex items-center gap-1">
                    <span className="text-[10px] text-muted-foreground">
                      Your bet:
                    </span>
                    <span className="text-xs font-semibold text-primary">
                      {match.userBet.homeScore}:{match.userBet.awayScore}
                    </span>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <ScoreInput
                  value={homeScore}
                  onChange={handleHomeScoreChange}
                  disabled={isLocked}
                />
                <span className="text-lg font-bold text-muted-foreground">:</span>
                <ScoreInput
                  value={awayScore}
                  onChange={handleAwayScoreChange}
                  disabled={isLocked}
                />
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

        {/* Overtime & Scorer Selection - Editable */}
        {!isLocked && (
          <div className="mt-3 pt-3 border-t border-border/30 space-y-3">
            {/* Soccer Playoff: Team Advancement Radio Buttons */}
            {sportId === SPORT_IDS.FOOTBALL && isPlayoff ? (
              <div className="space-y-2">
                <p className="text-xs text-center text-muted-foreground">
                  Who will advance?
                </p>
                <RadioGroup
                  value={
                    homeAdvanced === true
                      ? 'home'
                      : homeAdvanced === false
                        ? 'away'
                        : 'none'
                  }
                  onValueChange={handleAdvancedChange}
                  className="flex justify-center gap-6"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem
                      value="home"
                      id={`advance-home-${match.id}`}
                      className="border-border data-[state=checked]:border-primary data-[state=checked]:text-primary"
                    />
                    <Label
                      htmlFor={`advance-home-${match.id}`}
                      className="text-xs cursor-pointer"
                    >
                      {homeTeamName}
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem
                      value="away"
                      id={`advance-away-${match.id}`}
                      className="border-border data-[state=checked]:border-primary data-[state=checked]:text-primary"
                    />
                    <Label
                      htmlFor={`advance-away-${match.id}`}
                      className="text-xs cursor-pointer"
                    >
                      {awayTeamName}
                    </Label>
                  </div>
                </RadioGroup>
              </div>
            ) : (
              /* Overtime/Shootout Checkbox for all non-soccer-playoff games */
              <div className="flex items-center justify-center space-x-2">
                <Checkbox
                  id={`overtime-${match.id}`}
                  checked={overtime}
                  onCheckedChange={handleOvertimeChange}
                  className="border-border data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                />
                <Label
                  htmlFor={`overtime-${match.id}`}
                  className="text-xs text-muted-foreground cursor-pointer select-none"
                >
                  Overtime / Shootout
                </Label>
              </div>
            )}

            {/* Scorer Dropdown */}
            {(homeTeam.LeaguePlayer.length > 0 ||
              awayTeam.LeaguePlayer.length > 0) && (
              <ScorerSelect
                value={scorerId}
                onChange={handleScorerChange}
                noScorer={noScorer}
                onNoScorerChange={handleNoScorerChange}
                homePlayers={homeTeam.LeaguePlayer}
                awayPlayers={awayTeam.LeaguePlayer}
                homeTeamName={homeTeamName}
                awayTeamName={awayTeamName}
                sportId={sportId}
                disabled={isLocked}
              />
            )}
          </div>
        )}

        {/* Overtime & Scorer Display - Locked (read-only) */}
        {isLocked && !isEvaluated && match.userBet && (
          <div className="mt-3 pt-3 border-t border-border/30 space-y-2 opacity-60">
            {/* Soccer Playoff: Advance Team Display */}
            {sportId === SPORT_IDS.FOOTBALL && isPlayoff && match.userBet.homeAdvanced !== null ? (
              <div className="flex items-center justify-center gap-1.5 text-xs">
                <span className="text-muted-foreground">Advancing:</span>
                <span className="font-medium text-foreground">
                  {match.userBet.homeAdvanced ? homeTeamName : awayTeamName}
                </span>
              </div>
            ) : (
              /* Overtime/Shootout Display for all non-soccer-playoff games */
              <div className="flex items-center justify-center space-x-2">
                <Checkbox
                  checked={match.userBet.overtime}
                  disabled
                  className="border-border data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                />
                <span className="text-xs text-muted-foreground">
                  Overtime / Shootout
                </span>
              </div>
            )}

            {/* Scorer Display */}
            {match.userBet.noScorer ? (
              <div className="flex items-center justify-center gap-1.5 text-xs">
                <span className="text-muted-foreground">Scorer:</span>
                <span className="font-medium text-foreground italic">No Scorer (0:0)</span>
              </div>
            ) : match.userBet.scorerId && match.userBet.LeaguePlayer ? (
              <div className="flex items-center justify-center gap-1.5 text-xs">
                <span className="text-muted-foreground">Scorer:</span>
                <span className="font-medium text-foreground">
                  {match.userBet.LeaguePlayer.Player.firstName}{' '}
                  {match.userBet.LeaguePlayer.Player.lastName}
                </span>
              </div>
            ) : null}
          </div>
        )}

        {/* Save Button or Status */}
        {!isLocked && (
          <Button
            className={cn(
              'w-full mt-4',
              isSaved ? 'bg-primary/20 text-primary hover:bg-primary/30' : sportGradient
            )}
            size="sm"
            disabled={isSaving}
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

        {/* User's Bet Details - Only for finished matches */}
        {isEvaluated && match.userBet && (
          <div className="mt-3 pt-3 border-t border-border/30 space-y-2">
            {/* Soccer Playoff: Advance Team */}
            {sportId === SPORT_IDS.FOOTBALL && isPlayoff && match.userBet.homeAdvanced !== null && (
              <div className="flex items-center justify-center gap-1.5 text-xs">
                <span className="text-muted-foreground">Advancing:</span>
                <span className="font-medium text-foreground">
                  {match.userBet.homeAdvanced ? homeTeamName : awayTeamName}
                </span>
              </div>
            )}

            {/* Hockey: Overtime/Shootout */}
            {sportId === SPORT_IDS.HOCKEY && match.userBet.overtime && (
              <div className="flex items-center justify-center gap-1.5 text-xs">
                <span className="text-muted-foreground">Your bet:</span>
                <span className="font-medium text-foreground">Overtime / Shootout</span>
              </div>
            )}

            {/* Scorer */}
            {match.userBet.scorerId && match.userBet.LeaguePlayer && (
              <div className="flex items-center justify-center gap-1.5 text-xs">
                <span className="text-muted-foreground">Your scorer:</span>
                <span className="font-medium text-foreground">
                  {match.userBet.LeaguePlayer.Player.firstName}{' '}
                  {match.userBet.LeaguePlayer.Player.lastName}
                </span>
              </div>
            )}
          </div>
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
            {hasResult && (
              <p className="text-sm text-muted-foreground">
                Final: {match.Match.homeRegularScore} - {match.Match.awayRegularScore}
                {match.Match.isOvertime && ' (OT)'}
                {match.Match.isShootout && ' (SO)'}
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
                <p className="text-center text-muted-foreground text-sm py-4">
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
                  const isCorrect = hasResult &&
                    prediction.homeScore === match.Match.homeRegularScore &&
                    prediction.awayScore === match.Match.awayRegularScore

                  // Get scorer name if predicted
                  const scorerName = prediction.LeaguePlayer?.Player
                    ? `${prediction.LeaguePlayer.Player.firstName || ''} ${prediction.LeaguePlayer.Player.lastName || ''}`.trim()
                    : null

                  return (
                    <div
                      key={prediction.id}
                      className="flex items-center justify-between p-3 rounded-lg bg-secondary/30"
                    >
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarFallback className="text-xs font-semibold bg-primary/20 text-primary">
                            {initials}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex flex-col">
                          <span className="font-medium text-sm">{displayName}</span>
                          {scorerName && (
                            <span className="text-xs text-muted-foreground">
                              Scorer: {scorerName}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className={cn(
                          'font-bold text-sm',
                          isCorrect ? 'text-primary' : 'text-foreground'
                        )}>
                          {prediction.homeScore} : {prediction.awayScore}
                        </span>
                        {isEvaluated && prediction.totalPoints !== 0 && (
                          <span className={cn(
                            'px-2 py-0.5 rounded text-[10px] font-bold',
                            prediction.totalPoints > 0
                              ? 'bg-primary/20 text-primary'
                              : 'bg-secondary text-muted-foreground'
                          )}>
                            {prediction.totalPoints > 0 ? '+' : ''}{prediction.totalPoints}
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
