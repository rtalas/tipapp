/**
 * Special Bet Type Utilities
 *
 * Centralized utilities for determining special bet types from evaluators.
 */

export type SpecialBetType = 'team' | 'player' | 'value'

/**
 * Determines the prediction type based on evaluator type name
 * @param evaluatorTypeName - The EvaluatorType.name from the database
 * @returns The prediction type category
 */
export function getSpecialBetTypeFromEvaluator(evaluatorTypeName: string): SpecialBetType {
  // Team-based evaluators
  if (evaluatorTypeName === 'exact_team' || evaluatorTypeName === 'group_stage_team') {
    return 'team'
  }
  // Player-based evaluators
  if (evaluatorTypeName === 'exact_player') {
    return 'player'
  }
  // Value-based evaluators (exact_value, closest_value, etc.)
  return 'value'
}