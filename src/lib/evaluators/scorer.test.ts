import { describe, it, expect } from 'vitest'
import { evaluateScorer } from './scorer'
import type { MatchBetContext, ScorerRankedConfig } from './types'

describe("evaluateScorer", () => {
  it("should return true when predicted scorer is in actual scorers list", () => {
    const context: MatchBetContext = {
      prediction: { homeScore: 3, awayScore: 2, scorerId: 42 },
      actual: {
        homeRegularScore: 3,
        awayRegularScore: 2,
        homeFinalScore: 3,
        awayFinalScore: 2,
        scorerIds: [41, 42, 43], // Scorer 42 scored
        isOvertime: false,
        isShootout: false,
        isPlayoffGame: false,
      },
    };

    expect(evaluateScorer(context)).toBe(true);
  });

  it("should return false when predicted scorer did not score", () => {
    const context: MatchBetContext = {
      prediction: { homeScore: 3, awayScore: 2, scorerId: 99 },
      actual: {
        homeRegularScore: 3,
        awayRegularScore: 2,
        homeFinalScore: 3,
        awayFinalScore: 2,
        scorerIds: [41, 42, 43], // Scorer 99 did not score
        isOvertime: false,
        isShootout: false,
        isPlayoffGame: false,
      },
    };

    expect(evaluateScorer(context)).toBe(false);
  });

  it("should return false when no scorer was predicted", () => {
    const context: MatchBetContext = {
      prediction: { homeScore: 3, awayScore: 2, scorerId: null },
      actual: {
        homeRegularScore: 3,
        awayRegularScore: 2,
        homeFinalScore: 3,
        awayFinalScore: 2,
        scorerIds: [41, 42, 43],
        isOvertime: false,
        isShootout: false,
        isPlayoffGame: false,
      },
    };

    expect(evaluateScorer(context)).toBe(false);
  });

  it("should return false when no actual scorers recorded", () => {
    const context: MatchBetContext = {
      prediction: { homeScore: 3, awayScore: 2, scorerId: 42 },
      actual: {
        homeRegularScore: 3,
        awayRegularScore: 2,
        homeFinalScore: 3,
        awayFinalScore: 2,
        scorerIds: [], // No scorers recorded
        isOvertime: false,
        isShootout: false,
        isPlayoffGame: false,
      },
    };

    expect(evaluateScorer(context)).toBe(false);
  });

  it("should return true when user predicted no scorer and match had no scorers", () => {
    const context: MatchBetContext = {
      prediction: { homeScore: 0, awayScore: 0, scorerId: null, noScorer: true },
      actual: {
        homeRegularScore: 0,
        awayRegularScore: 0,
        homeFinalScore: 0,
        awayFinalScore: 0,
        scorerIds: [], // No scorers in 0-0 game
        isOvertime: false,
        isShootout: false,
        isPlayoffGame: false,
      },
    };

    expect(evaluateScorer(context)).toBe(true);
  });

  it("should return false when user predicted no scorer but match had scorers", () => {
    const context: MatchBetContext = {
      prediction: { homeScore: 1, awayScore: 0, scorerId: null, noScorer: true },
      actual: {
        homeRegularScore: 1,
        awayRegularScore: 0,
        homeFinalScore: 1,
        awayFinalScore: 0,
        scorerIds: [42], // Match had scorers
        isOvertime: false,
        isShootout: false,
        isPlayoffGame: false,
      },
    };

    expect(evaluateScorer(context)).toBe(false);
  });

  it("should return false when user did not pick anything (null/null) even if match had no scorers", () => {
    const context: MatchBetContext = {
      prediction: { homeScore: 0, awayScore: 0, scorerId: null, noScorer: null },
      actual: {
        homeRegularScore: 0,
        awayRegularScore: 0,
        homeFinalScore: 0,
        awayFinalScore: 0,
        scorerIds: [], // No scorers but user didn't make a prediction
        isOvertime: false,
        isShootout: false,
        isPlayoffGame: false,
      },
    };

    expect(evaluateScorer(context)).toBe(false); // No points for "not picked"
  });
});

