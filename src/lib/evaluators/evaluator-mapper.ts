/**
 * Maps EvaluatorType.name (snake_case) to evaluator functions
 * Provides type-safe lookup and execution
 */

import {
  evaluateExactScore,
  evaluateScoreDifference,
  evaluateWinner,
  evaluateScorer,
  evaluateDraw,
  evaluateSoccerPlayoffAdvance,
  evaluateSeriesExact,
  evaluateSeriesWinner,
  evaluateExactPlayer,
  evaluateExactTeam,
  evaluateExactValue,
  evaluateClosestValue,
  type MatchBetContext,
  type SeriesBetContext,
  type SpecialBetContext,
  type ClosestValueContext,
} from './index'

// Type definitions
type MatchEvaluatorFn = (context: MatchBetContext) => boolean | number
type SeriesEvaluatorFn = (context: SeriesBetContext) => boolean
type SpecialEvaluatorFn = (context: SpecialBetContext) => boolean
type ClosestValueEvaluatorFn = (context: ClosestValueContext) => boolean


// Evaluator mapping registries
const MATCH_EVALUATORS: Record<string, MatchEvaluatorFn> = {
  exact_score: evaluateExactScore,
  score_difference: evaluateScoreDifference,
  winner: evaluateWinner,
  scorer: evaluateScorer,
  draw: evaluateDraw,
  soccer_playoff_advance: evaluateSoccerPlayoffAdvance,
}

const SERIES_EVALUATORS: Record<string, SeriesEvaluatorFn> = {
  series_exact: evaluateSeriesExact,
  series_winner: evaluateSeriesWinner,
}

const SPECIAL_EVALUATORS: Record<string, SpecialEvaluatorFn> = {
  exact_player: evaluateExactPlayer,
  exact_team: evaluateExactTeam,
  exact_value: evaluateExactValue,
}

// closest_value requires special handling (needs all predictions)
const CLOSEST_VALUE_EVALUATORS: Record<string, ClosestValueEvaluatorFn> = {
  closest_value: evaluateClosestValue,
}

/**
 * Get evaluator function for match bets
 */
export function getMatchEvaluator(
  evaluatorTypeName: string
): MatchEvaluatorFn | null {
  return MATCH_EVALUATORS[evaluatorTypeName] ?? null
}

/**
 * Get evaluator function for series bets
 */
export function getSeriesEvaluator(
  evaluatorTypeName: string
): SeriesEvaluatorFn | null {
  return SERIES_EVALUATORS[evaluatorTypeName] ?? null
}

/**
 * Get evaluator function for special bets
 */
export function getSpecialEvaluator(
  evaluatorTypeName: string
): SpecialEvaluatorFn | ClosestValueEvaluatorFn | null {
  return (
    SPECIAL_EVALUATORS[evaluatorTypeName] ??
    CLOSEST_VALUE_EVALUATORS[evaluatorTypeName] ??
    null
  )
}

/**
 * Check if evaluator type is closest_value (requires special handling)
 */
export function isClosestValueEvaluator(evaluatorTypeName: string): boolean {
  return evaluatorTypeName === 'closest_value'
}

/**
 * Check if evaluator type is question (returns point multiplier instead of boolean)
 */
export function isQuestionEvaluator(evaluatorTypeName: string): boolean {
  return evaluatorTypeName === 'question'
}