import { Checkbox } from '@/components/ui/checkbox'
import { SPORT_IDS } from '@/lib/constants'
import type { UserMatch } from '@/actions/user/matches'

interface BetDisplayProps {
  match: UserMatch
  isEvaluated: boolean
}

export function BetDisplay({ match, isEvaluated }: BetDisplayProps) {
  const homeTeam = match.Match.LeagueTeam_Match_homeTeamIdToLeagueTeam
  const awayTeam = match.Match.LeagueTeam_Match_awayTeamIdToLeagueTeam
  const homeTeamName = homeTeam.Team.shortcut || homeTeam.Team.name
  const awayTeamName = awayTeam.Team.shortcut || awayTeam.Team.name
  const sportId = match.League.sportId
  const isPlayoff = match.Match.isPlayoffGame

  if (!match.userBet) return null

  return (
    <div className="mt-3 pt-3 border-t border-border/30 space-y-2">
      {/* Soccer Playoff: Advance Team Display */}
      {sportId === SPORT_IDS.FOOTBALL &&
      isPlayoff &&
      match.userBet.homeAdvanced !== null ? (
        <div className="flex items-center justify-center gap-1.5 text-xs">
          <span className="text-muted-foreground">
            {isEvaluated ? 'Advancing:' : 'Advancing:'}
          </span>
          <span className="font-medium text-foreground">
            {match.userBet.homeAdvanced ? homeTeamName : awayTeamName}
          </span>
        </div>
      ) : (
        /* Overtime/Shootout Display for all non-soccer-playoff games */
        !isEvaluated && (
          <div className="flex items-center justify-center space-x-2">
            <Checkbox
              checked={match.userBet.overtime}
              disabled
              className="border-border data-[state=checked]:bg-primary data-[state=checked]:border-primary"
            />
            <span className="text-xs text-muted-foreground">Overtime / Shootout</span>
          </div>
        )
      )}

      {/* Hockey Overtime Display (evaluated only) */}
      {isEvaluated && sportId === SPORT_IDS.HOCKEY && match.userBet.overtime && (
        <div className="flex items-center justify-center gap-1.5 text-xs">
          <span className="text-muted-foreground">Your bet:</span>
          <span className="font-medium text-foreground">Overtime / Shootout</span>
        </div>
      )}

      {/* Scorer Display */}
      {match.userBet.noScorer ? (
        <div className="flex items-center justify-center gap-1.5 text-xs">
          <span className="text-muted-foreground">
            {isEvaluated ? 'Your scorer:' : 'Scorer:'}
          </span>
          <span className="font-medium text-foreground italic">No Scorer (0:0)</span>
        </div>
      ) : (
        match.userBet.scorerId &&
        match.userBet.LeaguePlayer && (
          <div className="flex items-center justify-center gap-1.5 text-xs">
            <span className="text-muted-foreground">
              {isEvaluated ? 'Your scorer:' : 'Scorer:'}
            </span>
            <span className="font-medium text-foreground">
              {match.userBet.LeaguePlayer.Player.firstName}{' '}
              {match.userBet.LeaguePlayer.Player.lastName}
            </span>
          </div>
        )
      )}
    </div>
  )
}
