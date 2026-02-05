import { useTranslations } from 'next-intl'
import { Check } from 'lucide-react'
import { SPORT_IDS } from '@/lib/constants'
import type { UserMatch } from '@/actions/user/matches'

interface BetDisplayProps {
  match: UserMatch
  isEvaluated: boolean
}

export function BetDisplay({ match, isEvaluated }: BetDisplayProps) {
  const t = useTranslations('user.matches')
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
            {t('advancing')}
          </span>
          <span className="font-medium text-foreground">
            {match.userBet.homeAdvanced ? homeTeamName : awayTeamName}
          </span>
        </div>
      ) : (
        /* Overtime/Shootout Display for all non-soccer-playoff games - only show if user picked overtime */
        !isEvaluated && match.userBet.overtime && (
          <div className="flex items-center justify-center gap-1 text-xs text-muted-foreground">
            <Check className="w-3.5 h-3.5" />
            <span>{t('overtimeShootout')}</span>
          </div>
        )
      )}

      {/* Hockey Overtime Display (evaluated only) */}
      {isEvaluated && sportId === SPORT_IDS.HOCKEY && match.userBet.overtime && (
        <div className="flex items-center justify-center gap-1 text-xs text-muted-foreground">
          <Check className="w-3.5 h-3.5" />
          <span>{t('overtimeShootout')}</span>
        </div>
      )}

      {/* Scorer Display */}
      {match.userBet.noScorer ? (
        <div className="flex items-center justify-center gap-1.5 text-xs">
          <span className="text-muted-foreground">
            {isEvaluated ? t('yourScorer') : t('scorer')}
          </span>
          <span className="font-medium text-foreground italic">{t('noScorer')}</span>
        </div>
      ) : (
        match.userBet.scorerId &&
        match.userBet.LeaguePlayer && (
          <div className="flex items-center justify-center gap-1.5 text-xs">
            <span className="text-muted-foreground">
              {isEvaluated ? t('yourScorer') : t('scorer')}
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
