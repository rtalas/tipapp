import type { MatchBetContext, ScorerRankedConfig } from './types'

/**
 * Evaluates scorer predictions.
 * Supports two modes:
 * 1. Simple mode (no config): Returns boolean (true if correct prediction)
 * 2. Rank-based mode (with config): Returns points value based on scorer's ranking
 *
 * @param context - Match bet context with scorer rankings (optional)
 * @param config - Optional league-specific rank points configuration
 * @returns Boolean (simple mode) or number (rank-based mode)
 */
export function evaluateScorer(
  context: MatchBetContext,
  config?: ScorerRankedConfig | null
): boolean | number {
  const { prediction, actual } = context

  // Handle "no scorer" prediction (0-0 game)
  if (prediction.noScorer === true) {
    const isCorrect = actual.scorerIds.length === 0

    // Rank-based mode: return unranked points
    if (config) {
      return isCorrect ? config.unrankedPoints : 0
    }

    // Simple mode: return boolean
    return isCorrect
  }

  // Check if predicted scorer is in actual scorers
  if (!prediction.scorerId || !actual.scorerIds.includes(prediction.scorerId)) {
    return config ? 0 : false // Return type based on mode
  }

  // Correct prediction - determine points/boolean based on mode
  if (!config) {
    // Simple mode: return true (original behavior)
    return true
  }

  // Rank-based mode: lookup ranking and return points
  const ranking = actual.scorerRankings?.get(prediction.scorerId) ?? null

  // Award points based on ranking (supports dynamic rank counts)
  if (ranking !== null && String(ranking) in config.rankedPoints) {
    return config.rankedPoints[String(ranking)]
  }

  // No ranking or ranking not configured in league
  return config.unrankedPoints
}
