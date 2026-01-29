import { describe, it, expect } from "vitest";
import { evaluateOneTeamScore } from "./one-team-score";
import type { MatchBetContext } from "./types";

describe("evaluateOneTeamScore", () => {
  it("should return true when home score matches (but not exact or difference)", () => {
    const context: MatchBetContext = {
      prediction: { homeScore: 3, awayScore: 1 },
      actual: {
        homeRegularScore: 3,
        awayRegularScore: 2, // Different from prediction
        homeFinalScore: 3,
        awayFinalScore: 2,
        scorerIds: [],
        isOvertime: false,
        isShootout: false,
        isPlayoffGame: false,
      },
    };

    expect(evaluateOneTeamScore(context)).toBe(true);
  });

  it("should return true when away score matches (but not exact or difference)", () => {
    const context: MatchBetContext = {
      prediction: { homeScore: 2, awayScore: 3 },
      actual: {
        homeRegularScore: 4,
        awayRegularScore: 3, // Matches prediction
        homeFinalScore: 4,
        awayFinalScore: 3,
        scorerIds: [],
        isOvertime: false,
        isShootout: false,
        isPlayoffGame: false,
      },
    };

    expect(evaluateOneTeamScore(context)).toBe(true);
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

    expect(evaluateOneTeamScore(context)).toBe(false);
  });

  it("should return false when score difference matches (no double points)", () => {
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

    expect(evaluateOneTeamScore(context)).toBe(false);
  });

  it("should return false when neither score matches", () => {
    const context: MatchBetContext = {
      prediction: { homeScore: 2, awayScore: 1 },
      actual: {
        homeRegularScore: 4,
        awayRegularScore: 3,
        homeFinalScore: 4,
        awayFinalScore: 3,
        scorerIds: [],
        isOvertime: false,
        isShootout: false,
        isPlayoffGame: false,
      },
    };

    expect(evaluateOneTeamScore(context)).toBe(false);
  });

  it("should return false when match is not finished", () => {
    const context: MatchBetContext = {
      prediction: { homeScore: 3, awayScore: 1 },
      actual: {
        homeRegularScore: null,
        awayRegularScore: null,
        homeFinalScore: null,
        awayFinalScore: null,
        scorerIds: [],
        isOvertime: null,
        isShootout: null,
        isPlayoffGame: false,
      },
    };

    expect(evaluateOneTeamScore(context)).toBe(false);
  });

  it("should handle zero scores correctly", () => {
    const context: MatchBetContext = {
      prediction: { homeScore: 0, awayScore: 2 },
      actual: {
        homeRegularScore: 0, // Matches
        awayRegularScore: 1, // Different
        homeFinalScore: 0,
        awayFinalScore: 1,
        scorerIds: [],
        isOvertime: false,
        isShootout: false,
        isPlayoffGame: false,
      },
    };

    expect(evaluateOneTeamScore(context)).toBe(true);
  });
});
