import { describe, it, expect } from "vitest";
import { evaluateSeriesWinner } from "./series-winner";
import type { SeriesBetContext } from "./types";

describe("evaluateSeriesWinner", () => {
  it("should return true when series winner is correct but score is wrong", () => {
    const context: SeriesBetContext = {
      prediction: { homeTeamScore: 4, awayTeamScore: 2 },
      actual: { homeTeamScore: 4, awayTeamScore: 3 }, // Still home win
    };

    expect(evaluateSeriesWinner(context)).toBe(true);
  });

  it("should return false when exact series matches (no double points)", () => {
    const context: SeriesBetContext = {
      prediction: { homeTeamScore: 4, awayTeamScore: 2 },
      actual: { homeTeamScore: 4, awayTeamScore: 2 },
    };

    expect(evaluateSeriesWinner(context)).toBe(false);
  });

  it("should return false when series winner is incorrect", () => {
    const context: SeriesBetContext = {
      prediction: { homeTeamScore: 4, awayTeamScore: 2 }, // Home win
      actual: { homeTeamScore: 2, awayTeamScore: 4 }, // Away win
    };

    expect(evaluateSeriesWinner(context)).toBe(false);
  });

  it("should handle away team wins correctly", () => {
    const context: SeriesBetContext = {
      prediction: { homeTeamScore: 1, awayTeamScore: 4 },
      actual: { homeTeamScore: 2, awayTeamScore: 4 }, // Both away wins
    };

    expect(evaluateSeriesWinner(context)).toBe(true);
  });
});
