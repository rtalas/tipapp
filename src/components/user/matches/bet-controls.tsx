import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { ScorerSelect } from './scorer-select'
import { SPORT_IDS } from '@/lib/constants'
import type { UserMatch } from '@/actions/user/matches'

interface BetControlsProps {
  match: UserMatch
  overtime: boolean
  onOvertimeChange: (checked: boolean) => void
  homeAdvanced: boolean | null
  onAdvancedChange: (value: string) => void
  scorerId: number | null
  onScorerChange: (value: number | null) => void
  noScorer: boolean | null
  onNoScorerChange: (value: boolean | null) => void
}

export function BetControls({
  match,
  overtime,
  onOvertimeChange,
  homeAdvanced,
  onAdvancedChange,
  scorerId,
  onScorerChange,
  noScorer,
  onNoScorerChange,
}: BetControlsProps) {
  const homeTeam = match.Match.LeagueTeam_Match_homeTeamIdToLeagueTeam
  const awayTeam = match.Match.LeagueTeam_Match_awayTeamIdToLeagueTeam
  const homeTeamName = homeTeam.Team.shortcut || homeTeam.Team.name
  const awayTeamName = awayTeam.Team.shortcut || awayTeam.Team.name
  const sportId = match.League.sportId
  const isPlayoff = match.Match.isPlayoffGame

  return (
    <div className="mt-3 pt-3 border-t border-border/30 space-y-3">
      {/* Soccer Playoff: Team Advancement Radio Buttons */}
      {sportId === SPORT_IDS.FOOTBALL && isPlayoff ? (
        <div className="space-y-2">
          <p className="text-xs text-center text-muted-foreground">Who will advance?</p>
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
      ) : (
        /* Overtime/Shootout Checkbox for all non-soccer-playoff games */
        <div className="flex items-center justify-center space-x-2">
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
            Overtime / Shootout
          </Label>
        </div>
      )}

      {/* Scorer Dropdown */}
      {(homeTeam.LeaguePlayer.length > 0 || awayTeam.LeaguePlayer.length > 0) && (
        <ScorerSelect
          value={scorerId}
          onChange={onScorerChange}
          noScorer={noScorer}
          onNoScorerChange={onNoScorerChange}
          homePlayers={homeTeam.LeaguePlayer}
          awayPlayers={awayTeam.LeaguePlayer}
          homeTeamName={homeTeamName}
          awayTeamName={awayTeamName}
          sportId={sportId}
          disabled={false}
        />
      )}
    </div>
  )
}
