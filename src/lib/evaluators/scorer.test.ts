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
});