describe('evaluateScorer - rank-based mode', () => {
  const config: ScorerRankedConfig = {
    rankedPoints: {
      '1': 2,
      '2': 4,
      '3': 5,
      '4': 6,
    },
    unrankedPoints: 8,
  }

  it('should return rank 1 points when predicting rank 1 scorer', () => {
    const context: MatchBetContext = {
      prediction: { homeScore: 3, awayScore: 2, scorerId: 42 },
      actual: {
        homeRegularScore: 3,
        awayRegularScore: 2,
        homeFinalScore: 3,
        awayFinalScore: 2,
        scorerIds: [42],
        scorerRankings: new Map([[42, 1]]), // Rank 1 scorer
        isOvertime: false,
        isShootout: false,
        isPlayoffGame: false,
      },
    }

    expect(evaluateScorer(context, config)).toBe(2)
  })

  it('should return rank 2 points when predicting rank 2 scorer', () => {
    const context: MatchBetContext = {
      prediction: { homeScore: 3, awayScore: 2, scorerId: 42 },
      actual: {
        homeRegularScore: 3,
        awayRegularScore: 2,
        homeFinalScore: 3,
        awayFinalScore: 2,
        scorerIds: [42],
        scorerRankings: new Map([[42, 2]]), // Rank 2 scorer
        isOvertime: false,
        isShootout: false,
        isPlayoffGame: false,
      },
    }

    expect(evaluateScorer(context, config)).toBe(4)
  })

  it('should return rank 3 points when predicting rank 3 scorer', () => {
    const context: MatchBetContext = {
      prediction: { homeScore: 3, awayScore: 2, scorerId: 42 },
      actual: {
        homeRegularScore: 3,
        awayRegularScore: 2,
        homeFinalScore: 3,
        awayFinalScore: 2,
        scorerIds: [42],
        scorerRankings: new Map([[42, 3]]), // Rank 3 scorer
        isOvertime: false,
        isShootout: false,
        isPlayoffGame: false,
      },
    }

    expect(evaluateScorer(context, config)).toBe(5)
  })

  it('should return rank 4 points when predicting rank 4 scorer', () => {
    const context: MatchBetContext = {
      prediction: { homeScore: 3, awayScore: 2, scorerId: 42 },
      actual: {
        homeRegularScore: 3,
        awayRegularScore: 2,
        homeFinalScore: 3,
        awayFinalScore: 2,
        scorerIds: [42],
        scorerRankings: new Map([[42, 4]]), // Rank 4 scorer
        isOvertime: false,
        isShootout: false,
        isPlayoffGame: false,
      },
    }

    expect(evaluateScorer(context, config)).toBe(6)
  })

  it('should return unranked points when predicting unranked scorer', () => {
    const context: MatchBetContext = {
      prediction: { homeScore: 3, awayScore: 2, scorerId: 42 },
      actual: {
        homeRegularScore: 3,
        awayRegularScore: 2,
        homeFinalScore: 3,
        awayFinalScore: 2,
        scorerIds: [42],
        scorerRankings: new Map([[42, null]]), // Unranked scorer
        isOvertime: false,
        isShootout: false,
        isPlayoffGame: false,
      },
    }

    expect(evaluateScorer(context, config)).toBe(8)
  })

  it('should return 0 when prediction is incorrect', () => {
    const context: MatchBetContext = {
      prediction: { homeScore: 3, awayScore: 2, scorerId: 99 },
      actual: {
        homeRegularScore: 3,
        awayRegularScore: 2,
        homeFinalScore: 3,
        awayFinalScore: 2,
        scorerIds: [42],
        scorerRankings: new Map([[42, 1]]),
        isOvertime: false,
        isShootout: false,
        isPlayoffGame: false,
      },
    }

    expect(evaluateScorer(context, config)).toBe(0)
  })

  it('should return unranked points when no scorer predicted for 0-0 game', () => {
    const context: MatchBetContext = {
      prediction: { homeScore: 0, awayScore: 0, scorerId: null, noScorer: true },
      actual: {
        homeRegularScore: 0,
        awayRegularScore: 0,
        homeFinalScore: 0,
        awayFinalScore: 0,
        scorerIds: [],
        scorerRankings: new Map(),
        isOvertime: false,
        isShootout: false,
        isPlayoffGame: false,
      },
    }

    expect(evaluateScorer(context, config)).toBe(8)
  })

  it('should return 0 when no scorer predicted but game had scorers', () => {
    const context: MatchBetContext = {
      prediction: { homeScore: 1, awayScore: 0, scorerId: null, noScorer: true },
      actual: {
        homeRegularScore: 1,
        awayRegularScore: 0,
        homeFinalScore: 1,
        awayFinalScore: 0,
        scorerIds: [42],
        scorerRankings: new Map([[42, 1]]),
        isOvertime: false,
        isShootout: false,
        isPlayoffGame: false,
      },
    }

    expect(evaluateScorer(context, config)).toBe(0)
  })

  it('should return unranked points when ranking is missing in context', () => {
    const context: MatchBetContext = {
      prediction: { homeScore: 3, awayScore: 2, scorerId: 42 },
      actual: {
        homeRegularScore: 3,
        awayRegularScore: 2,
        homeFinalScore: 3,
        awayFinalScore: 2,
        scorerIds: [42],
        // scorerRankings not provided
        isOvertime: false,
        isShootout: false,
        isPlayoffGame: false,
      },
    }

    expect(evaluateScorer(context, config)).toBe(8)
  })

  it('should return unranked points when ranking exists but not in config', () => {
    const context: MatchBetContext = {
      prediction: { homeScore: 3, awayScore: 2, scorerId: 42 },
      actual: {
        homeRegularScore: 3,
        awayRegularScore: 2,
        homeFinalScore: 3,
        awayFinalScore: 2,
        scorerIds: [42],
        scorerRankings: new Map([[42, 5]]), // Rank 5 not in config
        isOvertime: false,
        isShootout: false,
        isPlayoffGame: false,
      },
    }

    expect(evaluateScorer(context, config)).toBe(8)
  })

  it('should work with league using only 3 ranks', () => {
    const config3Ranks: ScorerRankedConfig = {
      rankedPoints: {
        '1': 3,
        '2': 5,
        '3': 7,
      },
      unrankedPoints: 10,
    }

    const context: MatchBetContext = {
      prediction: { homeScore: 3, awayScore: 2, scorerId: 42 },
      actual: {
        homeRegularScore: 3,
        awayRegularScore: 2,
        homeFinalScore: 3,
        awayFinalScore: 2,
        scorerIds: [42],
        scorerRankings: new Map([[42, 2]]), // Rank 2
        isOvertime: false,
        isShootout: false,
        isPlayoffGame: false,
      },
    }

    expect(evaluateScorer(context, config3Ranks)).toBe(5)
  })

  it('should work with league using 6 ranks', () => {
    const config6Ranks: ScorerRankedConfig = {
      rankedPoints: {
        '1': 1,
        '2': 2,
        '3': 3,
        '4': 4,
        '5': 5,
        '6': 6,
      },
      unrankedPoints: 10,
    }

    const context: MatchBetContext = {
      prediction: { homeScore: 3, awayScore: 2, scorerId: 42 },
      actual: {
        homeRegularScore: 3,
        awayRegularScore: 2,
        homeFinalScore: 3,
        awayFinalScore: 2,
        scorerIds: [42],
        scorerRankings: new Map([[42, 6]]), // Rank 6
        isOvertime: false,
        isShootout: false,
        isPlayoffGame: false,
      },
    }

    expect(evaluateScorer(context, config6Ranks)).toBe(6)
  })
})
