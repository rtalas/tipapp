/**
 * Maps EvaluatorType.name (snake_case) to evaluator functions
 * Provides type-safe lookup and execution
 */

import {
  evaluateExactScore,
  evaluateScoreDifference,
  evaluateOneTeamScore,
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
  evaluateGroupStageTeam,
  type MatchBetContext,
  type SeriesBetContext,
  type SpecialBetContext,
  type ClosestValueContext,
  type GroupStageContext,
} from './index'

// Type definitions
type MatchEvaluatorFn = (context: MatchBetContext) => boolean | number
type SeriesEvaluatorFn = (context: SeriesBetContext) => boolean
type SpecialEvaluatorFn = (context: SpecialBetContext) => boolean
type ClosestValueEvaluatorFn = (context: ClosestValueContext) => number
type GroupStageEvaluatorFn = (context: GroupStageContext) => number


// Evaluator mapping registries
const MATCH_EVALUATORS: Record<string, MatchEvaluatorFn> = {
  exact_score: evaluateExactScore,
  score_difference: evaluateScoreDifference,
  one_team_score: evaluateOneTeamScore,
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

// group_stage_team requires special handling (needs config + advanced teams)
const GROUP_STAGE_EVALUATORS: Record<string, GroupStageEvaluatorFn> = {
  group_stage_team: evaluateGroupStageTeam,
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
): SpecialEvaluatorFn | ClosestValueEvaluatorFn | GroupStageEvaluatorFn | null {
  return (
    SPECIAL_EVALUATORS[evaluatorTypeName] ??
    CLOSEST_VALUE_EVALUATORS[evaluatorTypeName] ??
    GROUP_STAGE_EVALUATORS[evaluatorTypeName] ??
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

/**
 * Check if evaluator type is group_stage_team (requires config and advanced teams)
 */
export function isGroupStageEvaluator(evaluatorTypeName: string): boolean {
  return evaluatorTypeName === 'group_stage_team'
}

/**
 * Get the entity type for an evaluator based on its type name
 * Returns: 'match' | 'series' | 'special' | 'question'
 */
export function getEvaluatorEntity(evaluatorTypeName: string): string {
  if (SERIES_EVALUATORS[evaluatorTypeName]) {
    return 'series'
  }
  if (SPECIAL_EVALUATORS[evaluatorTypeName] || CLOSEST_VALUE_EVALUATORS[evaluatorTypeName] || GROUP_STAGE_EVALUATORS[evaluatorTypeName]) {
    return 'special'
  }
  if (isQuestionEvaluator(evaluatorTypeName)) {
    return 'question'
  }
  // Default to match for all other evaluators
  return 'match'
}