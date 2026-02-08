import { type MatchBetContext, hasRegularScores } from "./types";

/**
 * DRAW: Awards points if match ends in draw and prediction was also a draw
 * Exclusion from exact_score is handled by the match-evaluator orchestrator.
 */
export function evaluateDraw(context: MatchBetContext): boolean {
  const { prediction, actual } = context;

  if (!hasRegularScores(actual)) {
    return false;
  }

  const predictedDraw = prediction.homeScore === prediction.awayScore;
  const actualDraw = actual.homeRegularScore === actual.awayRegularScore;

  return predictedDraw && actualDraw;
}
