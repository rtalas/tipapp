import { describe, it, expect } from "vitest";
import { evaluateExactScore } from "./exact-score";
import type { MatchBetContext } from "./types";

describe("evaluateExactScore", () => {
  it("should return true when score and overtime prediction match (no overtime)", () => {
    const context: MatchBetContext = {
      prediction: { homeScore: 3, awayScore: 2, overtime: false },
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

  it("should return true when score and overtime prediction match (with overtime)", () => {
    const context: MatchBetContext = {
      prediction: { homeScore: 2, awayScore: 2, overtime: true },
      actual: {
        homeRegularScore: 2,
        awayRegularScore: 2,
        homeFinalScore: 3,
        awayFinalScore: 2,
        scorerIds: [],
        isOvertime: true,
        isShootout: false,
        isPlayoffGame: true,
      },
    };

    expect(evaluateExactScore(context)).toBe(true);
  });

  it("should return true when score and overtime prediction match (with shootout)", () => {
    const context: MatchBetContext = {
      prediction: { homeScore: 2, awayScore: 2, overtime: true },
      actual: {
        homeRegularScore: 2,
        awayRegularScore: 2,
        homeFinalScore: 3,
        awayFinalScore: 2,
        scorerIds: [],
        isOvertime: false,
        isShootout: true,
        isPlayoffGame: false,
      },
    };

    expect(evaluateExactScore(context)).toBe(true);
  });

  it("should return false when score matches but overtime prediction does not (predicted no OT, was OT)", () => {
    const context: MatchBetContext = {
      prediction: { homeScore: 2, awayScore: 2, overtime: false },
      actual: {
        homeRegularScore: 2,
        awayRegularScore: 2,
        homeFinalScore: 3,
        awayFinalScore: 2,
        scorerIds: [],
        isOvertime: true,
        isShootout: false,
        isPlayoffGame: true,
      },
    };

    expect(evaluateExactScore(context)).toBe(false);
  });

  it("should return false when score matches but overtime prediction does not (predicted OT, was regulation)", () => {
    const context: MatchBetContext = {
      prediction: { homeScore: 3, awayScore: 2, overtime: true },
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

    expect(evaluateExactScore(context)).toBe(false);
  });

  it("should return false when predicted score does not match", () => {
    const context: MatchBetContext = {
      prediction: { homeScore: 3, awayScore: 2, overtime: false },
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
      prediction: { homeScore: 3, awayScore: 2, overtime: false },
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

  it("should treat undefined overtime as false", () => {
    const context: MatchBetContext = {
      prediction: { homeScore: 3, awayScore: 2 }, // overtime undefined
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
});
