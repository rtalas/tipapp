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
  const homeTeamName = homeTeam?.Team.shortcut || homeTeam?.Team.name || match.Match.homePlaceholder || t('tbd')
  const awayTeamName = awayTeam?.Team.shortcut || awayTeam?.Team.name || match.Match.awayPlaceholder || t('tbd')
  const isPlaceholder = !homeTeam || !awayTeam

  const hasResult =
    match.Match.homeRegularScore !== null && match.Match.awayRegularScore !== null

  return (
    <div className="flex items-center justify-between gap-2 sm:gap-6">
      {/* Home Team */}
      <div className="flex flex-col items-center sm:items-end gap-1 min-w-0 flex-1 p-2 sm:pr-0">
        <div className="flex items-center gap-0.5 sm:gap-1">
          {homeTeam ? (
            <TeamFlag
              flagIcon={homeTeam.Team.flagIcon}
              flagType={homeTeam.Team.flagType}
              teamName={homeTeam.Team.name}
              size="lg"
              className="w-auto h-auto text-3xl sm:text-4xl"
            />
          ) : null}
          <p className={`font-semibold text-xs sm:text-sm text-center leading-tight line-clamp-2 ${homeTeam ? 'text-foreground' : 'italic text-muted-foreground'}`}>
            {homeTeamName}
          </p>
        </div>
      </div>

      {/* Score Selection */}
      <div className="flex items-center gap-2 shrink-0">
        {isPlaceholder ? null : isLocked ? (
          <div className="flex flex-col items-center gap-1">
            {isEvaluated && hasResult && (
              <>
                <span className="text-[10px] text-muted-foreground uppercase">{t('result')}</span>
                <span className="text-lg font-black text-foreground">
                  {match.Match.homeFinalScore ?? match.Match.homeRegularScore} : {match.Match.awayFinalScore ?? match.Match.awayRegularScore}
                  {(match.Match.isOvertime || match.Match.isShootout) && (
                    <span className="text-lg font-black text-foreground ml-1">
                      {match.Match.isShootout ? t('shootoutSuffix') : t('overtimeSuffix')}
                    </span>
                  )}
                </span>
              </>
            )}
            {match.userBet && (
              <div className="flex items-center gap-1">
                <span className="text-[10px] text-muted-foreground">{t('yourBetShort')}</span>
                <span className="text-xs font-semibold text-primary">
                  {match.userBet.homeScore}:{match.userBet.awayScore}
                  {match.userBet.overtime && (
                    <span className="ml-1">{t('overtimeSuffix')}</span>
                  )}
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
      <div className="flex flex-col items-center sm:items-start gap-1 min-w-0 flex-1 p-2 sm:pl-0">
        <div className="flex items-center gap-0.5 sm:gap-1">
          {awayTeam ? (
            <TeamFlag
              flagIcon={awayTeam.Team.flagIcon}
              flagType={awayTeam.Team.flagType}
              teamName={awayTeam.Team.name}
              size="lg"
              className="w-auto h-auto text-3xl sm:text-4xl"
            />
          ) : null}
          <p className={`font-semibold text-xs sm:text-sm text-center leading-tight line-clamp-2 ${awayTeam ? 'text-foreground' : 'italic text-muted-foreground'}`}>
            {awayTeamName}
          </p>
        </div>
      </div>
    </div>
  )
}
