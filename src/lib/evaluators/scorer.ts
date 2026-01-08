import type { MatchBetContext } from "./types";

/**
 * SCORER: Awards points if predicted scorer is among the actual scorers
 */
export function evaluateScorer(context: MatchBetContext): boolean {
  const { prediction, actual } = context;

  if (!prediction.scorerId || actual.scorerIds.length === 0) {
    return false;
  }

  return actual.scorerIds.includes(prediction.scorerId);
}
