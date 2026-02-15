import { type MatchBetContext, hasRegularScores, getPredictedRegulationScores } from "./types";

/**
 * EXACT_SCORE: Awards points if predicted score matches actual score exactly after regulation time
 * AND overtime prediction matches actual overtime result
 */
export function evaluateExactScore(context: MatchBetContext): boolean {
  const { prediction, actual } = context;

  if (!hasRegularScores(actual)) {
    return false;
  }

  // Compare predicted regulation scores (adjusts for OT goal if user entered final score)
  const predictedReg = getPredictedRegulationScores(prediction);
  const scoresMatch =
    predictedReg.homeScore === actual.homeRegularScore &&
    predictedReg.awayScore === actual.awayRegularScore;

  if (!scoresMatch) {
    return false;
  }

  // Overtime prediction must match actual overtime result
  const predictedOvertime = prediction.overtime ?? false;
  const actualOvertime = actual.isOvertime || actual.isShootout || false;

  return predictedOvertime === actualOvertime;
}
