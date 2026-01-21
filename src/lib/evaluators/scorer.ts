import type { MatchBetContext } from "./types";

/**
 * SCORER: Awards points if predicted scorer is among the actual scorers,
 * or if user predicted "no scorer" and match had no scorers (0:0 game)
 */
export function evaluateScorer(context: MatchBetContext): boolean {
  const { prediction, actual } = context;

  // Award points if user predicted "no scorer" and match had no scorers
  if (prediction.noScorer === true && actual.scorerIds.length === 0) {
    return true;
  }

  // Award points if predicted scorer is in actual scorers
  if (prediction.scorerId && actual.scorerIds.length > 0) {
    return actual.scorerIds.includes(prediction.scorerId);
  }

  // No points for "not picked" or wrong predictions
  return false;
}
