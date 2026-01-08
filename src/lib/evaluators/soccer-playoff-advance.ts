import type { MatchBetContext } from "./types";

/**
 * SOCCER_PLAYOFF_ADVANCE: Awards points if predicted team advances in playoff scenario
 * For soccer playoff games in overtime or penalties
 */
export function evaluateSoccerPlayoffAdvance(
  context: MatchBetContext
): boolean {
  const { prediction, actual } = context;

  if (!actual.isPlayoffGame) {
    return false;
  }

  if (
    prediction.homeAdvanced === null ||
    prediction.homeAdvanced === undefined ||
    actual.homeAdvanced === null ||
    actual.homeAdvanced === undefined
  ) {
    return false;
  }

  return prediction.homeAdvanced === actual.homeAdvanced;
}
