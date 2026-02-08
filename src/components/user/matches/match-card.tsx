'use client'

import { useState, useCallback, useRef } from 'react'
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
import { logger } from '@/lib/logging/client-logger'
import { saveMatchBet, getMatchFriendPredictions } from '@/actions/user/matches'
import type { UserMatch, FriendPrediction } from '@/actions/user/matches'

interface MatchCardProps {
  match: UserMatch
  onBetSaved?: () => void
}

export function MatchCard({ match, onBetSaved }: MatchCardProps) {
  const t = useTranslations('user.matches')
  const homeTeam = match.Match.LeagueTeam_Match_homeTeamIdToLeagueTeam
  const awayTeam = match.Match.LeagueTeam_Match_awayTeamIdToLeagueTeam
  const isLocked = !match.isBettingOpen
  const isEvaluated = match.Match.isEvaluated
  const isDoubled = match.isDoubled ?? false
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
  const [overtime, setOvertime] = useState(match.userBet?.overtime ?? false)
  const [homeAdvanced, setHomeAdvanced] = useState<boolean | null>(
    match.userBet?.homeAdvanced ?? null
  )
  const [isSaving, setIsSaving] = useState(false)
  const [showFriendsBets, setShowFriendsBets] = useState(false)
  const [friendPredictions, setFriendPredictions] = useState<FriendPrediction[]>([])
  const [isLoadingFriends, setIsLoadingFriends] = useState(false)

  // Track last-saved values to derive dirty state
  const savedValuesRef = useRef(
    match.userBet
      ? {
          homeScore: match.userBet.homeScore ?? 0,
          awayScore: match.userBet.awayScore ?? 0,
          scorerId: match.userBet.scorerId ?? null,
          noScorer: match.userBet.noScorer ?? null,
          overtime: match.userBet.overtime ?? false,
          homeAdvanced: match.userBet.homeAdvanced ?? null,
        }
      : null
  )

  const isSaved =
    savedValuesRef.current !== null &&
    homeScore === savedValuesRef.current.homeScore &&
    awayScore === savedValuesRef.current.awayScore &&
    scorerId === savedValuesRef.current.scorerId &&
    noScorer === savedValuesRef.current.noScorer &&
    overtime === savedValuesRef.current.overtime &&
    homeAdvanced === savedValuesRef.current.homeAdvanced

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
        overtime,
        homeAdvanced,
      })

      if (!result.success) {
        toast.error(result.error || 'Failed to save bet')
      } else {
        savedValuesRef.current = { homeScore, awayScore, scorerId, noScorer, overtime, homeAdvanced }
        onBetSaved?.()
      }
    } catch {
      toast.error('Failed to save bet')
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
    }
  }

  const handleNoScorerChange = (value: boolean | null) => {
    setNoScorer(value)
    if (value === true) {
      setScorerId(null) // Clear scorerId when noScorer selected
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
        logger.error('Failed to load friend predictions', { error: error instanceof Error ? error.message : String(error), matchId: match.id })
        toast.error(t('friendsLoadError'))
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
        <MatchHeader
          match={match}
          isEvaluated={isEvaluated}
          isDoubled={isDoubled}
        />

        <MatchTeamsDisplay
          match={match}
          isLocked={isLocked}
          homeScore={homeScore}
          awayScore={awayScore}
          onHomeScoreChange={handleHomeScoreChange}
          onAwayScoreChange={handleAwayScoreChange}
        />

        {/* Betting Controls - Editable when unlocked */}
        {!isLocked && (
          <BetControls
            match={match}
            overtime={overtime}
            onOvertimeChange={handleOvertimeChange}
            homeAdvanced={homeAdvanced}
            onAdvancedChange={handleAdvancedChange}
            scorerId={scorerId}
            onScorerChange={handleScorerChange}
            noScorer={noScorer}
            onNoScorerChange={handleNoScorerChange}
          />
        )}

        {/* Bet Display - Read-only when locked or evaluated */}
        {isLocked && <BetDisplay match={match} isEvaluated={isEvaluated} />}

        {/* Save Button */}
        {!isLocked && (
          <SaveButton
            isSaving={isSaving}
            isSaved={isSaved}
            onClick={handleSave}
            sportId={sportId}
          />
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
          hasResult
            ? `${t('final')} ${match.Match.homeRegularScore} - ${match.Match.awayRegularScore}${
                match.Match.isOvertime ? ' (OT)' : ''
              }${match.Match.isShootout ? ' (SO)' : ''}`
            : undefined
        }
        sectionLabel={t('friendsPredictions')}
        isLocked={isLocked}
        isLoading={isLoadingFriends}
        predictions={friendPredictions}
        emptyMessage={t('noFriendsPredictions')}
        lockedMessage={t('friendsPicksLater')}
      >
        <FriendPredictionsList
          predictions={friendPredictions}
          match={match}
          isEvaluated={isEvaluated}
        />
      </FriendPredictionsModal>
    </>
  )
}
