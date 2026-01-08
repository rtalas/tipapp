import { describe, it, expect } from "vitest";
import { evaluateDraw } from "./draw";
import type { MatchBetContext } from "./types";

describe("evaluateDraw", () => {
  it("should return true when both prediction and actual are draws", () => {
    const context: MatchBetContext = {
      prediction: { homeScore: 2, awayScore: 2 },
      actual: {
        homeRegularScore: 1,
        awayRegularScore: 1,
        homeFinalScore: 1,
        awayFinalScore: 1,
        scorerIds: [],
        isOvertime: false,
        isShootout: false,
        isPlayoffGame: false,
      },
    };

    expect(evaluateDraw(context)).toBe(true);
  });

  it("should return false when exact score matches (no double points)", () => {
    const context: MatchBetContext = {
      prediction: { homeScore: 2, awayScore: 2 },
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

    expect(evaluateDraw(context)).toBe(false);
  });

  it("should return false when prediction is draw but actual is not", () => {
    const context: MatchBetContext = {
      prediction: { homeScore: 2, awayScore: 2 },
      actual: {
        homeRegularScore: 3,
        awayRegularScore: 1,
        homeFinalScore: 3,
        awayFinalScore: 1,
        scorerIds: [],
        isOvertime: false,
        isShootout: false,
        isPlayoffGame: false,
      },
    };

    expect(evaluateDraw(context)).toBe(false);
  });

  it("should return false when actual is draw but prediction is not", () => {
    const context: MatchBetContext = {
      prediction: { homeScore: 3, awayScore: 1 },
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

    expect(evaluateDraw(context)).toBe(false);
  });
});
