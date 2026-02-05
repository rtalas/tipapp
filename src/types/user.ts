/**
 * User-facing type definitions
 */

// Leaderboard types
export interface LeaderboardEntry {
  rank: number
  leagueUserId: number
  userId: number
  username: string
  firstName: string | null
  lastName: string | null
  avatarUrl: string | null
  matchPoints: number
  seriesPoints: number
  specialBetPoints: number
  questionPoints: number
  totalPoints: number
  isCurrentUser: boolean
}
