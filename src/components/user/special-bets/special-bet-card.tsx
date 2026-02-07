'use client'

import { useState, useMemo } from 'react'
import { useTranslations } from 'next-intl'
import { format } from 'date-fns'
import { Trophy, Target, Clock, Check, Users, CheckCircle } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { UserAvatar } from '@/components/common/user-avatar'
import { CountdownBadge } from '@/components/user/common/countdown-badge'
import { StatusBadge } from '@/components/user/common/status-badge'
import { FriendPredictionsModal } from '@/components/user/common/friend-predictions-modal'
import { SearchableSelect } from '@/components/user/special-bets/searchable-select'
import { TeamFlag } from '@/components/common/team-flag'
import { cn } from '@/lib/utils'
import { getUserDisplayName } from '@/lib/user-display-utils'
import { saveSpecialBet, getSpecialBetFriendPredictions } from '@/actions/user/special-bets'
import type { UserSpecialBet, SpecialBetFriendPrediction } from '@/actions/user/special-bets'
import type { ExactPlayerConfig } from '@/lib/evaluators/types'

function isExactPlayerConfig(value: unknown): value is ExactPlayerConfig {
  return (
    typeof value === 'object' &&
    value !== null &&
    'positions' in value &&
    (Array.isArray((value as ExactPlayerConfig).positions) || (value as ExactPlayerConfig).positions === null)
  )
}

interface SpecialBetCardProps {
  specialBet: UserSpecialBet
  teams: Array<{
    id: number
    group: string | null
    Team: {
      id: number
      name: string
      shortcut: string
      flagIcon?: string | null
      flagType?: string | null
    }
  }>
  players: Array<{
    id: number
    Player: { id: number; firstName: string | null; lastName: string | null; position: string | null }
    LeagueTeam: { Team: { shortcut: string } }
  }>
  onSaved: () => void
}

