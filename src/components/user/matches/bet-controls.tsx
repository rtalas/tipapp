import { useTranslations } from 'next-intl'
import { Star } from 'lucide-react'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { ScorerSelect } from './scorer-select'
import { SPORT_IDS } from '@/lib/constants'
import { cn } from '@/lib/utils'
import type { UserMatch } from '@/actions/user/matches'

interface BetControlsProps {
  match: UserMatch
  homeScore: number
  awayScore: number
  overtime: boolean
  onOvertimeChange: (checked: boolean) => void
  homeAdvanced: boolean | null
  onAdvancedChange: (value: string) => void
  scorerId: number | null
  onScorerChange: (value: number | null) => void
  noScorer: boolean | null
  onNoScorerChange: (value: boolean | null) => void
  ownGoal: boolean | null
  onOwnGoalChange: (value: boolean | null) => void
  useJoker: boolean
  onJokerChange: (value: boolean) => void
  jokersRemaining: number
}

export function BetControls({
  match,
  homeScore,
  awayScore,
  overtime,
  onOvertimeChange,
  homeAdvanced,
  onAdvancedChange,
  scorerId,
  onScorerChange,
  noScorer,
  onNoScorerChange,
  ownGoal,
  onOwnGoalChange,
  useJoker,
  onJokerChange,
  jokersRemaining,
}: BetControlsProps) {
  const t = useTranslations('user.matches')
  const homeTeam = match.Match.LeagueTeam_Match_homeTeamIdToLeagueTeam
  const awayTeam = match.Match.LeagueTeam_Match_awayTeamIdToLeagueTeam
  // Placeholder matches lock betting at the parent — defensive null guard.
  if (!homeTeam || !awayTeam) return null
  const homeTeamName = homeTeam.Team.shortcut || homeTeam.Team.name
  const awayTeamName = awayTeam.Team.shortcut || awayTeam.Team.name
  const sportId = match.League.sportId
  const isPlayoff = match.Match.isPlayoffGame
  const isSoccerPlayoff = sportId === SPORT_IDS.FOOTBALL && isPlayoff
  // Advancement pick only needed in soccer playoff when user predicts a draw.
  // For non-draw predictions the winner is implied by the score.
  const showAdvancePicker = isSoccerPlayoff && homeScore === awayScore

  const jokerAllowed =
    match.League.jokerCount > 0 && !match.isDoubled && !match.jokerBlocked
  // Joker is saved alongside the bet, so we don't require a pre-existing saved bet.
  const jokerDisabledReason =
    jokerAllowed && !useJoker && jokersRemaining === 0
      ? t('jokerDisabled.noJokersLeft')
      : null

  // The top divider belongs to the controls "header" (advancement picker /
  // overtime / joker). When none of those render (e.g. football group match
  // with no joker), skip the divider so it doesn't dangle above the lone
  // scorer dropdown.
  const hasControlsHeader =
    showAdvancePicker || sportId !== SPORT_IDS.FOOTBALL || jokerAllowed

  return (
    <div
      className={cn(
        'mt-3 space-y-3',
        hasControlsHeader && 'pt-3 border-t border-border/30'
      )}
    >
      {showAdvancePicker ? (
        <div className="space-y-2">
          <p className="text-xs text-center text-muted-foreground">{t('whoWillAdvance')}</p>
          <RadioGroup
            value={
              homeAdvanced === true ? 'home' : homeAdvanced === false ? 'away' : 'none'
            }
            onValueChange={onAdvancedChange}
            className="flex justify-center gap-6"
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem
                value="home"
                id={`advance-home-${match.id}`}
                className="border-border data-[state=checked]:border-primary data-[state=checked]:text-primary"
              />
              <Label htmlFor={`advance-home-${match.id}`} className="text-xs cursor-pointer">
                {homeTeamName}
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem
                value="away"
                id={`advance-away-${match.id}`}
                className="border-border data-[state=checked]:border-primary data-[state=checked]:text-primary"
              />
              <Label htmlFor={`advance-away-${match.id}`} className="text-xs cursor-pointer">
                {awayTeamName}
              </Label>
            </div>
          </RadioGroup>
        </div>
      ) : null}

      {/* Inline checkboxes: overtime (hockey) + joker — side by side to save space */}
      {(sportId !== SPORT_IDS.FOOTBALL || jokerAllowed) && !showAdvancePicker && (
        <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2">
          {/* Overtime/Shootout — hockey only.
           * Football has no OT in group stage; in playoff the winner is captured
           * via the advancement radio (or implied by a non-draw score). */}
          {sportId !== SPORT_IDS.FOOTBALL && (
            <div className="flex items-center space-x-2">
              <Checkbox
                id={`overtime-${match.id}`}
                checked={overtime}
                onCheckedChange={onOvertimeChange}
                className="border-border data-[state=checked]:bg-primary data-[state=checked]:border-primary"
              />
              <Label
                htmlFor={`overtime-${match.id}`}
                className="text-xs text-muted-foreground cursor-pointer select-none"
              >
                {t('overtimeShootout')}
              </Label>
            </div>
          )}

          {/* Joker checkbox — only when feature enabled, match not doubled or blocked */}
          {jokerAllowed && (
            <div className="flex items-center space-x-2">
              <Checkbox
                id={`joker-${match.id}`}
                checked={useJoker}
                disabled={jokerDisabledReason !== null}
                onCheckedChange={(checked) => onJokerChange(checked === true)}
                className={cn(
                  'border-border',
                  useJoker
                    ? 'data-[state=checked]:bg-amber-500 data-[state=checked]:border-amber-500'
                    : 'data-[state=checked]:bg-primary data-[state=checked]:border-primary',
                )}
              />
              <Label
                htmlFor={`joker-${match.id}`}
                title={jokerDisabledReason ?? undefined}
                className={cn(
                  'text-xs cursor-pointer select-none inline-flex items-center gap-1',
                  jokerDisabledReason
                    ? 'text-muted-foreground/50'
                    : 'text-muted-foreground',
                )}
              >
                <Star
                  className={cn(
                    'w-3 h-3',
                    useJoker && 'fill-amber-500 text-amber-500',
                  )}
                />
                {t('useJoker')}
                {!useJoker && jokerDisabledReason === null && (
                  <span>({t('jokerRemainingShort', { count: jokersRemaining })})</span>
                )}
              </Label>
            </div>
          )}
        </div>
      )}

      {/* Scorer Dropdown */}
      {(homeTeam.LeaguePlayer.length > 0 || awayTeam.LeaguePlayer.length > 0) && (
        <ScorerSelect
          value={scorerId}
          onChange={onScorerChange}
          noScorer={noScorer}
          onNoScorerChange={onNoScorerChange}
          ownGoal={ownGoal}
          onOwnGoalChange={onOwnGoalChange}
          homePlayers={homeTeam.LeaguePlayer}
          awayPlayers={awayTeam.LeaguePlayer}
          homeTeam={homeTeam.Team}
          awayTeam={awayTeam.Team}
          homeTeamName={homeTeamName}
          awayTeamName={awayTeamName}
          sportId={sportId}
          disabled={false}
        />
      )}
    </div>
  )
}
