import type { MatchBetContext } from "./types";

/**
 * Determines the winner based on scores
 * @returns 'home' | 'away' | 'draw'
 */
function getWinner(homeScore: number, awayScore: number): string {
  if (homeScore > awayScore) return "home";
  if (awayScore > homeScore) return "away";
  return "draw";
}

/**
 * WINNER: Awards points when the user correctly predicted a non-draw winner.
 *
 * Strict design: a draw on either side (prediction or actual) means winner does
 * not fire — the `draw` evaluator handles the draw case. This keeps the two
 * evaluators naturally mutually exclusive without an exclusion table.
 *
 * Hockey impact: actuals never resolve to a draw (OT/SO produce a decisive
 * homeFinalScore), and hockey users typically predict non-draw finals, so the
 * stricter rule does not change hockey behaviour. Football matches in group
 * stage can end as a draw; the football context-builder collapses
 * homeFinalScore = homeRegularScore so winner evaluates against regulation.
 */
export function evaluateWinner(context: MatchBetContext): boolean {
  const { prediction, actual } = context;

  if (actual.homeFinalScore === null || actual.awayFinalScore === null) {
    return false;
  }

  const predictedWinner = getWinner(prediction.homeScore, prediction.awayScore);
  const actualWinner = getWinner(actual.homeFinalScore, actual.awayFinalScore);

  if (predictedWinner === "draw" || actualWinner === "draw") {
    return false;
  }

  return predictedWinner === actualWinner;
}
