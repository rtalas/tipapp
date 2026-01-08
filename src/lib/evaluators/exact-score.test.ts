import { describe, it, expect } from "vitest";
import { evaluateExactScore } from "./exact-score";
import type { MatchBetContext } from "./types";

describe("evaluateExactScore", () => {
  it("should return true when predicted score matches actual score exactly", () => {
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

    expect(evaluateExactScore(context)).toBe(true);
  });

  it("should return false when predicted score does not match", () => {
    const context: MatchBetContext = {
      prediction: { homeScore: 3, awayScore: 2 },
      actual: {
        homeRegularScore: 2,
        awayRegularScore: 2,
        homeFinalScore: 2,
        awayFinalScore: 2,
        scorerIds: [],
        isOvertime: false,
        isShootout: false,
        isPlayoffGame: false,
      },
    };

    expect(evaluateExactScore(context)).toBe(false);
  });

  it("should return false when match is not finished (null scores)", () => {
    const context: MatchBetContext = {
      prediction: { homeScore: 3, awayScore: 2 },
      actual: {
        homeRegularScore: null,
        awayRegularScore: null,
        homeFinalScore: null,
        awayFinalScore: null,
        scorerIds: [],
        isOvertime: false,
        isShootout: false,
        isPlayoffGame: false,
      },
    };

    expect(evaluateExactScore(context)).toBe(false);
  });

  it("should use regular time scores, not final scores", () => {
    const context: MatchBetContext = {
      prediction: { homeScore: 2, awayScore: 2 },
      actual: {
        homeRegularScore: 2,
        awayRegularScore: 2,
        homeFinalScore: 3, // Overtime winner
        awayFinalScore: 2,
        scorerIds: [],
        isOvertime: true,
        isShootout: false,
        isPlayoffGame: true,
      },
    };

    expect(evaluateExactScore(context)).toBe(true);
  });
});
