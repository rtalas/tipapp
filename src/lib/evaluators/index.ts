/**
 * Evaluator functions for bet evaluation
 * Each evaluator type has its own file for maintainability
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
