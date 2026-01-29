import type { MatchBetContext } from "./types";

/**
 * EXACT_SCORE: Awards points if predicted score matches actual score exactly after regulation time
 * AND overtime prediction matches actual overtime result
 */
export function evaluateExactScore(context: MatchBetContext): boolean {
  const { prediction, actual } = context;

  if (actual.homeRegularScore === null || actual.awayRegularScore === null) {
    return false; // Match not finished
  }

  // Scores must match
  const scoresMatch =
    prediction.homeScore === actual.homeRegularScore &&
    prediction.awayScore === actual.awayRegularScore;

  if (!scoresMatch) {
    return false;
  }

  // Overtime prediction must match actual overtime result
  const predictedOvertime = prediction.overtime ?? false;
  const actualOvertime = actual.isOvertime || actual.isShootout || false;

  return predictedOvertime === actualOvertime;
}
