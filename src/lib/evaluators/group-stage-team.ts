import type { GroupStageContext } from "./types";

/**
 * Evaluates group stage team prediction
 * - Full points if predicted team is the position result (winner of this bet)
 * - Advance points if team advanced but didn't match position
 *   - When config.requiresUserMark is true, advance points require the user to
 *     have explicitly marked their prediction as advancing (used for 3rd-place bets)
 * - Zero otherwise
 */
export function evaluateGroupStageTeam(context: GroupStageContext): number {
  const { prediction, actual, config } = context;

  if (!prediction.teamResultId) return 0;

  if (prediction.teamResultId === actual.winnerTeamId) {
    return config.winnerPoints;
  }

  if (actual.advancedTeamIds.includes(prediction.teamResultId)) {
    if (config.requiresUserMark && !prediction.markedAsAdvancing) return 0;
    return config.advancePoints;
  }

  return 0;
}
