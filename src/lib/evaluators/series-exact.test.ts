import { describe, it, expect } from "vitest";
import { evaluateSeriesExact } from "./series-exact";
import type { SeriesBetContext } from "./types";

describe("evaluateSeriesExact", () => {
  it("should return true when series score matches exactly", () => {
    const context: SeriesBetContext = {
      prediction: { homeTeamScore: 4, awayTeamScore: 2 },
      actual: { homeTeamScore: 4, awayTeamScore: 2 },
    };

    expect(evaluateSeriesExact(context)).toBe(true);
  });

  it("should return false when series score does not match", () => {
    const context: SeriesBetContext = {
      prediction: { homeTeamScore: 4, awayTeamScore: 2 },
      actual: { homeTeamScore: 4, awayTeamScore: 3 },
    };

    expect(evaluateSeriesExact(context)).toBe(false);
  });

  it("should return false when series is not finished", () => {
    const context: SeriesBetContext = {
      prediction: { homeTeamScore: 4, awayTeamScore: 2 },
      actual: { homeTeamScore: null, awayTeamScore: null },
    };

    expect(evaluateSeriesExact(context)).toBe(false);
  });

  it("should work with reverse scores", () => {
    const context: SeriesBetContext = {
      prediction: { homeTeamScore: 2, awayTeamScore: 4 },
      actual: { homeTeamScore: 2, awayTeamScore: 4 },
    };

    expect(evaluateSeriesExact(context)).toBe(true);
  });
});
