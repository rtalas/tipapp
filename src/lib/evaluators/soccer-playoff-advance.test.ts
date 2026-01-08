import { describe, it, expect } from "vitest";
import { evaluateSoccerPlayoffAdvance } from "./soccer-playoff-advance";
import type { MatchBetContext } from "./types";

describe("evaluateSoccerPlayoffAdvance", () => {
  it("should return true when predicted advancing team is correct", () => {
    const context: MatchBetContext = {
      prediction: {
        homeScore: 3,
        awayScore: 2,
        homeAdvanced: true,
      },
      actual: {
        homeRegularScore: 2,
        awayRegularScore: 2,
        homeFinalScore: 3,
        awayFinalScore: 2,
        scorerIds: [],
        isOvertime: true,
        isShootout: false,
        isPlayoffGame: true,
        homeAdvanced: true,
      },
    };

    expect(evaluateSoccerPlayoffAdvance(context)).toBe(true);
  });

  it("should return true when away team advances correctly", () => {
    const context: MatchBetContext = {
      prediction: {
        homeScore: 1,
        awayScore: 3,
        homeAdvanced: false,
      },
      actual: {
        homeRegularScore: 2,
        awayRegularScore: 2,
        homeFinalScore: 2,
        awayFinalScore: 3,
        scorerIds: [],
        isOvertime: false,
        isShootout: true,
        isPlayoffGame: true,
        homeAdvanced: false,
      },
    };

    expect(evaluateSoccerPlayoffAdvance(context)).toBe(true);
  });

  it("should return false when not a playoff game", () => {
    const context: MatchBetContext = {
      prediction: {
        homeScore: 3,
        awayScore: 2,
        homeAdvanced: true,
      },
      actual: {
        homeRegularScore: 3,
        awayRegularScore: 2,
        homeFinalScore: 3,
        awayFinalScore: 2,
        scorerIds: [],
        isOvertime: false,
        isShootout: false,
        isPlayoffGame: false,
        homeAdvanced: null,
      },
    };

    expect(evaluateSoccerPlayoffAdvance(context)).toBe(false);
  });

  it("should return false when predicted advancing team is incorrect", () => {
    const context: MatchBetContext = {
      prediction: {
        homeScore: 3,
        awayScore: 2,
        homeAdvanced: true,
      },
      actual: {
        homeRegularScore: 2,
        awayRegularScore: 2,
        homeFinalScore: 2,
        awayFinalScore: 3,
        scorerIds: [],
        isOvertime: true,
        isShootout: false,
        isPlayoffGame: true,
        homeAdvanced: false, // Away team advanced
      },
    };

    expect(evaluateSoccerPlayoffAdvance(context)).toBe(false);
  });
});
