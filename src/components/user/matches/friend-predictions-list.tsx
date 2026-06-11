import { UserAvatar } from '@/components/common/user-avatar'
import { getUserDisplayName } from '@/lib/user-display-utils'
import { MatchPredictionRow } from './match-prediction-row'
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
  return (
    <>
      {predictions.map((prediction) => {
        const user = prediction.LeagueUser.User
        const scorer = prediction.LeaguePlayer?.Player
          ? {
              id: prediction.LeaguePlayer.id,
              firstName: prediction.LeaguePlayer.Player.firstName,
              lastName: prediction.LeaguePlayer.Player.lastName,
            }
          : null

        return (
          <MatchPredictionRow
            key={prediction.id}
            match={match}
            isEvaluated={isEvaluated}
            avatarSlot={
              <UserAvatar
                avatarUrl={user.avatarUrl}
                firstName={user.firstName}
                lastName={user.lastName}
                username={user.username}
                size="sm"
                fallbackClassName="bg-primary/20 text-primary"
              />
            }
            name={getUserDisplayName(user)}
            homeScore={prediction.homeScore}
            awayScore={prediction.awayScore}
            overtime={prediction.overtime}
            homeAdvanced={prediction.homeAdvanced}
            scorer={scorer}
            ownGoal={prediction.ownGoal}
            usedJoker={prediction.usedJoker}
            totalPoints={prediction.totalPoints}
          />
        )
      })}
    </>
  )
}
