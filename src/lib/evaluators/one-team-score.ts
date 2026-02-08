import { type MatchBetContext, hasRegularScores } from "./types";

/**
 * ONE_TEAM_SCORE: Awards points if user correctly predicted one team's score
 * Exclusion from exact_score and score_difference is handled by the match-evaluator orchestrator.
 */
export function evaluateOneTeamScore(context: MatchBetContext): boolean {
  const { prediction, actual } = context;

  if (!hasRegularScores(actual)) {
    return false;
  }

  // Check if either team's score matches
  const homeScoreMatch = prediction.homeScore === actual.homeRegularScore;
  const awayScoreMatch = prediction.awayScore === actual.awayRegularScore;

  return homeScoreMatch || awayScoreMatch;
}
