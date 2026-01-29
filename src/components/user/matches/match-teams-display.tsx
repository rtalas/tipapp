import { ScoreInput } from './score-input'
import type { UserMatch } from '@/actions/user/matches'

interface MatchTeamsDisplayProps {
  match: UserMatch
  isLocked: boolean
  homeScore: number
  awayScore: number
  onHomeScoreChange: (value: number) => void
  onAwayScoreChange: (value: number) => void
}

export function MatchTeamsDisplay({
  match,
  isLocked,
  homeScore,
  awayScore,
  onHomeScoreChange,
  onAwayScoreChange,
}: MatchTeamsDisplayProps) {
  const homeTeam = match.Match.LeagueTeam_Match_homeTeamIdToLeagueTeam
  const awayTeam = match.Match.LeagueTeam_Match_awayTeamIdToLeagueTeam
  const homeTeamName = homeTeam.Team.shortcut || homeTeam.Team.name
  const awayTeamName = awayTeam.Team.shortcut || awayTeam.Team.name

  const hasResult =
    match.Match.homeRegularScore !== null && match.Match.awayRegularScore !== null

  return (
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
                <span className="text-[10px] text-muted-foreground uppercase">Result</span>
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
                <span className="text-[10px] text-muted-foreground">Your bet:</span>
                <span className="text-xs font-semibold text-primary">
                  {match.userBet.homeScore}:{match.userBet.awayScore}
                </span>
              </div>
            )}
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <ScoreInput value={homeScore} onChange={onHomeScoreChange} disabled={isLocked} />
            <span className="text-lg font-bold text-muted-foreground">:</span>
            <ScoreInput value={awayScore} onChange={onAwayScoreChange} disabled={isLocked} />
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
  )
}
