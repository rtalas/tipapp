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

    // one_team_score is a pure predicate; exclusion is orchestrator's job
    expect(evaluateOneTeamScore(context)).toBe(true);
  });

  it("should return false when neither score matches (even with same difference)", () => {
    const context: MatchBetContext = {
      prediction: { homeScore: 3, awayScore: 1 }, // +2 difference
      actual: {
        homeRegularScore: 5,
        awayRegularScore: 3, // +2 difference, but neither individual score matches
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
        isOvertime: false,
        isShootout: false,
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

  it("should not give false positive when OT goal coincidentally matches regulation score", () => {
    // Game: 4:3 OT (regulation 3:3). User bets 2:3 OT. Raw awayScore(3) would match awayRegularScore(3),
    // but predicted regulation away score is 2 — should NOT match
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

    expect(evaluateOneTeamScore(context)).toBe(false);
  });

  it("should return true when OT regulation score matches one team", () => {
    // Game: 4:3 OT (regulation 3:3). User bets 4:3 OT = predicted regulation 3:3. Home 3 matches!
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

    expect(evaluateOneTeamScore(context)).toBe(true);
  });
});
