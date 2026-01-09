/**
 * Application-wide constants
 * Centralized configuration for magic numbers and limits
 */

/**
 * Authentication constants
 */
export const AUTH = {
  /**
   * Number of salt rounds for bcrypt password hashing
   */
  SALT_ROUNDS: 12,

  /**
   * Password reset token expiration time (milliseconds)
   * Default: 1 hour
   */
  RESET_TOKEN_EXPIRY_MS: 60 * 60 * 1000,
} as const

/**
 * Validation limits for scores and bets
 */
export const VALIDATION = {
  /**
   * Maximum score value for matches
   */
  MAX_MATCH_SCORE: 20,

  /**
   * Maximum score value for series (games won)
   */
  MAX_SERIES_SCORE: 7,

  /**
   * Minimum value for evaluator points
   */
  MIN_EVALUATOR_POINTS: 0,

  /**
   * Maximum value for evaluator points
   */
  MAX_EVALUATOR_POINTS: 100,
} as const

/**
 * League and tournament constants
 */
export const LEAGUE = {
  /**
   * Maximum number of games in a best-of series
   */
  MAX_SERIES_GAMES: 7,

  /**
   * Minimum number of games in a best-of series
   */
  MIN_SERIES_GAMES: 1,
} as const

/**
 * UI/Display constants
 */
export const UI = {
  /**
   * Default number of items per page for pagination
   */
  DEFAULT_PAGE_SIZE: 20,

  /**
   * Maximum file upload size (bytes)
   * Default: 5MB
   */
  MAX_UPLOAD_SIZE_BYTES: 5 * 1024 * 1024,
} as const

/**
 * Helper function to calculate games required to win a series
 * @param bestOf Total number of games in the series
 * @returns Number of games required to win
 */
export function getGamesRequiredToWin(bestOf: number): number {
  return Math.ceil(bestOf / 2)
}
