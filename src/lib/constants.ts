/**
 * Sport IDs from the Sport table
 */
export const SPORT_IDS = {
  HOCKEY: 1, // Hokej
  FOOTBALL: 2, // Fotbal
} as const

/**
 * Get sport emoji by sport ID
 */
export function getSportEmoji(sportId?: number): string {
  switch (sportId) {
    case SPORT_IDS.HOCKEY:
      return '🏒'
    case SPORT_IDS.FOOTBALL:
      return '⚽'
    default:
      return '🏆'
  }
}

/**
 * Estimated match/event duration for status calculations (3 hours)
 */
export const EVENT_DURATION_MS = 3 * 60 * 60 * 1000

/**
 * How long a match stays in the "current" tab after evaluation (8 hours)
 */
export const MATCH_POST_EVAL_VISIBLE_MS = 8 * 60 * 60 * 1000

/**
 * How long series/special-bets/questions stay in the "current" tab after evaluation (12 hours)
 */
export const EVENT_POST_EVAL_VISIBLE_MS = 12 * 60 * 60 * 1000

/**
 * Maximum number of prize/fine tiers per league
 */
export const MAX_PRIZE_TIERS = 10

/**
 * Event types for push notification tracking (SentNotification.eventType)
 */
export const NOTIFICATION_EVENT_TYPES = {
  MATCH: 'match',
  SERIES: 'series',
  SPECIAL_BET: 'special_bet',
  QUESTION: 'question',
} as const

export type NotificationEventType = typeof NOTIFICATION_EVENT_TYPES[keyof typeof NOTIFICATION_EVENT_TYPES]

/**
 * Player positions by sport for filtering in exact_player evaluators
 */
export const POSITIONS_BY_SPORT: Record<number, { value: string; label: string }[]> = {
  [SPORT_IDS.HOCKEY]: [
    { value: 'G', label: 'Goalie' },
    { value: 'D', label: 'Defense' },
    { value: 'FW', label: 'Forward' },
  ],
  [SPORT_IDS.FOOTBALL]: [
    { value: 'G', label: 'Goalkeeper' },
    { value: 'D', label: 'Defender' },
    { value: 'M', label: 'Midfielder' },
    { value: 'F', label: 'Forward' },
  ],
}
