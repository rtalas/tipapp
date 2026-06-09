'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import { useTranslations } from 'next-intl'
import { Users } from 'lucide-react'
import { toast } from 'sonner'
import { FriendPredictionsModal } from '@/components/user/common/friend-predictions-modal'
import { MatchHeader } from './match-header'
import { MatchTeamsDisplay } from './match-teams-display'
import { BetControls } from './bet-controls'
import { BetDisplay } from './bet-display'
import { SaveButton } from './save-button'
import { FriendPredictionsList } from './friend-predictions-list'
import { cn } from '@/lib/utils'
import { SPORT_IDS } from '@/lib/constants'
import { useFriendPredictions } from '@/hooks/useFriendPredictions'
import { saveMatchBet, getMatchFriendPredictions } from '@/actions/user/matches'
import { isMatchPlaceholder } from '@/lib/match-utils'
import type { UserMatch, FriendPrediction } from '@/actions/user/matches'

interface MatchCardProps {
  match: UserMatch
  jokersRemaining: number
  onBetSaved?: () => void
}

export function MatchCard({ match, jokersRemaining, onBetSaved }: MatchCardProps) {
  const t = useTranslations('user.matches')
  const homeTeam = match.Match.LeagueTeam_Match_homeTeamIdToLeagueTeam
  const awayTeam = match.Match.LeagueTeam_Match_awayTeamIdToLeagueTeam
  const isPlaceholder = isMatchPlaceholder(match.Match)
  const isLocked = isPlaceholder || !match.isBettingOpen
  const isEvaluated = match.Match.isEvaluated
  const isDoubled = match.isDoubled ?? false
  const jokerBlocked = match.jokerBlocked ?? false
  const sportId = match.League.sportId

  // Form state
  const [homeScore, setHomeScore] = useState(match.userBet?.homeScore ?? 0)
  const [awayScore, setAwayScore] = useState(match.userBet?.awayScore ?? 0)
  const [scorerId, setScorerId] = useState<number | null>(
    match.userBet?.scorerId ?? null
  )
  const [noScorer, setNoScorer] = useState<boolean | null>(
    match.userBet?.noScorer ?? null
  )
  const [ownGoal, setOwnGoal] = useState<boolean | null>(
    match.userBet?.ownGoal ?? null
  )
  const [overtime, setOvertime] = useState(match.userBet?.overtime ?? false)
  const [homeAdvanced, setHomeAdvanced] = useState<boolean | null>(
    match.userBet?.homeAdvanced ?? null
  )
  const [useJoker, setUseJoker] = useState<boolean>(match.userBet?.usedJoker ?? false)
  const [isSaving, setIsSaving] = useState(false)
  const friends = useFriendPredictions<FriendPrediction>({
    isLocked,
    entityId: match.id,
    entityName: 'match',
    fetchPredictions: getMatchFriendPredictions,
    errorToast: t('friendsLoadError'),
  })

  // Track last-saved values to derive dirty state
  const savedValuesRef = useRef(
    match.userBet
      ? {
          homeScore: match.userBet.homeScore ?? 0,
          awayScore: match.userBet.awayScore ?? 0,
          scorerId: match.userBet.scorerId ?? null,
          noScorer: match.userBet.noScorer ?? null,
          ownGoal: match.userBet.ownGoal ?? null,
          overtime: match.userBet.overtime ?? false,
          homeAdvanced: match.userBet.homeAdvanced ?? null,
          usedJoker: match.userBet.usedJoker ?? false,
        }
      : null
  )

  const isSaved =
    savedValuesRef.current !== null &&
    homeScore === savedValuesRef.current.homeScore &&
    awayScore === savedValuesRef.current.awayScore &&
    scorerId === savedValuesRef.current.scorerId &&
    noScorer === savedValuesRef.current.noScorer &&
    ownGoal === savedValuesRef.current.ownGoal &&
    overtime === savedValuesRef.current.overtime &&
    homeAdvanced === savedValuesRef.current.homeAdvanced &&
    useJoker === savedValuesRef.current.usedJoker

  const handleSave = useCallback(async () => {
    if (isLocked) return

    setIsSaving(true)
    try {
      const result = await saveMatchBet({
        leagueMatchId: match.id,
        homeScore,
        awayScore,
        scorerId,
        noScorer,
        ownGoal,
        overtime,
        homeAdvanced,
        useJoker,
      })

      if (!result.success) {
        toast.error(result.error || t('saveError'))
      } else {
        savedValuesRef.current = { homeScore, awayScore, scorerId, noScorer, ownGoal, overtime, homeAdvanced, usedJoker: useJoker }
        onBetSaved?.()
      }
    } catch {
      toast.error(t('saveError'))
    } finally {
      setIsSaving(false)
    }
  }, [
    match.id,
    homeScore,
    awayScore,
    scorerId,
    noScorer,
    ownGoal,
    overtime,
    homeAdvanced,
    useJoker,
    isLocked,
    onBetSaved,
    t,
  ])

  const handleHomeScoreChange = (value: number) => {
    setHomeScore(value)
  }

  const handleAwayScoreChange = (value: number) => {
    setAwayScore(value)
  }

  const handleScorerChange = (value: number | null) => {
    setScorerId(value)
    if (value !== null) {
      setNoScorer(null) // Clear noScorer when player selected
      setOwnGoal(null) // Clear ownGoal when player selected
    }
  }

  const handleNoScorerChange = (value: boolean | null) => {
    setNoScorer(value)
    if (value === true) {
      setScorerId(null) // Clear scorerId when noScorer selected
      setOwnGoal(null) // Clear ownGoal when noScorer selected
    }
  }

  const handleOwnGoalChange = (value: boolean | null) => {
    setOwnGoal(value)
    if (value === true) {
      setScorerId(null) // Clear scorerId when ownGoal selected
      setNoScorer(null) // Clear noScorer when ownGoal selected
    }
  }

  const handleOvertimeChange = (checked: boolean) => {
    setOvertime(checked)
  }

  const handleAdvancedChange = (value: string) => {
    if (value === 'home') {
      setHomeAdvanced(true)
    } else if (value === 'away') {
      setHomeAdvanced(false)
    } else {
      setHomeAdvanced(null)
    }
  }

  // Soccer playoff: when prediction is non-draw, advancement is implied by score.
  // Keep state in sync so saved value matches what the user sees.
  const isSoccerPlayoff =
    !isPlaceholder && sportId === SPORT_IDS.FOOTBALL && match.Match.isPlayoffGame
  useEffect(() => {
    if (!isSoccerPlayoff || homeScore === awayScore) return
    const implied = homeScore > awayScore
    if (homeAdvanced !== implied) {
      setHomeAdvanced(implied)
    }
  }, [isSoccerPlayoff, homeScore, awayScore, homeAdvanced])

  // Determine actual result display
  const hasResult =
    match.Match.homeRegularScore !== null &&
    match.Match.awayRegularScore !== null

  const homeTeamName = homeTeam?.Team.shortcut || homeTeam?.Team.name || match.Match.homePlaceholder || t('tbd')
  const awayTeamName = awayTeam?.Team.shortcut || awayTeam?.Team.name || match.Match.awayPlaceholder || t('tbd')

  return (
    <>
      <div
        className={cn(
          'glass-card rounded-xl p-4 animate-fade-in',
          isLocked && !isEvaluated && 'opacity-80'
        )}
      >
        <MatchHeader
          match={match}
          isEvaluated={isEvaluated}
          isDoubled={isDoubled}
          jokerBlocked={jokerBlocked}
          jokerUsed={useJoker}
        />

        <MatchTeamsDisplay
          match={match}
          isLocked={isLocked}
          isEvaluated={isEvaluated}
          homeScore={homeScore}
          awayScore={awayScore}
          onHomeScoreChange={handleHomeScoreChange}
          onAwayScoreChange={handleAwayScoreChange}
        />

        {/* Betting Controls - Editable when unlocked */}
        {!isLocked && (
          <BetControls
            match={match}
            homeScore={homeScore}
            awayScore={awayScore}
            overtime={overtime}
            onOvertimeChange={handleOvertimeChange}
            homeAdvanced={homeAdvanced}
            onAdvancedChange={handleAdvancedChange}
            scorerId={scorerId}
            onScorerChange={handleScorerChange}
            noScorer={noScorer}
            onNoScorerChange={handleNoScorerChange}
            ownGoal={ownGoal}
            onOwnGoalChange={handleOwnGoalChange}
            useJoker={useJoker}
            onJokerChange={setUseJoker}
            jokersRemaining={jokersRemaining}
          />
        )}

        {/* Placeholder: show notice instead of bet display */}
        {isPlaceholder && (
          <div className="mt-3 pt-3 border-t border-border/30 text-center text-xs text-muted-foreground">
            {t('waitingForOpponents')}
          </div>
        )}

        {/* Bet Display - Read-only when locked or evaluated (not for placeholders) */}
        {!isPlaceholder && isLocked && <BetDisplay match={match} isEvaluated={isEvaluated} />}

        {/* Save Button */}
        {!isLocked && (
          <SaveButton
            isSaving={isSaving}
            isSaved={isSaved}
            onClick={handleSave}
            sportId={sportId}
          />
        )}

        {/* Friends' Picks Button - Only when betting is closed (not for placeholders) */}
        {!isPlaceholder && isLocked && (
          <div className="mt-3 pt-3 border-t border-border/30 flex justify-center">
            <button
              onClick={friends.open}
              className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <Users className="w-4 h-4" />
              <span>{t('friendsPicks')}</span>
            </button>
          </div>
        )}
      </div>

      {/* Friends Predictions Modal */}
      <FriendPredictionsModal
        open={friends.showModal}
        onOpenChange={friends.setShowModal}
        title={`${homeTeamName} vs ${awayTeamName}`}
        subtitle={
          isEvaluated && hasResult
            ? `${t('final')} ${match.Match.homeFinalScore ?? match.Match.homeRegularScore} - ${match.Match.awayFinalScore ?? match.Match.awayRegularScore}${
                match.Match.isShootout ? ` ${t('shootoutSuffix')}` : match.Match.isOvertime ? ` ${t('overtimeSuffix')}` : ''
              }`
            : undefined
        }
        sectionLabel={t('friendsPredictions')}
        isLocked={isLocked}
        isLoading={friends.isLoading}
        predictions={friends.predictions}
        emptyMessage={t('noFriendsPredictions')}
        lockedMessage={t('friendsPicksLater')}
      >
        <FriendPredictionsList
          predictions={friends.predictions}
          match={match}
          isEvaluated={isEvaluated}
        />
      </FriendPredictionsModal>
    </>
  )
}
