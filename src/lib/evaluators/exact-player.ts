import type { SpecialBetContext } from "./types";

/**
 * EXACT_PLAYER: Awards points if predicted player matches actual player
 * Used for tournament-level predictions (e.g., best scorer)
 */
export function evaluateExactPlayer(context: SpecialBetContext): boolean {
  const { prediction, actual } = context;

  if (!prediction.playerResultId || !actual.playerResultId) {
    return false;
  }

  return prediction.playerResultId === actual.playerResultId;
}
