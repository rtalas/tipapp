import type { GroupStageContext } from "./types";

/**
 * Evaluates group stage team prediction
 * Awards full points if predicted team wins the group
 * Awards advance points if team advances but doesn't win
 * Awards zero points if team doesn't advance
 */
export function evaluateGroupStageTeam(context: GroupStageContext): number {
  const { prediction, actual, config } = context;

  if (!prediction.teamResultId) return 0;

  // Check if predicted team won the group (highest points)
  if (prediction.teamResultId === actual.winnerTeamId) {
    return config.winnerPoints;
  }

  // Check if predicted team advanced (fallback points)
  if (actual.advancedTeamIds.includes(prediction.teamResultId)) {
    return config.advancePoints;
  }

  return 0; // Team didn't advance
}
