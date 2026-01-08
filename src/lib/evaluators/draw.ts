import type { MatchBetContext } from "./types";
import { evaluateExactScore } from "./exact-score";

/**
 * DRAW: Awards points if match ends in draw and prediction was also a draw
 * Only for soccer, only if exact_score is false
 */
export function evaluateDraw(context: MatchBetContext): boolean {
  const { prediction, actual } = context;

  if (actual.homeRegularScore === null || actual.awayRegularScore === null) {
    return false;
  }

  // Don't award if exact score already matched
  if (evaluateExactScore(context)) {
    return false;
  }

  const predictedDraw = prediction.homeScore === prediction.awayScore;
  const actualDraw = actual.homeRegularScore === actual.awayRegularScore;

  return predictedDraw && actualDraw;
}
