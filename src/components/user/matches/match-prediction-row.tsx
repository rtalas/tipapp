import type { ReactNode } from 'react'
import { CheckCircle, Star } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { cn } from '@/lib/utils'
import { SPORT_IDS } from '@/lib/constants'
import { getPlayerDisplayName } from '@/lib/user-display-utils'
import { ScorerRankingBadge } from '@/components/common/scorer-ranking-badge'
import type { UserMatch } from '@/actions/user/matches'

interface ScorerInfo {
  id: number
  firstName: string | null
  lastName: string | null
  topScorerRanking: number | null
}

interface MatchPredictionRowProps {
  match: UserMatch
  isEvaluated: boolean
  /** Element shown on the left (friend avatar, or an icon for the user's own bet) */
  avatarSlot: ReactNode
  /** Display name (friend) or label ("Your prediction") */
  name: ReactNode
  homeScore: number
  awayScore: number
  overtime: boolean
  homeAdvanced: boolean | null
  scorer: ScorerInfo | null
  ownGoal: boolean | null
  usedJoker: boolean
  totalPoints: number
}

/**
 * A single prediction row (score + optional scorer/advancing), shared between
 * the user's own prediction and friends' predictions so both look identical.
 */
export function MatchPredictionRow({
  match,
  isEvaluated,
  avatarSlot,
  name,
  homeScore,
  awayScore,
  overtime,
  homeAdvanced,
  scorer,
  ownGoal,
  usedJoker,
  totalPoints,
}: MatchPredictionRowProps) {
  const t = useTranslations('user.matches')
  const sportId = match.League.sportId
  const isPlayoff = match.Match.isPlayoffGame
  const homeTeam = match.Match.LeagueTeam_Match_homeTeamIdToLeagueTeam
  const awayTeam = match.Match.LeagueTeam_Match_awayTeamIdToLeagueTeam
  const homeTeamName = homeTeam?.Team.shortcut || homeTeam?.Team.name || ''
  const awayTeamName = awayTeam?.Team.shortcut || awayTeam?.Team.name || ''
  const hasResult =
    match.Match.homeRegularScore !== null && match.Match.awayRegularScore !== null

  const actualScorerIds = match.Match.MatchScorer?.map((s) => s.LeaguePlayer?.id) ?? []
  const actualHasOwnGoal = match.Match.MatchScorer?.some((s) => s.ownGoal) ?? false

  const isCorrect =
    hasResult &&
    homeScore === match.Match.homeRegularScore &&
    awayScore === match.Match.awayRegularScore

  const scorerName = scorer ? getPlayerDisplayName(scorer) : null
  const isScorerCorrect = isEvaluated && scorer?.id && actualScorerIds.includes(scorer.id)
  const isOwnGoalCorrect = isEvaluated && ownGoal && actualHasOwnGoal

  return (
    <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/30">
      <div className="flex items-center gap-3">
        {avatarSlot}
        <div className="flex flex-col">
          <span className="font-medium text-sm">{name}</span>
          {scorerName && (
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              {t('scorer')} {scorerName}
              {scorer?.topScorerRanking && (
                <ScorerRankingBadge ranking={scorer.topScorerRanking} />
              )}
              {isScorerCorrect && <CheckCircle className="w-3 h-3 text-primary" />}
            </span>
          )}
          {!scorerName && ownGoal && (
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              {t('scorer')} <span className="italic">{t('ownGoal')}</span>
              {isOwnGoalCorrect && <CheckCircle className="w-3 h-3 text-primary" />}
            </span>
          )}
          {sportId === SPORT_IDS.FOOTBALL && isPlayoff && homeAdvanced !== null && (
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              {t('advancing')} {homeAdvanced ? homeTeamName : awayTeamName}
            </span>
          )}
        </div>
      </div>
      <div className="flex items-center gap-3">
        {usedJoker && (
          <Star
            className="w-3.5 h-3.5 text-amber-500 fill-amber-500 shrink-0"
            aria-label={t('jokerUsedLabel')}
          />
        )}
        <span
          className={cn(
            'font-bold text-sm',
            isCorrect ? 'text-primary' : 'text-foreground'
          )}
        >
          {homeScore}:{awayScore}
          {!(sportId === SPORT_IDS.FOOTBALL && isPlayoff) && overtime && (
            <span className="ml-0.5">{t('overtimeSuffix')}</span>
          )}
        </span>
        {isEvaluated && totalPoints !== 0 && (
          <span
            className={cn(
              'px-2 py-0.5 rounded text-[10px] font-bold',
              totalPoints > 0
                ? 'bg-primary/20 text-primary'
                : 'bg-secondary text-muted-foreground'
            )}
          >
            {totalPoints > 0 ? '+' : ''}
            {totalPoints}
          </span>
        )}
      </div>
    </div>
  )
}
