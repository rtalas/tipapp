import { useTranslations } from 'next-intl'
import { ScoreInput } from './score-input'
import { TeamFlag } from '@/components/common/team-flag'
import type { UserMatch } from '@/actions/user/matches'

interface MatchTeamsDisplayProps {
  match: UserMatch
  isLocked: boolean
  isEvaluated: boolean
  homeScore: number
  awayScore: number
  onHomeScoreChange: (value: number) => void
  onAwayScoreChange: (value: number) => void
}

export function MatchTeamsDisplay({
  match,
  isLocked,
  isEvaluated,
  homeScore,
  awayScore,
  onHomeScoreChange,
  onAwayScoreChange,
}: MatchTeamsDisplayProps) {
  const t = useTranslations('user.matches')
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
        <div className="flex items-center gap-2">
          <TeamFlag
            flagIcon={homeTeam.Team.flagIcon}
            flagType={homeTeam.Team.flagType}
            teamName={homeTeam.Team.name}
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
            {isEvaluated && hasResult && (
              <>
                <span className="text-[10px] text-muted-foreground uppercase">{t('result')}</span>
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
                <span className="text-[10px] text-muted-foreground">{t('yourBetShort')}</span>
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
        <div className="flex items-center gap-2">
          <TeamFlag
            flagIcon={awayTeam.Team.flagIcon}
            flagType={awayTeam.Team.flagType}
            teamName={awayTeam.Team.name}
            size="sm"
            className="sm:w-6 sm:h-6"
          />
          <p className="font-semibold text-xs sm:text-sm text-foreground text-center leading-tight line-clamp-2">
            {awayTeamName}
          </p>
        </div>
      </div>
    </div>
  )
}
