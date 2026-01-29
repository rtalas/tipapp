import type { MatchBetContext } from "./types";
import { evaluateExactScore } from "./exact-score";
import { evaluateScoreDifference } from "./score-difference";

/**
 * ONE_TEAM_SCORE: Awards points if user correctly predicted one team's score
 * Only evaluated if exact_score and score_difference are false
 */
export function evaluateOneTeamScore(context: MatchBetContext): boolean {
  const { prediction, actual } = context;

  if (actual.homeRegularScore === null || actual.awayRegularScore === null) {
    return false; // Match not finished
  }

  // Don't award if exact score or score difference already matched
  if (evaluateExactScore(context) || evaluateScoreDifference(context)) {
    return false;
  }

  // Check if either team's score matches
  const homeScoreMatch = prediction.homeScore === actual.homeRegularScore;
  const awayScoreMatch = prediction.awayScore === actual.awayRegularScore;

  return homeScoreMatch || awayScoreMatch;
}
