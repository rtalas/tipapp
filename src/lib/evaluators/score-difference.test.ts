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

  it("should return true even when exact score matches (exclusion handled by orchestrator)", () => {
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

    // score_difference is a pure predicate; exact_score exclusion is orchestrator's job
    expect(evaluateScoreDifference(context)).toBe(true);
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

  it("should handle OT prediction with final score convention (uneven scores + overtime=true)", () => {
    // Game: 4:3 OT (regulation 3:3). User bets 2:3 OT = predicted regulation 2:2 (diff 0 = matches)
    const context: MatchBetContext = {
      prediction: { homeScore: 2, awayScore: 3, overtime: true },
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

    expect(evaluateScoreDifference(context)).toBe(true);
  });

  it("should handle OT prediction with regulation score convention (tied scores + overtime=true)", () => {
    // User bets 2:2 OT = predicted regulation 2:2 (diff 0 = matches 3:3 reg)
    const context: MatchBetContext = {
      prediction: { homeScore: 2, awayScore: 2, overtime: true },
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

    expect(evaluateScoreDifference(context)).toBe(true);
  });

  it("should return false when OT final score prediction has wrong difference", () => {
    // Game: 4:3 OT (regulation 3:3, diff 0). User bets 3:1 OT = predicted regulation 2:1 (diff +1 ≠ 0)
    const context: MatchBetContext = {
      prediction: { homeScore: 3, awayScore: 1, overtime: true },
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

    expect(evaluateScoreDifference(context)).toBe(false);
  });
});
