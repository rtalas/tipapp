import { type MatchBetContext, hasRegularScores, getPredictedRegulationScores } from "./types";

/**
 * DRAW: Awards points if match ends in draw and prediction was also a draw
 * Exclusion from exact_score is handled by the match-evaluator orchestrator.
 */
export function evaluateDraw(context: MatchBetContext): boolean {
  const { prediction, actual } = context;

  if (!hasRegularScores(actual)) {
    return false;
  }

  // Compare predicted regulation scores (adjusts for OT goal if user entered final score)
  const predictedReg = getPredictedRegulationScores(prediction);
  const predictedDraw = predictedReg.homeScore === predictedReg.awayScore;
  const actualDraw = actual.homeRegularScore === actual.awayRegularScore;

  return predictedDraw && actualDraw;
}
