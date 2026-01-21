import { describe, it, expect } from "vitest";
import { evaluateScorer } from "./scorer";
import type { MatchBetContext } from "./types";

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
