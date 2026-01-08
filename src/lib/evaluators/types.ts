/**
 * Shared type definitions for bet evaluation
 */

/**
 * Match bet evaluation context
 */
export interface MatchBetContext {
  // User's prediction
  prediction: {
    homeScore: number;
    awayScore: number;
    scorerId?: number | null;
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
