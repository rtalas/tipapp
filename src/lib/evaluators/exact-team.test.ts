import { describe, it, expect } from "vitest";
import { evaluateExactTeam } from "./exact-team";
import type { SpecialBetContext } from "./types";

describe("evaluateExactTeam", () => {
  it("should return true when predicted team matches actual team", () => {
    const context: SpecialBetContext = {
      prediction: { teamResultId: 42 },
      actual: { teamResultId: 42 },
    };

    expect(evaluateExactTeam(context)).toBe(true);
  });

  it("should return false when teams do not match", () => {
    const context: SpecialBetContext = {
      prediction: { teamResultId: 42 },
      actual: { teamResultId: 99 },
    };

    expect(evaluateExactTeam(context)).toBe(false);
  });

  it("should return false when no team was predicted", () => {
    const context: SpecialBetContext = {
      prediction: { teamResultId: null },
      actual: { teamResultId: 42 },
    };

    expect(evaluateExactTeam(context)).toBe(false);
  });
});
