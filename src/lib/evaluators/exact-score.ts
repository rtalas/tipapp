import type { MatchBetContext } from "./types";

/**
 * EXACT_SCORE: Awards points if predicted score matches actual score exactly after regulation time
 */
export function evaluateExactScore(context: MatchBetContext): boolean {
  const { prediction, actual } = context;

  if (actual.homeRegularScore === null || actual.awayRegularScore === null) {
    return false; // Match not finished
  }

  return (
    prediction.homeScore === actual.homeRegularScore &&
    prediction.awayScore === actual.awayRegularScore
  );
}
