import type { SeriesBetContext } from "./types";
import { evaluateSeriesExact } from "./series-exact";

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
 * SERIES_WINNER: Awards points if predicted series winner is correct
 * Only evaluated if series_exact is false
 */
export function evaluateSeriesWinner(context: SeriesBetContext): boolean {
  const { prediction, actual } = context;

  if (
    prediction.homeTeamScore === null ||
    prediction.awayTeamScore === null ||
    actual.homeTeamScore === null ||
    actual.awayTeamScore === null
  ) {
    return false;
  }

  // Don't award if exact series already matched
  if (evaluateSeriesExact(context)) {
    return false;
  }

  const predictedWinner = getWinner(
    prediction.homeTeamScore,
    prediction.awayTeamScore
  );
  const actualWinner = getWinner(actual.homeTeamScore, actual.awayTeamScore);

  return predictedWinner === actualWinner;
}
