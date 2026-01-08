import { describe, it, expect } from "vitest";
import { evaluateWinner } from "./winner";
import type { MatchBetContext } from "./types";

describe("evaluateWinner", () => {
  it("should return true when predicted winner is correct (home win)", () => {
    const context: MatchBetContext = {
      prediction: { homeScore: 3, awayScore: 1 },
      actual: {
        homeRegularScore: 2,
        awayRegularScore: 2,
        homeFinalScore: 3, // Home wins in overtime
        awayFinalScore: 2,
        scorerIds: [],
        isOvertime: true,
        isShootout: false,
        isPlayoffGame: true,
      },
    };

    expect(evaluateWinner(context)).toBe(true);
  });

  it("should return true when predicted winner is correct (away win)", () => {
    const context: MatchBetContext = {
      prediction: { homeScore: 1, awayScore: 4 },
      actual: {
        homeRegularScore: 2,
        awayRegularScore: 2,
        homeFinalScore: 2,
        awayFinalScore: 3, // Away wins in overtime
        scorerIds: [],
        isOvertime: true,
        isShootout: false,
        isPlayoffGame: true,
      },
    };

    expect(evaluateWinner(context)).toBe(true);
  });

  it("should return true when predicted draw is correct", () => {
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

    expect(evaluateWinner(context)).toBe(true);
  });

  it("should use final scores for winner determination", () => {
    const context: MatchBetContext = {
      prediction: { homeScore: 3, awayScore: 2 }, // Home win
      actual: {
        homeRegularScore: 2,
        awayRegularScore: 2, // Draw in regulation
        homeFinalScore: 3, // Home wins in OT
        awayFinalScore: 2,
        scorerIds: [],
        isOvertime: true,
        isShootout: false,
        isPlayoffGame: true,
      },
    };

    expect(evaluateWinner(context)).toBe(true);
  });

  it("should return false when predicted winner is incorrect", () => {
    const context: MatchBetContext = {
      prediction: { homeScore: 3, awayScore: 1 }, // Home win prediction
      actual: {
        homeRegularScore: 1,
        awayRegularScore: 3, // Away win actual
        homeFinalScore: 1,
        awayFinalScore: 3,
        scorerIds: [],
        isOvertime: false,
        isShootout: false,
        isPlayoffGame: false,
      },
    };

    expect(evaluateWinner(context)).toBe(false);
  });
});
