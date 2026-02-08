/**
 * Sport IDs from the Sport table
 */
export const SPORT_IDS = {
  HOCKEY: 1, // Hokej
  FOOTBALL: 2, // Fotbal
} as const

/**
 * Maximum number of prize/fine tiers per league
 */
export const MAX_PRIZE_TIERS = 10

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
