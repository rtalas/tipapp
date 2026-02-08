/**
 * Shared type definitions for bet evaluation
 */

/**
 * Check whether regulation-time scores are available (match finished)
 */
export function hasRegularScores(actual: MatchBetContext['actual']): boolean {
  return actual.homeRegularScore !== null && actual.awayRegularScore !== null
}

/**
 * Match bet evaluation context
 */
export interface MatchBetContext {
  // User's prediction
  prediction: {
    homeScore: number;
    awayScore: number;
    scorerId?: number | null;
    noScorer?: boolean | null;
    homeAdvanced?: boolean | null;
    overtime?: boolean;
  };
  // Actual match result
  actual: {
    homeRegularScore: number | null;
    awayRegularScore: number | null;
    homeFinalScore: number | null;
    awayFinalScore: number | null;
    scorerIds: number[]; // Array of scorer IDs from MatchScorer
    scorerRankings?: Map<number, number | null>; // leaguePlayerId -> ranking at match time
    isOvertime: boolean | null;
    isShootout: boolean | null;
    isPlayoffGame: boolean;
    homeAdvanced?: boolean | null; // For playoff games
  };
}

/**
 * Series bet evaluation context
 */
export interface SeriesBetContext {
  prediction: {
    homeTeamScore: number | null;
    awayTeamScore: number | null;
  };
  actual: {
    homeTeamScore: number | null;
    awayTeamScore: number | null;
  };
}

/**
 * Special bet evaluation context (for player/team/value predictions)
 */
export interface SpecialBetContext {
  prediction: {
    teamResultId?: number | null;
    playerResultId?: number | null;
    value?: number | null;
  };
  actual: {
    teamResultId?: number | null;
    playerResultId?: number | null;
    value?: number | null;
  };
}

/**
 * Closest value evaluation context (requires all user bets)
 */
export interface ClosestValueContext {
  prediction: {
    value: number;
  };
  actual: {
    value: number;
  };
  allPredictions: number[]; // All user predictions for comparison
}

/**
 * Config for rank-based scorer evaluation
 * Supports flexible number of ranks per league
 */
export interface ScorerRankedConfig {
  rankedPoints: Record<string, number>; // "1" -> 2pts, "2" -> 4pts, etc.
  unrankedPoints: number; // Points for unranked scorers
}

// Example config JSON stored in database:
// {
//   "rankedPoints": { "1": 2, "2": 4, "3": 5, "4": 6 },
//   "unrankedPoints": 8
// }
// OR for league with only 3 ranks:
// {
//   "rankedPoints": { "1": 3, "2": 5, "3": 7 },
//   "unrankedPoints": 10
// }

/**
 * Config for group stage team prediction
 */
export interface GroupStageConfig {
  winnerPoints: number; // Points if predicted team wins group
  advancePoints: number; // Points if team advances but doesn't win
}

/**
 * Config for exact_player evaluator with position filtering
 * Allows restricting player selection to specific positions (e.g., only goalies)
 */
export interface ExactPlayerConfig {
  positions: string[] | null; // ['G', 'D'] or null for all positions
}

/**
 * Group stage evaluation context
 */
export interface GroupStageContext {
  prediction: {
    teamResultId: number | null;
  };
  actual: {
    winnerTeamId: number | null;
    advancedTeamIds: number[]; // All advancing teams (including winner)
  };
  config: GroupStageConfig;
}
