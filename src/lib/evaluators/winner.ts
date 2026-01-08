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
 * WINNER: Awards points if predicted winner matches actual winner after total time
 * Uses final scores (including overtime/shootout)
 */
export function evaluateWinner(context: MatchBetContext): boolean {
  const { prediction, actual } = context;

  if (actual.homeFinalScore === null || actual.awayFinalScore === null) {
    return false;
  }

  const predictedWinner = getWinner(prediction.homeScore, prediction.awayScore);
  const actualWinner = getWinner(actual.homeFinalScore, actual.awayFinalScore);

  return predictedWinner === actualWinner;
}
