import { type MatchBetContext, hasRegularScores, getPredictedRegulationScores } from "./types";

/**
 * SCORE_DIFFERENCE: Awards points if predicted goal difference matches actual goal difference
 * Exclusion from exact_score is handled by the match-evaluator orchestrator.
 */
export function evaluateScoreDifference(context: MatchBetContext): boolean {
  const { prediction, actual } = context;

  if (!hasRegularScores(actual)) {
    return false;
  }

  const predictedReg = getPredictedRegulationScores(prediction);
  const predictedDiff = predictedReg.homeScore - predictedReg.awayScore;
  const actualDiff = actual.homeRegularScore! - actual.awayRegularScore!;

  return predictedDiff === actualDiff;
}