export function SpecialBetCard({
  specialBet,
  teams,
  players,
  onSaved,
}: SpecialBetCardProps) {
  const t = useTranslations('user.specialBets')
  const isLocked = !specialBet.isBettingOpen
  const isEvaluated = specialBet.isEvaluated

  // Determine bet type from evaluator type (primary) or fallback to SpecialBetSingleType (legacy)
  const evaluatorTypeName = specialBet.Evaluator?.EvaluatorType?.name || ''
  const betTypeId = specialBet.SpecialBetSingle?.SpecialBetSingleType?.id

  const [teamId, setTeamId] = useState<number | null>(
    specialBet.userBet?.teamResultId ?? null
  )
  const [playerId, setPlayerId] = useState<number | null>(
    specialBet.userBet?.playerResultId ?? null
  )
  const [value, setValue] = useState<number | null>(
    specialBet.userBet?.value ?? null
  )
  const [isSaving, setIsSaving] = useState(false)
  const [isSaved, setIsSaved] = useState(!!specialBet.userBet)
  const [showFriendsBets, setShowFriendsBets] = useState(false)
  const [friendPredictions, setFriendPredictions] = useState<SpecialBetFriendPrediction[]>([])
  const [isLoadingFriends, setIsLoadingFriends] = useState(false)

  // Determine bet type from evaluator type (primary) or SpecialBetSingleType (legacy fallback)
  const isTeamBet = evaluatorTypeName === 'exact_team' || evaluatorTypeName === 'group_stage_team' || betTypeId === 2
  const isPlayerBet = evaluatorTypeName === 'exact_player' || betTypeId === 1

  // Filter teams by group if special bet has group restriction
  const availableTeams = specialBet.group
    ? teams.filter((t) => t.group === specialBet.group)
    : teams

  // Filter players by position if evaluator config has position restriction
  const availablePlayers = useMemo(() => {
    // Check if evaluator has position filter config
    const config = specialBet.Evaluator?.config
    if (isExactPlayerConfig(config) && config.positions && config.positions.length > 0) {
      return players.filter(
        (p) => p.Player.position && config.positions!.includes(p.Player.position)
      )
    }
    // No filter - return all players
    return players
  }, [players, specialBet.Evaluator?.config])

  const handleSave = async () => {
    if (isLocked) return

    setIsSaving(true)
    try {
      const result = await saveSpecialBet({
        leagueSpecialBetSingleId: specialBet.id,
        teamResultId: teamId,
        playerResultId: playerId,
        value: value,
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

  const handleTeamChange = (val: number | null) => {
    setIsSaved(false)
    setTeamId(val)
    if (val !== null) {
      setPlayerId(null)
      setValue(null)
    }
  }

  const handlePlayerChange = (val: number | null) => {
    setIsSaved(false)
    setPlayerId(val)
    if (val !== null) {
      setTeamId(null)
      setValue(null)
    }
  }

  const handleValueChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setIsSaved(false)
    const v = e.target.value === '' ? null : parseInt(e.target.value, 10)
    setValue(v)
    setTeamId(null)
    setPlayerId(null)
  }

  const handleOpenFriendsBets = async () => {
    setShowFriendsBets(true)
    if (isLocked && friendPredictions.length === 0) {
      setIsLoadingFriends(true)
      try {
        const result = await getSpecialBetFriendPredictions(specialBet.id)
        setFriendPredictions(result.predictions)
      } catch (error) {
        console.error('Failed to load friend predictions:', error)
        toast.error(t('friendsLoadError'))
      } finally {
        setIsLoadingFriends(false)
      }
    }
  }

  // Get display values
  const selectedTeam = teams.find((t) => t.id === teamId)
  const selectedTeamName = selectedTeam?.Team.name
  const selectedPlayer = players.find((p) => p.id === playerId)
  const selectedPlayerName = selectedPlayer
    ? `${selectedPlayer.Player.firstName} ${selectedPlayer.Player.lastName}`
    : null

  const userSelection = selectedTeamName || selectedPlayerName || (value !== null ? value.toString() : null)

  // Check if correct
  const actualResultTeam = specialBet.LeagueTeam?.Team
  const actualResult =
    actualResultTeam?.name ||
    (specialBet.LeaguePlayer &&
      `${specialBet.LeaguePlayer.Player.firstName} ${specialBet.LeaguePlayer.Player.lastName}`) ||
    specialBet.specialBetValue?.toString()
  const isCorrect = isEvaluated && userSelection === actualResult

  return (
    <>
      <div
        className={cn(
          'glass-card rounded-xl p-3 sm:p-4 animate-fade-in',
          isLocked && !isEvaluated && 'opacity-80'
        )}
      >
        <div className="flex items-start gap-2 sm:gap-3 mb-3">
          <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg flex items-center justify-center shrink-0 gradient-hockey">
            {isPlayerBet ? (
              <Target className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
            ) : (
              <Trophy className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-sm text-foreground leading-tight">
                  {specialBet.name}
                </h3>
                {specialBet.group && (
                  <div className="text-[10px] text-muted-foreground mt-0.5">
                    Group: <strong>{specialBet.group}</strong>
                  </div>
                )}
              </div>
              <div className="flex items-center gap-1 shrink-0">
                {/* Status badge: Scheduled or Awaiting evaluation */}
                <StatusBadge dateTime={specialBet.dateTime} isEvaluated={isEvaluated} />
                {/* Countdown and time badges - only show for non-evaluated events */}
                {!isEvaluated && !isLocked && <CountdownBadge deadline={specialBet.dateTime} />}
                {!isEvaluated && (
                  <span className="badge-upcoming flex items-center gap-0.5 text-[9px] sm:text-[10px]">
                    <Clock className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                    {format(specialBet.dateTime, 'HH:mm')}
                  </span>
                )}
                {/* Points badge - only show for evaluated special bets */}
                {isEvaluated && specialBet.userBet && (
                  <span
                    className={cn(
                      'px-1.5 py-0.5 rounded text-[9px] sm:text-[10px] font-bold',
                      specialBet.userBet.totalPoints > 0
                        ? 'bg-primary/20 text-primary'
                        : 'bg-secondary text-muted-foreground'
                    )}
                  >
                    +{specialBet.userBet.totalPoints}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {isLocked ? (
          <div className="space-y-2">
            {/* Your Selection */}
            <div className="p-3 rounded-lg bg-secondary/30">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">{t('yourPick')}</span>
                  <div className="flex items-center gap-1.5">
                    {selectedTeam && (
                      <TeamFlag
                        flagIcon={selectedTeam.Team.flagIcon ?? null}
                        flagType={selectedTeam.Team.flagType ?? null}
                        teamName={selectedTeam.Team.name}
                        size="sm"
                      />
                    )}
                    <span
                      className={cn(
                        'text-sm font-medium',
                        isCorrect ? 'text-primary' : 'text-foreground'
                      )}
                    >
                      {userSelection || t('noSelection')}
                    </span>
                  </div>
                  {isCorrect && (
                    <CheckCircle className="w-4 h-4 text-primary fill-primary/20" />
                  )}
                </div>
              </div>
            </div>
            {/* Actual Result */}
            {actualResult && (
              <div className="p-3 rounded-lg bg-primary/10">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">{t('winner')}</span>
                  <div className="flex items-center gap-1.5">
                    {actualResultTeam && (
                      <TeamFlag
                        flagIcon={actualResultTeam.flagIcon}
                        flagType={actualResultTeam.flagType}
                        teamName={actualResultTeam.name}
                        size="sm"
                      />
                    )}
                    <span className="text-sm font-semibold text-primary">
                      {actualResult}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            {/* Team selection */}
            {isTeamBet && (
              <SearchableSelect
                value={teamId}
                onChange={handleTeamChange}
                placeholder={t('selectTeam')}
                noSelectionLabel={t('noSelection')}
                disabled={isLocked}
                teams={availableTeams}
              />
            )}

            {/* Player selection */}
            {isPlayerBet && (
              <SearchableSelect
                value={playerId}
                onChange={handlePlayerChange}
                placeholder={t('selectPlayer')}
                noSelectionLabel={t('noSelection')}
                disabled={isLocked}
                players={availablePlayers}
              />
            )}

            {/* Value input */}
            {!isTeamBet && !isPlayerBet && (
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">
                  {t('enterValue')}
                </Label>
                <Input
                  type="number"
                  value={value ?? ''}
                  onChange={handleValueChange}
                  disabled={isLocked}
                  placeholder={t('enterPrediction')}
                />
              </div>
            )}

            <Button
              className={cn(
                'w-full',
                isSaved
                  ? 'bg-primary/20 text-primary hover:bg-primary/30'
                  : 'gradient-hockey'
              )}
              size="sm"
              disabled={isSaving || (!teamId && !playerId && value === null)}
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
                  {t('save')}
                </>
              )}
            </Button>
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
              <span>{t('friendsPicks')}</span>
            </button>
          </div>
        )}
      </div>

      {/* Friends Predictions Modal */}
      <FriendPredictionsModal
        open={showFriendsBets}
        onOpenChange={setShowFriendsBets}
        title={specialBet.name}
        subtitle={actualResult ? `${t('winner')}: ${actualResult}` : undefined}
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

          // Get display value for the prediction
          const predictionDisplay =
            prediction.LeagueTeam?.Team.name ||
            (prediction.LeaguePlayer &&
              `${prediction.LeaguePlayer.Player.firstName} ${prediction.LeaguePlayer.Player.lastName}`) ||
            prediction.value?.toString() ||
            'No selection'

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
                <span className="font-bold text-foreground text-sm">
                  {predictionDisplay}
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
