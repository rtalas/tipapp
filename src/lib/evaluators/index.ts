/**
 * Evaluator functions for bet evaluation
 *
 * The TipApp betting system uses 13 distinct evaluator types organized into three categories:
 *
 * ## Match Bet Evaluators
 * - `exact-score` - Exact match prediction (regulation score + overtime must match)
 * - `score-difference` - Goal difference prediction (excludes exact score)
 * - `one-team-score` - One team's score correct (excludes exact score and score difference)
 * - `winner` - Match winner prediction (includes OT/SO)
 * - `scorer` - Goal scorer prediction
 * - `draw` - Draw prediction (soccer only, excludes exact score)
 * - `soccer-playoff-advance` - Team advancement in playoffs
 *
 * ## Series Bet Evaluators
 * - `series-exact` - Exact series result (e.g., 4-2)
 * - `series-winner` - Series winner prediction (excludes exact)
 *
 * ## Special Bet Evaluators
 * - `exact-player` - Player prediction (e.g., best scorer)
 * - `exact-team` - Team prediction (e.g., tournament winner)
 * - `exact-value` - Exact numeric value
 * - `closest-value` - Closest prediction among all users
 * - `question` - Yes/no question answers
 *
 * @module evaluators
 * @see {@link ../../CLAUDE.md} for detailed documentation
 */

// Export types
export type {
  MatchBetContext,
  SeriesBetContext,
  SpecialBetContext,
  ClosestValueContext,
} from "./types";

// Export match bet evaluators
export { evaluateExactScore } from "./exact-score";
export { evaluateScoreDifference } from "./score-difference";
export { evaluateOneTeamScore } from "./one-team-score";
export { evaluateWinner } from "./winner";
export { evaluateScorer } from "./scorer";
export { evaluateDraw } from "./draw";
export { evaluateSoccerPlayoffAdvance } from "./soccer-playoff-advance";

// Export series bet evaluators
export { evaluateSeriesExact } from "./series-exact";
export { evaluateSeriesWinner } from "./series-winner";

// Export special bet evaluators
export { evaluateExactPlayer } from "./exact-player";
export { evaluateExactTeam } from "./exact-team";
export { evaluateExactValue } from "./exact-value";
export { evaluateClosestValue } from "./closest-value";
export { evaluateQuestion } from "./question";

// Export evaluator utilities
export {
  getMatchEvaluator,
  getSeriesEvaluator,
  getSpecialEvaluator,
  isClosestValueEvaluator,
  isQuestionEvaluator,
  getEvaluatorEntity,
} from "./evaluator-mapper";

export {
  buildMatchBetContext,
  buildSeriesBetContext,
  buildSpecialBetContext,
  buildClosestValueContext,
  buildQuestionContext,
} from "./context-builders";
