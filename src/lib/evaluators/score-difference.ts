import type { MatchBetContext } from "./types";
import { evaluateExactScore } from "./exact-score";

/**
 * SCORE_DIFFERENCE: Awards points if predicted goal difference matches actual goal difference
 * Only evaluated if exact_score is false
 */
export function evaluateScoreDifference(context: MatchBetContext): boolean {
  const { prediction, actual } = context;

  if (actual.homeRegularScore === null || actual.awayRegularScore === null) {
    return false;
  }

  // Don't award if exact score already matched
  if (evaluateExactScore(context)) {
    return false;
  }

  const predictedDiff = prediction.homeScore - prediction.awayScore;
  const actualDiff = actual.homeRegularScore - actual.awayRegularScore;

  return predictedDiff === actualDiff;
}
