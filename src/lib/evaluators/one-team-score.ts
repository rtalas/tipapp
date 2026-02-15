import { type MatchBetContext, hasRegularScores, getPredictedRegulationScores } from "./types";

/**
 * ONE_TEAM_SCORE: Awards points if user correctly predicted one team's score
 * Exclusion from exact_score and score_difference is handled by the match-evaluator orchestrator.
 */
export function evaluateOneTeamScore(context: MatchBetContext): boolean {
  const { prediction, actual } = context;

  if (!hasRegularScores(actual)) {
    return false;
  }

  // Compare predicted regulation scores (adjusts for OT goal if user entered final score)
  const predictedReg = getPredictedRegulationScores(prediction);
  const homeScoreMatch = predictedReg.homeScore === actual.homeRegularScore;
  const awayScoreMatch = predictedReg.awayScore === actual.awayRegularScore;

  return homeScoreMatch || awayScoreMatch;
}
