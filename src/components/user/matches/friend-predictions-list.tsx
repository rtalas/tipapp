import { CheckCircle } from 'lucide-react'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { cn } from '@/lib/utils'
import { getUserDisplayName, getUserInitials } from '@/lib/user-display-utils'
import type { FriendPrediction, UserMatch } from '@/actions/user/matches'

interface FriendPredictionsListProps {
  predictions: FriendPrediction[]
  match: UserMatch
  isEvaluated: boolean
}

export function FriendPredictionsList({
  predictions,
  match,
  isEvaluated,
}: FriendPredictionsListProps) {
  const hasResult =
    match.Match.homeRegularScore !== null && match.Match.awayRegularScore !== null

  // Get actual scorer IDs from match
  const actualScorerIds = match.Match.MatchScorer?.map((s) => s.LeaguePlayer?.id) ?? []

  return (
    <>
      {predictions.map((prediction) => {
        const user = prediction.LeagueUser.User
        const displayName = getUserDisplayName(user)
        const initials = getUserInitials(user)
        const isCorrect =
          hasResult &&
          prediction.homeScore === match.Match.homeRegularScore &&
          prediction.awayScore === match.Match.awayRegularScore

        // Get scorer name if predicted
        const scorerName = prediction.LeaguePlayer?.Player
          ? `${prediction.LeaguePlayer.Player.firstName || ''} ${prediction.LeaguePlayer.Player.lastName || ''}`.trim()
          : null

        // Check if predicted scorer is in actual scorers
        const isScorerCorrect =
          isEvaluated &&
          prediction.LeaguePlayer?.id &&
          actualScorerIds.includes(prediction.LeaguePlayer.id)

        return (
          <div
            key={prediction.id}
            className="flex items-center justify-between p-3 rounded-lg bg-secondary/30"
          >
            <div className="flex items-center gap-3">
              <Avatar className="h-8 w-8">
                <AvatarFallback className="text-xs font-semibold bg-primary/20 text-primary">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="flex flex-col">
                <span className="font-medium text-sm">{displayName}</span>
                {scorerName && (
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    Scorer: {scorerName}
                    {isScorerCorrect && (
                      <CheckCircle className="w-3 h-3 text-primary" />
                    )}
                  </span>
                )}
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span
                className={cn(
                  'font-bold text-sm',
                  isCorrect ? 'text-primary' : 'text-foreground'
                )}
              >
                {prediction.homeScore} : {prediction.awayScore}
              </span>
              {isEvaluated && prediction.totalPoints !== 0 && (
                <span
                  className={cn(
                    'px-2 py-0.5 rounded text-[10px] font-bold',
                    prediction.totalPoints > 0
                      ? 'bg-primary/20 text-primary'
                      : 'bg-secondary text-muted-foreground'
                  )}
                >
                  {prediction.totalPoints > 0 ? '+' : ''}
                  {prediction.totalPoints}
                </span>
              )}
            </div>
          </div>
        )
      })}
    </>
  )
}
