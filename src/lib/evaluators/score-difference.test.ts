import { describe, it, expect } from "vitest";
import { evaluateScoreDifference } from "./score-difference";
import type { MatchBetContext } from "./types";

describe("evaluateScoreDifference", () => {
  it("should return true when goal difference matches", () => {
    const context: MatchBetContext = {
      prediction: { homeScore: 3, awayScore: 1 }, // +2 difference
      actual: {
        homeRegularScore: 5,
        awayRegularScore: 3, // +2 difference
        homeFinalScore: 5,
        awayFinalScore: 3,
        scorerIds: [],
        isOvertime: false,
        isShootout: false,
        isPlayoffGame: false,
      },
    };

    expect(evaluateScoreDifference(context)).toBe(true);
  });

  it("should return false when exact score matches (no double points)", () => {
    const context: MatchBetContext = {
      prediction: { homeScore: 3, awayScore: 2 },
      actual: {
        homeRegularScore: 3,
        awayRegularScore: 2,
        homeFinalScore: 3,
        awayFinalScore: 2,
        scorerIds: [],
        isOvertime: false,
        isShootout: false,
        isPlayoffGame: false,
      },
    };

    expect(evaluateScoreDifference(context)).toBe(false);
  });

  it("should handle negative differences correctly", () => {
    const context: MatchBetContext = {
      prediction: { homeScore: 1, awayScore: 3 }, // -2 difference
      actual: {
        homeRegularScore: 0,
        awayRegularScore: 2, // -2 difference
        homeFinalScore: 0,
        awayFinalScore: 2,
        scorerIds: [],
        isOvertime: false,
        isShootout: false,
        isPlayoffGame: false,
      },
    };

    expect(evaluateScoreDifference(context)).toBe(true);
  });

  it("should handle zero difference (draw) correctly", () => {
    const context: MatchBetContext = {
      prediction: { homeScore: 2, awayScore: 2 }, // 0 difference
      actual: {
        homeRegularScore: 1,
        awayRegularScore: 1, // 0 difference
        homeFinalScore: 1,
        awayFinalScore: 1,
        scorerIds: [],
        isOvertime: false,
        isShootout: false,
        isPlayoffGame: false,
      },
    };

    expect(evaluateScoreDifference(context)).toBe(true);
  });
});
