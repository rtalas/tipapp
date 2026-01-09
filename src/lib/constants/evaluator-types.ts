/**
 * Evaluator type name constants
 * These match the EvaluatorType.name values in the database
 * Used for type-safe evaluation logic
 */
export const EVALUATOR_TYPES = {
  // Match bet evaluators
  EXACT_SCORE: 'exact_score',
  SCORE_DIFFERENCE: 'score_difference',
  WINNER: 'winner',
  SCORER: 'scorer',
  DRAW: 'draw',
  SOCCER_PLAYOFF_ADVANCE: 'soccer_playoff_advance',

  // Series bet evaluators
  SERIES_EXACT: 'series-exact',
  SERIES_WINNER: 'series-winner',

  // Special bet evaluators
  EXACT_PLAYER: 'exact-player',
  EXACT_TEAM: 'exact-team',
  EXACT_VALUE: 'exact-value',
  CLOSEST_VALUE: 'closest-value',
  QUESTION: 'question',
} as const

/**
 * Type for evaluator type names
 */
export type EvaluatorTypeName = (typeof EVALUATOR_TYPES)[keyof typeof EVALUATOR_TYPES]

/**
 * Evaluator type categories for grouping
 */
export const EVALUATOR_CATEGORIES = {
  MATCH: [
    EVALUATOR_TYPES.EXACT_SCORE,
    EVALUATOR_TYPES.SCORE_DIFFERENCE,
    EVALUATOR_TYPES.WINNER,
    EVALUATOR_TYPES.SCORER,
    EVALUATOR_TYPES.DRAW,
    EVALUATOR_TYPES.SOCCER_PLAYOFF_ADVANCE,
  ],
  SERIES: [EVALUATOR_TYPES.SERIES_EXACT, EVALUATOR_TYPES.SERIES_WINNER],
  SPECIAL: [
    EVALUATOR_TYPES.EXACT_PLAYER,
    EVALUATOR_TYPES.EXACT_TEAM,
    EVALUATOR_TYPES.EXACT_VALUE,
    EVALUATOR_TYPES.CLOSEST_VALUE,
    EVALUATOR_TYPES.QUESTION,
  ],
} as const
