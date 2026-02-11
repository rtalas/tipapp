import { Zap } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { cn } from '@/lib/utils'
import { StatusBadge } from '@/components/user/common/status-badge'
import { CountdownBadge } from '@/components/user/common/countdown-badge'
import type { UserMatch } from '@/actions/user/matches'

interface MatchHeaderProps {
  match: UserMatch
  isEvaluated: boolean
  isDoubled: boolean
}

export function MatchHeader({
  match,
  isEvaluated,
  isDoubled,
}: MatchHeaderProps) {
  const t = useTranslations('user.matches')
  const homeTeam = match.Match.LeagueTeam_Match_homeTeamIdToLeagueTeam
  const isPlayoff = match.Match.isPlayoffGame

  return (
    <div className="flex items-center justify-between mb-4">
      <div className="flex items-center gap-1.5">
        {/* Phase + Game Number badge */}
        {match.Match.MatchPhase && (
          <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide px-1.5 py-0.5 bg-secondary/50 rounded">
            {match.Match.MatchPhase.name}
            {match.Match.gameNumber &&
              match.Match.MatchPhase.bestOf &&
              match.Match.MatchPhase.bestOf > 1 && <>, {t('game', { number: match.Match.gameNumber })}</>}
          </span>
        )}

        {/* Fallback badges for backward compatibility (only if no phase) */}
        {!match.Match.MatchPhase && (
          <>
            {homeTeam.group && (
              <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide px-1.5 py-0.5 bg-secondary/50 rounded">
                {homeTeam.group}
              </span>
            )}
            {isPlayoff && (
              <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide px-1.5 py-0.5 bg-secondary/50 rounded">
                {t('playoff')}
              </span>
            )}
          </>
        )}
      </div>
      <div className="flex items-center gap-1.5">
        {isDoubled && (
          <span className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-yellow-500/20 text-yellow-600 dark:text-yellow-500 text-[10px] font-bold">
            <Zap className="w-3 h-3" />
            2x
          </span>
        )}
        {/* Status badge: Scheduled or Awaiting evaluation */}
        <StatusBadge dateTime={match.Match.dateTime} isEvaluated={isEvaluated} />
        {/* Countdown badge - only show for non-evaluated events */}
        {!isEvaluated && (
          <CountdownBadge deadline={match.Match.dateTime} />
        )}
        {/* Points badge - only show for evaluated matches */}
        {isEvaluated && match.userBet && (
          <span
            className={cn(
              'px-2 py-0.5 rounded text-[10px] font-bold',
              match.userBet.totalPoints > 0
                ? 'bg-primary/20 text-primary'
                : 'bg-secondary text-muted-foreground'
            )}
          >
            +{match.userBet.totalPoints} pts
          </span>
        )}
      </div>
    </div>
  )
}
