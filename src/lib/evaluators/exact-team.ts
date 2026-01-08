import type { SpecialBetContext } from "./types";

/**
 * EXACT_TEAM: Awards points if predicted team matches actual team
 * Used for tournament-level predictions (e.g., winner, finalist)
 */
export function evaluateExactTeam(context: SpecialBetContext): boolean {
  const { prediction, actual } = context;

  if (!prediction.teamResultId || !actual.teamResultId) {
    return false;
  }

  return prediction.teamResultId === actual.teamResultId;
}
