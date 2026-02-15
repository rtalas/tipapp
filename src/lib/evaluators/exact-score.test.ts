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

  it("should return true when user enters final OT score convention (e.g. 4:3 OT = predicted regulation 3:3)", () => {
    // Game: 4:3 OT (regulation 3:3). User bets 4:3 OT — getPredictedRegulationScores strips OT goal → 3:3
    const context: MatchBetContext = {
      prediction: { homeScore: 4, awayScore: 3, overtime: true },
      actual: {
        homeRegularScore: 3,
        awayRegularScore: 3,
        homeFinalScore: 4,
        awayFinalScore: 3,
        scorerIds: [],
        isOvertime: true,
        isShootout: false,
        isPlayoffGame: false,
      },
    };

    expect(evaluateExactScore(context)).toBe(true);
  });

  it("should return false when OT final score predicts wrong regulation score", () => {
    // Game: 4:3 OT (regulation 3:3). User bets 3:2 OT = predicted regulation 2:2 ≠ 3:3
    const context: MatchBetContext = {
      prediction: { homeScore: 3, awayScore: 2, overtime: true },
      actual: {
        homeRegularScore: 3,
        awayRegularScore: 3,
        homeFinalScore: 4,
        awayFinalScore: 3,
        scorerIds: [],
        isOvertime: true,
        isShootout: false,
        isPlayoffGame: false,
      },
    };

    expect(evaluateExactScore(context)).toBe(false);
  });
});
